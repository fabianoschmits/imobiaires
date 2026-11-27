import { readStorage, writeStorage } from './storage.js';
import {
  money,
  fmt,
  esc,
  getAllProperties,
  getMinPrice,
  filterProperties,
  sortAndBoundProperties,
  renderIllustration,
} from './catalog.js';
import { createMapController } from './map.js';

const $ = (s) => document.getElementById(s);
const q = (s, p = document) => p.querySelector(s);
const qa = (s, p = document) => [...p.querySelectorAll(s)];

let mine = readStorage('mine', []);
let extra = readStorage('offers', []);
let fav = new Set(readStorage('fav', []));
const comp = new Set();

let type = 'Todos';
let mode = 'all';
let active = null;
let filters = {};
let draftLocation = null;
let photoData = '';
let contactMessage = '';
let toastTimer;

const all = () => getAllProperties(mine, extra);

function toast(t) {
  $('toast').textContent = t;
  $('toast').style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').style.display = 'none'), 3000);
}

function openDialog(id) {
  const d = $(id);
  if (!d.open) d.showModal();
}

function closeDialog(id) {
  $(id).close();
}

function isMobile() {
  return innerWidth <= 760;
}

function setPanel(v) {
  $('panel').classList.toggle('open', v);
  $('mobileToggle').textContent = v ? '⌖ Mapa' : '☰ Lista';
}

function showDetailPanel() {
  $('panel').classList.add('detailopen');
  setPanel(true);
}

function hideDetail() {
  active = null;
  $('detail').hidden = true;
  $('cards').hidden = false;
  q('.panelhead').hidden = false;
  $('panel').classList.remove('detailopen');
  render();
}

const mapCtrl = createMapController({
  onRender: () => render(),
  onSelect: (id, fly) => select(id, fly),
  onMapError: (show) => {
    $('mapError').hidden = !show;
  },
});

function getFiltered() {
  return filterProperties(all(), {
    search: $('search').value,
    mode,
    fav,
    type,
    filters,
  });
}

function render() {
  const filtered = getFiltered();
  const list = sortAndBoundProperties(filtered, {
    map: mapCtrl.getMap(),
    withinBounds: $('within').checked,
    sort: $('sort').value,
  });

  $('count').textContent = list.length + ' ' + (list.length === 1 ? 'imóvel' : 'imóveis');
  $('savedCount').textContent = fav.size ? '(' + fav.size + ')' : '';
  $('compareCount').textContent = comp.size ? '(' + comp.size + ')' : '';
  $('dockText').textContent = comp.size + ' de 3 selecionados';
  $('compareDock').hidden = !comp.size;
  $('openCompare').disabled = comp.size < 2;

  $('cards').innerHTML = list.length
    ? list
        .map(
          (p) =>
            '<article class="card ' +
            (active === p.id ? 'selected' : '') +
            '"><div class="cardphoto" data-open="' +
            p.id +
            '" role="button" tabindex="0" aria-label="Ver ' +
            esc(p.title) +
            '">' +
            renderIllustration(p) +
            '<span class="tag">' +
            esc(p.type) +
            ' · ' +
            esc(p.deal) +
            '</span><button class="heart ' +
            (fav.has(p.id) ? 'on' : '') +
            '" data-fav="' +
            p.id +
            '" aria-label="Salvar imóvel">' +
            (fav.has(p.id) ? '♥' : '♡') +
            '</button><span class="photoLabel">' +
            (p.photo ? 'Foto enviada' : 'Ilustração') +
            '</span></div><div class="cardbody"><div class="price">' +
            money(getMinPrice(p)) +
            (p.deal === 'Aluguel' ? '<small style="font-size:12px">/mês</small>' : '') +
            '</div><h3 data-open="' +
            p.id +
            '" tabindex="0" role="button">' +
            esc(p.title) +
            '</h3><div class="loc">⌖ ' +
            esc(p.district) +
            ' · Venâncio Aires</div><div class="facts"><span>▱ ' +
            fmt(p.area) +
            ' m²</span>' +
            (p.front ? '<span>' + fmt(p.front) + ' × ' + fmt(p.depth) + ' m</span>' : '') +
            (p.beds ? '<span>' + p.beds + ' quartos</span>' : '') +
            '<span>' +
            money(getMinPrice(p) / p.area) +
            '/m²</span></div><div class="cardbottom"><span class="offers">' +
            p.offers.length +
            ' ' +
            (p.offers.length === 1 ? 'oferta' : 'ofertas') +
            ' · ' +
            (p.mine ? 'Seu anúncio' : 'Demo') +
            '</span><button class="comparebtn ' +
            (comp.has(p.id) ? 'on' : '') +
            '" data-comp="' +
            p.id +
            '">' +
            (comp.has(p.id) ? '✓ Comparando' : '＋ Comparar') +
            '</button></div></div></article>'
        )
        .join('')
    : '<div class="empty"><strong>Nenhum imóvel encontrado</strong><p>Experimente limpar os filtros ou ampliar a área do mapa.</p><button class="secondary" id="emptyReset">Limpar busca</button></div>';

  mapCtrl.renderMarkers(filtered, active);
}

