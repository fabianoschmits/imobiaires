export const CENTER = [-29.606, -52.192];

export const MAP_PROVIDERS = {
  satellite: {
    url:
      window.__IMOBIAIRES_CONFIG__?.satelliteTileUrl ||
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      window.__IMOBIAIRES_CONFIG__?.satelliteAttribution ||
      'Tiles © Esri — Esri, Maxar, Earthstar Geographics, GIS User Community',
    maxZoom: 22,        // overzoom permitido
    maxNativeZoom: 18,  // tiles reais existem até zoom 18 na região; 19-22 faz zoom digital
  },
  street: {
    url:
      window.__IMOBIAIRES_CONFIG__?.streetTileUrl ||
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      window.__IMOBIAIRES_CONFIG__?.streetAttribution ||
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 22,        // overzoom permitido
    maxNativeZoom: 19,  // OSM tiles nativos até zoom 19
  },
};

export const DEMO_AGENCIES = [
  'Imobiliária Horizonte (demo)',
  'Imobiliária Raízes (demo)',
  'Imobiliária Vértice (demo)',
];

const SEED = [
  ['T01', 'Terreno residencial de esquina', 'Terreno', 'Bela Vista', -29.5998, -52.191, 450, 149900, 15, 30, 0, 'Venda', [160000, 165000]],
  ['T02', 'Lote amplo para construir', 'Terreno', 'Centro', -29.6075, -52.1939, 360, 185000, 12, 30, 0, 'Venda', [195000]],
  ['C03', 'Casa térrea com pátio', 'Casa', 'Centro', -29.6051, -52.1887, 150, 450000, 0, 0, 3, 'Venda', [465000, 480000]],
  ['T04', 'Terreno com excelente área', 'Terreno', 'Santa Tecla', -29.6145, -52.1875, 500, 179000, 20, 25, 0, 'Venda', []],
  ['C05', 'Casa contemporânea', 'Casa', 'Bela Vista', -29.599, -52.1968, 192, 690000, 0, 0, 3, 'Venda', [710000]],
  ['A06', 'Apartamento bem localizado', 'Apartamento', 'Centro', -29.6068, -52.1907, 82, 315000, 0, 0, 2, 'Venda', []],
  ['T07', 'Lote residencial', 'Terreno', 'Santa Tecla', -29.6128, -52.199, 300, 119000, 10, 30, 0, 'Venda', []],
  ['C08', 'Casa para locação', 'Casa', 'Centro', -29.6101, -52.1898, 110, 2200, 0, 0, 2, 'Aluguel', []],
  ['T09', 'Terreno de frente ampla', 'Terreno', 'Bela Vista', -29.6015, -52.1878, 600, 230000, 20, 30, 0, 'Venda', [245000]],
  ['M10', 'Área comercial', 'Comercial', 'Centro', -29.6042, -52.195, 260, 580000, 0, 0, 0, 'Venda', []],
  ['T11', 'Lote para seu projeto', 'Terreno', 'Santa Tecla', -29.6162, -52.193, 420, 135000, 14, 30, 0, 'Venda', [145000]],
  ['C12', 'Casa com três dormitórios', 'Casa', 'Centro', -29.609, -52.196, 138, 399000, 0, 0, 3, 'Venda', []],
];

function rect(lat, lng, f, d) {
  const a = d / 222640;
  const b = f / (222640 * Math.cos((lat * Math.PI) / 180));
  return [
    [lat - a, lng - b],
    [lat - a, lng + b],
    [lat + a, lng + b],
    [lat + a, lng - b],
  ];
}

export const BASE_PROPERTIES = SEED.map((a, i) => ({
  id: a[0],
  title: a[1],
  type: a[2],
  district: a[3],
  lat: a[4],
  lng: a[5],
  area: a[6],
  front: a[8],
  depth: a[9],
  beds: a[10],
  deal: a[11],
  description:
    a[2] === 'Terreno'
      ? 'Exemplo de terreno residencial. Dimensões informadas para demonstração; não correspondem a cadastro real.'
      : 'Exemplo de anúncio imobiliário com características ilustrativas.',
  points: a[2] === 'Terreno' ? rect(a[4], a[5], a[8], a[9]) : [],
  offers: [a[7], ...a[12]].map((price, j) => ({
    agency: DEMO_AGENCIES[(i + j) % 3],
    price,
  })),
  mine: false,
}));

