# personal_website

Static personal portfolio website for Justin (Ziheng) Zhong, deployed with GitHub Pages from the repository root.

## Overview

This repo is a no-build static site. It serves three hand-authored HTML pages:

- `index.html` - homepage, bio, education, stack, and navigation into the site.
- `projects.html` - selected projects, work experience, and leadership.
- `cv.html` - web CV page with a direct download link to `CV.pdf`.

The current design uses an engineering-notebook aesthetic with a sticky profile sidebar, responsive single-column mobile layout, light/dark theme toggle, scroll reveal, section navigation, and a small edit-mode tweaks panel.

## Stack

- **Markup:** static HTML
- **Styling:** vanilla CSS in `styles.css` and `tweaks.css`
- **Runtime behavior:** vanilla JavaScript in `site.js`
- **Optional tweaks panel:** React 18 UMD + Babel standalone loaded from CDN for `tweaks.jsx`
- **Typography:** Google Fonts, IBM Plex Sans and JetBrains Mono
- **Hosting:** GitHub Pages, deployed from `main` branch `/ (root)`
- **Build step:** none

## Project Structure

```text
.
├── index.html          # Homepage
├── projects.html       # Projects, experience, and leadership
├── cv.html             # Web CV and PDF actions
├── styles.css          # Main responsive layout, theme, and page styling
├── tweaks.css          # Floating tweaks-panel styling
├── site.js             # Theme, tweaks, cursor, reveal, nav, clock behavior
├── tweaks.jsx          # Page-specific React tweaks panel
├── tweaks-panel.jsx    # Reusable tweaks-panel helpers/reference component
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

## Deployment

GitHub Pages should be configured as:

- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/ (root)`

Because the site is static HTML/CSS/JS, pushing changes to `main` is enough for Pages to serve the updated files after GitHub Pages finishes publishing.

## Notes

- The site defaults to light mode for first-time visitors. If a user toggles dark mode, the choice is saved in `localStorage` under `site.theme`.
- `CV.pdf` is the canonical downloadable resume file used by the CV page.
- The old Quarto project files and GitHub Actions build workflow were removed; this repo no longer renders through Quarto.
