import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const out = path.join(root, '_site');

const htmlEscape = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const attrEscape = htmlEscape;
const stripHtml = (value = '') => String(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
};

const readJson = async (filename) => JSON.parse(await fs.readFile(filename, 'utf8'));

async function listJson(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const records = [];
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(directory, entry.name);
    const data = await readJson(full);
    data._source = path.relative(src, full).split(path.sep).join('/');
    data._filename = entry.name;
    data.slug ||= path.basename(entry.name, '.json');
    records.push(data);
  }
  return records;
}

function parsePageSource(raw) {
  if (!raw.startsWith('---\n')) throw new Error('Page source is missing front matter.');
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) throw new Error('Page source has malformed front matter.');
  const fmText = raw.slice(4, end);
  const body = raw.slice(end + 5);
  const data = {};
  for (const line of fmText.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const rawValue = line.slice(idx + 1).trim();
    try {
      data[key] = JSON.parse(rawValue);
    } catch {
      data[key] = rawValue;
    }
  }
  return { data, body };
}

function outputPathForUrl(url) {
  const clean = url.split(/[?#]/)[0];
  if (clean === '/') return path.join(out, 'index.html');
  const withoutLeading = clean.replace(/^\//, '');
  if (withoutLeading.endsWith('/')) return path.join(out, withoutLeading, 'index.html');
  return path.join(out, withoutLeading);
}

async function writeUrl(url, content) {
  const target = outputPathForUrl(url);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, 'utf8');
}

const editableProp = (record, key) => `@file[/src/${record._source}].${key}`;
const siteTextProp = (key) => `@file[/src/data/site-text.json].${key}`;

function editableText(tag, record, key, value, attrs = '') {
  return `<${tag} data-editable="text" data-prop="${attrEscape(editableProp(record, key))}"${attrs ? ` ${attrs}` : ''}>${htmlEscape(value ?? '')}</${tag}>`;
}

function editableSiteText(tag, key, value, attrs = '') {
  return `<${tag} data-editable="text" data-prop="${attrEscape(siteTextProp(key))}"${attrs ? ` ${attrs}` : ''}>${htmlEscape(value ?? '')}</${tag}>`;
}

function editableRich(record, key, html, className = 'prose') {
  return `<div class="${attrEscape(className)}" data-editable="text" data-type="block" data-prop="${attrEscape(editableProp(record, key))}">${html || ''}</div>`;
}

function editableImage(record, srcKey, altKey, className = '') {
  const source = record[srcKey];
  if (!source) return '';
  const attrs = [
    'data-editable="image"',
    `data-prop-src="${attrEscape(editableProp(record, srcKey))}"`,
    `data-prop-alt="${attrEscape(editableProp(record, altKey))}"`,
    `src="${attrEscape(source)}"`,
    `alt="${attrEscape(record[altKey] || '')}"`,
  ];
  if (className) attrs.push(`class="${attrEscape(className)}"`);
  return `<img ${attrs.join(' ')}>`;
}

function linkAttrs(url) {
  return /^https?:\/\//i.test(url || '') ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function topicLabels(topics = []) {
  const names = { workforce: 'Workforce', institutions: 'Institutions', technology: 'Technology', behavior: 'Behavior & equity', data: 'Data' };
  return topics.map((topic) => names[topic] || topic).join(', ');
}

function sectionHeading({ eyebrowKey, headingKey, copyKey, siteText }) {
  return `<div class="section-heading reveal"><div>${editableSiteText('span', eyebrowKey, siteText[eyebrowKey], 'class="eyebrow"')}${editableSiteText('h2', headingKey, siteText[headingKey])}</div>${editableSiteText('p', copyKey, siteText[copyKey], 'class="section-heading__copy"')}</div>`;
}

function projectHomeCard(project) {
  const style = project.home_style || '';
  const className = style ? `project-card project-card--${style} reveal` : 'project-card reveal';
  const tagClass = style === 'ai' ? 'card__tag card__tag--red' : 'card__tag';
  let visual = '';
  if (style === 'insight') visual = '<div aria-hidden="true" class="project-visual project-visual--dots"></div>';
  if (style === 'ai') visual = '<div aria-hidden="true" class="cas-orbit"><span class="cas-letter cas-letter--c">C</span><span class="cas-letter cas-letter--a">A</span><span class="cas-letter cas-letter--s">S</span></div>';
  return `<article class="${className}"${style === 'arrc' ? ' id="arrc"' : ''}>
    <div class="project-card__content">
      ${editableText('span', project, 'tag', project.tag, `class="${tagClass}"`)}
      ${editableText('h3', project, 'title', project.title)}
      ${editableText('p', project, 'summary', project.summary)}
      <a class="text-link" href="${attrEscape(project.home_link || `/projects/${project.slug}/`)}"${linkAttrs(project.home_link)}>${htmlEscape(project.home_link_label || 'View project')}</a>
    </div>${visual}
  </article>`;
}

function researchProjectCard(project) {
  const topics = (project.topics || []).join(' ');
  const methods = (project.methods || []).map((method) => `<span>${htmlEscape(method)}</span>`).join('');
  return `<article class="card reveal" data-filter-item data-research-card data-topics="${attrEscape(topics)}" id="${attrEscape(project.anchor_id || project.slug)}">
    ${editableText('span', project, 'tag', project.tag, 'class="card__tag"')}
    ${editableText('h3', project, 'title', project.title)}
    ${editableText('p', project, 'summary', project.summary)}
    ${methods ? `<div class="card__meta">${methods}</div>` : ''}
    <a class="text-link" href="/projects/${attrEscape(project.slug)}/">View project</a>
  </article>`;
}

function publicationRow(publication) {
  const venue = publication.citation || publication.venue || '';
  const venueKey = publication.citation ? 'citation' : 'venue';
  return `<article class="publication reveal">
    ${editableText('div', publication, 'year', publication.year, 'class="publication__year"')}
    <div>${editableText('h3', publication, 'title', publication.title)}<p>${editableText('span', publication, 'authors', publication.authors)}${venue ? ` · ${editableText('span', publication, venueKey, venue)}` : ''}</p></div>
    <a aria-label="${attrEscape(publication.link_label || 'Open publication')}" class="publication__link" href="${attrEscape(publication.url)}"${linkAttrs(publication.url)}>↗</a>
  </article>`;
}

function newsCard(news) {
  return `<article class="news-card reveal">
    ${news.image ? `<a class="news-card__image" href="/news/${attrEscape(news.slug)}/">${editableImage(news, 'image', 'image_alt')}</a>` : ''}
    <div class="news-card__body">
      <div class="news-card__meta">${editableText('span', news, 'eyebrow', news.eyebrow || 'Update')}<time datetime="${attrEscape(news.date)}">${htmlEscape(formatDate(news.date))}</time></div>
      ${editableText('h3', news, 'title', news.title)}
      ${editableText('p', news, 'summary', news.summary)}
      <a class="text-link" href="/news/${attrEscape(news.slug)}/">Read update</a>
    </div>
  </article>`;
}

function personCard(person) {
  const expertise = (person.expertise || []).map((item) => `<li>${htmlEscape(item)}</li>`).join('');
  const alumniBadge = person.is_alumni ? '<span class="badge">CLEAR Alumnus</span>' : '';
  return `<article class="person-card reveal">
    <a class="person-card__initials" aria-label="View ${attrEscape(person.name)} profile" href="/people/${attrEscape(person.slug)}/">${htmlEscape(person.initials || person.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join(''))}</a>
    ${editableText('h3', person, 'name', person.name)}
    ${editableText('p', person, 'affiliation', person.affiliation || '')}
    ${alumniBadge}
    ${expertise ? `<ul class="inline-list">${expertise}</ul>` : ''}
    <a class="text-link" href="/people/${attrEscape(person.slug)}/">View profile</a>
  </article>`;
}

function partnerCard(partner) {
  return `<article class="partner-card reveal">
    ${editableText('h3', partner, 'name', partner.name)}
    ${editableText('p', partner, 'summary', partner.summary)}
    <a class="text-link" href="${attrEscape(partner.url)}"${linkAttrs(partner.url)}>${htmlEscape(partner.link_label || 'Visit website')}</a>
  </article>`;
}

function episodeCard(episode) {
  return `<article class="episode-card reveal">
    <div class="episode-card__art"><strong>BookMarked</strong><span>Conversations about civic leadership</span></div>
    <div class="episode-card__body"><span class="episode-card__date">${htmlEscape(formatDate(episode.date))}</span>
      ${editableText('h3', episode, 'title', episode.title)}
      <p>${editableText('strong', episode, 'book_title', episode.book_title)}<br>${editableText('span', episode, 'summary', episode.summary)}</p>
      <a class="text-link" href="/bookmarked/${attrEscape(episode.slug)}/">View conversation</a>
    </div>
  </article>`;
}

function resourceCard(resource) {
  const topics = (resource.topics || []).join(' ');
  return `<article class="resource-card card reveal" data-filter-item data-resource-card data-topics="${attrEscape(topics)}">
    ${editableText('span', resource, 'type', resource.type, 'class="card__tag"')}
    ${editableText('h3', resource, 'title', resource.title)}
    ${editableText('p', resource, 'summary', resource.summary)}
    <a class="text-link" href="${attrEscape(resource.url)}"${linkAttrs(resource.url)}>${htmlEscape(resource.link_label || 'Open resource')}</a>
  </article>`;
}

function renderDynamicSections(body, context) {
  const { site, siteText, projects, publications, people, partners, news, resources, episodes } = context;
  const featuredProjects = projects.filter((item) => item.published && item.featured_home).sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
  const researchProjects = projects.filter((item) => item.published && item.show_on_research).sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
  const allProjects = projects.filter((item) => item.published).sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
  const allPublications = publications.filter((item) => item.published).sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || (a.sort_order || 999) - (b.sort_order || 999));
  const featuredPublications = allPublications.filter((item) => item.featured_home).slice(0, 3);
  const allNews = news.filter((item) => item.published).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const featuredNews = allNews.filter((item) => item.featured_home).slice(0, 3);
  const director = people.find((item) => item.published && item.category === 'director');
  const alumni = people.filter((item) => item.published && item.category === 'alumni').sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
  const gsuFellows = people.filter((item) => item.published && item.category === 'gsu_fellow').sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
  const clearFellows = people.filter((item) => item.published && item.category === 'clear_fellow').sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
  const students = people.filter((item) => item.published && item.category === 'student').sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
  const allPartners = partners.filter((item) => item.published).sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
  const allEpisodes = episodes.filter((item) => item.published).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const allResources = resources.filter((item) => item.published).sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));

  const replacements = {
    HOME_PROJECTS: `<section class="section"><div class="container">${sectionHeading({ eyebrowKey: 'home_platforms_eyebrow', headingKey: 'home_platforms_heading', copyKey: 'home_platforms_copy', siteText })}<div class="project-grid">${featuredProjects.map(projectHomeCard).join('\n')}</div><div class="button-row archive-link-row"><a class="button button--ghost" href="/projects/">View all projects</a></div></div></section>`,
    HOME_PUBLICATIONS: `<section class="section"><div class="container">${sectionHeading({ eyebrowKey: 'home_publications_eyebrow', headingKey: 'home_publications_heading', copyKey: 'home_publications_copy', siteText })}<div class="publication-list">${featuredPublications.map(publicationRow).join('\n')}</div><div class="button-row" style="margin-top:2rem"><a class="button" href="/publications/">View publication record</a><a class="button button--ghost" href="${attrEscape(site.scholar_url)}" target="_blank" rel="noopener noreferrer">Google Scholar</a></div></div></section>`,
    HOME_NEWS: `<section class="section section--surface"><div class="container">${sectionHeading({ eyebrowKey: 'home_news_eyebrow', headingKey: 'home_news_heading', copyKey: 'home_news_copy', siteText })}${featuredNews.length ? `<div class="news-grid">${featuredNews.map(newsCard).join('\n')}</div>` : '<div class="callout"><p>New CLEAR updates will appear here.</p></div>'}<div class="button-row archive-link-row"><a class="button button--ghost" href="/news/">All news</a></div></div></section>`,
    RESEARCH_PROJECTS: `<section class="section"><div class="container">${sectionHeading({ eyebrowKey: 'research_projects_eyebrow', headingKey: 'research_projects_heading', copyKey: 'research_projects_copy', siteText })}<div aria-label="Filter research areas" class="filter-bar" data-filter-group data-filter-target="[data-research-card]"><button aria-pressed="true" class="filter-button" data-filter="all" type="button">All</button><button aria-pressed="false" class="filter-button" data-filter="workforce" type="button">Workforce</button><button aria-pressed="false" class="filter-button" data-filter="institutions" type="button">Institutions</button><button aria-pressed="false" class="filter-button" data-filter="technology" type="button">Technology</button><button aria-pressed="false" class="filter-button" data-filter="behavior" type="button">Behavior &amp; equity</button></div><div class="card-grid card-grid--2" id="workforce">${researchProjects.map(researchProjectCard).join('\n')}</div><div class="button-row archive-link-row"><a class="button button--ghost" href="/projects/">View complete project portfolio</a></div></div></section>`,
    RESEARCH_PUBLICATIONS: `<section class="section section--surface" id="publications"><div class="container">${sectionHeading({ eyebrowKey: 'research_publications_eyebrow', headingKey: 'research_publications_heading', copyKey: 'research_publications_copy', siteText })}<div class="publication-list">${allPublications.slice(0, 6).map(publicationRow).join('\n')}</div><div class="button-row" style="margin-top:2rem"><a class="button" href="/publications/">Browse publications</a><a class="button button--ghost" href="/contact/">Discuss a project</a></div></div></section>`,
    PEOPLE_DIRECTOR: director ? `<section class="section"><div class="container"><div class="profile-card reveal"><div class="profile-card__photo">${editableImage(director, 'photo', 'photo_alt')}</div><div><span class="eyebrow">Director</span>${editableText('h2', director, 'name', director.name)}<p class="profile-card__title">${editableText('span', director, 'title', director.title)} · ${editableText('span', director, 'affiliation', director.affiliation)}</p>${editableText('p', director, 'summary', director.summary)}<div class="button-row" style="margin-top:1.4rem"><a class="button" href="/people/${attrEscape(director.slug)}/">Full profile</a><a class="button button--ghost" href="mailto:${attrEscape(director.email)}">${htmlEscape(director.email)}</a></div></div></div></div></section>` : '',
    PEOPLE_GSU_FELLOWS: `<section class="section section--surface" id="gsu-fellows"><div class="container">${sectionHeading({ eyebrowKey: 'people_gsu_fellows_eyebrow', headingKey: 'people_gsu_fellows_heading', copyKey: 'people_gsu_fellows_copy', siteText })}<div class="person-grid">${gsuFellows.map(personCard).join('\n')}</div></div></section>`,
    PEOPLE_STUDENT_FELLOWS: `<section class="section" id="student-fellows"><div class="container">${sectionHeading({ eyebrowKey: 'people_student_fellows_eyebrow', headingKey: 'people_student_fellows_heading', copyKey: 'people_student_fellows_copy', siteText })}<div class="person-grid">${students.map(personCard).join('\n')}</div></div></section>`,
    PEOPLE_CLEAR_FELLOWS: `<section class="section section--surface" id="clear-fellows"><div class="container">${sectionHeading({ eyebrowKey: 'people_clear_fellows_eyebrow', headingKey: 'people_clear_fellows_heading', copyKey: 'people_clear_fellows_copy', siteText })}<div class="person-grid">${clearFellows.map(personCard).join('\n')}</div></div></section>`,
    PEOPLE_ALUMNI: alumni.length ? `<section class="section" id="alumni"><div class="container">${sectionHeading({ eyebrowKey: 'people_alumni_eyebrow', headingKey: 'people_alumni_heading', copyKey: 'people_alumni_copy', siteText })}<div class="person-grid">${alumni.map(personCard).join('\n')}</div></div></section>` : '',
    PEOPLE_PARTNERS: `<section class="section section--blue" id="partners"><div class="container">${sectionHeading({ eyebrowKey: 'people_partners_eyebrow', headingKey: 'people_partners_heading', copyKey: 'people_partners_copy', siteText })}<div class="partner-grid">${allPartners.map(partnerCard).join('\n')}</div><div class="callout" style="margin-top:2rem"><strong>Past and project-specific support</strong> has also included the John Randolph Haynes and Dora Haynes Foundation, Arizona State University’s Center for Organization Research and Design, USC’s Center for Inclusive Democracy, and other university and civic collaborators.</div></div></section>`,
    BOOKMARKED_EPISODES: `<section class="section section--surface"><div class="container">${sectionHeading({ eyebrowKey: 'bookmarked_eyebrow', headingKey: 'bookmarked_heading', copyKey: 'bookmarked_copy', siteText })}<div class="episode-grid">${allEpisodes.map(episodeCard).join('\n')}</div></div></section>`,
    PROJECTS_ALL: `<section class="section"><div class="container">${editableSiteText('h2', 'projects_heading', siteText.projects_heading)}${editableSiteText('p', 'projects_copy', siteText.projects_copy, 'class="lead archive-intro"')}<div aria-label="Filter projects" class="filter-bar" data-filter-group data-filter-target="[data-project-card]"><button aria-pressed="true" class="filter-button" data-filter="all" type="button">All</button><button aria-pressed="false" class="filter-button" data-filter="workforce" type="button">Workforce</button><button aria-pressed="false" class="filter-button" data-filter="institutions" type="button">Institutions</button><button aria-pressed="false" class="filter-button" data-filter="technology" type="button">Technology</button><button aria-pressed="false" class="filter-button" data-filter="behavior" type="button">Behavior &amp; equity</button><button aria-pressed="false" class="filter-button" data-filter="data" type="button">Data</button></div><div class="archive-grid archive-grid--projects">${allProjects.map((project) => `<article class="card archive-card reveal" data-filter-item data-project-card data-topics="${attrEscape((project.topics || []).join(' '))}">${editableText('span', project, 'tag', project.tag, 'class="card__tag"')}${editableText('h2', project, 'title', project.title)}${editableText('p', project, 'summary', project.summary)}<div class="card__meta"><span>${htmlEscape(project.status || 'Active')}</span><span>${htmlEscape(topicLabels(project.topics))}</span></div><a class="text-link" href="/projects/${attrEscape(project.slug)}/">Open project</a></article>`).join('\n')}</div></div></section>`,
    PUBLICATIONS_ALL: `<section class="section"><div class="container">${editableSiteText('h2', 'publications_heading', siteText.publications_heading)}${editableSiteText('p', 'publications_copy', siteText.publications_copy, 'class="lead archive-intro"')}<div class="publication-list">${allPublications.map(publicationRow).join('\n')}</div><div class="button-row archive-link-row"><a class="button button--ghost" href="${attrEscape(site.scholar_url)}" target="_blank" rel="noopener noreferrer">Complete record on Google Scholar</a></div></div></section>`,
    NEWS_ALL: `<section class="section"><div class="container">${editableSiteText('h2', 'news_heading', siteText.news_heading)}${editableSiteText('p', 'news_copy', siteText.news_copy, 'class="lead archive-intro"')}${allNews.length ? `<div class="news-grid">${allNews.map(newsCard).join('\n')}</div>` : '<div class="callout"><p>No news items have been published yet.</p></div>'}</div></section>`,
    RESOURCES_ALL: `<section class="section"><div class="container">${editableSiteText('h2', 'resources_heading', siteText.resources_heading)}${editableSiteText('p', 'resources_copy', siteText.resources_copy, 'class="lead archive-intro"')}<div aria-label="Filter resources" class="filter-bar" data-filter-group data-filter-target="[data-resource-card]"><button aria-pressed="true" class="filter-button" data-filter="all" type="button">All</button><button aria-pressed="false" class="filter-button" data-filter="workforce" type="button">Workforce</button><button aria-pressed="false" class="filter-button" data-filter="technology" type="button">Technology</button><button aria-pressed="false" class="filter-button" data-filter="institutions" type="button">Institutions</button><button aria-pressed="false" class="filter-button" data-filter="data" type="button">Data</button></div><div class="card-grid card-grid--2">${allResources.map(resourceCard).join('\n')}</div></div></section>`,
  };

  return body.replace(/<!--\s*CLEAR:([A-Z_]+)\s*-->/g, (match, key) => replacements[key] ?? match);
}

