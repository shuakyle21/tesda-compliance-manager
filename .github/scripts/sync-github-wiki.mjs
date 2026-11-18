// Mirror the OpenWiki pages in openwiki/ into a local clone of the GitHub wiki, laid out with
// the PracticalSeries conventions (github.com/practicalseries/GitHub-Wiki-Design-and-Implementation):
// one numbered folder per page (Cc-SsDd), numbered headings (Cc.Ss.Dd), pages split at a section
// once they pass ~4000 words, a per-folder sidebar (prev/home/next + collapsible contents) and footer,
// and a "Back to top" link closing every section.
//
// Usage (from the repo root): pnpm wiki:github <path-to-wiki-clone>
// Then commit and push inside the clone. openwiki/ stays the source of truth: this script deletes
// every root page and numbered folder in the clone before regenerating them.
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = 'https://github.com/shuakyle21/tesda-compliance-manager';
const CHAPTERS = ['quickstart.md', 'architecture/overview.md', 'architecture/data-model-and-rls.md', 'architecture/module-boundaries-and-data-pattern.md'];
const MAX_WORDS = 4000; // PracticalSeries page budget; split only at a section (H2) boundary
const TOP = '**[Back to top](#idtop)**';

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Rendered heading text: inline code keeps its content, links keep their text.
const plain = (md) => md.replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').trim();
// GitHub's heading-id rule: lowercase, drop punctuation, spaces to hyphens.
export const slug = (md) => plain(md).toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
const slugger = () => {
  const seen = {};
  return (md) => {
    const s = slug(md);
    const n = seen[s] ?? 0;
    seen[s] = n + 1;
    return n ? `${s}-${n}` : s;
  };
};
// A stray tokenizer placeholder in one OpenWiki description; fix it in openwiki/ and this line can go.
const clean = (s) => s.replace(/<\|place_holder_[^|]*\|> ?-admin/g, '/platform-admin');

