'use strict';
import { signIn, signUp, signOut, refreshSession, createAgency, updateAgency, updatePassword, getMyAgency, fetchMyProperties, upsertProperty, uploadPhoto, deleteProperty, upsertOffer, isAdmin } from './supabase.js';
import { money, fmt, esc, renderIllustration } from './catalog.js';
import { readStorage, writeStorage } from './storage.js';
import { icon } from './icons.js';

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
  if (msg) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  // Show admin banner if admin
  let banner = $('adminBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'adminBanner';
    banner.style.cssText = 'background:var(--blue);color:#fff;text-align:center;padding:8px 16px;font-size:12.5px;font-weight:600;';
    document.body.prepend(banner);
  }
  banner.hidden = !adminMode;
  banner.textContent = adminMode ? 'Modo Admin — visualizando todos os imóveis do sistema.' : '';
  const pubLink = $('navPublicPage');
  if (pubLink) {
    if (myAgency?.slug) {
      pubLink.href = '/' + encodeURIComponent(myAgency.slug);
      pubLink.hidden = false;
    } else {
      pubLink.hidden = true;
    }
  }
  switchDashTab('anuncios');
  await renderDash();
}

function switchDashTab(tab) {
  $('anunciosView').hidden = tab !== 'anuncios';
  $('perfilView').hidden = tab !== 'perfil';
  $('senhaView').hidden = tab !== 'senha';
  $('navAnuncios').classList.toggle('active', tab === 'anuncios');
  $('navPerfil').classList.toggle('active', tab === 'perfil' || tab === 'senha');
  if (tab === 'perfil') fillPerfilForm();
  if (tab === 'senha') $('senhaForm')?.reset();
}