function siteHeader(site, navKey) {
  const nav = site.navigation.map((item) => {
    const active = item.key === navKey;
    const classes = ['site-nav__link', item.contact ? 'site-nav__link--contact' : ''].filter(Boolean).join(' ');
    return `<li><a class="${classes}" href="${attrEscape(item.url)}"${active ? ' aria-current="page"' : ''}>${htmlEscape(item.label)}</a></li>`;
  }).join('');
  return `<a class="skip-link" href="#main-content">Skip to main content</a>
<div class="site-topbar"><div class="container site-topbar__inner"><span>${htmlEscape(site.tagline)}</span><div class="site-topbar__links"><a href="${attrEscape(site.institution_url)}" target="_blank" rel="noopener noreferrer">${htmlEscape(site.institution)}</a><a href="${attrEscape(site.school_url)}" target="_blank" rel="noopener noreferrer">Andrew Young School</a><a href="${attrEscape(site.department_url)}" target="_blank" rel="noopener noreferrer">Public Management &amp; Policy</a></div></div></div>
<header class="site-header"><div class="container site-header__inner"><a aria-label="CLEAR home" class="brand" href="/"><img alt="Georgia State University, Andrew Young School of Policy Studies" class="brand__institutional" src="/assets/images/aysps-logo.png"><span aria-hidden="true" class="brand__divider"></span><span class="brand__clear"><strong>CLEAR</strong><span>Civic Leadership Education and Research</span></span></a><button aria-controls="site-navigation" aria-expanded="false" class="nav-toggle" data-nav-toggle type="button"><span class="sr-only">Toggle navigation</span><span aria-hidden="true" class="nav-toggle__bars"></span></button><nav aria-label="Primary navigation" class="site-nav" data-site-nav id="site-navigation"><ul class="site-nav__list">${nav}</ul></nav></div></header>`;
}

