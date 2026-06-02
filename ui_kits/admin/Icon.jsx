/* global React */
// Tabler icon — inline SVG component.
// Usage: <Icon name="folders" size={14} className="..." />
const ICONS = {
  folders:        '<path d="M9 4h3l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2"/><path d="M17 17v2a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2h2"/>',
  users:          '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>',
  user:           '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>',
  'chart-dots':   '<path d="M3 3v18h18"/><circle cx="9" cy="15" r="2"/><circle cx="14" cy="10" r="2"/><circle cx="19" cy="6" r="2"/>',
  'chart-bar':    '<rect x="3" y="12" width="6" height="8" rx="1"/><rect x="9" y="8"  width="6" height="12" rx="1"/><rect x="15" y="4" width="6" height="16" rx="1"/><path d="M4 20h14"/>',
  'file-check':   '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M9 15l2 2l4 -4"/>',
  'file-text':    '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M9 9h1"/><path d="M9 13h6"/><path d="M9 17h6"/>',
  'file-invoice': '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M9 7h1"/><path d="M9 13h6"/><path d="M13 17h2"/>',
  'file-off':     '<path d="M3 3l18 18"/><path d="M7 3h7l5 5v7m0 4a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2V7"/>',
  certificate:    '<circle cx="15" cy="15" r="3"/><path d="M13 17v5l2 -1.5l2 1.5v-5"/><path d="M10 19H5a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v7"/><path d="M6 9h12"/><path d="M6 12h3"/><path d="M6 15h2"/>',
  receipt:        '<path d="M5 21V5a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2"/><path d="M14 8h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3H10"/>',
  briefcase:      '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0 -2 -2h-4a2 2 0 0 0 -2 2v2"/>',
  calendar:       '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/>',
  clock:          '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  check:          '<path d="M5 12l5 5l10 -10"/>',
  'alert-triangle':'<path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/>',
  'alert-circle': '<circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  'info-circle':  '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/>',
  search:         '<circle cx="10" cy="10" r="7"/><path d="M21 21l-6 -6"/>',
  'search-off':   '<path d="M3 3l18 18"/><path d="M17 17a7 7 0 0 0 -9.876 -9.876m-1.764 2.342a7 7 0 0 0 9.301 9.298"/>',
  filter:         '<path d="M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227z"/>',
  download:       '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><polyline points="7 11 12 16 17 11"/><path d="M12 4v12"/>',
  send:           '<path d="M10 14l11 -11"/><path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0L10 14l-7 -3.5a.55 .55 0 0 1 0 -1L21 3"/>',
  settings:       '<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/><circle cx="12" cy="12" r="3"/>',
  refresh:        '<path d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>',
  'external-link':'<path d="M12 6H6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6"/><path d="M11 13l9 -9"/><polyline points="15 4 20 4 20 9"/>',
  'shield-check': '<path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3"/><path d="M9 12l2 2l4 -4"/>',
  'shield-off':   '<path d="M3 3l18 18"/><path d="M20.043 16.045a12 12 0 0 0 .457 -3.045m0 -4a12 12 0 0 0 -8.5 -3a12 12 0 0 0 -3 .397m-3.13 1.567a12 12 0 0 0 -2.37 1.036m0 4a12 12 0 0 0 8.5 15a12 12 0 0 0 5.130 -2.870"/>',
  presentation:   '<path d="M3 4l18 0"/><path d="M4 4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-10"/><path d="M12 16v4"/><path d="M9 20h6"/>',
  timeline:       '<path d="M4 16l6 -7l5 5l5 -6"/><circle cx="4" cy="16" r="1"/><circle cx="10" cy="9" r="1"/><circle cx="15" cy="14" r="1"/><circle cx="20" cy="8" r="1"/>',
  plus:           '<path d="M12 5v14"/><path d="M5 12h14"/>',
  x:              '<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>',
  'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
  'chevron-right':'<polyline points="9 6 15 12 9 18"/>',
  dots:           '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  bell:           '<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/>',
  help:           '<circle cx="12" cy="12" r="9"/><path d="M12 17v.01"/><path d="M12 13.5a1.5 1.5 0 0 1 1 -1.5a2.6 2.6 0 1 0 -3 -4"/>',
  play:           '<polygon points="8 5 19 12 8 19" fill="currentColor" stroke="none"/>',
};

function Icon({ name, size = 14, className = '', style = {} }) {
  const body = ICONS[name] || '';
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    className,
    style,
    dangerouslySetInnerHTML: { __html: body }
  });
}

window.Icon = Icon;
