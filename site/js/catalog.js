import { BASE_PROPERTIES } from './config.js';
import { icon } from './icons.js';

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
    photo: row.photo_url || (Array.isArray(row.photos) && row.photos[0]) || null,
    photo_url: row.photo_url || (Array.isArray(row.photos) && row.photos[0]) || null,
    photos: Array.isArray(row.photos) && row.photos.length
      ? row.photos
      : (row.photo_url ? [row.photo_url] : []),
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

export function getShortLabel(p) {
  const deal = p.deal === 'Aluguel' ? 'Alug · ' : '';
  const typeMap = {
    Terreno: 'Terr',
    Casa: 'Casa',
    Apartamento: 'Apto',
    Comercial: 'Com',
  };
  const t = typeMap[p.type] || p.type;
  const detail = (p.type === 'Casa' || p.type === 'Apartamento') && p.beds
    ? `${p.beds}q`
    : `${fmt(p.area)}m²`;
  return `${deal}${t} ${detail}`;
}

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
  const cover = p.photo_url || (Array.isArray(p.photos) && p.photos[0]) || '';
  if (cover) {
    return (
      '<img src="' +
      esc(cover) +
      '" alt="' +
      esc(p.title || 'Foto do imóvel') +
      '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.hidden=false">' +
      '<div class="illustration" hidden>' +
      icon(p.type === 'Terreno' ? 'land' : p.type === 'Apartamento' ? 'apartment' : p.type === 'Comercial' ? 'commercial' : 'house') +
      '<span>Foto não cadastrada</span></div>'
    );
  }
  if (p.photo && /^data:image\/(jpeg|png|webp);base64,/.test(p.photo)) {
    return '<img src="' + esc(p.photo) + '" alt="Foto do imóvel" loading="lazy">';
  }
  const typeIcon =
    p.type === 'Terreno'
      ? 'land'
      : p.type === 'Apartamento'
        ? 'apartment'
        : p.type === 'Comercial'
          ? 'commercial'
          : 'house';
  return (
    '<div class="illustration">' +
    icon(typeIcon) +
    '<span>Foto não cadastrada</span></div>'
  );
}