function siteFooter(site) {
  const explore = site.footer_explore.map((item) => `<li><a href="${attrEscape(item.url)}">${htmlEscape(item.label)}</a></li>`).join('');
  const platforms = site.footer_platforms.map((item) => `<li><a href="${attrEscape(item.url)}">${htmlEscape(item.label)}</a></li>`).join('');
  return `<footer class="footer"><div class="container footer__main"><div class="footer__brand"><a class="footer__brandmark" href="/"><strong>CLEAR</strong><span>Civic Leadership Education and Research</span></a><p>${htmlEscape(site.description)}</p><a class="footer__institution" href="${attrEscape(site.school_url)}" target="_blank" rel="noopener noreferrer"><img src="/assets/images/aysps-logo.png" alt="Georgia State University, Andrew Young School of Policy Studies"></a></div><div><h3>Explore</h3><ul>${explore}</ul></div><div><h3>Platforms</h3><ul>${platforms}</ul></div><div><h3>Connect</h3><ul><li><a href="mailto:${attrEscape(site.email)}">${htmlEscape(site.email)}</a></li><li><a href="tel:${attrEscape(site.phone_href)}">${htmlEscape(site.phone)}</a></li><li><a href="${attrEscape(site.linkedin_url)}" target="_blank" rel="noopener noreferrer">LinkedIn</a></li><li><a href="/search/">Search</a></li><li><a href="/contact/">Contact CLEAR</a></li></ul></div></div><div class="container footer__bottom"><span>© <span data-year>2026</span> Georgia State University. CLEAR is hosted at the Andrew Young School of Policy Studies.</span><div class="footer__bottom-links"><a href="https://www.gsu.edu/privacy/" target="_blank" rel="noopener noreferrer">Privacy</a><a href="https://www.gsu.edu/legal-statement/" target="_blank" rel="noopener noreferrer">Legal statement</a><a href="/contact/">Accessibility contact</a></div></div></footer>`;
}

