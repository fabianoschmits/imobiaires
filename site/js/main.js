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
  onMapClick: () => {
    if (active) {
      hideDetail();
      if (isMobile()) setPanel(false);
    }
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
  const session = readStorage('session', null);
  if (fly) mapCtrl.flyTo(p.lat, p.lng);
  q('.panelhead').hidden = true;
  $('cards').hidden = true;
  $('detail').hidden = false;

  const myOfferIdx = session
    ? p.offers.findIndex((o) => o.agency.toLowerCase() === session.name.toLowerCase())
    : -1;

  const offersHtml = p.offers
    .map((o, i) => {
      const isMine = i === myOfferIdx;
      return (
        '<div class="offerrow">' +
        '<div>' +
        '<small>' + (i === 0 ? 'MENOR PREÇO' : 'OFERTA ' + (i + 1)) + '</small>' +
        '<strong>' + esc(o.agency) + (isMine ? ' · <em style="color:#2255d4;font-style:normal">sua oferta</em>' : '') + '</strong>' +
        (isMine
          ? '<button class="offer-edit-btn" data-edit-offer="' + p.id + '" data-offer-idx="' + i + '" title="Clique para editar seu preço">' + money(o.price) + ' <span style="font-size:12px">✎</span></button>'
          : '<strong style="color:#17634f">' + money(o.price) + '</strong>') +
        '</div>' +
        (isMine
          ? '<span class="muted" style="font-size:11px;align-self:center">Clique no valor para editar</span>'
          : '<button class="primary" data-contact="' + i + '">Contato ↗</button>') +
        '</div>'
      );
    })
    .join('');

  const hasMyOffer = myOfferIdx !== -1;

  $('detail').innerHTML =
    '<div class="detailbody"><button class="back" id="backList">← Voltar aos resultados</button><div class="heroimg">' +
    renderIllustration(p) +
    '<span class="tag">' + esc(p.type) + ' · ' + esc(p.deal) + '</span><span class="photoLabel">Imagem demonstrativa</span></div><div class="eyebrow" style="margin-top:14px">REFERÊNCIA ' +
    esc(p.id) + ' · DEMONSTRAÇÃO</div><h2 class="detailtitle">' + esc(p.title) + '</h2><div class="loc">⌖ ' +
    esc(p.district) + ' · Venâncio Aires, RS</div><div style="margin-top:12px" class="muted">' +
    (p.offers.length > 1 ? 'A partir de' : 'Preço anunciado') +
    '</div><div class="price detailprice">' + money(getMinPrice(p)) + (p.deal === 'Aluguel' ? '/mês' : '') +
    '</div><div class="statstrip"><div><small>Área informada</small><strong>' + fmt(p.area) + ' m²</strong></div><div><small>Valor por m²</small><strong>' +
    money(getMinPrice(p) / p.area) + '</strong></div><div><small>' +
    (p.front ? 'Dimensões' : 'Ofertas') + '</small><strong>' +
    (p.front ? fmt(p.front) + ' × ' + fmt(p.depth) + ' m' : p.offers.length) +
    '</strong></div></div><div class="detailactions"><button class="secondary" data-fav="' + p.id + '">' +
    (fav.has(p.id) ? '♥ Salvo' : '♡ Salvar') + '</button><button class="secondary" data-comp="' + p.id + '">' +
    (comp.has(p.id) ? '✓ Comparando' : '＋ Comparar') + '</button><button class="secondary" id="shareProp">↗ Compartilhar</button></div>' +
    '<h3>Sobre o imóvel</h3><p>' + esc(p.description) + '</p>' +
    '<h3>Compare as ' + p.offers.length + ' ofertas</h3>' +
    offersHtml +
    (p.offers.length > 1
      ? '<p class="muted">Diferença entre ofertas: <strong>' + money(p.offers.at(-1).price - getMinPrice(p)) + '</strong></p>'
      : '') +
    (!hasMyOffer
      ? '<button class="secondary" id="offerHere">＋ Adicionar oferta neste imóvel</button>'
      : '') +
    '<p class="muted" style="margin-top:15px">Endereço, medidas e limites de exemplo não são cadastrais. Anúncio fictício.</p></div>';

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
  const session = readStorage('session', null);
  if (!session) {
    openDialog('agencyAuthDialog');
    return;
  }
  $('agencySessionInfo').textContent = 'Conectado como ' + session.name + ' (' + session.email + ')';
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
  const session = readStorage('session', null);
  $('offerProperty').innerHTML = all()
    .map((p) => '<option value="' + p.id + '">' + esc(p.id + ' — ' + p.title) + '</option>')
    .join('');
  $('offerForm').reset();
  if (session?.name) $('offerForm').elements.agency.value = session.name;
  if (id) {
    $('offerProperty').value = id;
    // pre-fill price if agency already has an offer
    const existing = all()
      .find((p) => p.id === id)
      ?.offers.find((o) => session && o.agency.toLowerCase() === session.name.toLowerCase());
    if (existing) $('offerForm').elements.price.value = existing.price;
  }
  openDialog('offerDialog');
}

