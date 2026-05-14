import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const CONFIG_PATH = new URL("../projects.config.json", import.meta.url);
const OUTPUT_PATH = new URL("../projects-data.json", import.meta.url);
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

const output = {
  schemaVersion: 1,
  projects,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${projects.length} project metadata entries to projects-data.json`);