function layout({ site, title, description, url, bodyClass = '', navKey = '', content, structuredData = null, socialImage = null, type = 'website' }) {
  const canonical = new URL(url, site.site_url).href;
  const image = new URL(socialImage || site.default_social_image, site.site_url).href;
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'ResearchOrganization',
    name: site.organization_name,
    alternateName: site.short_name,
    url: site.site_url,
    parentOrganization: { '@type': 'CollegeOrUniversity', name: site.institution, url: site.institution_url },
    email: site.email,
    telephone: site.phone,
  };
  const jsonLd = structuredData ? [organization, structuredData] : organization;
  return `<!doctype html>
<html lang="${attrEscape(site.language || 'en')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${attrEscape(description)}">
  <link rel="canonical" href="${attrEscape(canonical)}">
  <meta name="theme-color" content="#0039a6">
  <meta property="og:type" content="${attrEscape(type)}">
  <meta property="og:title" content="${attrEscape(title)}">
  <meta property="og:description" content="${attrEscape(description)}">
  <meta property="og:url" content="${attrEscape(canonical)}">
  <meta property="og:image" content="${attrEscape(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="alternate" type="application/rss+xml" title="CLEAR News" href="/news/feed.xml">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">
  <script>document.documentElement.classList.add('js');</script>
  <link rel="stylesheet" href="/assets/css/site.css">
  <script src="/assets/js/site.js" defer></script>
  <script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>
</head>
<body class="${attrEscape(bodyClass)}">
${siteHeader(site, navKey)}
${content}
${siteFooter(site)}
</body>
</html>\n`;
}

