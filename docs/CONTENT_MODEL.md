# Content model

The site separates design from content so the appearance remains consistent while records can be maintained through CloudCannon.

| Collection | Source | Generated output |
|---|---|---|
| Main pages | `src/pages/*.html` | Principal site pages |
| People | `src/content/people/*.json` | People archive and individual profiles |
| Partners | `src/content/partners/*.json` | Partner cards on People & Partners |
| Projects | `src/content/projects/*.json` | Home/research cards, project archive, and detail pages |
| Publications | `src/content/publications/*.json` | Home, research, and publication listings |
| News | `src/content/news/*.json` | Home/news cards, article pages, RSS feed |
| Resources | `src/content/resources/*.json` | Filterable resource archive |
| BookMarked episodes | `src/content/episodes/*.json` | BookMarked archive and detail pages |
| Site settings | `src/data/*.json` | Shared navigation, contact data, and labels |

## Build products

The Node build script generates:

- 53 HTML documents
- a JSON search index
- an XML sitemap
- an RSS news feed
- a web manifest
- Netlify redirects and security headers
- structured metadata for the organization, projects, people, and news

The exact counts can change as editors add or remove records.
