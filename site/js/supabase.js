/**
 * ImobiAires – Supabase client wrapper
 * Uses the anon key (safe for browser). RLS enforces access control.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env.js';

const H = (extra = {}) => ({
  apikey: SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
  ...extra,
});

function authHeader(session) {
  return session?.access_token ? { Authorization: 'Bearer ' + session.access_token } : {};
}

async function req(method, path, body, session, extraHeaders = {}) {
  const res = await fetch(SUPABASE_URL + path, {
    method,
    headers: { ...H(authHeader(session)), ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${path} → ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* ─── Auth ─── */
export async function signUp(email, password, name, phone) {
  const res = await fetch(SUPABASE_URL + '/auth/v1/signup', {
    method: 'POST',
    headers: H(),
    body: JSON.stringify({
      email,
      password,
      data: { name, phone: phone || '' },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || data.message);
  return data;
}

export async function signIn(email, password) {
  const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: H(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error_description || data.error) throw new Error(data.error_description || data.error);
  return data; // { access_token, refresh_token, user, ... }
}

export async function signOut(session) {
  await fetch(SUPABASE_URL + '/auth/v1/logout', {
    method: 'POST',
    headers: H(authHeader(session)),
  });
}

export async function getUser(session) {
  if (!session?.access_token) return null;
  const res = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: H(authHeader(session)) });
  if (!res.ok) return null;
  return res.json();
}

/* ─── Admin check ─── */
export async function isAdmin(session) {
  if (!session) return false;
  const user = await getUser(session);
  return user?.email === 'fabiano.schmits@outlook.com';
}

/* ─── Agencies ─── */
export async function createAgency(session, { name, owner_name, creci, phone, logo_url }) {
  const slug =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'imobiliaria';
  const [agency] = await req(
    'POST',
    '/rest/v1/agencies?select=id,name,slug,phone,owner_name,creci,logo_url',
    {
      name,
      slug,
      owner_name: owner_name || '',
      creci: creci || '',
      phone: phone || '',
      logo_url: logo_url || null,
    },
    session
  );
  // Add owner membership
  await req(
    'POST',
    '/rest/v1/agency_members',
    { agency_id: agency.id, user_id: session.user.id, role: 'owner' },
    session
  );
  return agency;
}

export async function fetchAgencyBySlug(slug) {
  const data = await req(
    'GET',
    `/rest/v1/agencies?slug=eq.${encodeURIComponent(slug)}&select=id,name,slug,phone,owner_name,creci,logo_url`,
    null,
    null
  );
  return data?.[0] || null;
}

export async function fetchPropertiesByAgency(agencyId) {
  return req(
    'GET',
    `/rest/v1/properties?status=eq.published&select=*,offers!inner(id,price,deal_type,agency_id,agencies(name,phone,logo_url,creci,slug))&offers.agency_id=eq.${agencyId}&order=created_at.desc`,
    null,
    null
  );
}

export async function getMyAgency(session) {
  if (!session) return null;
  const userId = session.user?.id;
  const data = await req(
    'GET',
    `/rest/v1/agency_members?user_id=eq.${userId}&select=agency_id,role,agencies(*)`,
    null,
    session
  );
  return data?.[0]?.agencies || null;
}

/* ─── Properties (public map) ─── */
export async function fetchProperties() {
  // Fetch published properties with their offers and agency info
  return req(
    'GET',
    '/rest/v1/properties?status=eq.published&select=*,offers(id,price,deal_type,agency_id,agencies(name,phone,logo_url,creci,slug))&order=created_at.desc',
    null,
    null
  );
}

/* ─── Properties (painel) ─── */
/**
 * Fetch properties for the agency dashboard.
 * Admin (fabiano.schmits@outlook.com) sees ALL properties.
 * Regular agencies see only properties they created (by user id).
 */
export async function fetchMyProperties(session, agencyId, adminMode = false) {
  if (!session) return [];
  if (adminMode) {
    // Admin: return all properties
    return req(
      'GET',
      '/rest/v1/properties?select=*,offers(id,price,deal_type,agency_id,agencies(name,phone))&order=created_at.desc',
      null,
      session
    );
  }
  // Regular agency: only properties created by this user
  return req(
    'GET',
    `/rest/v1/properties?created_by=eq.${session.user.id}&select=*,offers(id,price,deal_type,agency_id,agencies(name,phone))&order=created_at.desc`,
    null,
    session
  );
}

export async function upsertProperty(session, prop) {
  const method = prop.id ? 'PATCH' : 'POST';
  const path = prop.id
    ? `/rest/v1/properties?id=eq.${prop.id}`
    : '/rest/v1/properties?select=id';
  const payload = { ...prop, created_by: session.user.id };
  if (!prop.id) delete payload.id;
  const data = await req(method, path, payload, session);
  return method === 'POST' ? data?.[0] : prop;
}

export async function deleteProperty(session, id) {
  await req('DELETE', `/rest/v1/offers?property_id=eq.${id}`, null, session);
  await req('DELETE', `/rest/v1/properties?id=eq.${id}`, null, session);
}

/* ─── Offers ─── */
export async function upsertOffer(session, { property_id, agency_id, deal_type, price }) {
  await req(
    'POST',
    '/rest/v1/offers?on_conflict=property_id,agency_id',
    { property_id, agency_id, deal_type, price, status: 'published' },
    session,
    { Prefer: 'resolution=merge-duplicates,return=representation' }
  );
}

/* ─── Storage ─── */
export async function uploadPhoto(session, file, propertyId) {
  const ext = file.name.split('.').pop();
  const path = `${session.user.id}/${propertyId || 'tmp'}-${Date.now()}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/property-photos/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + session.access_token,
      'Content-Type': file.type,
    },
    body: file,
  });
  if (!res.ok) throw new Error('Upload falhou: ' + (await res.text()));
  return `${SUPABASE_URL}/storage/v1/object/public/property-photos/${path}`;
}