function detailHero({ eyebrow, title, aside, breadcrumbs, eyebrowHtml = '', titleHtml = '', asideHtml = '' }) {
  const eyebrowMarkup = eyebrowHtml || `<span class="eyebrow">${htmlEscape(eyebrow)}</span>`;
  const titleMarkup = titleHtml || `<h1>${htmlEscape(title)}</h1>`;
  const asideMarkup = asideHtml || `<p class="page-hero__aside">${htmlEscape(aside)}</p>`;
  return `<section class="page-hero"><div class="container page-hero__inner"><div><ol class="breadcrumbs">${breadcrumbs.map((item, index) => `<li>${item.url && index < breadcrumbs.length - 1 ? `<a href="${attrEscape(item.url)}">${htmlEscape(item.label)}</a>` : htmlEscape(item.label)}</li>`).join('')}</ol>${eyebrowMarkup}${titleMarkup}</div>${asideMarkup}</div></section>`;
}

function renderProjectDetail(project, context) {
  const methods = (project.methods || []).map((method) => `<li>${htmlEscape(method)}</li>`).join('');
  const topics = (project.topics || []).map((topic) => `<li>${htmlEscape(topicLabels([topic]))}</li>`).join('');
  const content = `<main id="main-content">${detailHero({ eyebrow: project.tag || 'CLEAR project', title: project.title, aside: project.summary, breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'Projects', url: '/projects/' }, { label: project.title }], eyebrowHtml: editableText('span', project, 'tag', project.tag || 'CLEAR project', 'class="eyebrow"'), titleHtml: editableText('h1', project, 'title', project.title), asideHtml: editableText('p', project, 'summary', project.summary, 'class="page-hero__aside"') })}<section class="section"><div class="container detail-layout"><article class="detail-main"><div class="detail-status"><span class="status-pill">${htmlEscape(project.status || 'Active')}</span><span>${htmlEscape(project.type || 'Research project')}</span></div>${editableRich(project, 'body_html', project.body_html)}${project.home_link && project.home_link !== `/projects/${project.slug}/` ? `<div class="button-row"><a class="button" href="${attrEscape(project.home_link)}"${linkAttrs(project.home_link)}>${htmlEscape(project.home_link_label || 'Explore program')}</a></div>` : ''}</article><aside class="detail-sidebar"><div class="card"><h2>Methods and materials</h2><ul>${methods || '<li>Research design in development</li>'}</ul></div><div class="card"><h2>Topics</h2><ul>${topics}</ul></div><a class="button button--ghost" href="/contact/">Discuss this project</a></aside></div></section></main>`;
  const structured = { '@context': 'https://schema.org', '@type': 'ResearchProject', name: project.title, description: project.summary, url: `${context.site.site_url}/projects/${project.slug}/`, memberOf: { '@type': 'ResearchOrganization', name: context.site.organization_name } };
  return layout({ site: context.site, title: `${project.title} | CLEAR`, description: project.summary, url: `/projects/${project.slug}/`, navKey: 'research', content, structuredData: structured });
}