function formatPhoneBR(val) {
  const d = String(val || '').replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 8) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 8)} ${d.slice(8)}`;
}

document.querySelectorAll('input[type="tel"]').forEach((inp) => {
  inp.addEventListener('input', () => {
    inp.value = formatPhoneBR(inp.value);
  });
});

function fillPerfilForm() {
  const form = $('perfilForm');
  if (!form) return;
  form.elements.name.value = myAgency?.name || '';
  form.elements.owner_name.value = myAgency?.owner_name || '';
  form.elements.creci.value = myAgency?.creci || '';
  form.elements.phone.value = formatPhoneBR(myAgency?.phone || '');
  const box = $('perfilLogoPreview');
  if (box) {
    box.innerHTML = myAgency?.logo_url
      ? `<img src="${esc(myAgency.logo_url)}" alt="Logo">`
      : icon('agency');
  }
}

/* ─── Dashboard ─── */
async function renderDash() {
  let props = [];
  try {
    props = await fetchMyProperties(session, myAgency?.id, adminMode);
  } catch (err) {
    if (String(err.message).includes('401')) {
      const refreshed = await refreshSession(session).catch(() => null);
      if (refreshed) {
        session = refreshed;
        writeStorage('sb-session', session);
        props = await fetchMyProperties(session, myAgency?.id, adminMode).catch(() => []);
      } else {
        writeStorage('sb-session', null);
        session = null;
        myAgency = null;
        showAuth();
        showError('Sua sessão expirou. Entre novamente.');
        return;
      }
    } else {
      toast('Erro ao carregar imóveis: ' + err.message);
    }
  }
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
    const coverUrl = p.photo_url || (Array.isArray(p.photos) && p.photos[0]) || null;
    const imgHtml = coverUrl
      ? `<img src="${esc(coverUrl)}" alt="Foto do imóvel" onerror="this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.hidden=false)">`
      : renderIllustration({ ...p, photo_url: null, photos: [] });
    // Admin can edit any property; regular agency can only edit their own
    const canEdit = adminMode || p.created_by === session?.user?.id;
    const agencyLabel = adminMode && offer?.agencies?.name
      ? `<div class="prop-card-agency">${icon('agency')}<span>${esc(offer.agencies.name)}</span></div>` : '';
    return `
      <div class="prop-card">
        <div class="prop-card-img">
          ${imgHtml}
          <span class="prop-card-tag">${esc(p.type)} · ${esc(p.deal)}</span>
        </div>
        <div class="prop-card-body">
          <p class="prop-card-title">${esc(p.title)}</p>
          <div class="prop-card-loc">${icon('pin')}<span>${esc(p.district)} · Venâncio Aires</span></div>
          ${agencyLabel}
          <div class="prop-card-price">${money(price)}${p.deal === 'Aluguel' ? '<small style="font-size:12px">/mês</small>' : ''}</div>
          <div class="prop-card-meta">
            <span>${fmt(p.area)} m²</span>
            ${p.front ? `<span>· ${fmt(p.front)} × ${fmt(p.depth)} m</span>` : ''}
            ${p.beds ? `<span>· ${p.beds} quartos</span>` : ''}
            ${price && p.area ? `<span>· ${money(price / p.area)}/m²</span>` : ''}
          </div>
        </div>
        <div class="prop-card-actions">
          ${canEdit ? `<button type="button" class="secondary" data-edit="${p.id}">${icon('edit')} Editar</button>` : ''}
          ${canEdit ? `<button type="button" class="secondary" style="color:var(--danger)" data-delete="${p.id}">${icon('trash')} Excluir</button>` : '<span class="muted" style="font-size:12px">Somente leitura</span>'}
        </div>
      </div>`;
  }).join('');
}

/* ─── Map ─── */
let propMap = null, mapPoints = [], mapDrawLayer = null;

function initPropMap() {
  if (propMap) return;
  const CENTER = [-29.606, -52.192];
  // Mapa de ruas/construções (OSM) com overzoom até ~50 m
  propMap = window.L.map('propMap', { zoomControl: true, maxZoom: 22 }).setView(CENTER, 15);
  window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 22,
    maxNativeZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(propMap);
  mapDrawLayer = window.L.layerGroup().addTo(propMap);
  propMap.on('click', (e) => {
    mapPoints.push([e.latlng.lat, e.latlng.lng]);
    renderMapDraw();
  });
}

function renderMapDraw() {
  mapDrawLayer.clearLayers();
  mapPoints.forEach((pt, idx) => {
    const dotIcon = window.L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#1d4ed8;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.45);cursor:grab;"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    const marker = window.L.marker(pt, { icon: dotIcon, draggable: true }).addTo(mapDrawLayer);
    marker.on('dragend', (ev) => {
      const pos = ev.target.getLatLng();
      mapPoints[idx] = [pos.lat, pos.lng];
      renderMapDraw();
    });
  });
  if (mapPoints.length > 1) window.L.polyline(mapPoints, { color: '#3b82f6', weight: 2 }).addTo(mapDrawLayer);
  if (mapPoints.length >= 3) window.L.polygon(mapPoints, { color: '#3b82f6', fillOpacity: 0.15 }).addTo(mapDrawLayer);
  $('undoMapPt').disabled = mapPoints.length === 0;
  updateHiddenInputs();
  const el = $('mapStatus');
  if (!mapPoints.length) el.textContent = 'Nenhuma posição marcada. Clique no mapa para começar.';
  else if (mapPoints.length === 1) el.textContent = `📍 Posição marcada (${mapPoints[0][0].toFixed(5)}, ${mapPoints[0][1].toFixed(5)}) — arraste para ajustar`;
  else el.textContent = mapPoints.length >= 3 ? `Polígono com ${mapPoints.length} pontos (arraste os pontos para ajustar)` : `${mapPoints.length} pontos — mais 1 para criar polígono`;
}

function updateHiddenInputs() {
  if (!mapPoints.length) { $('latInput').value = ''; $('lngInput').value = ''; $('pointsInput').value = ''; return; }
  const lat = mapPoints.reduce((s, p) => s + p[0], 0) / mapPoints.length;
  const lng = mapPoints.reduce((s, p) => s + p[1], 0) / mapPoints.length;
  $('latInput').value = lat; $('lngInput').value = lng;
  $('pointsInput').value = JSON.stringify(mapPoints.length >= 3 ? mapPoints : []);
}

/* ─── Photo ─── */
// photoItems: array of { url: string, file?: File } — index 0 is always the cover
let photoItems = [];

function setupPhotoUpload() {
  $('photoUploadArea').addEventListener('click', (e) => {
    if (e.target.closest('#removePhoto, .photo-thumb-cover, .photo-thumb-del')) return;
    $('photoInput').click();
  });
  $('photoInput').onchange = (e) => {
    const files = [...(e.target.files || [])];
    for (const f of files) {
      if (f.size > 2 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        toast('Use JPG, PNG ou WebP até 2 MB'); continue;
      }
      photoItems.push({ url: URL.createObjectURL(f), file: f });
    }
    e.target.value = '';
    renderPhotoThumbs();
  };
  $('removePhoto').onclick = () => {
    photoItems = [];
    $('photoInput').value = '';
    renderPhotoThumbs();
  };
  $('photoPreview').addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-del-photo]');
    if (delBtn) {
      e.stopPropagation();
      photoItems.splice(+delBtn.dataset.delPhoto, 1);
      renderPhotoThumbs();
      return;
    }
    const coverBtn = e.target.closest('[data-cover-photo]');
    if (coverBtn) {
      e.stopPropagation();
      const idx = +coverBtn.dataset.coverPhoto;
      const [item] = photoItems.splice(idx, 1);
      photoItems.unshift(item);
      renderPhotoThumbs();
    }
  });
}

function renderPhotoThumbs() {
  const wrap = $('photoPreview');
  if (!photoItems.length) {
    wrap.hidden = true;
    wrap.innerHTML = '';
    $('photoLabel').hidden = false;
    $('removePhoto').hidden = true;
    return;
  }
  wrap.innerHTML = photoItems.map((item, i) => `
    <div class="photo-thumb ${i === 0 ? 'is-cover' : ''}">
      <img src="${esc(item.url)}" alt="Foto ${i + 1}">
      ${i === 0
        ? '<span class="photo-thumb-badge">Capa</span>'
        : `<button type="button" class="photo-thumb-cover" data-cover-photo="${i}">Capa</button>`}
      <button type="button" class="photo-thumb-del" data-del-photo="${i}" aria-label="Remover foto" title="Remover">${icon('close')}</button>
    </div>
  `).join('');
  wrap.hidden = false;
  $('photoLabel').hidden = false;
  $('removePhoto').hidden = false;
}

/* ─── Property form ─── */
let editingId = null;

function openNewProp() {
  editingId = null;
  photoItems = [];
  $('propDialogEyebrow').textContent = 'NOVO ANÚNCIO';
  $('propDialogTitle').textContent = 'Cadastrar imóvel';
  $('propForm').reset();
  $('photoInput').value = '';
  renderPhotoThumbs();
  mapPoints = [];
  setTimeout(() => { initPropMap(); propMap.invalidateSize(); propMap.setView([-29.606,-52.192], 14); renderMapDraw(); }, 80);
  openDialog('propDialog');
}

async function openEditProp(id) {
  const props = await fetchMyProperties(session, myAgency?.id, adminMode);
  const p = props.find(x => x.id === id);
  if (!p) { toast('Imóvel não encontrado ou sem permissão.'); return; }
  editingId = id;
  const existingPhotos = Array.isArray(p.photos) && p.photos.length
    ? p.photos
    : (p.photo_url ? [p.photo_url] : []);
  photoItems = existingPhotos.map((url) => ({ url }));
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
  renderPhotoThumbs();
  mapPoints = Array.isArray(p.points) && p.points.length ? p.points : (p.lat && p.lng ? [[p.lat, p.lng]] : []);
  setTimeout(() => {
    initPropMap(); propMap.invalidateSize();
    if (mapPoints.length) propMap.setView(mapPoints[0], 17);
    renderMapDraw();
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
    const uploadedUrls = [];
    for (const item of photoItems) {
      if (item.file) {
        uploadedUrls.push(await uploadPhoto(session, item.file, editingId || 'new'));
      } else if (item.url) {
        uploadedUrls.push(item.url);
      }
    }
    const photoUrl = uploadedUrls[0] || null;

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
      photos: uploadedUrls,
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
  if (b.id === 'navAnuncios' || b.id === 'backToAnuncios') { switchDashTab('anuncios'); return; }
  if (b.id === 'navPerfil' || b.id === 'backToPerfil') { switchDashTab('perfil'); return; }
  if (b.id === 'openSenhaBtn') { switchDashTab('senha'); return; }
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
    btn.innerHTML = icon(show ? 'eyeOff' : 'eye');
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

function validateAuthForm(form) {
  let firstInvalid = null;
  form.querySelectorAll('input').forEach((inp) => {
    const valid = inp.checkValidity();
    inp.classList.toggle('field-error', !valid);
    if (!valid && !firstInvalid) firstInvalid = inp;
  });
  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstInvalid.focus({ preventScroll: true });
    showError('Preencha os campos obrigatórios destacados em vermelho.');
    return false;
  }
  showError('');
  return true;
}

document.querySelectorAll('#loginForm input, #registerForm input').forEach((inp) => {
  inp.addEventListener('input', () => {
    if (inp.classList.contains('field-error') && inp.checkValidity()) {
      inp.classList.remove('field-error');
    }
  });
});

$('loginForm').onsubmit = async (e) => {
  e.preventDefault();
  if (!validateAuthForm(e.target)) return;
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
  } catch {
    showError('Não foi possível entrar. Verifique seus dados e tente novamente.');
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
};

$('registerForm').onsubmit = async (e) => {
  e.preventDefault();
  if (!validateAuthForm(e.target)) return;
  const f = Object.fromEntries(new FormData(e.target));
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Criando conta...';
  try {
    session = await signUp(f.email.trim(), f.password, f.name.trim(), f.phone?.trim());
    writeStorage('sb-session', session);
    if (session?.access_token) {
      let logoUrl = null;
      const logoFile = $('regLogoInput')?.files?.[0];
      if (logoFile) {
        logoUrl = await uploadPhoto(session, logoFile, 'logo').catch(() => null);
      }
      myAgency = await createAgency(session, {
        name: f.name.trim(),
        owner_name: f.owner_name?.trim() || '',
        creci: f.creci?.trim().toUpperCase() || '',
        phone: f.phone?.trim() || '',
        logo_url: logoUrl,
      });
    } else {
      showError('Conta criada! Confirme seu e-mail para continuar.');
      btn.disabled = false; btn.textContent = 'Criar conta e entrar';
      return;
    }
    await showDash();
  } catch {
    showError('Não foi possível criar a conta. Verifique os dados e tente novamente.');
  } finally {
    btn.disabled = false; btn.textContent = 'Criar conta e entrar';
  }
};

/* ─── Profile form ─── */
$('perfilLogoInput')?.addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  if (f.size > 2 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
    toast('Use JPG, PNG ou WebP até 2 MB');
    e.target.value = '';
    return;
  }
  const box = $('perfilLogoPreview');
  if (box) box.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="Logo">`;
});