function newProp() {
  const session = readStorage('session', null);
  $('propertyForm').reset();
  if (session?.name) $('propertyForm').elements.agency.value = session.name;
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
      ' (' +
      p.district +
      ', ' +
      fmt(p.area) +
      ' m²), anunciado por ' +
      money(o.price) +
      (p.deal === 'Aluguel' ? '/mês' : '') +
      '. Poderia me enviar mais informações?';
    $('contactText').textContent = contactMessage;
    const waMessage = contactMessage + '\n\n— Enviado via ImobiAires: https://imobiaires.vercel.app';
    const accounts = readStorage('accounts', []);
    const matchedAcc = accounts.find(
      (a) => a.name.toLowerCase() === String(o.agency || '').toLowerCase()
    );
    const rawPhone = o.phone || matchedAcc?.phone || '';
    const digits = rawPhone.replace(/\D/g, '');
    const waBtn = $('sendWhatsApp');
    if (digits.length >= 10) {
      const fullPhone = digits.length <= 11 ? '55' + digits : digits;
      waBtn.href = 'https://wa.me/' + fullPhone + '?text=' + encodeURIComponent(waMessage);
      waBtn.hidden = false;
      $('contactNote').textContent = 'WhatsApp cadastrado: ' + rawPhone;
    } else {
      waBtn.hidden = true;
      waBtn.removeAttribute('href');
      $('contactNote').textContent =
        'Imobiliária demonstrativa sem WhatsApp cadastrado. Use "Copiar mensagem" para testar.';
    }
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
$('search').oninput = () => {
  hideDetail();
  renderSuggestions();
};
$('clearSearch').onclick = () => {
  $('search').value = '';
  $('searchSuggest').hidden = true;
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
$('authTabLogin').onclick = () => {
  $('authTabLogin').classList.add('active');
  $('authTabRegister').classList.remove('active');
  $('loginForm').hidden = false;
  $('registerForm').hidden = true;
};
$('authTabRegister').onclick = () => {
  $('authTabRegister').classList.add('active');
  $('authTabLogin').classList.remove('active');
  $('registerForm').hidden = false;
  $('loginForm').hidden = true;
};
$('loginForm').onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const accounts = readStorage('accounts', []);
  const acc = accounts.find(
    (a) => a.email.toLowerCase() === f.email.trim().toLowerCase() && a.password === f.password
  );
  if (!acc) {
    toast('E-mail ou senha inválidos neste navegador');
    return;
  }
  writeStorage('session', { name: acc.name, email: acc.email, phone: acc.phone || '' }, toast);
  closeDialog('agencyAuthDialog');
  openAgency();
  toast('Bem-vindo, ' + acc.name + '!');
};
$('registerForm').onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const accounts = readStorage('accounts', []);
  const email = f.email.trim().toLowerCase();
  if (accounts.some((a) => a.email.toLowerCase() === email)) {
    toast('Já existe uma conta com este e-mail');
    return;
  }
  const acc = {
    name: f.name.trim(),
    email,
    phone: (f.phone || '').trim(),
    password: f.password,
  };
  if (!writeStorage('accounts', [...accounts, acc], toast)) return;
  writeStorage('session', { name: acc.name, email: acc.email, phone: acc.phone }, toast);
  closeDialog('agencyAuthDialog');
  openAgency();
  toast('Conta criada com sucesso!');
};
$('agencyLogout').onclick = () => {
  localStorage.removeItem('t360-session');
  closeDialog('agencyDialog');
  toast('Sessão encerrada');
};
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
  const session = readStorage('session', null);
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
    offers: [{ agency: f.agency, price: +f.price, phone: session?.phone || '' }],
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
  const session = readStorage('session', null);
  const f = Object.fromEntries(new FormData(e.target));
  const agencyName = f.agency;
  const propId = f.id;
  const newPrice = +f.price;
  const phone = session?.phone || '';

  // Update existing offer if same agency already has one for this property
  const alreadyInMine = mine.find((p) => p.id === propId)?.offers
    .findIndex((o) => o.agency.toLowerCase() === agencyName.toLowerCase());
  if (alreadyInMine !== undefined && alreadyInMine >= 0) {
    const nextMine = mine.map((p) => {
      if (p.id !== propId) return p;
      const updatedOffers = p.offers.map((o, i) =>
        i === alreadyInMine ? { ...o, price: newPrice, phone } : o
      );
      return { ...p, offers: updatedOffers };
    });
    if (!writeStorage('mine', nextMine, toast)) return;
    mine = nextMine;
    closeDialog('offerDialog');
    select(propId);
    toast('Oferta atualizada!');
    return;
  }

  const alreadyInExtra = extra.findIndex(
    (o) => o.id === propId && o.agency.toLowerCase() === agencyName.toLowerCase()
  );
  if (alreadyInExtra >= 0) {
    const nextExtra = extra.map((o, i) =>
      i === alreadyInExtra ? { ...o, price: newPrice, phone } : o
    );
    if (!writeStorage('offers', nextExtra, toast)) return;
    extra = nextExtra;
    closeDialog('offerDialog');
    select(propId);
    toast('Oferta atualizada!');
    return;
  }

  // New offer
  const next = [...extra, { id: propId, agency: agencyName, price: newPrice, phone }];
  if (!writeStorage('offers', next, toast)) return;
  extra = next;
  closeDialog('offerDialog');
  select(propId);
  toast('Oferta adicionada!');
};