function renderPersonDetail(person, context) {
  const expertise = (person.expertise || []).map((item) => `<li>${htmlEscape(item)}</li>`).join('');
  const image = person.photo ? `<div class="detail-portrait">${editableImage(person, 'photo', 'photo_alt')}</div>` : `<div class="detail-portrait detail-portrait--initials">${htmlEscape(person.initials || '')}</div>`;
  const buttons = [person.email ? `<a class="button" href="mailto:${attrEscape(person.email)}">Email</a>` : '', person.profile_url ? `<a class="button button--ghost" href="${attrEscape(person.profile_url)}" target="_blank" rel="noopener noreferrer">Institutional profile</a>` : ''].join('');
  const personTitleLine = [person.title ? editableText('span', person, 'title', person.title) : '', person.affiliation ? editableText('span', person, 'affiliation', person.affiliation) : ''].filter(Boolean).join(' · ');
  const content = `<main id="main-content">${detailHero({ eyebrow: person.role || 'CLEAR network', title: person.name, aside: [person.title, person.affiliation].filter(Boolean).join(' · '), breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'People & Partners', url: '/people/' }, { label: person.name }], eyebrowHtml: editableText('span', person, 'role', person.role || 'CLEAR network', 'class="eyebrow"'), titleHtml: editableText('h1', person, 'name', person.name), asideHtml: `<p class="page-hero__aside">${personTitleLine}</p>` })}<section class="section"><div class="container profile-detail">${image}<article><p class="profile-card__title">${personTitleLine}</p>${editableRich(person, 'bio_html', person.bio_html)}${expertise ? `<h2>Areas of expertise</h2><ul class="inline-list profile-detail__expertise">${expertise}</ul>` : ''}${buttons ? `<div class="button-row">${buttons}</div>` : ''}</article></div></section></main>`;
  const structured = { '@context': 'https://schema.org', '@type': 'Person', name: person.name, jobTitle: person.title || person.role, affiliation: { '@type': 'Organization', name: person.affiliation || context.site.organization_name }, url: `${context.site.site_url}/people/${person.slug}/` };
  return layout({ site: context.site, title: `${person.name} | CLEAR`, description: person.summary || `${person.name}, ${person.role || 'CLEAR network'}.`, url: `/people/${person.slug}/`, navKey: 'people', content, structuredData: structured, socialImage: person.photo || context.site.default_social_image });
}