function select(id, fly = true) {
  const p = all().find((x) => x.id === id);
  if (!p) return;
  active = id;
  if (fly) mapCtrl.flyTo(p.lat, p.lng);
  q('.panelhead').hidden = true;
  $('cards').hidden = true;
  $('detail').hidden = false;
  $('detail').innerHTML =
    '<div class="detailbody"><button class="back" id="backList">← Voltar aos resultados</button><div class="heroimg">' +
    renderIllustration(p) +
    '<span class="tag">' +
    esc(p.type) +
    ' · ' +
    esc(p.deal) +
    '</span><span class="photoLabel">Imagem demonstrativa</span></div><div class="eyebrow" style="margin-top:14px">REFERÊNCIA ' +
    esc(p.id) +
    ' · DEMONSTRAÇÃO</div><h2 class="detailtitle">' +
    esc(p.title) +
    '</h2><div class="loc">⌖ ' +
    esc(p.district) +
    ' · Venâncio Aires, RS</div><div style="margin-top:12px" class="muted">' +
    (p.offers.length > 1 ? 'A partir de' : 'Preço anunciado') +
    '</div><div class="price detailprice">' +
    money(getMinPrice(p)) +
    (p.deal === 'Aluguel' ? '/mês' : '') +
    '</div><div class="statstrip"><div><small>Área informada</small><strong>' +
    fmt(p.area) +
    ' m²</strong></div><div><small>Valor por m²</small><strong>' +
    money(getMinPrice(p) / p.area) +
    '</strong></div><div><small>' +
    (p.front ? 'Dimensões' : 'Ofertas') +
    '</small><strong>' +
    (p.front ? fmt(p.front) + ' × ' + fmt(p.depth) + ' m' : p.offers.length) +
    '</strong></div></div><div class="detailactions"><button class="secondary" data-fav="' +
    p.id +
    '">' +
    (fav.has(p.id) ? '♥ Salvo' : '♡ Salvar') +
    '</button><button class="secondary" data-comp="' +
    p.id +
    '">' +
    (comp.has(p.id) ? '✓ Comparando' : '＋ Comparar') +
    '</button><button class="secondary" id="shareProp">↗ Compartilhar</button></div><h3>Sobre o imóvel</h3><p>' +
    esc(p.description) +
    '</p><h3>Compare as ' +
    p.offers.length +
    ' ofertas</h3>' +
    p.offers
      .map(
        (o, i) =>
          '<div class="offerrow"><div><small>' +
          (i === 0 ? 'MENOR PREÇO' : 'OFERTA ' + (i + 1)) +
          '</small><strong>' +
          esc(o.agency) +
          '</strong><strong style="color:#17634f">' +
          money(o.price) +
          '</strong></div><button class="primary" data-contact="' +
          i +
          '">Contato ↗</button></div>'
      )
      .join('') +
    (p.offers.length > 1
      ? '<p class="muted">Diferença entre ofertas: <strong>' +
        money(p.offers.at(-1).price - getMinPrice(p)) +
        '</strong></p>'
      : '') +
    '<button class="secondary" id="offerHere">＋ Adicionar oferta neste imóvel</button><p class="muted" style="margin-top:15px">Endereço, medidas e limites de exemplo não são cadastrais. Anúncio fictício.</p></div>';
  showDetailPanel();
  $('panel').scrollTop = 0;
  render();
}

