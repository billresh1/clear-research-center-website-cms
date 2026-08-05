import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '_site');
const src = path.join(root, 'src');
const failures = [];
const warnings = [];

async function walk(directory) {
  const found = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await walk(full));
    else found.push(full);
  }
  return found;
}

function outputFileForUrl(value, currentFile) {
  const cleaned = value.split('#')[0].split('?')[0];
  if (!cleaned) return currentFile;
  if (/^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(cleaned)) return null;
  if (cleaned.startsWith('//')) return null;
  let resolved;
  if (cleaned.startsWith('/')) resolved = path.join(out, cleaned.replace(/^\//, ''));
  else resolved = path.resolve(path.dirname(currentFile), cleaned);
  if (cleaned.endsWith('/')) return path.join(resolved, 'index.html');
  if (path.extname(resolved)) return resolved;
  return path.join(resolved, 'index.html');
}

function fragmentFromUrl(value) {
  const index = value.indexOf('#');
  return index >= 0 ? decodeURIComponent(value.slice(index + 1)) : '';
}

const allFiles = await walk(out);
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));
if (!htmlFiles.length) failures.push('No HTML output files were built.');

const idCache = new Map();
for (const file of htmlFiles) {
  const rel = path.relative(out, file).split(path.sep).join('/');
  const html = await fs.readFile(file, 'utf8');
  const required = [
    ['doctype', /<!doctype html>/i],
    ['language', /<html[^>]+lang=/i],
    ['title', /<title>[^<]+<\/title>/i],
    ['description', /<meta[^>]+name=["']description["']/i],
    ['canonical', /<link[^>]+rel=["']canonical["']/i],
    ['stylesheet', /href=["']\/assets\/css\/site\.css["']/i],
    ['script', /src=["']\/assets\/js\/site\.js["']/i],
    ['main', /<main\b/i],
    ['h1', /<h1\b/i],
    ['skip link target', /id=["']main-content["']/i],
  ];
  for (const [label, pattern] of required) if (!pattern.test(html)) failures.push(`${rel}: missing ${label}`);
  if (/<!--\s*CLEAR:/.test(html)) failures.push(`${rel}: unresolved CLEAR marker`);
  if (/\b(?:undefined|null)\b/.test(html.replace(/application\/ld\+json[\s\S]*?<\/script>/gi, ''))) warnings.push(`${rel}: contains undefined/null text; inspect manually`);

  const editableProps = [...html.matchAll(/\bdata-prop(?:-[a-z-]+)?=["'](@file\[[^"']+)["']/gi)].map((match) => match[1]);
  for (const prop of editableProps) {
    const match = prop.match(/^@file\[([^\]]+)\]/);
    if (!match) continue;
    const sourcePath = match[1];
    if (!sourcePath.startsWith('/')) {
      failures.push(`${rel}: CloudCannon @file path must start with /: ${prop}`);
      continue;
    }
    const sourceFile = path.join(root, sourcePath.replace(/^\//, ''));
    try { await fs.access(sourceFile); }
    catch { failures.push(`${rel}: CloudCannon @file target does not exist: ${sourcePath}`); }
  }

  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) failures.push(`${rel}: duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
  idCache.set(file, new Set(ids));

  const refs = [...html.matchAll(/(?:^|\s)(?:href|src)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const ref of refs) {
    const target = outputFileForUrl(ref, file);
    if (target) {
      try { await fs.access(target); }
      catch { failures.push(`${rel}: unresolved local reference ${ref}`); continue; }
      const fragment = fragmentFromUrl(ref);
      if (fragment && target.endsWith('.html')) {
        let idsForTarget = idCache.get(target);
        if (!idsForTarget) {
          try {
            const targetHtml = await fs.readFile(target, 'utf8');
            idsForTarget = new Set([...targetHtml.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]));
            idCache.set(target, idsForTarget);
          } catch { /* unresolved reported above */ }
        }
        if (idsForTarget && !idsForTarget.has(fragment)) failures.push(`${rel}: missing fragment target ${ref}`);
      }
    }
  }
}

for (const required of ['search.json', 'sitemap.xml', 'robots.txt', 'site.webmanifest', '404.html', '_redirects', '_headers']) {
  try { await fs.access(path.join(out, required)); }
  catch { failures.push(`Missing output file: ${required}`); }
}

const search = JSON.parse(await fs.readFile(path.join(out, 'search.json'), 'utf8'));
if (!Array.isArray(search) || search.length < 40) failures.push(`Search index unexpectedly small: ${Array.isArray(search) ? search.length : 'not an array'}`);

const sourceHtml = (await walk(path.join(src, 'pages'))).filter((file) => file.endsWith('.html'));
const seenKeys = new Set();
for (const file of sourceHtml) {
  const html = await fs.readFile(file, 'utf8');
  const sourceRegions = [...html.matchAll(/data-editable=["']source["'][^>]*data-key=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const key of sourceRegions) {
    const compound = `${path.basename(file)}:${key}`;
    if (seenKeys.has(compound)) failures.push(`Duplicate source editable key: ${compound}`);
    seenKeys.add(compound);
  }
}

for (const folder of ['people', 'partners', 'projects', 'publications', 'news', 'resources', 'episodes']) {
  const files = (await fs.readdir(path.join(src, 'content', folder))).filter((file) => file.endsWith('.json'));
  for (const file of files) {
    try { JSON.parse(await fs.readFile(path.join(src, 'content', folder, file), 'utf8')); }
    catch (error) { failures.push(`Invalid JSON: src/content/${folder}/${file}: ${error.message}`); }
  }
}

if (warnings.length) {
  console.warn(`Warnings (${warnings.length}):`);
  warnings.slice(0, 20).forEach((warning) => console.warn(`- ${warning}`));
}
if (failures.length) {
  console.error(`Validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Validation passed: ${htmlFiles.length} HTML files, ${allFiles.length} total output files, ${search.length} search records, ${seenKeys.size} source-editable regions.`);