$('perfilForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const btn = $('savePerfilBtn');
  btn.disabled = true;
  btn.textContent = 'Salvando...';
  try {
    let logoUrl;
    const logoFile = $('perfilLogoInput')?.files?.[0];
    if (logoFile) {
      logoUrl = await uploadPhoto(session, logoFile, 'logo');
    }
    if (myAgency) {
      const updated = await updateAgency(session, myAgency.id, {
        name: f.name.trim(),
        owner_name: f.owner_name?.trim() || '',
        creci: f.creci?.trim().toUpperCase() || '',
        phone: f.phone?.trim() || '',
        logo_url: logoUrl,
      });
      if (updated) myAgency = updated;
    }
    toast('Perfil atualizado com sucesso!');
    await showDash();
  } catch (err) {
    toast('Erro ao salvar perfil: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar alterações';
  }
});

$('senhaForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const p1 = $('senhaNova').value;
  const p2 = $('senhaConfirma').value;
  if (p1.length < 6) {
    toast('A nova senha deve ter pelo menos 6 caracteres.');
    return;
  }
  if (p1 !== p2) {
    toast('As senhas não coincidem. Digite novamente.');
    return;
  }
  const btn = $('saveSenhaBtn');
  btn.disabled = true;
  btn.textContent = 'Atualizando...';
  try {
    await updatePassword(session, p1);
    toast('Senha atualizada com sucesso!');
    $('senhaForm').reset();
    switchDashTab('perfil');
  } catch (err) {
    toast('Erro ao atualizar senha: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Atualizar senha';
  }
});

/* ─── Boot ─── */
setupPhotoUpload();
(async () => {
  const saved = readStorage('sb-session', null);
  if (saved?.access_token) {
    session = saved;
    const fresh = await refreshSession(session).catch(() => null);
    if (fresh) {
      session = fresh;
      writeStorage('sb-session', session);
    }
    adminMode = session.user?.email?.toLowerCase() === ADMIN_EMAIL;
    myAgency = await getMyAgency(session).catch(() => null);
    if (myAgency || adminMode) { await showDash(); return; }
  }
  showAuth();
})();
