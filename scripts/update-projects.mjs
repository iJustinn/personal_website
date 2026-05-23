import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const CONFIG_PATH = new URL("../projects.config.json", import.meta.url);
const OUTPUT_PATH = new URL("../projects-data.json", import.meta.url);
const HTML_PATH = new URL("../projects.html", import.meta.url);
const API_VERSION = "2022-11-28";

function readJson(path, fallback = null) {
  return readFile(path, "utf8")
    .then((text) => JSON.parse(text))
    .catch(() => fallback);
}

function resolveToken() {
  const envToken = process.env.GH_PROJECTS_TOKEN || process.env.GITHUB_TOKEN;
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

function normalizeRepo(repo, owner) {
  return repo.includes("/") ? repo : `${owner}/${repo}`;
}

async function github(path, token) {
  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "ijustinn-personal-website",
    "X-GitHub-Api-Version": API_VERSION,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${details.slice(0, 160)}`);
  }
  return response.json();
}

async function fetchProject(project, config, token, previousById) {
  const repoName = normalizeRepo(project.repo, config.owner);
  const previous = previousById.get(project.id);

  try {
    const repo = await github(`/repos/${repoName}`, token);

    return {
      id: project.id,
      title: project.title,
      repo: repo.full_name,
      name: repo.name,
      description: repo.description || "",
      url: repo.html_url,
      homepage: repo.homepage || "",
      primaryLanguage: repo.language || null,
      pushedAt: repo.pushed_at,
      updatedAt: repo.updated_at,
      status: "ok",
    };
  } catch (error) {
    if (previous) {
      console.warn(`Keeping previous metadata for ${repoName}: ${error.message}`);
      return previous;
    }

    console.warn(`Could not fetch metadata for ${repoName}: ${error.message}`);
    return {
      id: project.id,
      title: project.title,
      repo: repoName,
      url: `https://github.com/${repoName}`,
      status: "unavailable",
    };
  }
}

const config = await readJson(CONFIG_PATH);
if (!config || !Array.isArray(config.projects)) {
  throw new Error("projects.config.json must contain a projects array.");
}

const previous = await readJson(OUTPUT_PATH, { schemaVersion: 1, projects: [] });
const previousById = new Map((previous.projects || []).map((project) => [project.id, project]));
const token = resolveToken();

const projects = [];
for (const project of config.projects) {
  projects.push(await fetchProject(project, config, token, previousById));
}

function sortKey(project) {
  const raw = project.pushedAt || project.updatedAt;
  const time = raw ? new Date(raw).valueOf() : 0;
  return Number.isFinite(time) ? time : 0;
}
projects.sort((a, b) => sortKey(b) - sortKey(a));

const output = {
  schemaVersion: 1,
  projects,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${projects.length} project metadata entries to projects-data.json`);

await reorderProjectsHtml(projects);

async function reorderProjectsHtml(orderedProjects) {
  const html = await readFile(HTML_PATH, "utf8");
  const articleRegex = /<article class="project"[^>]*data-project-id="([^"]+)"[^>]*>[\s\S]*?<\/article>/g;
  const matches = [...html.matchAll(articleRegex)];

  if (matches.length !== orderedProjects.length) {
    console.warn(
      `Expected ${orderedProjects.length} <article> blocks in projects.html, found ${matches.length}. Skipping HTML reorder.`,
    );
    return;
  }

  const blockById = new Map(matches.map((match) => [match[1], match[0]]));
  const orderedBlocks = [];
  for (const project of orderedProjects) {
    const block = blockById.get(project.id);
    if (!block) {
      console.warn(`No <article> block for project id "${project.id}". Skipping HTML reorder.`);
      return;
    }
    orderedBlocks.push(block);
  }

  const renumberedBlocks = orderedBlocks.map((block, index) => {
    const label = `[${String(index + 1).padStart(2, "0")}]`;
    return block.replace(/<div class="idx">\[\d+\]<\/div>/, `<div class="idx">${label}</div>`);
  });

  const separators = [];
  for (let i = 0; i < matches.length - 1; i += 1) {
    const endOfCurrent = matches[i].index + matches[i][0].length;
    const startOfNext = matches[i + 1].index;
    separators.push(html.slice(endOfCurrent, startOfNext));
  }

  const firstStart = matches[0].index;
  const lastEnd = matches[matches.length - 1].index + matches[matches.length - 1][0].length;
  const before = html.slice(0, firstStart);
  const after = html.slice(lastEnd);

  let middle = "";
  for (let i = 0; i < renumberedBlocks.length; i += 1) {
    middle += renumberedBlocks[i];
    if (i < separators.length) middle += separators[i];
  }

  const next = before + middle + after;
  if (next === html) {
    console.log("projects.html already in sorted order; no changes written.");
    return;
  }

  await writeFile(HTML_PATH, next);
  console.log("Reordered <article> blocks in projects.html.");
}
