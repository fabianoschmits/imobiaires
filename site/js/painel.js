'use strict';
import { signIn, signUp, signOut, createAgency, getMyAgency, fetchMyProperties, upsertProperty, uploadPhoto, deleteProperty, upsertOffer, isAdmin } from './supabase.js';
import { money, fmt, esc, renderIllustration } from './catalog.js';
import { readStorage, writeStorage } from './storage.js';

const ADMIN_EMAIL = 'fabiano.schmits@outlook.com';
const $ = (s) => document.getElementById(s);
let session = null;
let myAgency = null;
let adminMode = false; // true when logged in as admin
let toastTimer;

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.style.display = 'none'), 3500);
}

function showError(msg) {
  const el = $('authError');
  el.textContent = msg;
  el.hidden = !msg;
}

function openDialog(id) { const d=$(id); if(!d.open) d.showModal(); }
function closeDialog(id) { $(id).close(); }

/* ─── Screens ─── */
function showAuth() {
  $('authScreen').hidden = false;
  $('dashScreen').hidden = true;
}

async function showDash() {
  $('authScreen').hidden = true;
  $('dashScreen').hidden = false;
  adminMode = session?.user?.email === ADMIN_EMAIL;
  $('sessionName').textContent = adminMode
    ? '👑 Admin — ' + (myAgency?.name || 'ImobiAires')
    : (myAgency?.name || session?.user?.email || 'Imobiliária');
  // Show admin banner if admin
  let banner = $('adminBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'adminBanner';
    banner.style.cssText = 'background:#1d4ed8;color:#fff;text-align:center;padding:8px 16px;font-size:13px;font-weight:600;';
    document.body.prepend(banner);
  }
  banner.hidden = !adminMode;
  banner.textContent = adminMode ? '👑 Modo Admin — você está vendo todos os imóveis do sistema.' : '';
  await renderDash();
}

/* ─── Dashboard ─── */
async function renderDash() {
  const props = await fetchMyProperties(session, myAgency?.id, adminMode);
  const totalOffers = props.reduce((s, p) => s + (p.offers?.length || 0), 0);

  $('painelStats').innerHTML = `
    <div class="stat-card"><small>${adminMode ? 'Total do sistema' : 'Imóveis cadastrados'}</small><strong>${props.length}</strong></div>
    <div class="stat-card"><small>Ofertas ativas</small><strong>${totalOffers}</strong></div>
    <div class="stat-card"><small>Conta</small><strong style="font-size:14px;letter-spacing:0">${esc(session?.user?.email || '')}</strong></div>
  `;
  $('emptyMsg').hidden = props.length > 0;

  if (!props.length) { $('propGrid').innerHTML = ''; return; }

  $('propGrid').innerHTML = props.map((p) => {
    const offer = p.offers?.[0];
    const price = offer?.price || 0;
    const imgHtml = p.photo_url
      ? `<img src="${esc(p.photo_url)}" alt="Foto do imóvel">`
      : renderIllustration(p);
    // Admin can edit any property; regular agency can only edit their own
    const canEdit = adminMode || p.created_by === session?.user?.id;
    const agencyLabel = adminMode && offer?.agencies?.name
      ? `<div class="prop-card-agency">🏢 ${esc(offer.agencies.name)}</div>` : '';
    return `
      <div class="prop-card">
        <div class="prop-card-img">
          ${imgHtml}
          <span class="prop-card-tag">${esc(p.type)} · ${esc(p.deal)}</span>
        </div>
        <div class="prop-card-body">
          <p class="prop-card-title">${esc(p.title)}</p>
          <div class="prop-card-loc">⌖ ${esc(p.district)} · Venâncio Aires</div>
          ${agencyLabel}
          <div class="prop-card-price">${money(price)}${p.deal === 'Aluguel' ? '<small style="font-size:13px">/mês</small>' : ''}</div>
          <div class="prop-card-meta">
            <span>▱ ${fmt(p.area)} m²</span>
            ${p.front ? `<span>${fmt(p.front)} × ${fmt(p.depth)} m</span>` : ''}
            ${p.beds ? `<span>${p.beds} quartos</span>` : ''}
            ${price && p.area ? `<span>${money(price / p.area)}/m²</span>` : ''}
          </div>
        </div>
        <div class="prop-card-actions">
          ${canEdit ? `<button class="secondary" data-edit="${p.id}">✎ Editar</button>` : ''}
          ${canEdit ? `<button class="secondary" style="color:#c0392b;border-color:#f5b8b8" data-delete="${p.id}">🗑 Excluir</button>` : '<span class="muted" style="font-size:12px">Somente leitura</span>'}
        </div>
      </div>`;
  }).join('');
}

/* ─── Map ─── */
let propMap = null, mapPoints = [], mapDrawLayer = null;

