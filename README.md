# CLEAR Research Center website

This repository contains the production website for the Civic Leadership Education and Research (CLEAR) Initiative at Georgia State University's Andrew Young School of Policy Studies.

It preserves the current CLEAR/GSU design while adding a structured content system for projects, people, publications, news, resources, partners, and BookMarked episodes. CloudCannon supplies browser-based visual and data editing. GitHub stores the source and history. Netlify builds and publishes the live site.

## Routine workflow

1. Edit content in CloudCannon.
2. Save or publish the change.
3. CloudCannon commits the source change to GitHub.
4. Netlify detects the commit, runs `npm run build`, and deploys `_site`.

The generated `_site` directory is disposable build output. Do not edit it directly.

## Local commands

Requires Node.js 20 or newer; Node.js 22 is used by the hosting configuration.

```bash
npm run build      # Generate the website in _site
npm run validate   # Validate the generated website
npm test           # Build, then validate
npm start          # Preview the built website locally
```

The build has no third-party runtime dependencies. The site uses ordinary HTML, CSS, JavaScript, JSON content files, and a small custom Node build script.

## Main folders

- `src/pages/` — visually editable principal pages
- `src/content/people/` — people profiles
- `src/content/projects/` — projects and platforms
- `src/content/publications/` — publication records
- `src/content/news/` — news and announcements
- `src/content/resources/` — reports, data documentation, and links
- `src/content/partners/` — partner records
- `src/content/episodes/` — BookMarked records
- `src/data/` — site settings, navigation, contact information, and shared labels
- `src/assets/` — styles, scripts, and images
- `scripts/` — build, preview, and validation programs
- `_site/` — generated deploy output; intentionally excluded from Git

## Setup and editing instructions

Start with [`docs/SETUP.md`](docs/SETUP.md). Routine CloudCannon editing is explained in [`docs/EDITING.md`](docs/EDITING.md).