// Split a body into lines tagged with whether they sit inside a code fence.
const fenced = (body) => {
  let inFence = false;
  return body.split('\n').map((text) => {
    const fence = /^\s*(```|~~~)/.test(text);
    const line = { text, code: inFence || fence };
    if (fence) inFence = !inFence;
    return line;
  });
};

function parseChapter(src, n) {
  const raw = clean(readFileSync(join('openwiki', src), 'utf8'));
  const [, fm, body] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const field = (k) => fm.match(new RegExp(`^${k}: "?(.*?)"?$`, 'm'))[1];
  const title = field('title');
  const lines = fenced(body.replace(/^\s*# .*\n/, '')); // the body's own H1 is replaced below
  const sections = [{ lines: [] }]; // sections[0] is the intro before the first H2
  for (const l of lines) {
    if (!l.code && /^## /.test(l.text)) sections.push({ heading: l.text.slice(3), lines: [] });
    sections.at(-1).lines.push(l);
  }
  return { src, n, title, description: field('description'), sections };
}

// Group a chapter's sections into wiki pages, greedily, by word count.
function paginate(ch) {
  const words = (s) => s.lines.reduce((w, l) => w + l.text.split(/\s+/).filter(Boolean).length, 0);
  const pages = [];
  ch.sections.forEach((s, i) => {
    const page = pages.at(-1);
    if (!page || (i > 1 && page.words + words(s) > MAX_WORDS)) {
      const first = !page;
      const name = first ? `${pad(ch.n)} ${ch.title}` : `${pad(ch.n)}.${pad(i)} ${ch.title}`;
      pages.push({ chapter: ch, folder: first ? `${pad(ch.n)}-0000` : `${pad(ch.n)}-${pad(i)}00`, name, slug: name.replace(/ /g, '-'), sections: [], words: 0 });
    }
    pages.at(-1).sections.push({ ...s, index: i });
    pages.at(-1).words += words(s);
  });
  return pages;
}

export function build() {
  const chapters = CHAPTERS.map((src, i) => parseChapter(src, i + 1));
  const pages = chapters.flatMap(paginate);

  // Number headings and record where each original anchor now lives.
  const anchors = {}; // src -> original id -> { page, id }
  const toc = new Map(); // page -> [{ level, label, id }]
  for (const page of pages) {
    const { src, n } = page.chapter;
    const orig = (anchors[src] ??= { idOf: slugger(), map: {} });
    const next = slugger();
    const entries = [];
    for (const s of page.sections) {
      let h3 = 0;
      for (const l of s.lines) {
        const m = !l.code && l.text.match(/^(#{2,6}) (.*)$/);
        if (!m) continue;
        const [, hashes, text] = m;
        const num = hashes === '##' ? `${n}.${s.index}` : hashes === '###' ? `${n}.${s.index}.${++h3}` : '';
        const label = num ? `${num} ${text}` : text;
        const id = next(label);
        orig.map[orig.idOf(text)] = { page: page.slug, id };
        l.text = `${hashes} ${label}`;
        if (hashes.length <= 3) entries.push({ level: hashes.length, label: plain(label), id });
      }
    }
    toc.set(page, entries);
  }

  // Resolve links; anything unresolvable is reported and falls back to the page top.
  const warnings = [];
  const firstPage = (src) => pages.find((p) => p.chapter.src === src).slug;
  const resolve = (page, src, hash) => {
    const hit = anchors[src].map[hash.slice(1)];
    if (hit) return hit.page === page.slug ? `#${hit.id}` : `${hit.page}#${hit.id}`;
    warnings.push(`${page.name}: no heading for ${src}${hash}, linked to page top`);
    return firstPage(src);
  };
  const rewrite = (page, text) =>
    text
      .replace(/\]\((\/[^)\s#]*)?(#[^)\s]*)?\)/g, (all, target, hash = '') => {
        if (!target && !hash) return all;
        if (!target) return `](${resolve(page, page.chapter.src, hash)})`;
        const src = target.replace(/^\/openwiki\//, '');
        if (src !== target) {
          if (!anchors[src]) throw new Error(`unmapped wiki link ${target}`);
          return `](${hash ? resolve(page, src, hash) : firstPage(src)})`;
        }
        return `](${REPO}/blob/main${target}${hash})`;
      })
      .replace(/\]\(<\/([^>]*)>\)/g, `](<${REPO}/blob/main/$1>)`); // <…> form wraps paths with parentheses

  // Navigation shared by sidebars and footers.
  const nav = (i) => {
    const link = (p, label) => (p ? `[${label}](${p.slug})` : label);
    return `${link(pages[i - 1], '&larr; Previous')}&emsp;|&emsp;[Home](Home)&emsp;|&emsp;${link(pages[i + 1], 'Next &rarr;')}`;
  };
  const contents = (current) =>
    chapters
      .map((ch) => {
        const chPages = pages.filter((p) => p.chapter === ch);
        const items = chPages.flatMap((p) => toc.get(p).map((e) => ({ ...e, page: p })));
        const rows = items.map((e) => `${e.level === 3 ? '&emsp;&emsp;' : '&emsp;'}[${esc(e.label)}](${e.page.slug}#${e.id})<br>`);
        const open = current?.chapter === ch ? ' open' : '';
        // The blank line after </summary> lets GitHub parse the Markdown links inside <details>.
        return `<details${open}>\n<summary><a href="${chPages[0].slug}">${ch.n} ${esc(ch.title)}</a></summary>\n\n${rows.join('\n')}\n</details>`;
      })
      .join('\n\n');
  const sidebar = (i, page) => `### Wiki contents\n\n${nav(i)}\n\n${contents(page)}\n`;
  const footer = (i) =>
    `${nav(i)}\n\n<p align="center"><strong>TVI-CAMS &mdash; TESDA Compliance Manager</strong></p>\n\n` +
    `<p align="center"><a href="#idtop">Back to top</a>&emsp;|&emsp;<a href="${REPO}">Main repository</a>&emsp;|&emsp;` +
    `Mirrored from <a href="${REPO}/tree/main/openwiki"><code>openwiki/</code></a>; edit there and re-sync, changes made here are overwritten.</p>\n`;

  const files = {};
  pages.forEach((page, i) => {
    const head = page.sections[0].index === 0 ? `# ${page.chapter.n} ${page.chapter.title}\n` : '';
    const body = page.sections
      .map((s) => s.lines.map((l) => (l.code ? l.text : rewrite(page, l.text))).join('\n').trimEnd() + (s.index ? `\n\n${TOP}` : ''))
      .join('\n\n');
    const dir = page.folder;
    files[`${dir}/${page.name}.md`] = `<a name="idtop"></a>\n\n${head}\n${body.trim()}\n`;
    files[`${dir}/_Sidebar.md`] = sidebar(i, page);
    files[`${dir}/_Footer.md`] = footer(i);
  });

  files['Home.md'] =
    `<a name="idtop"></a>\n\nTVI-CAMS (TESDA Compliance Manager) repository wiki: how the system is built and where each kind of change belongs. ` +
    `Start with **[${chapters[0].n} ${chapters[0].title}](${pages[0].slug})**.\n\n## Contents\n\n` +
    chapters.map((ch) => `**[${ch.n} ${esc(ch.title)}](${firstPage(ch.src)})**: ${esc(ch.description)}`).join('\n\n') +
    `\n\n${contents()}\n\n## About this wiki\n\n` +
    `Every page is generated from [\`openwiki/\`](${REPO}/tree/main/openwiki) by [\`.github/scripts/sync-github-wiki.mjs\`](${REPO}/blob/main/.github/scripts/sync-github-wiki.mjs). ` +
    `Headings are numbered chapter.section.division, and a chapter longer than ${MAX_WORDS} words continues on a page numbered by the section it starts at (for example \`03.05\`). ` +
    `Use the sidebar to move between pages.\n\n${TOP}\n`;
  files['_Sidebar.md'] = sidebar(-1, null);
  files['_Footer.md'] = footer(-1);

  // Self-check: every internal link lands on a generated page and heading.
  const ids = { Home: new Set(['idtop', 'contents', 'about-this-wiki']) };
  for (const [page, entries] of toc) ids[page.slug] = new Set(['idtop', ...Object.values(anchors[page.chapter.src].map).filter((a) => a.page === page.slug).map((a) => a.id), ...entries.map((e) => e.id)]);
  for (const [path, text] of Object.entries(files)) {
    const own = path.endsWith('.md') && !path.split('/').pop().startsWith('_') ? (path === 'Home.md' ? 'Home' : path.split('/').pop().slice(0, -3).replace(/ /g, '-')) : null;
    for (const [, target = '', hash = ''] of text.matchAll(/(?:\]\(|href=")([^)"#\s:<]*)(#[^)"\s]*)?[)"]/g)) {
      const pageSlug = target || own;
      if (!target && !hash) continue;
      if (!pageSlug) continue; // a sidebar/footer "#idtop" resolves against whichever page shows it
      if (!ids[pageSlug]) throw new Error(`${path}: link to missing page ${target}`);
      if (hash && !ids[pageSlug].has(hash.slice(1))) throw new Error(`${path}: link to missing heading ${pageSlug}${hash}`);
    }
  }
  return { files, pages, warnings };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2];
  if (!out) throw new Error('usage: sync-github-wiki.mjs <path-to-wiki-clone>');
  const { files, pages, warnings } = build();
  for (const f of readdirSync(out)) {
    if (/^(\d{2}|[A-Z])-\d{4}$/.test(f) || f.endsWith('.md')) rmSync(join(out, f), { recursive: true });
  }
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(out, path, '..'), { recursive: true });
    writeFileSync(join(out, path), text);
  }
  warnings.forEach((w) => console.warn(`warning: ${w}`));
  console.log(`Wrote ${pages.length} pages in ${new Set(pages.map((p) => p.folder)).size} folders, plus Home, to ${out}`);
  for (const p of pages) console.log(`  ${p.folder}/${p.name}.md  (${p.words} words)`);
}