function initPropMap() {
  if (propMap) return;
  const CENTER = [-29.606, -52.192];
  // maxZoom 22 com overzoom: estica tiles até ~50 m de escala
  propMap = window.L.map('propMap', { zoomControl: true, maxZoom: 22 }).setView(CENTER, 14);
  window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 22,
    maxNativeZoom: 19,
    attribution: 'Tiles © Esri',
  }).addTo(propMap);
  mapDrawLayer = window.L.layerGroup().addTo(propMap);
  propMap.on('click', (e) => {
    mapPoints.push([e.latlng.lat, e.latlng.lng]);
    renderMapDraw();
  });
}

function renderMapDraw() {
  mapDrawLayer.clearLayers();
  mapPoints.forEach(pt => window.L.circleMarker(pt, { radius: 6, color: '#fff', fillColor: '#1d4ed8', fillOpacity: 1 }).addTo(mapDrawLayer));
  if (mapPoints.length > 1) window.L.polyline(mapPoints, { color: '#3b82f6', weight: 2 }).addTo(mapDrawLayer);
  if (mapPoints.length >= 3) window.L.polygon(mapPoints, { color: '#3b82f6', fillOpacity: 0.15 }).addTo(mapDrawLayer);
  $('undoMapPt').disabled = mapPoints.length === 0;
  updateHiddenInputs();
  const el = $('mapStatus');
  if (!mapPoints.length) el.textContent = 'Nenhuma posição marcada. Clique no mapa para começar.';
  else if (mapPoints.length === 1) el.textContent = `📍 Posição marcada (${mapPoints[0][0].toFixed(5)}, ${mapPoints[0][1].toFixed(5)})`;
  else el.textContent = mapPoints.length >= 3 ? `Polígono com ${mapPoints.length} pontos` : `${mapPoints.length} pontos — mais 1 para criar polígono`;
}

function updateHiddenInputs() {
  if (!mapPoints.length) { $('latInput').value = ''; $('lngInput').value = ''; $('pointsInput').value = ''; return; }
  const lat = mapPoints.reduce((s, p) => s + p[0], 0) / mapPoints.length;
  const lng = mapPoints.reduce((s, p) => s + p[1], 0) / mapPoints.length;
  $('latInput').value = lat; $('lngInput').value = lng;
  $('pointsInput').value = JSON.stringify(mapPoints.length >= 3 ? mapPoints : []);
}

/* ─── Photo ─── */
let photoPending = null; // File object when new, null when no change
let currentPhotoUrl = '';

function setupPhotoUpload() {
  $('photoUploadArea').addEventListener('click', (e) => {
    if (e.target === $('removePhoto') || $('removePhoto').contains(e.target)) return;
    $('photoInput').click();
  });
  $('photoInput').onchange = (e) => {
    const f = e.target.files[0];
    photoPending = null;
    if (!f) return;
    if (f.size > 2 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      toast('Escolha JPG, PNG ou WebP até 2 MB'); e.target.value = ''; return;
    }
    photoPending = f;
    const url = URL.createObjectURL(f);
    setPhotoPreview(url);
  };
  $('removePhoto').onclick = () => { photoPending = null; currentPhotoUrl = ''; setPhotoPreview(''); $('photoInput').value = ''; };
}

function setPhotoPreview(url) {
  if (url) {
    $('photoPreview').innerHTML = `<img src="${url}" alt="Preview">`;
    $('photoPreview').hidden = false;
    $('photoLabel').hidden = true;
    $('removePhoto').hidden = false;
  } else {
    $('photoPreview').hidden = true;
    $('photoPreview').innerHTML = '';
    $('photoLabel').hidden = false;
    $('removePhoto').hidden = true;
  }
}

/* ─── Property form ─── */
let editingId = null;

function openNewProp() {
  editingId = null;
  currentPhotoUrl = '';
  photoPending = null;
  $('propDialogEyebrow').textContent = 'NOVO ANÚNCIO';
  $('propDialogTitle').textContent = 'Cadastrar imóvel';
  $('propForm').reset();
  $('photoInput').value = '';
  setPhotoPreview('');
  mapPoints = [];
  setTimeout(() => { initPropMap(); propMap.invalidateSize(); propMap.setView([-29.606,-52.192], 14); }, 80);
  openDialog('propDialog');
}

async function openEditProp(id) {
  const props = await fetchMyProperties(session, myAgency?.id);
  const p = props.find(x => x.id === id);
  if (!p) { toast('Imóvel não encontrado ou sem permissão.'); return; }
  editingId = id;
  currentPhotoUrl = p.photo_url || '';
  photoPending = null;
  $('propDialogEyebrow').textContent = 'EDITAR ANÚNCIO';
  $('propDialogTitle').textContent = 'Editar imóvel';
  const form = $('propForm');
  form.reset();
  form.elements.title.value = p.title || '';
  form.elements.type.value = p.type || 'Terreno';
  form.elements.deal.value = p.deal || 'Venda';
  form.elements.district.value = p.district || '';
  form.elements.price.value = p.offers?.[0]?.price || '';
  form.elements.area.value = p.area || '';
  form.elements.front.value = p.front || '';
  form.elements.depth.value = p.depth || '';
  form.elements.beds.value = p.beds || '';
  form.elements.description.value = p.description || '';
  setPhotoPreview(p.photo_url || '');
  mapPoints = Array.isArray(p.points) && p.points.length ? p.points : (p.lat && p.lng ? [[p.lat, p.lng]] : []);
  setTimeout(() => {
    initPropMap(); propMap.invalidateSize();
    if (mapPoints.length) { propMap.setView(mapPoints[0], 17); renderMapDraw(); }
  }, 80);
  openDialog('propDialog');
}

