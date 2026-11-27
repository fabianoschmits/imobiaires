/**
 * Centralized SVG icon library for ImobiAires
 * viewBox 0 0 24 24, stroke-width 1.65, currentColor, rounded caps/joins
 */

const BASE = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

export const ICONS = {
  // Property types
  land: `<svg ${BASE}><path d="M3 17l5-9 6 4 7-6"/><path d="M3 20h18"/><path d="M8 8v12"/><path d="M14 12v8"/></svg>`,
  house: `<svg ${BASE}><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 20v-6h5v6"/></svg>`,
  apartment: `<svg ${BASE}><rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2"/><path d="M10 21v-3h4v3"/></svg>`,
  commercial: `<svg ${BASE}><path d="M3 20h18"/><path d="M4 20V8l8-4 8 4v12"/><path d="M9 12h2m2 0h2M9 16h2m2 0h2"/></svg>`,

  // Navigation & actions
  search: `<svg ${BASE}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`,
  filter: `<svg ${BASE}><path d="M4 6h16M7 12h10M10 18h4"/></svg>`,
  heart: `<svg ${BASE}><path d="M12 20.5s-7.5-4.8-9-9.5C1.8 7.2 4.5 4 8 4c2 0 3.4 1.1 4 2.3C12.6 5.1 14 4 16 4c3.5 0 6.2 3.2 5 7-1.5 4.7-9 9.5-9 9.5z"/></svg>`,
  heartFilled: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.8-9-9.5C1.8 7.2 4.5 4 8 4c2 0 3.4 1.1 4 2.3C12.6 5.1 14 4 16 4c3.5 0 6.2 3.2 5 7-1.5 4.7-9 9.5-9 9.5z"/></svg>`,
  compare: `<svg ${BASE}><path d="M7 17V7m0 0L4 10m3-3l3 3"/><path d="M17 7v10m0 0l-3-3m3 3l3-3"/></svg>`,
  pin: `<svg ${BASE}><path d="M12 21s-6-5.7-6-10.5a6 6 0 1 1 12 0C18 15.3 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/></svg>`,
  satellite: `<svg ${BASE}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>`,
  street: `<svg ${BASE}><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"/><path d="M9 4v14M15 6v14"/></svg>`,
  center: `<svg ${BASE}><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/><circle cx="12" cy="12" r="8"/></svg>`,
  share: `<svg ${BASE}><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.3 10.8l7.4-4.6M8.3 13.2l7.4 4.6"/></svg>`,
  edit: `<svg ${BASE}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`,
  trash: `<svg ${BASE}><path d="M4 7h16M10 11v6M14 11v6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/></svg>`,
  camera: `<svg ${BASE}><path d="M4 8h3l2-2.5h6L17 8h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="13.5" r="3.2"/></svg>`,
  gallery: `<svg ${BASE}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-4 4-2.5-2.5L3 19"/></svg>`,
  eye: `<svg ${BASE}><path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>`,
  eyeOff: `<svg ${BASE}><path d="M3 3l18 18"/><path d="M10.6 10.6a2.8 2.8 0 0 0 3.8 3.8"/><path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6.2 0 10 7 10 7a16.8 16.8 0 0 1-3.2 4.2M6.6 6.6A16.5 16.5 0 0 0 2 12s3.8 7 10 7c1.6 0 3.1-.4 4.4-1"/></svg>`,
  plus: `<svg ${BASE}><path d="M12 5v14M5 12h14"/></svg>`,
  check: `<svg ${BASE}><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  close: `<svg ${BASE}><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  back: `<svg ${BASE}><path d="M19 12H5m0 0l6-6m-6 6l6 6"/></svg>`,
  arrowRight: `<svg ${BASE}><path d="M5 12h14m0 0l-6-6m6 6l-6 6"/></svg>`,
  arrowUpRight: `<svg ${BASE}><path d="M7 17L17 7M9 7h8v8"/></svg>`,
  chevronLeft: `<svg ${BASE}><path d="M15 6l-6 6 6 6"/></svg>`,
  chevronRight: `<svg ${BASE}><path d="M9 6l6 6-6 6"/></svg>`,
  list: `<svg ${BASE}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
  map: `<svg ${BASE}><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"/><path d="M9 4v14M15 6v14"/></svg>`,
  whatsapp: `<svg ${BASE}><path d="M20 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20l1.1-4.3A8.5 8.5 0 1 1 20 11.5z"/><path d="M9.5 9.2c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.6 1.4c.1.3 0 .5-.2.7l-.4.4c.6 1 1.4 1.8 2.4 2.4l.4-.4c.2-.2.4-.3.7-.2l1.4.6c.3.1.4.3.4.5v.5c0 .3 0 .5-.4.7-.6.3-1.7.5-3.3-.2-1.7-.7-3.4-2.4-4.1-4.1-.7-1.6-.5-2.7-.2-3.3z"/></svg>`,
  agency: `<svg ${BASE}><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/></svg>`,
  area: `<svg ${BASE}><rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9h16M9 4v16"/></svg>`,
  undo: `<svg ${BASE}><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>`,
  shield: `<svg ${BASE}><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"/></svg>`,
};

export function icon(name, cls = 'ico') {
  const svg = ICONS[name] || '';
  if (!svg) return '';
  return svg.replace('<svg ', `<svg class="${cls}" `);
}

