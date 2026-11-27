'use strict';
import { readStorage, writeStorage } from './storage.js';
import { money, fmt, esc, renderIllustration } from './catalog.js';

const $ = (s) => document.getElementById(s);
const q = (s, p = document) => p.querySelector(s);

let session = null;
let mine = [];
let extra = [];
let toastTimer;
let propMap = null;
let mapPoints = [];
let mapDrawLayer = null;
let mapMarkerLayer = null;
let editingId = null;
let photoPending = '';

const CENTER = [-29.606, -52.192];

/* ─── Helpers ─── */
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.style.display = 'none'), 3000);
}

function showError(msg) {
  const el = $('authError');
  el.textContent = msg;
  el.hidden = !msg;
}

function openDialog(id) {
  const d = $(id);
  if (!d.open) d.showModal();
}
function closeDialog(id) {
  $(id).close();
}

/* ─── Storage ─── */
function saveAll() {
  writeStorage('mine', mine, toast);
}

function reload() {
  mine = readStorage('mine', []);
  extra = readStorage('offers', []);
}

function getMyProps() {
  if (!session) return [];
  const name = session.name.toLowerCase();
  return mine.filter(
    (p) => p.mine && p.offers.some((o) => o.agency.toLowerCase() === name)
  );
}

function getMyOffers(propId) {
  return extra.filter((o) => o.id === propId);
}

/* ─── Auth ─── */
function tryLogin(email, password) {
  const accounts = readStorage('accounts', []);
  return accounts.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
  ) || null;
}

function tryRegister({ name, email, phone, password }) {
  const accounts = readStorage('accounts', []);
  if (accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase())) return null;
  const acc = { name: name.trim(), email: email.trim().toLowerCase(), phone: (phone || '').trim(), password };
  writeStorage('accounts', [...accounts, acc], toast);
  return acc;
}

function saveSession(acc) {
  writeStorage('session', { name: acc.name, email: acc.email, phone: acc.phone || '' }, toast);
  session = readStorage('session', null);
}

function logout() {
  localStorage.removeItem('t360-session');
  session = null;
  showAuth();
}

/* ─── Screens ─── */
function showAuth() {
  $('authScreen').hidden = false;
  $('dashScreen').hidden = true;
}

function showDash() {
  $('authScreen').hidden = true;
  $('dashScreen').hidden = false;
  $('sessionName').textContent = session.name;
  renderDash();
}

/* ─── Dashboard render ─── */
function renderDash() {
  reload();
  const props = getMyProps();

  // Stats
  const totalOffers = props.reduce((s, p) => s + p.offers.length + getMyOffers(p.id).length, 0);
  $('painelStats').innerHTML = `
    <div class="stat-card"><small>Imóveis cadastrados</small><strong>${props.length}</strong></div>
    <div class="stat-card"><small>Ofertas ativas</small><strong>${totalOffers}</strong></div>
    <div class="stat-card"><small>Conta</small><strong style="font-size:14px;letter-spacing:0">${esc(session.email)}</strong></div>
  `;

  $('emptyMsg').hidden = props.length > 0;

  if (!props.length) {
    $('propGrid').innerHTML = '';
    return;
  }

  $('propGrid').innerHTML = props
    .map((p) => {
      const price = p.offers[0]?.price || 0;
      const imgHtml = p.photo && /^data:image/.test(p.photo)
        ? `<img src="${esc(p.photo)}" alt="Foto do imóvel">`
        : renderIllustration(p);
      return `
        <div class="prop-card">
          <div class="prop-card-img">
            ${imgHtml}
            <span class="prop-card-tag">${esc(p.type)} · ${esc(p.deal)}</span>
          </div>
          <div class="prop-card-body">
            <p class="prop-card-title">${esc(p.title)}</p>
            <div class="prop-card-loc">⌖ ${esc(p.district)} · Venâncio Aires</div>
            <div class="prop-card-price">${money(price)}${p.deal === 'Aluguel' ? '<small style="font-size:13px">/mês</small>' : ''}</div>
            <div class="prop-card-meta">
              <span>▱ ${fmt(p.area)} m²</span>
              ${p.front ? `<span>${fmt(p.front)} × ${fmt(p.depth)} m</span>` : ''}
              ${p.beds ? `<span>${p.beds} quartos</span>` : ''}
              <span>${money(price / p.area)}/m²</span>
            </div>
          </div>
          <div class="prop-card-actions">
            <button class="secondary" data-edit="${p.id}">✎ Editar</button>
            <button class="secondary" style="color:#c0392b;border-color:#f5b8b8" data-delete="${p.id}">🗑 Excluir</button>
          </div>
        </div>`;
    })
    .join('');
}