$('propForm').onsubmit = async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (!f.lat || !f.lng) { toast('Marque a localização no mapa antes de salvar.'); return; }

  $('savePropBtn').disabled = true;
  $('savePropBtn').textContent = 'Salvando...';
  try {
    let photoUrl = currentPhotoUrl;
    if (photoPending) {
      photoUrl = await uploadPhoto(session, photoPending, editingId || 'new');
    }

    let points = [];
    try { points = JSON.parse(f.points || '[]'); } catch {}

    const propPayload = {
      id: editingId || undefined,
      title: f.title,
      type: f.type,
      deal: f.deal,
      district: f.district,
      area: +f.area,
      front: +f.front || 0,
      depth: +f.depth || 0,
      beds: +f.beds || 0,
      description: f.description || '',
      lat: +f.lat,
      lng: +f.lng,
      points,
      photo_url: photoUrl,
      status: 'published',
    };

    const result = await upsertProperty(session, propPayload);
    const propId = editingId || result?.id;

    if (myAgency) {
      await upsertOffer(session, {
        property_id: propId,
        agency_id: myAgency.id,
        deal_type: f.deal,
        price: +f.price,
      });
    }

    closeDialog('propDialog');
    toast(editingId ? 'Imóvel atualizado!' : 'Imóvel cadastrado!');
    await renderDash();
  } catch (err) {
    toast('Erro ao salvar: ' + err.message);
  } finally {
    $('savePropBtn').disabled = false;
    $('savePropBtn').textContent = 'Salvar imóvel';
  }
};

/* ─── Event delegation ─── */
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button,[data-close]');
  if (!b) return;
  if (b.dataset.close) { closeDialog(b.dataset.close); return; }
  if (b.id === 'logoutBtn') {
    await signOut(session);
    writeStorage('sb-session', null);
    session = null; myAgency = null;
    showAuth(); return;
  }
  if (b.id === 'newPropBtn') { openNewProp(); return; }
  if (b.id === 'cancelPropBtn') { closeDialog('propDialog'); return; }
  if (b.dataset.edit) { await openEditProp(b.dataset.edit); return; }
  if (b.dataset.delete) {
    if (!confirm('Excluir este imóvel permanentemente?')) return;
    try {
      await deleteProperty(session, b.dataset.delete);
      toast('Imóvel excluído.');
      await renderDash();
    } catch (err) { toast('Erro ao excluir: ' + err.message); }
    return;
  }
  if (b.id === 'undoMapPt') { mapPoints.pop(); renderMapDraw(); return; }
  if (b.id === 'clearMapPts') { mapPoints = []; renderMapDraw(); return; }
});

/* ─── Auth tab switching & password toggle ─── */
document.querySelectorAll('.pw-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = btn.previousElementSibling;
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.classList.toggle('active', show);
    btn.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    btn.setAttribute('title', show ? 'Ocultar senha' : 'Mostrar senha');
  });
});

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

$('loginForm').onsubmit = async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Entrando...';
  try {
    session = await signIn(f.email.trim(), f.password);
    writeStorage('sb-session', session);
    adminMode = session.user?.email === ADMIN_EMAIL;
    myAgency = await getMyAgency(session);
    if (!myAgency && !adminMode) toast('Conta sem imobiliária vinculada. Crie uma no cadastro.');
    await showDash();
  } catch (err) {
    showError(err.message || 'E-mail ou senha incorretos.');
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
};

$('registerForm').onsubmit = async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Criando conta...';
  try {
    session = await signUp(f.email.trim(), f.password, f.name.trim(), f.phone?.trim());
    writeStorage('sb-session', session);
    if (session?.access_token) {
      myAgency = await createAgency(session, { name: f.name, phone: f.phone || '' });
    } else {
      showError('Conta criada! Confirme seu e-mail para continuar.');
      btn.disabled = false; btn.textContent = 'Criar conta e entrar';
      return;
    }
    await showDash();
  } catch (err) {
    showError(err.message || 'Erro ao criar conta.');
  } finally {
    btn.disabled = false; btn.textContent = 'Criar conta e entrar';
  }
};

/* ─── Boot ─── */
setupPhotoUpload();
(async () => {
  const saved = readStorage('sb-session', null);
  if (saved?.access_token) {
    session = saved;
    // Admin can enter painel without an agency linked
    adminMode = session.user?.email === ADMIN_EMAIL;
    myAgency = await getMyAgency(session).catch(() => null);
    if (myAgency || adminMode) { await showDash(); return; }
  }
  showAuth();
})();