function refreshDetail() {
  if (active) select(active, false);
  else render();
}

function toggleFav(id) {
  const next = new Set(fav);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  if (writeStorage('fav', [...next], toast)) {
    fav = next;
    toast(fav.has(id) ? 'Imóvel salvo' : 'Removido dos salvos');
    refreshDetail();
  }
}

function toggleComp(id) {
  if (comp.has(id)) comp.delete(id);
  else if (comp.size >= 3) {
    toast('Selecione até 3 imóveis');
    return;
  } else comp.add(id);
  refreshDetail();
}

function resetAll() {
  filters = {};
  $('filterForm').reset();
  $('filterCount').textContent = '';
  $('search').value = '';
  type = 'Todos';
  qa('[data-type]').forEach((b) => b.classList.toggle('active', b.dataset.type === type));
  hideDetail();
}

function switchMode(v) {
  mode = v;
  $('explore').classList.toggle('active', v === 'all');
  $('saved').classList.toggle('active', v === 'saved');
  $('heading').textContent =
    v === 'saved' ? 'Seus imóveis salvos.' : 'Encontre seu próximo endereço.';
  $('subheading').textContent =
    v === 'saved'
      ? 'Volte às suas oportunidades favoritas.'
      : 'Explore o mapa e compare as melhores oportunidades.';
  if (v === 'saved') $('within').checked = false;
  hideDetail();
  setPanel(true);
}

function compare() {
  const a = all().filter((p) => comp.has(p.id));
  if (a.length < 2) {
    toast('Selecione pelo menos 2 imóveis para comparar');
    return;
  }
  const rows = [
    ['Preço', (p) => money(getMinPrice(p)) + (p.deal === 'Aluguel' ? '/mês' : '')],
    ['Tipo', (p) => p.type],
    ['Negociação', (p) => p.deal],
    ['Bairro', (p) => p.district],
    ['Área', (p) => fmt(p.area) + ' m²'],
    ['Preço por m²', (p) => money(getMinPrice(p) / p.area)],
    ['Dimensões', (p) => (p.front ? fmt(p.front) + ' × ' + fmt(p.depth) + ' m' : 'Não informado')],
    ['Quartos', (p) => p.beds || '—'],
    ['Ofertas', (p) => p.offers.length],
    ['Menor oferta', (p) => p.offers[0].agency],
  ];
  $('compareTable').innerHTML =
    '<div class="tablewrap"><table><thead><tr><th>Característica</th>' +
    a.map((p) => '<th>' + esc(p.title) + '</th>').join('') +
    '</tr></thead><tbody>' +
    rows
      .map(
        ([n, fn]) =>
          '<tr><th>' +
          n +
          '</th>' +
          a.map((p) => '<td>' + esc(fn(p)) + '</td>').join('') +
          '</tr>'
      )
      .join('') +
    '</tbody></table></div><p class="muted">Valores demonstrativos. Venda e aluguel devem ser avaliados separadamente.</p>';
  openDialog('compareDialog');
}

function populateDistrict() {
  const v = $('bairro').value;
  $('bairro').innerHTML =
    '<option value="">Todos</option>' +
    [...new Set(all().map((p) => p.district))]
      .sort()
      .map((x) => '<option>' + esc(x) + '</option>')
      .join('');
  $('bairro').value = v;
}

function openAgency() {
  $('mineCount').textContent = mine.length;
  $('offerCount').textContent = extra.length;
  $('mineList').innerHTML = mine.length
    ? mine
        .map(
          (p) =>
            '<div class="mineRow"><div><strong>' +
            esc(p.title) +
            '</strong><br><span class="muted">' +
            esc(p.district) +
            ' · ' +
            money(p.offers[0].price) +
            '</span></div><button class="secondary" data-delete="' +
            p.id +
            '">Excluir</button></div>'
        )
        .join('')
    : '<p class="muted">Nenhum imóvel cadastrado por você ainda.</p>';
  openDialog('agencyDialog');
}

