# Quality assurance report

## Automated build validation

The production source was built and validated with `npm test` on July 20, 2026.

Result:

```text
Built 14 pages, 11 projects, 19 people, 6 publications,
1 news item, 6 resources, and 7 BookMarked episodes.

Validation passed: 53 HTML files, 68 total output files,
64 search records, 50 source-editable regions.
```

The validator checks:

- valid JSON content files
- page titles, descriptions, main landmarks, and primary headings
- duplicate HTML IDs
- unresolved local assets and links
- unresolved fragment anchors
- duplicate or incomplete CloudCannon source-editable regions
- successful generation of the search index and deployment files

## Visual review

Representative desktop and mobile pages were rendered from the final build. Reviewed pages included the homepage, Projects archive, INSIGHT+ project detail, and People & Partners. No horizontal overflow was detected at 1440-pixel desktop or 390-pixel mobile widths. The current visual system, content hierarchy, header, footer, imagery, cards, and responsive layout were preserved.

## Progressive enhancement

Reveal animations are applied only when JavaScript is active. Content remains visible when JavaScript is unavailable. Reduced-motion preferences disable the animation treatment.

## Remaining service-level verification

The repository configuration follows CloudCannon's current unified configuration and editable-region conventions, but the actual first CloudCannon build and editor session must occur inside the owner's CloudCannon account. The first service-level review should confirm that page source regions and structured JSON bindings appear as editable outlines and that a saved edit syncs to GitHub and triggers Netlify.

## Interaction review

Browser-based interaction checks were run against the generated pages using Chromium:

- mobile navigation opens, updates `aria-expanded`, and closes with the Escape key
- the Projects topic filter updates pressed states and shows only matching records
- the client-side site search loads the generated search index and returns ranked results

Results:

```text
mobile navigation: pass
project filter: pass (10/11 projects visible for Workforce)
site search: pass (10 results for “shutdown”)
```