/* ─── Map helpers ─── */
function initPropMap() {
  if (propMap) return;
  propMap = window.L.map('propMap', { zoomControl: true, maxZoom: 20 }).setView(CENTER, 14);
  window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20, maxNativeZoom: 19,
    attribution: 'Tiles © Esri — Esri, Maxar, Earthstar Geographics',
  }).addTo(propMap);
  mapMarkerLayer = window.L.layerGroup().addTo(propMap);
  mapDrawLayer = window.L.layerGroup().addTo(propMap);
  propMap.on('click', (e) => {
    mapPoints.push([e.latlng.lat, e.latlng.lng]);
    renderMapDraw();
  });
}

function renderMapDraw() {
  mapDrawLayer.clearLayers();
  mapPoints.forEach((pt) =>
    window.L.circleMarker(pt, { radius: 6, color: '#fff', fillColor: '#1d4ed8', fillOpacity: 1 }).addTo(mapDrawLayer)
  );
  if (mapPoints.length > 1) {
    window.L.polyline(mapPoints, { color: '#3b82f6', weight: 2 }).addTo(mapDrawLayer);
  }
  if (mapPoints.length >= 3) {
    window.L.polygon(mapPoints, { color: '#3b82f6', fillOpacity: 0.15 }).addTo(mapDrawLayer);
  }
  $('undoMapPt').disabled = mapPoints.length === 0;
  updateMapStatus();
  updateHiddenInputs();
}

function updateMapStatus() {
  const el = $('mapStatus');
  if (mapPoints.length === 0) {
    el.textContent = 'Nenhuma posição marcada. Clique no mapa para começar.';
  } else if (mapPoints.length === 1) {
    el.textContent = `📍 Posição marcada (${mapPoints[0][0].toFixed(5)}, ${mapPoints[0][1].toFixed(5)}). Clique mais para criar polígono.`;
  } else if (mapPoints.length < 3) {
    el.textContent = `${mapPoints.length} pontos — mais 1 ponto para criar polígono de limite.`;
  } else {
    el.textContent = `Polígono com ${mapPoints.length} pontos definido.`;
  }
}

function updateHiddenInputs() {
  if (mapPoints.length === 0) {
    $('latInput').value = '';
    $('lngInput').value = '';
    $('pointsInput').value = '';
    return;
  }
  const lat = mapPoints.reduce((s, p) => s + p[0], 0) / mapPoints.length;
  const lng = mapPoints.reduce((s, p) => s + p[1], 0) / mapPoints.length;
  $('latInput').value = lat;
  $('lngInput').value = lng;
  $('pointsInput').value = JSON.stringify(mapPoints.length >= 3 ? mapPoints : []);
}

function loadMapPoints(pts, lat, lng) {
  mapPoints = pts && pts.length ? pts : (lat && lng ? [[lat, lng]] : []);
  renderMapDraw();
  if (mapPoints.length) {
    propMap.setView([lat || mapPoints[0][0], lng || mapPoints[0][1]], 17);
  }
}

/* ─── Photo ─── */
function setupPhotoUpload() {
  const input = $('photoInput');
  const area = $('photoUploadArea');
  const label = $('photoLabel');
  const preview = $('photoPreview');
  const removeBtn = $('removePhoto');

  area.addEventListener('click', (e) => {
    if (e.target === removeBtn || removeBtn.contains(e.target)) return;
    input.click();
  });

  input.onchange = async (e) => {
    const f = e.target.files[0];
    photoPending = '';
    if (!f) return;
    if (f.size > 2 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      toast('Escolha JPG, PNG ou WebP de até 2 MB');
      input.value = '';
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      photoPending = r.result;
      $('photoData').value = r.result;
      preview.innerHTML = `<img src="${esc(r.result)}" alt="Pré-visualização">`;
      preview.hidden = false;
      label.hidden = true;
      removeBtn.hidden = false;
    };
    r.readAsDataURL(f);
  };

  removeBtn.onclick = () => {
    photoPending = '';
    $('photoData').value = '';
    preview.hidden = true;
    preview.innerHTML = '';
    label.hidden = false;
    removeBtn.hidden = false;
    input.value = '';
  };
}

function setPhotoPreview(dataUrl) {
  const preview = $('photoPreview');
  const label = $('photoLabel');
  const removeBtn = $('removePhoto');
  if (dataUrl) {
    photoPending = dataUrl;
    $('photoData').value = dataUrl;
    preview.innerHTML = `<img src="${esc(dataUrl)}" alt="Foto atual">`;
    preview.hidden = false;
    label.hidden = true;
    removeBtn.hidden = false;
  } else {
    photoPending = '';
    $('photoData').value = '';
    preview.hidden = true;
    preview.innerHTML = '';
    label.hidden = false;
    removeBtn.hidden = false;
  }
}

/* ─── Open form ─── */
function openNewProp() {
  editingId = null;
  $('propDialogEyebrow').textContent = 'NOVO ANÚNCIO';
  $('propDialogTitle').textContent = 'Cadastrar imóvel';
  $('propForm').reset();
  $('photoInput').value = '';
  setPhotoPreview('');
  mapPoints = [];
  renderMapDraw();
  setTimeout(() => {
    initPropMap();
    propMap.invalidateSize();
    propMap.setView(CENTER, 14);
  }, 80);
  openDialog('propDialog');
}