function openOffer(id) {
  $('offerProperty').innerHTML = all()
    .map((p) => '<option value="' + p.id + '">' + esc(p.id + ' — ' + p.title) + '</option>')
    .join('');
  $('offerForm').reset();
  if (id) $('offerProperty').value = id;
  openDialog('offerDialog');
}

function newProp() {
  $('propertyForm').reset();
  photoData = '';
  draftLocation = null;
  $('locationStatus').textContent = 'Localização pendente';
  openDialog('propertyDialog');
}

async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
    toast('Copiado!');
  } catch {
    toast('Não foi possível copiar neste navegador.');
  }
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('button,[data-open]');
  if (!b) return;
  if (b.dataset.close) {
    closeDialog(b.dataset.close);
    return;
  }
  if (b.dataset.fav) {
    e.stopPropagation();
    toggleFav(b.dataset.fav);
    return;
  }
  if (b.dataset.comp) {
    toggleComp(b.dataset.comp);
    return;
  }
  if (b.dataset.open) {
    select(b.dataset.open);
    return;
  }
  if (b.dataset.type) {
    type = b.dataset.type;
    qa('[data-type]').forEach((x) => x.classList.toggle('active', x === b));
    hideDetail();
    return;
  }
  if (b.dataset.contact !== undefined && active) {
    const p = all().find((x) => x.id === active);
    const o = p.offers[Number(b.dataset.contact)];
    contactMessage =
      'Olá! Tenho interesse no imóvel ' +
      p.id +
      ' — ' +
      p.title +
      ', anunciado por ' +
      money(o.price) +
      '. Poderia me enviar mais informações?';
    $('contactText').textContent = contactMessage;
    openDialog('contactDialog');
    return;
  }
  if (b.dataset.delete) {
    if (!confirm('Excluir este anúncio demonstrativo?')) return;
    const next = mine.filter((p) => p.id !== b.dataset.delete);
    if (!writeStorage('mine', next, toast)) return;
    mine = next;
    extra = extra.filter((o) => o.id !== b.dataset.delete);
    fav.delete(b.dataset.delete);
    comp.delete(b.dataset.delete);
    writeStorage('offers', extra, toast);
    writeStorage('fav', [...fav], toast);
    hideDetail();
    closeDialog('agencyDialog');
    openAgency();
    return;
  }
  if (b.id === 'backList') hideDetail();
  if (b.id === 'emptyReset') {
    resetAll();
    $('within').checked = false;
    render();
  }
  if (b.id === 'offerHere') openOffer(active);
  if (b.id === 'shareProp') {
    const url = new URL(location.href);
    url.searchParams.set('imovel', active);
    copyText(url.href);
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-open]')) {
    e.preventDefault();
    select(e.target.dataset.open);
  }
});