mapCtrl.init();
render();
const initialId = new URLSearchParams(location.search).get('imovel');
if (initialId && all().some((p) => p.id === initialId)) select(initialId);
if (!initialId && isMobile()) setPanel(false);
window.addEventListener('resize', () => mapCtrl.invalidateSize());

function renderSuggestions() {
  const box = $('searchSuggest');
  const raw = $('search').value.trim();
  if (!raw) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  const norm = (v) =>
    String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const qNorm = norm(raw);
  const items = all();
  const suggestions = [];

  [...new Set(items.map((p) => p.district))]
    .filter((d) => norm(d).includes(qNorm))
    .slice(0, 3)
    .forEach((d) =>
      suggestions.push({ kind: 'district', value: d, label: d, meta: 'Bairro' })
    );

  ['Terreno', 'Casa', 'Apartamento', 'Comercial']
    .filter((t) => norm(t).includes(qNorm))
    .slice(0, 2)
    .forEach((t) =>
      suggestions.push({ kind: 'type', value: t, label: t, meta: 'Tipo' })
    );

  items
    .filter((p) => norm(p.title + ' ' + p.district + ' ' + p.id).includes(qNorm))
    .slice(0, 4)
    .forEach((p) =>
      suggestions.push({
        kind: 'property',
        value: p.id,
        label: p.title,
        meta: p.district + ' · ' + p.id,
      })
    );

  if (!suggestions.length) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  box.innerHTML = suggestions
    .map(
      (s) =>
        '<button type="button" data-suggest-kind="' +
        s.kind +
        '" data-suggest-val="' +
        esc(s.value) +
        '"><span>' +
        esc(s.label) +
        '</span><small>' +
        esc(s.meta) +
        '</small></button>'
    )
    .join('');
  box.hidden = false;
}

$('searchSuggest').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-suggest-kind]');
  if (!btn) return;
  const { suggestKind, suggestVal } = btn.dataset;
  $('searchSuggest').hidden = true;
  if (suggestKind === 'property') {
    select(suggestVal);
  } else if (suggestKind === 'type') {
    type = suggestVal;
    qa('[data-type]').forEach((x) => x.classList.toggle('active', x.dataset.type === type));
    $('search').value = '';
    hideDetail();
  } else {
    $('search').value = suggestVal;
    hideDetail();
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search')) $('searchSuggest').hidden = true;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $('searchSuggest').hidden = true;
});

(function initPanelDrag() {
  const handle = $('panelHandle');
  const panel = $('panel');
  if (!handle || !panel) return;
  let startY = 0;
  let deltaY = 0;
  let dragging = false;

  handle.addEventListener('pointerdown', (e) => {
    if (!isMobile()) return;
    dragging = true;
    startY = e.clientY;
    deltaY = 0;
    panel.style.transition = 'none';
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    deltaY = Math.max(0, e.clientY - startY);
    panel.style.transform = 'translateY(' + deltaY + 'px)';
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = '';
    panel.style.transform = '';
    if (deltaY > 80) {
      panel.classList.remove('detailopen');
      setPanel(false);
      if (active) hideDetail();
    }
  };

  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
})();

