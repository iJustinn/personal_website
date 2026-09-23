# personal_website

Static [personal portfolio website](https://ijustinn.github.io/personal_website/) for Justin (Ziheng) Zhong, deployed with GitHub Pages from the repository root.

## Overview

This repo is a no-build static site. It serves three hand-authored HTML pages:

- `index.html` - Work: pinned hero (avatar, intro, GitHub contribution heatmap) and a tag-filterable masonry feed of project and news cards.
- `projects.html` - detailed project cards with GitHub-powered "updated" dates and tag filters.
- `about.html` - bio, experience, education, stack, leadership, news, contact details, and the `CV.pdf` download.

The design is a minimal portfolio feed (Geist type, rounded cards, translucent sticky header) with light/dark themes that follow the system setting until the visitor toggles one.

## Stack

- **Markup:** static HTML
- **Styling:** vanilla CSS in `main.css`
- **Runtime behavior:** vanilla JavaScript in `main.js`
- **Legacy:** `styles.css`, `tweaks.css`, `site.js`, and `tweaks.jsx` are only used by the hidden `apps.html` page
- **GitHub metadata refresh:** GitHub Actions + `scripts/update-projects.mjs` and `scripts/update-github-heatmap.mjs`
- **Typography:** Google Fonts, Geist and Geist Mono
- **Hosting:** GitHub Pages, deployed from `main` branch `/ (root)`
- **Build step:** none

## Project Structure

```text
.
├── index.html          # Work feed (homepage)
├── projects.html       # Detailed projects (reordered by the metadata workflow)
├── about.html          # Bio, experience, education, stack, leadership
├── main.css            # Site styling, themes, responsive layout
├── main.js             # Theme, header, hero fade, tag filters, GitHub data
├── apps.html           # Hidden apps page (still uses the legacy files below)
├── styles.css          # Legacy styling for apps.html
├── tweaks.css          # Legacy tweaks-panel styling for apps.html
├── site.js             # Legacy behavior for apps.html
├── projects.config.json # Curated project-to-repo mapping
├── projects-data.json  # Generated GitHub project metadata served to the site
├── github-activity.json # Generated recent GitHub contribution heatmap data
├── scripts/
│   ├── update-projects.mjs # Fetches repo metadata from the GitHub API
│   └── update-github-heatmap.mjs # Fetches recent GitHub contribution data
├── .github/
│   └── workflows/
│       └── update-projects.yml # Scheduled/manual metadata refresh
├── tweaks.jsx          # Legacy React tweaks panel for apps.html
├── Avatar.png          # Profile photo used by sidebar
├── CV.pdf              # Downloadable CV
├── .nojekyll           # Keeps GitHub Pages from treating files as Jekyll input
├── .gitignore
└── README.md
```

## Local Development

No dependencies are required for normal editing. Open `index.html` directly in a browser, or run a simple static server if you want localhost URLs:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`.

To refresh the GitHub metadata locally:

```bash
node scripts/update-projects.mjs
node scripts/update-github-heatmap.mjs
```

The project script uses `GH_PROJECTS_TOKEN` or `GITHUB_TOKEN` when set. The heatmap script uses `GH_HEATMAP_TOKEN`, `GH_PROJECTS_TOKEN`, or `GITHUB_TOKEN`. If no environment token is present, both scripts try the local `gh` CLI token. Public repositories can be fetched without a token, but private repositories such as `iJustinn/Coin` and private contribution counts need a token with read access.

## Deployment

GitHub Pages should be configured as:

- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/ (root)`

Because the site is static HTML/CSS/JS, pushing changes to `main` is enough for Pages to serve the updated files after GitHub Pages finishes publishing.

GitHub metadata is refreshed by `.github/workflows/update-projects.yml` every 12 hours and can also be run manually from the Actions tab. The workflow commits changes to `projects-data.json` and `github-activity.json` only when GitHub metadata has changed. To include private repositories, add a repository secret named `GH_PROJECTS_TOKEN` with read access to those repos. To include private contribution counts in the heatmap, add `GH_HEATMAP_TOKEN` from the GitHub account whose contributions should be displayed. The generated JSON contains only repo-level fields and daily contribution counts used by the site; tokens and commit messages are never written into the repo.

## Notes

- The site follows the visitor's system light/dark setting. If a user toggles the theme, the choice is saved in `localStorage` under `site.theme`.
- `CV.pdf` is the canonical downloadable resume file, linked from the About page.
- The old Quarto project files and Quarto build workflow were removed; this repo no longer renders through Quarto.