$('copyContact').onclick = () => copyText(contactMessage);
$('explore').onclick = () => switchMode('all');
$('saved').onclick = () => switchMode(mode === 'saved' ? 'all' : 'saved');
$('compareTop').onclick = compare;
$('openCompare').onclick = compare;
$('clearCompare').onclick = () => {
  comp.clear();
  refreshDetail();
};
$('search').oninput = hideDetail;
$('clearSearch').onclick = () => {
  $('search').value = '';
  hideDetail();
};
$('sort').onchange = render;
$('within').onchange = render;
$('mobileToggle').onclick = () => {
  if ($('panel').classList.contains('open')) {
    $('panel').classList.remove('detailopen');
    setPanel(false);
  } else setPanel(true);
};
$('center').onclick = () => mapCtrl.centerCity();
$('showAll').onclick = () => mapCtrl.fitAll(getFiltered());
$('sat').onclick = () => {
  mapCtrl.setLayer(false);
  $('sat').classList.add('selected');
  $('street').classList.remove('selected');
};
$('street').onclick = () => {
  mapCtrl.setLayer(true);
  $('sat').classList.remove('selected');
  $('street').classList.add('selected');
};
$('filters').onclick = () => {
  populateDistrict();
  openDialog('filterDialog');
};
$('resetFilter').onclick = () => {
  $('filterForm').reset();
  filters = {};
  $('filterCount').textContent = '';
  render();
};
$('filterForm').onsubmit = (e) => {
  e.preventDefault();
  const f = {};
  ['minPrice', 'maxPrice', 'minArea', 'maxArea'].forEach(
    (k) => (f[k] = Number($(k).value) || 0)
  );
  f.bairro = $('bairro').value;
  f.negocio = $('negocio').value;
  f.multiOffer = $('multiOffer').checked;
  if ((f.maxPrice && f.minPrice > f.maxPrice) || (f.maxArea && f.minArea > f.maxArea)) {
    toast('O valor mínimo não pode superar o máximo');
    return;
  }
  filters = f;
  $('filterCount').textContent = Object.values(f).filter(Boolean).length || '';
  closeDialog('filterDialog');
  hideDetail();
};
$('agency').onclick = openAgency;
$('newProperty').onclick = () => {
  closeDialog('agencyDialog');
  newProp();
};
$('newOffer').onclick = () => {
  closeDialog('agencyDialog');
  openOffer();
};
$('pickLocation').onclick = () => {
  if (!mapCtrl.startDraw()) {
    toast('O mapa não está disponível');
    return;
  }
  closeDialog('propertyDialog');
  setPanel(false);
  $('panel').classList.remove('detailopen');
  $('drawBar').hidden = false;
  $('drawHint').textContent =
    'Toque para marcar a posição; 3+ pontos formam um limite demonstrativo.';
  $('finishDraw').disabled = true;
};
$('undoPoint').onclick = () => mapCtrl.undoDrawPoint();
$('finishDraw').onclick = () => {
  const res = mapCtrl.endDraw(true);
  if (res) {
    draftLocation = res;
    $('locationStatus').textContent = 'Localização marcada ✓';
  }
  $('drawBar').hidden = true;
  render();
  openDialog('propertyDialog');
};
$('cancelDraw').onclick = () => {
  mapCtrl.endDraw(false);
  $('drawBar').hidden = true;
  render();
  openDialog('propertyDialog');
};
$('photo').onchange = async (e) => {
  const f = e.target.files[0];
  photoData = '';
  if (!f) return;
  if (f.size > 2 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
    toast('Escolha JPG, PNG ou WebP de até 2 MB');
    e.target.value = '';
    return;
  }
  const r = new FileReader();
  r.onload = () => (photoData = r.result);
  r.readAsDataURL(f);
};
$('propertyForm').onsubmit = (e) => {
  e.preventDefault();
  if (!draftLocation) {
    toast('Marque a localização no mapa primeiro');
    return;
  }
  const f = Object.fromEntries(new FormData(e.target));
  const p = {
    id: 'P' + Date.now().toString(36),
    title: f.title,
    type: f.type,
    district: f.district,
    area: +f.area,
    front: +f.front || 0,
    depth: +f.depth || 0,
    beds: +f.beds || 0,
    deal: f.deal,
    description: f.description || 'Anúncio demonstrativo cadastrado pela imobiliária.',
    ...draftLocation,
    photo: photoData,
    mine: true,
    offers: [{ agency: f.agency, price: +f.price }],
  };
  const next = [...mine, p];
  if (!writeStorage('mine', next, toast)) return;
  mine = next;
  closeDialog('propertyDialog');
  switchMode('all');
  resetAll();
  select(p.id);
  toast('Imóvel cadastrado neste navegador!');
};
$('offerForm').onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const next = [...extra, { id: f.id, agency: f.agency, price: +f.price }];
  if (!writeStorage('offers', next, toast)) return;
  extra = next;
  closeDialog('offerDialog');
  select(f.id);
  toast('Oferta adicionada!');
};

mapCtrl.init();
render();
const initialId = new URLSearchParams(location.search).get('imovel');
if (initialId && all().some((p) => p.id === initialId)) select(initialId);
if (!initialId && isMobile()) setPanel(false);
window.addEventListener('resize', () => mapCtrl.invalidateSize());

