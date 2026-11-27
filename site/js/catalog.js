import { BASE_PROPERTIES } from './config.js';

export const money = (n) =>
  Number(n).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

export const fmt = (n) =>
  Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

/**
 * Convert a Supabase `properties` row (with nested offers + agencies) into the
 * local property shape expected by catalog/map/filter functions.
 */
export function fromSupabaseRow(row) {
  const offers = (row.offers || [])
    .map((o) => ({
      agency: o.agencies?.name || 'Imobiliária',
      price: o.price || 0,
      phone: o.agencies?.phone || '',
      logo_url: o.agencies?.logo_url || '',
      creci: o.agencies?.creci || '',
      slug: o.agencies?.slug || '',
      agency_id: o.agency_id,
    }))
    .sort((a, b) => a.price - b.price);

  return {
    id: row.id,
    title: row.title || '',
    type: row.type || 'Terreno',
    district: row.district || '',
    lat: row.lat || 0,
    lng: row.lng || 0,
    area: row.area || 0,
    front: row.front || 0,
    depth: row.depth || 0,
    beds: row.beds || 0,
    deal: row.deal || 'Venda',
    description: row.description || '',
    points: Array.isArray(row.points)
      ? row.points
      : row.points
        ? JSON.parse(row.points)
        : [],
    photo: row.photo_url || null,
    photo_url: row.photo_url || null,
    offers: offers.length > 0 ? offers : [{ agency: '—', price: 0 }],
    mine: false,
    is_demo: row.is_demo || false,
    created_by: row.created_by || null,
  };
}

export function getAllProperties(mine, extra) {
  return [...BASE_PROPERTIES, ...mine].map((p) => ({
    ...p,
    offers: [...p.offers, ...extra.filter((o) => o.id === p.id)].sort(
      (a, b) => a.price - b.price
    ),
  }));
}

export const getMinPrice = (p) => p.offers[0].price;

export const getCompactPrice = (p) =>
  p.deal === 'Aluguel'
    ? money(getMinPrice(p)) + '/mês'
    : getMinPrice(p) >= 1000000
      ? 'R$ ' + fmt(getMinPrice(p) / 1000000) + ' mi'
      : 'R$ ' + fmt(getMinPrice(p) / 1000) + ' mil';

export function filterProperties(properties, { search, mode, fav, type, filters }) {
  const s = search
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return properties.filter((p) => {
    const text = (
      p.title +
      ' ' +
      p.district +
      ' ' +
      p.id +
      ' ' +
      p.type +
      ' ' +
      p.offers.map((o) => o.agency).join(' ')
    )
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return (
      (!s || text.includes(s)) &&
      (mode !== 'saved' || fav.has(p.id)) &&
      (type === 'Todos' || p.type === type) &&
      (!filters.minPrice || getMinPrice(p) >= filters.minPrice) &&
      (!filters.maxPrice || getMinPrice(p) <= filters.maxPrice) &&
      (!filters.minArea || p.area >= filters.minArea) &&
      (!filters.maxArea || p.area <= filters.maxArea) &&
      (!filters.bairro || p.district === filters.bairro) &&
      (!filters.negocio || p.deal === filters.negocio) &&
      (!filters.multiOffer || p.offers.length > 1)
    );
  });
}

export function sortAndBoundProperties(filtered, { map, withinBounds, sort }) {
  const bounded = filtered.filter(
    (p) => !map || !withinBounds || map.getBounds().contains([p.lat, p.lng])
  );
  return bounded.sort((x, y) =>
    sort === 'low'
      ? getMinPrice(x) - getMinPrice(y)
      : sort === 'high'
        ? getMinPrice(y) - getMinPrice(x)
        : sort === 'sqm'
          ? getMinPrice(x) / x.area - getMinPrice(y) / y.area
          : sort === 'area'
            ? y.area - x.area
            : 0
  );
}

export function renderIllustration(p) {
  if (p.photo_url) {
    return '<img src="' + esc(p.photo_url) + '" alt="Foto do imóvel">';
  }
  if (p.photo && /^data:image\/(jpeg|png|webp);base64,/.test(p.photo)) {
    return '<img src="' + esc(p.photo) + '" alt="Foto enviada na demonstração">';
  }
  const land = p.type === 'Terreno';
  return (
    '<div class="illustration"><svg viewBox="0 0 420 150" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ilustração de imóvel"><defs><linearGradient id="sky' +
    esc(p.id) +
    '" x2="0" y2="1"><stop stop-color="#d9e9e9"/><stop offset="1" stop-color="#edf3e8"/></linearGradient></defs><rect width="420" height="150" fill="url(#sky' +
    esc(p.id) +
    ')"/><path d="M0 77 75 45 140 76 215 40 310 72 420 42V150H0" fill="#8aa78f"/><path d="M0 96 115 70 214 100 320 69 420 97V150H0" fill="#6f9475"/><path d="M0 123 420 115V150H0" fill="#b8c4ae"/>' +
    (land
      ? '<path d="m126 83 130-8 64 44-180 6Z" fill="#a1cda0" stroke="#edf7db" stroke-width="2" stroke-dasharray="6 4"/><path d="m126 83 130-8 64 44-180 6Z" fill="none" stroke="#26765a" stroke-width="2"/><text x="218" y="108" text-anchor="middle" fill="#174c40" font-size="13" font-weight="bold">' +
        fmt(p.area) +
        ' m²</text>'
      : '<path d="M123 75 210 33 302 75V122H123Z" fill="#ece9df"/><path d="m108 77 101-51 108 51-11 9-97-46-92 46Z" fill="#405e52"/><rect x="145" y="84" width="40" height="30" fill="#789c9e"/><rect x="235" y="83" width="43" height="39" fill="#597367"/><path d="M195 78h24v44h-24" fill="#9f8065"/>') +
    '<circle cx="63" cy="90" r="18" fill="#527b61"/><path d="M63 99v24" stroke="#52665a" stroke-width="4"/><circle cx="356" cy="86" r="21" fill="#547a60"/><path d="M356 100v23" stroke="#52665a" stroke-width="4"/></svg></div>'
  );
}
