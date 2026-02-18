# personal_website

Personal portfolio website for Justin (Ziheng) Zhong, built with [Quarto](https://quarto.org/) and deployed on GitHub Pages.

## Overview

A single-page, responsive portfolio showcasing education, technical skills, selected projects, and professional experience. The site uses a two-column layout with a sticky sidebar on desktop and collapses to a single column on mobile.

## Tech Stack

- **Static site generator:** Quarto
- **Theme:** Cosmo (Bootstrap 5)
- **Custom styling:** `styles.css` (CSS custom properties, grid layout, responsive breakpoints)
- **Deployment:** GitHub Pages via the `/docs` output directory

## Project Structure

```
.
├── _quarto.yml        # Quarto project configuration
├── index.qmd          # All page content (Quarto Markdown)
├── styles.css         # Custom CSS
├── Avatar.png         # Profile photo
├── CV.pdf             # Downloadable CV
├── docs/              # Generated output (do not edit manually)
└── README.md
```

## Local Development

**Prerequisites:** [Quarto CLI](https://quarto.org/docs/get-started/)

```bash
# Preview with live reload
quarto preview

# Build to /docs
quarto render
```

The rendered site is written to `docs/`, which is served directly by GitHub Pages.

## Deployment

Push the `docs/` directory to the branch configured for GitHub Pages. The `.nojekyll` file tells GitHub Pages to skip Jekyll processing.