// ================================================================
// TCS Design System — Figma Token Sync Plugin
// Training Compliance System · TESDA TWSP & CFSP Dashboard · v1.0
//
// HOW TO RUN:
//   1. Open your Figma file
//   2. Menu → Plugins → Development → Open Console
//   3. Paste this entire script and press Enter
// ================================================================

(async () => {

  // ── 1. Pre-load every font variant we need ────────────────────
  await Promise.all([
    figma.loadFontAsync({ family: 'IBM Plex Sans', style: 'Light' }),
    figma.loadFontAsync({ family: 'IBM Plex Sans', style: 'Regular' }),
    figma.loadFontAsync({ family: 'IBM Plex Sans', style: 'Italic' }),
    figma.loadFontAsync({ family: 'IBM Plex Sans', style: 'Medium' }),
    figma.loadFontAsync({ family: 'IBM Plex Sans', style: 'SemiBold' }),
    figma.loadFontAsync({ family: 'IBM Plex Mono', style: 'Light' }),
    figma.loadFontAsync({ family: 'IBM Plex Mono', style: 'Regular' }),
    figma.loadFontAsync({ family: 'IBM Plex Mono', style: 'Medium' }),
    figma.loadFontAsync({ family: 'IBM Plex Mono', style: 'SemiBold' }),
  ]);

  let created = 0;
  let updated = 0;

  // ── Helpers ───────────────────────────────────────────────────
  function hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16) / 255,
      g: parseInt(hex.slice(3, 5), 16) / 255,
      b: parseInt(hex.slice(5, 7), 16) / 255,
    };
  }

  function setPaintStyle(name, hex, description = '') {
    let style = figma.getLocalPaintStyles().find(s => s.name === name);
    if (!style) { style = figma.createPaintStyle(); style.name = name; created++; }
    else { updated++; }
    style.description = description;
    style.paints = [{ type: 'SOLID', color: hexToRgb(hex), opacity: 1 }];
  }

  function setTextStyle(name, opts, description = '') {
    let style = figma.getLocalTextStyles().find(s => s.name === name);
    if (!style) { style = figma.createTextStyle(); style.name = name; created++; }
    else { updated++; }
    style.description   = description;
    style.fontName      = { family: opts.family || 'IBM Plex Sans', style: opts.style || 'Regular' };
    style.fontSize      = opts.fontSize;
    style.lineHeight    = { unit: 'PIXELS', value: opts.lineHeight };
    style.letterSpacing = opts.letterSpacing
      ? { unit: 'PERCENT', value: opts.letterSpacing }
      : { unit: 'PERCENT', value: 0 };
    style.textCase      = opts.textCase || 'ORIGINAL';
  }


  // ================================================================
  //  COLOR STYLES
  // ================================================================

  // Neutrals — backgrounds
  setPaintStyle('Background/Page',           '#F5F4F0', 'Page background — warm off-white');
  setPaintStyle('Background/Surface',        '#FFFFFF', 'Cards, panels, modals, dropdowns');
  setPaintStyle('Background/Surface Alt',    '#EEECEA', 'Alt table rows, input backgrounds, sidebar');
  setPaintStyle('Background/Surface Raised', '#FAF9F6', 'Card hover state');

  // Borders
  setPaintStyle('Border/Default', '#D8D6D0', 'Default borders, dividers, input edges');
  setPaintStyle('Border/Strong',  '#B0AEA8', 'Section dividers, active input borders');
  setPaintStyle('Border/Faint',   '#E8E6E2', 'Subtle separators, card internal dividers');

  // Text
  setPaintStyle('Text/Primary',   '#18180F', 'Headlines, card titles, primary labels');
  setPaintStyle('Text/Secondary', '#5A5950', 'Body text, descriptions, form labels');
  setPaintStyle('Text/Muted',     '#97968E', 'Placeholders, metadata, timestamps');
  setPaintStyle('Text/Disabled',  '#C4C2BC', 'Disabled inputs, inactive navigation');
  setPaintStyle('Text/Inverse',   '#F5F4F0', 'Text on dark backgrounds');

  // Blue — TWSP / Informational
  setPaintStyle('Status/Blue/DEFAULT', '#185FA5', 'TWSP badge, informational icons, active tab');
  setPaintStyle('Status/Blue/Light',   '#E6F1FB', 'TWSP badge background, info callout bg');
  setPaintStyle('Status/Blue/Dark',    '#0C447C', 'TWSP badge text, info callout text');
  setPaintStyle('Status/Blue/Border',  '#B5D0EE', 'Info callout border');
  setPaintStyle('Status/Blue/Hover',   '#D4E8F8', 'TWSP badge hover');

  // Teal — CFSP
  setPaintStyle('Status/Teal/DEFAULT', '#0F6E56', 'CFSP program badge');
  setPaintStyle('Status/Teal/Light',   '#E1F5EE', 'CFSP badge background');
  setPaintStyle('Status/Teal/Dark',    '#085041', 'CFSP badge text');
  setPaintStyle('Status/Teal/Border',  '#9FE1CB', 'CFSP badge border');
  setPaintStyle('Status/Teal/Hover',   '#C8EFE3', 'CFSP badge hover');

  // Green — Completed / Approved / On Track
  setPaintStyle('Status/Green/DEFAULT', '#3B6D11', 'Completed, BSRS Approved, on-track progress');
  setPaintStyle('Status/Green/Light',   '#EAF3DE', 'Completed badge background');
  setPaintStyle('Status/Green/Dark',    '#27500A', 'Completed badge text');
  setPaintStyle('Status/Green/Border',  '#B5D98A', 'Success callout border');
  setPaintStyle('Status/Green/Hover',   '#D5EBB8', 'Completed badge hover');

  // Amber — Warning / 7–21 Days / Pending
  setPaintStyle('Status/Amber/DEFAULT', '#C7600F', 'Warning deadlines, mid-range urgency');
  setPaintStyle('Status/Amber/Light',   '#FCE6CC', 'Warning badge background');
  setPaintStyle('Status/Amber/Dark',    '#7A3806', 'Warning badge text');
  setPaintStyle('Status/Amber/Border',  '#F2B673', 'Warning callout border');
  setPaintStyle('Status/Amber/Hover',   '#F8D4A8', 'Warning badge hover');

  // Red — Critical / <7 Days / Errors
  setPaintStyle('Status/Red/DEFAULT', '#C81F1F', 'Critical deadline badges, error states');
  setPaintStyle('Status/Red/Light',   '#FCE4E4', 'Critical badge background');
  setPaintStyle('Status/Red/Dark',    '#8B1414', 'Critical badge text');
  setPaintStyle('Status/Red/Border',  '#ED9999', 'Error callout border');
  setPaintStyle('Status/Red/Hover',   '#F6C2C2', 'Critical badge hover');

  // Purple — NC Level Indicators
  setPaintStyle('Status/Purple/DEFAULT', '#534AB7', 'NC II badges');
  setPaintStyle('Status/Purple/Light',   '#EEEDFE', 'NC II badge background');
  setPaintStyle('Status/Purple/Dark',    '#3C3489', 'NC II badge text');


  // ================================================================
  //  TEXT STYLES
  // ================================================================

  // IBM Plex Sans — UI & body
  setTextStyle('Type/Page Title',   { fontSize: 20, lineHeight: 26, style: 'SemiBold' },                                     'Page-level headings — text-xl · 600');
  setTextStyle('Type/Section',      { fontSize: 16, lineHeight: 22, style: 'SemiBold' },                                     'Section headings — text-lg · 600');
  setTextStyle('Type/Card Title',   { fontSize: 14, lineHeight: 20, style: 'Medium' },                                       'Card titles — text-md · 500');
  setTextStyle('Type/Body',         { fontSize: 13, lineHeight: 19, style: 'Regular' },                                      'Primary body text — text-base · 400');
  setTextStyle('Type/Label',        { fontSize: 11, lineHeight: 15, style: 'Medium',   letterSpacing: 4, textCase: 'UPPER' },'Field labels, table headers — text-xs · 500 · uppercase');
  setTextStyle('Type/Cell',         { fontSize: 12, lineHeight: 17, style: 'Regular' },                                      'Table cell content — text-sm · 400');
  setTextStyle('Type/Remark',       { fontSize: 12, lineHeight: 17, style: 'Italic' },                                       'Remarks, notes — text-sm · italic');
  setTextStyle('Type/Hero',         { fontSize: 32, lineHeight: 38, style: 'Light' },                                        'Cover / print display only — text-3xl · 300');

  // IBM Plex Mono — data & machine-readable
  setTextStyle('Type/Metric Value', { fontSize: 24, lineHeight: 30, family: 'IBM Plex Mono', style: 'SemiBold' },            'Metric card values — text-2xl · 600 · mono');
  setTextStyle('Type/Badge',        { fontSize: 11, lineHeight: 15, family: 'IBM Plex Mono', style: 'Medium',  letterSpacing: 4 }, 'Badge labels — text-xs · 500 · mono');
  setTextStyle('Type/Mono',         { fontSize: 12, lineHeight: 17, family: 'IBM Plex Mono', style: 'Regular' },             'IDs, dates, codes, percentages — text-sm · mono');
  setTextStyle('Type/Metric Label', { fontSize: 11, lineHeight: 15, family: 'IBM Plex Mono', style: 'Regular', letterSpacing: 4, textCase: 'UPPER' }, 'Metric card labels — text-xs · uppercase · mono');


  // ── Done ─────────────────────────────────────────────────────
  const msg = `TCS Design System synced — ${created} created, ${updated} updated.`;
  figma.notify(`✅ ${msg}`, { timeout: 6000 });
  console.log(msg);

})();