function renderNewsDetail(item, context) {
  const content = `<main id="main-content">${detailHero({ eyebrow: item.eyebrow || 'CLEAR update', title: item.title, aside: item.summary, breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'News', url: '/news/' }, { label: item.title }], eyebrowHtml: editableText('span', item, 'eyebrow', item.eyebrow || 'CLEAR update', 'class="eyebrow"'), titleHtml: editableText('h1', item, 'title', item.title), asideHtml: editableText('p', item, 'summary', item.summary, 'class="page-hero__aside"') })}<article class="section"><div class="container container--narrow"><p class="article-date"><time datetime="${attrEscape(item.date)}">${htmlEscape(formatDate(item.date))}</time></p>${item.image ? `<figure class="article-image">${editableImage(item, 'image', 'image_alt')}</figure>` : ''}${editableRich(item, 'body_html', item.body_html, 'prose article-body')}${item.external_url ? `<div class="button-row"><a class="button" href="${attrEscape(item.external_url)}" target="_blank" rel="noopener noreferrer">${htmlEscape(item.external_label || 'Read more')}</a></div>` : ''}</div></article></main>`;
  const structured = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: item.title, description: item.summary, datePublished: item.date, mainEntityOfPage: `${context.site.site_url}/news/${item.slug}/`, publisher: { '@type': 'ResearchOrganization', name: context.site.organization_name } };
  return layout({ site: context.site, title: `${item.title} | CLEAR News`, description: item.summary, url: `/news/${item.slug}/`, navKey: 'news', content, structuredData: structured, socialImage: item.image || context.site.default_social_image, type: 'article' });
}

function renderEpisodeDetail(episode, context) {
  const content = `<main id="main-content">${detailHero({ eyebrow: 'BookMarked conversation', title: episode.title, aside: episode.book_title, breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'BookMarked', url: '/bookmarked/' }, { label: episode.title }], titleHtml: editableText('h1', episode, 'title', episode.title), asideHtml: editableText('p', episode, 'book_title', episode.book_title, 'class="page-hero__aside"') })}<section class="section"><div class="container detail-layout"><article class="detail-main"><p class="article-date"><time datetime="${attrEscape(episode.date)}">${htmlEscape(formatDate(episode.date))}</time></p><p class="lead">${editableText('strong', episode, 'book_title', episode.book_title)}</p>${editableRich(episode, 'body_html', episode.body_html)}<div class="button-row"><a class="button" href="${attrEscape(episode.url)}"${linkAttrs(episode.url)}>${htmlEscape(episode.link_label || 'Episode archive')}</a></div></article><aside class="detail-sidebar"><div class="episode-card__art episode-card__art--detail"><strong>BookMarked</strong><span>Conversations about civic leadership</span></div><div class="card"><h2>Guest</h2>${editableText('p', episode, 'guest', episode.guest)}</div></aside></div></section></main>`;
  return layout({ site: context.site, title: `${episode.title} | BookMarked`, description: episode.summary, url: `/bookmarked/${episode.slug}/`, navKey: 'bookmarked', content, type: 'article' });
}

async function copyDirectory(from, to) {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(from, entry.name);
    const destinationPath = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDirectory(sourcePath, destinationPath);
    else await fs.copyFile(sourcePath, destinationPath);
  }
}

