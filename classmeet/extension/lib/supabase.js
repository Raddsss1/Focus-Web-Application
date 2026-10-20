// Tiny Supabase client using plain fetch (no bundler needed).
import { SUPABASE_URL as URL_, SUPABASE_ANON_KEY as KEY } from '../config.js';
const H = { apikey: KEY, 'Content-Type': 'application/json' };

async function parse(r) {
  const t = await r.text(); let j = null;
  try { j = t ? JSON.parse(t) : null; } catch {}
  if (!r.ok) throw new Error(j?.msg || j?.error_description || j?.message || t || r.statusText);
  return j;
}
const save = a => chrome.storage.local.set({ auth: {
  access_token: a.access_token, refresh_token: a.refresh_token,
  expires_at: a.expires_at || Math.floor(Date.now() / 1000) + a.expires_in, user: a.user } });

export async function signIn(email, password) {
  const a = await parse(await fetch(`${URL_}/auth/v1/token?grant_type=password`,
    { method: 'POST', headers: H, body: JSON.stringify({ email, password }) }));
  await save(a); return a;
}
export async function signUp(email, password, full_name, role) {
  const a = await parse(await fetch(`${URL_}/auth/v1/signup`,
    { method: 'POST', headers: H, body: JSON.stringify({ email, password, data: { full_name, role } }) }));
  if (a.access_token) { await save(a); return a; }
  return null; // email confirmation is required
}
export const signOut = () => chrome.storage.local.remove(['auth', 'activeClass']);

export async function getSession() {
  const { auth } = await chrome.storage.local.get('auth');
  if (!auth) return null;
  if (auth.expires_at * 1000 - Date.now() > 60000) return auth;
  try {
    const a = await parse(await fetch(`${URL_}/auth/v1/token?grant_type=refresh_token`,
      { method: 'POST', headers: H, body: JSON.stringify({ refresh_token: auth.refresh_token }) }));
    await save(a);
    return (await chrome.storage.local.get('auth')).auth;
  } catch { await signOut(); return null; }
}
export async function api(path, { method = 'GET', body, prefer } = {}) {
  const s = await getSession();
  if (!s) throw new Error('Not logged in');
  return parse(await fetch(`${URL_}/rest/v1/${path}`, {
    method, body: body ? JSON.stringify(body) : undefined,
    headers: { ...H, Authorization: `Bearer ${s.access_token}`, ...(prefer ? { Prefer: prefer } : {}) } }));
}
export const rpc = (fn, args) => api(`rpc/${fn}`, { method: 'POST', body: args });