function openEditProp(id) {
  reload();
  const p = mine.find((x) => x.id === id);
  if (!p) return;
  editingId = id;
  $('propDialogEyebrow').textContent = 'EDITAR ANÚNCIO';
  $('propDialogTitle').textContent = 'Editar imóvel';

  const form = $('propForm');
  form.reset();
  form.elements.title.value = p.title || '';
  form.elements.type.value = p.type || 'Terreno';
  form.elements.deal.value = p.deal || 'Venda';
  form.elements.district.value = p.district || '';
  form.elements.price.value = p.offers[0]?.price || '';
  form.elements.area.value = p.area || '';
  form.elements.front.value = p.front || '';
  form.elements.depth.value = p.depth || '';
  form.elements.beds.value = p.beds || '';
  form.elements.description.value = p.description || '';

  setPhotoPreview(p.photo || '');

  setTimeout(() => {
    initPropMap();
    propMap.invalidateSize();
    loadMapPoints(p.points || [], p.lat, p.lng);
  }, 80);

  openDialog('propDialog');
}

/* ─── Save form ─── */
$('propForm').onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const lat = parseFloat(f.lat);
  const lng = parseFloat(f.lng);

  if (!f.lat || !f.lng) {
    toast('Marque a localização no mapa antes de salvar.');
    return;
  }

  let points = [];
  try { points = JSON.parse(f.points || '[]'); } catch { points = []; }

  reload();

  if (editingId) {
    mine = mine.map((p) => {
      if (p.id !== editingId) return p;
      return {
        ...p,
        title: f.title,
        type: f.type,
        deal: f.deal,
        district: f.district,
        area: +f.area,
        front: +f.front || 0,
        depth: +f.depth || 0,
        beds: +f.beds || 0,
        description: f.description || '',
        lat,
        lng,
        points,
        photo: f.photoData || p.photo || '',
        offers: [{ ...p.offers[0], price: +f.price }],
      };
    });
    saveAll();
    closeDialog('propDialog');
    renderDash();
    toast('Imóvel atualizado!');
  } else {
    const p = {
      id: 'P' + Date.now().toString(36),
      title: f.title,
      type: f.type,
      deal: f.deal,
      district: f.district,
      area: +f.area,
      front: +f.front || 0,
      depth: +f.depth || 0,
      beds: +f.beds || 0,
      description: f.description || '',
      lat,
      lng,
      points,
      photo: f.photoData || '',
      mine: true,
      offers: [{ agency: session.name, price: +f.price, phone: session.phone || '' }],
    };
    mine = [...mine, p];
    saveAll();
    closeDialog('propDialog');
    renderDash();
    toast('Imóvel cadastrado!');
  }
};

/* ─── Event delegation ─── */
document.addEventListener('click', (e) => {
  const b = e.target.closest('button,a[data-close]');
  if (!b) return;

  if (b.dataset.close) { closeDialog(b.dataset.close); return; }
  if (b.id === 'logoutBtn') { logout(); return; }
  if (b.id === 'newPropBtn') { openNewProp(); return; }
  if (b.id === 'cancelPropBtn') { closeDialog('propDialog'); return; }
  if (b.dataset.edit) { openEditProp(b.dataset.edit); return; }
  if (b.dataset.delete) {
    if (!confirm('Excluir este imóvel permanentemente?')) return;
    reload();
    mine = mine.filter((p) => p.id !== b.dataset.delete);
    extra = extra.filter((o) => o.id !== b.dataset.delete);
    writeStorage('mine', mine, toast);
    writeStorage('offers', extra, toast);
    renderDash();
    toast('Imóvel excluído.');
    return;
  }
  if (b.id === 'undoMapPt') {
    mapPoints.pop();
    renderMapDraw();
    return;
  }
  if (b.id === 'clearMapPts') {
    mapPoints = [];
    renderMapDraw();
    return;
  }
});

/* ─── Auth tab switching ─── */
$('authTabLogin').onclick = () => {
  $('authTabLogin').classList.add('active');
  $('authTabRegister').classList.remove('active');
  $('loginForm').hidden = false;
  $('registerForm').hidden = true;
  showError('');
};
$('authTabRegister').onclick = () => {
  $('authTabRegister').classList.add('active');
  $('authTabLogin').classList.remove('active');
  $('registerForm').hidden = false;
  $('loginForm').hidden = true;
  showError('');
};

$('loginForm').onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const acc = tryLogin(f.email, f.password);
  if (!acc) { showError('E-mail ou senha incorretos.'); return; }
  saveSession(acc);
  showDash();
};

$('registerForm').onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const acc = tryRegister(f);
  if (!acc) { showError('Já existe uma conta com este e-mail.'); return; }
  saveSession(acc);
  showDash();
};

/* ─── Boot ─── */
setupPhotoUpload();
session = readStorage('session', null);
if (session) {
  showDash();
} else {
  showAuth();
}
