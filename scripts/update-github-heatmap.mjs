import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const OUTPUT_PATH = new URL("../github-activity.json", import.meta.url);
const USER = process.env.GH_HEATMAP_USER || "iJustinn";
const WEEK_COUNT = Number.parseInt(process.env.GH_HEATMAP_WEEKS || "15", 10);
const API_VERSION = "2022-11-28";
const LEVELS = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function readJson(path, fallback = null) {
  return readFile(path, "utf8")
    .then((text) => JSON.parse(text))
    .catch(() => fallback);
}

function resolveToken() {
  const envToken = process.env.GH_HEATMAP_TOKEN || process.env.GH_PROJECTS_TOKEN || process.env.GITHUB_TOKEN;
  if (envToken) return envToken.trim();

  try {
    return execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function sameStableData(a, b) {
  if (!a || !b) return false;
  const stableA = { ...a, generatedAt: undefined };
  const stableB = { ...b, generatedAt: undefined };
  return JSON.stringify(stableA) === JSON.stringify(stableB);
}

async function githubGraphql(query, variables, token) {
  if (!token) throw new Error("A GitHub token is required for contribution calendar GraphQL queries.");

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ijustinn-personal-website",
      "X-GitHub-Api-Version": API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.[0]?.message || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }
  return payload.data;
}

function buildCalendar(calendar, start, today) {
  const byDate = new Map();
  for (const week of calendar.weeks || []) {
    for (const day of week.contributionDays || []) {
      byDate.set(day.date, {
        count: day.contributionCount,
        level: LEVELS[day.contributionLevel] ?? 0,
      });
    }
  }

  const weeks = [];
  for (let weekIndex = 0; weekIndex < WEEK_COUNT; weekIndex += 1) {
    const weekStart = addDays(start, weekIndex * 7);
    const days = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = addDays(weekStart, weekday);
      const key = dateKey(date);
      const future = date > today;
      const contribution = byDate.get(key) || { count: 0, level: 0 };
      days.push({
        date: key,
        count: future ? null : contribution.count,
        level: future ? null : contribution.level,
        weekday,
        future,
      });
    }
    weeks.push({ start: dateKey(weekStart), days });
  }

  const months = [];
  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
    const firstOfMonth = weeks[weekIndex].days.find((day) => day.date.endsWith("-01"));
    if (firstOfMonth) {
      const date = new Date(`${firstOfMonth.date}T00:00:00Z`);
      months.push({ weekIndex, label: MONTHS[date.getUTCMonth()] });
    }
  }

  return { weeks, months };
}

const previous = await readJson(OUTPUT_PATH);
const token = resolveToken();
const today = startOfUtcDay(new Date());
const currentWeekStart = addDays(today, -today.getUTCDay());
const start = addDays(currentWeekStart, -(WEEK_COUNT - 1) * 7);
const to = addDays(today, 1);

try {
  const data = await githubGraphql(`
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
                contributionLevel
              }
            }
          }
        }
      }
    }
  `, {
    login: USER,
    from: start.toISOString(),
    to: to.toISOString(),
  }, token);

  const calendar = data.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new Error(`No contribution calendar returned for ${USER}.`);

  const output = {
    schemaVersion: 1,
    user: USER,
    range: {
      weeks: WEEK_COUNT,
      from: dateKey(start),
      to: dateKey(today),
    },
    ...buildCalendar(calendar, start, today),
    generatedAt: new Date().toISOString(),
  };

  if (sameStableData(previous, output)) {
    console.log("No GitHub activity changes.");
  } else {
    await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
    console.log(`Wrote ${WEEK_COUNT} weeks of GitHub activity to github-activity.json`);
  }
} catch (error) {
  if (previous) {
    console.warn(`Keeping previous GitHub activity data: ${error.message}`);
  } else {
    throw error;
  }
}