async function build() {
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });

  const site = await readJson(path.join(src, 'data/site.json'));
  const siteText = await readJson(path.join(src, 'data/site-text.json'));
  const [projects, publications, people, partners, news, resources, episodes] = await Promise.all([
    listJson(path.join(src, 'content/projects')),
    listJson(path.join(src, 'content/publications')),
    listJson(path.join(src, 'content/people')),
    listJson(path.join(src, 'content/partners')),
    listJson(path.join(src, 'content/news')),
    listJson(path.join(src, 'content/resources')),
    listJson(path.join(src, 'content/episodes')),
  ]);
  const context = { site, siteText, projects, publications, people, partners, news, resources, episodes };

  await copyDirectory(path.join(src, 'assets'), path.join(out, 'assets'));

  const pageEntries = (await fs.readdir(path.join(src, 'pages'))).filter((name) => name.endsWith('.html')).sort();
  const pageRecords = [];
  for (const filename of pageEntries) {
    const raw = await fs.readFile(path.join(src, 'pages', filename), 'utf8');
    const { data, body } = parsePageSource(raw);
    const content = renderDynamicSections(body, context);
    const html = layout({ site, title: data.title, description: data.description, url: data.permalink, bodyClass: data.body_class, navKey: data.nav_key, content });
    await writeUrl(data.permalink, html);
    pageRecords.push({ title: data.title.replace(/ \| CLEAR.*$/, ''), description: data.description, url: data.permalink, type: 'Page', text: stripHtml(content) });
  }

  for (const project of projects.filter((item) => item.published)) await writeUrl(`/projects/${project.slug}/`, renderProjectDetail(project, context));
  for (const person of people.filter((item) => item.published)) await writeUrl(`/people/${person.slug}/`, renderPersonDetail(person, context));
  for (const item of news.filter((entry) => entry.published)) await writeUrl(`/news/${item.slug}/`, renderNewsDetail(item, context));
  for (const episode of episodes.filter((item) => item.published)) await writeUrl(`/bookmarked/${episode.slug}/`, renderEpisodeDetail(episode, context));

  const searchEntries = [
    ...pageRecords,
    ...projects.filter((item) => item.published).map((item) => ({ title: item.title, description: item.summary, url: `/projects/${item.slug}/`, type: 'Project', text: stripHtml(`${item.body_html} ${(item.methods || []).join(' ')} ${(item.topics || []).join(' ')}`) })),
    ...people.filter((item) => item.published).map((item) => ({ title: item.name, description: [item.role, item.affiliation].filter(Boolean).join(' · '), url: `/people/${item.slug}/`, type: 'Person', text: stripHtml(`${item.summary || ''} ${item.bio_html || ''} ${(item.expertise || []).join(' ')}`) })),
    ...publications.filter((item) => item.published).map((item) => ({ title: item.title, description: `${item.authors} · ${item.venue || item.citation || ''}`, url: item.url, type: 'Publication', text: `${item.year} ${(item.topics || []).join(' ')}` })),
    ...news.filter((item) => item.published).map((item) => ({ title: item.title, description: item.summary, url: `/news/${item.slug}/`, type: 'News', text: stripHtml(item.body_html || '') })),
    ...resources.filter((item) => item.published).map((item) => ({ title: item.title, description: item.summary, url: item.url, type: 'Resource', text: `${item.type} ${(item.topics || []).join(' ')}` })),
    ...episodes.filter((item) => item.published).map((item) => ({ title: item.title, description: `${item.book_title} · ${item.summary}`, url: `/bookmarked/${item.slug}/`, type: 'BookMarked', text: `${item.guest} ${stripHtml(item.body_html || '')}` })),
  ];
  await fs.writeFile(path.join(out, 'search.json'), JSON.stringify(searchEntries, null, 2), 'utf8');

  const urls = new Set(pageRecords.map((page) => page.url));
  projects.filter((item) => item.published).forEach((item) => urls.add(`/projects/${item.slug}/`));
  people.filter((item) => item.published).forEach((item) => urls.add(`/people/${item.slug}/`));
  news.filter((item) => item.published).forEach((item) => urls.add(`/news/${item.slug}/`));
  episodes.filter((item) => item.published).forEach((item) => urls.add(`/bookmarked/${item.slug}/`));
  const lastmod = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].sort().map((url) => `  <url><loc>${htmlEscape(new URL(url, site.site_url).href)}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(out, 'sitemap.xml'), sitemap, 'utf8');
  await fs.writeFile(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.site_url}/sitemap.xml\n`, 'utf8');

  const feedNews = news.filter((item) => item.published).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 20);
  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${htmlEscape(site.short_name)} News</title><link>${htmlEscape(site.site_url)}/news/</link><description>${htmlEscape(site.description)}</description>${feedNews.map((item) => `<item><title>${htmlEscape(item.title)}</title><link>${htmlEscape(site.site_url)}/news/${htmlEscape(item.slug)}/</link><guid>${htmlEscape(site.site_url)}/news/${htmlEscape(item.slug)}/</guid><pubDate>${new Date(`${item.date}T12:00:00Z`).toUTCString()}</pubDate><description>${htmlEscape(item.summary)}</description></item>`).join('')}</channel></rss>\n`;
  await fs.mkdir(path.join(out, 'news'), { recursive: true });
  await fs.writeFile(path.join(out, 'news', 'feed.xml'), rss, 'utf8');

  const manifest = { name: site.site_name, short_name: site.short_name, description: site.description, start_url: '/', display: 'standalone', background_color: '#ffffff', theme_color: '#0039a6', icons: [{ src: '/assets/images/favicon.svg', sizes: 'any', type: 'image/svg+xml' }] };
  await fs.writeFile(path.join(out, 'site.webmanifest'), JSON.stringify(manifest, null, 2), 'utf8');

  const notFoundContent = `<main id="main-content"><section class="page-hero"><div class="container page-hero__inner"><div><span class="eyebrow">404</span><h1>That page could not be found.</h1></div><p class="page-hero__aside">The address may have changed during the CLEAR migration. Search the site or return to the homepage.</p></div></section><section class="section"><div class="container container--narrow"><div class="button-row"><a class="button" href="/">Return home</a><a class="button button--ghost" href="/search/">Search CLEAR</a></div></div></section></main>`;
  await fs.writeFile(path.join(out, '404.html'), layout({ site, title: 'Page not found | CLEAR', description: 'The requested CLEAR page could not be found.', url: '/404.html', content: notFoundContent }), 'utf8');

  const redirectsSource = path.join(src, '_redirects');
  try { await fs.copyFile(redirectsSource, path.join(out, '_redirects')); } catch { /* optional */ }
  const headersSource = path.join(src, '_headers');
  try { await fs.copyFile(headersSource, path.join(out, '_headers')); } catch { /* optional */ }

  console.log(`Built ${pageRecords.length} pages, ${projects.length} projects, ${people.length} people, ${publications.length} publications, ${news.length} news items, ${resources.length} resources, and ${episodes.length} BookMarked episodes.`);
}

build().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
