# personal_website

Personal portfolio website for Justin (Ziheng) Zhong, built with [Quarto](https://quarto.org/) and deployed on GitHub Pages.

## Overview

A single-page, responsive portfolio showcasing education, technical skills, selected projects, and professional experience. The site uses a two-column layout with a sticky sidebar on desktop and collapses to a single column on mobile. Includes light/dark mode with an automatic toggle.

## Tech Stack

- **Static site generator:** Quarto
- **Theme:** Cosmo (light) / Darkly (dark) — Bootstrap 5
- **Custom styling:** `styles.css` (CSS custom properties, grid layout, responsive breakpoints)
- **CI/CD:** GitHub Actions (build + deploy on push to `main`)
- **Hosting:** GitHub Pages

## Project Structure

```
.
├── _quarto.yml                    # Quarto project configuration
├── index.qmd                     # All page content (Quarto Markdown)
├── styles.css                    # Custom CSS (light + dark mode variables)
├── Avatar.png                    # Profile photo
├── CV.pdf                        # Downloadable CV
├── .github/workflows/publish.yml # CI/CD workflow
└── README.md
```

## Local Development

**Prerequisites:** [Quarto CLI](https://quarto.org/docs/get-started/)

```bash
# Preview with live reload
quarto preview

# Build to docs/
quarto render
```

## Deployment

Pushing to `main` triggers a GitHub Actions workflow that renders the site with Quarto and deploys it to GitHub Pages. The GitHub Pages source must be set to **GitHub Actions** in the repository settings.