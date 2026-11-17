// Mirror the OpenWiki pages in openwiki/ into a local clone of the GitHub wiki.
// Usage: node .github/scripts/sync-github-wiki.mjs <path-to-wiki-clone>
// Then commit and push inside the clone. openwiki/ stays the source of truth.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'https://github.com/shuakyle21/tesda-compliance-manager';
const PAGES = ['quickstart.md', 'architecture/overview.md', 'architecture/module-boundaries-and-data-pattern.md', 'architecture/data-model-and-rls.md'];

const out = process.argv[2];
if (!out) throw new Error('usage: sync-github-wiki.mjs <path-to-wiki-clone>');

// A stray tokenizer placeholder in one OpenWiki description; fix it in openwiki/ and this line can go.
const clean = (s) => s.replace(/<\|place_holder_[^|]*\|> ?-admin/g, '/platform-admin');

const pages = PAGES.map((path) => {
  const raw = readFileSync(join('openwiki', path), 'utf8');
  const [, fm, body] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const field = (k) => fm.match(new RegExp(`^${k}: "?(.*?)"?$`, 'm'))[1];
  const title = field('title');
  return { path, title, slug: title.replace(/ /g, '-'), description: clean(field('description')).replace(/</g, '&lt;'), body };
});
const slugOf = Object.fromEntries(pages.map((p) => [`/openwiki/${p.path}`, p.slug]));

const rewriteLinks = (md) =>
  md.replace(/\]\((\/[^)\s#]*)(#[^)\s]*)?\)/g, (_, target, hash = '') => {
    if (slugOf[target]) return `](${slugOf[target]}${hash})`;
    if (target.startsWith('/openwiki/')) throw new Error(`unmapped wiki link ${target}`);
    return `](${REPO}/blob/main${target}${hash})`;
  }).replace(/\]\(<\/([^>]*)>\)/g, `](<${REPO}/blob/main/$1>)`); // <…> form wraps paths with parentheses

const footer = `_Mirrored from [\`openwiki/\`](${REPO}/tree/main/openwiki). Edit there and re-sync; changes made here are overwritten._\n`;

for (const p of pages) {
  // GitHub prints the page name as the heading, so drop the body's own H1.
  const body = clean(p.body).replace(/^\s*# .*\n+/, '');
  writeFileSync(join(out, `${p.slug}.md`), rewriteLinks(body));
}

const list = pages.map((p) => `- [${p.title}](${p.slug})`).join('\n');
writeFileSync(
  join(out, 'Home.md'),
  `TVI-CAMS (TESDA Compliance Manager) repository wiki. Start with **[Quickstart and Change Routing](${pages[0].slug})**.\n\n` +
    pages.map((p) => `## [${p.title}](${p.slug})\n\n${p.description}\n`).join('\n'),
);
writeFileSync(join(out, '_Sidebar.md'), `**[Home](Home)**\n\n${list}\n`);
writeFileSync(join(out, '_Footer.md'), footer);

// Remove pages that no longer exist in openwiki/.
const keep = new Set(['Home.md', '_Sidebar.md', '_Footer.md', ...pages.map((p) => `${p.slug}.md`)]);
const stale = readdirSync(out).filter((f) => f.endsWith('.md') && !keep.has(f));
if (stale.length) console.log(`Not in openwiki/ (delete if unwanted): ${stale.join(', ')}`);
console.log(`Wrote ${pages.length} pages + Home, _Sidebar, _Footer to ${out}`);
