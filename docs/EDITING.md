# Editing the CLEAR website in CloudCannon

## Editing an ordinary page visually

Use **Main Pages** for Home, About, Research, INSIGHT+, AI & Workforce, People & Partners, BookMarked, Contact, and the archive pages.

1. Open the page.
2. Select **Visual Editor**.
3. Click a yellow-outlined section.
4. Edit text with the WYSIWYG toolbar, replace images, or change links.
5. Save the change with a clear message.

The header, navigation, and footer are shared. They are intentionally not repeated inside every page file.

## Adding or changing a person

Use **Community → People**.

Fields include name, role, title, affiliation, email, profile URL, expertise, short summary, biography, photo, category, sort order, and publication status.

- `category: director` places the record in the director section.
- `category: fellow` places the record among CLEAR Fellows.
- `category: student` is available for student collaborators.
- Lower `sort_order` values appear first.
- Turn off `published` to keep a record in the CMS without displaying it publicly.

After creating a person, CloudCannon creates a JSON record and the build generates the profile page and People archive automatically.

## Adding or changing a project

Use **Research → Projects**.

Important controls:

- `featured_home` adds the project to the homepage platform area.
- `show_on_research` includes it on the Research page.
- `topics` controls archive filtering.
- `home_style` selects one of the existing featured-card treatments.
- `status`, `methods`, and `sort_order` control labels and placement.
- `published` controls whether the project and its detail page are public.

## Adding a publication

Use **Research → Publications** and create a new record. Enter the title, authors, year, venue or citation, destination URL, topic tags, and whether it should be featured on the homepage. The website sorts publication records by year automatically.

## Adding news

Use **Website → News**. Enter a date, title, short summary, main article text, optional image, and optional external link. Turn on `featured_home` to display it on the homepage. Published news receives its own page and appears in the RSS feed and search index.

## Adding a resource or BookMarked episode

Use **Website → Resources** for reports, datasets, documentation, codebooks, and external archives. Use **Community → BookMarked Episodes** for episode records. The build automatically updates archive pages and site search.

## Editing site-wide information

Use **Administration → Site Settings & Labels**.

- `site.json` contains navigation, contact details, institution links, social links, and footer links.
- `site-text.json` contains shared headings and explanatory copy used in generated sections.

Changes here affect multiple pages, so review the Netlify deploy preview carefully.

## Image guidance

CloudCannon uploads images into `src/assets/images`. Supply meaningful alternative text for every informative image. Use landscape images for news and project features when possible. Avoid uploading video files or very large datasets into the website repository; link to an appropriate external service instead.

## What not to edit

- Do not edit `_site`; it is recreated on every build.
- Do not move or rename the `src`, `scripts`, or `.cloudcannon` folders.
- Do not change `netlify.toml` or `cloudcannon.config.yml` during routine content editing.
- Do not delete `published`, `sort_order`, or URL-related fields from structured records.

## Publishing and rollback

Every saved CloudCannon change becomes a Git commit. Netlify builds the commit automatically. To undo a mistake, restore the prior field value in CloudCannon or revert the corresponding commit/deploy. Do not manually upload a separate static folder over the Git-connected Netlify project except during an emergency recovery.
