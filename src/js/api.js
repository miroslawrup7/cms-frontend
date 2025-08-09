// src/js/api.js
// Jedno miejsce prawdy dla API_BASE + bezpieczne wrappery fetch

let API_BASE = 'http://localhost:5000';

// Udostępniam bieżącą wartość API_BASE
export function getApiBase() {
  return API_BASE;
}

// 1) Wczytanie /config/config.json — ustawi API_BASE gdy plik istnieje
export const configPromise = (async () => {
  try {
    const res = await fetch('/config/config.json', { cache: 'no-store' });
    if (res.ok) {
      const cfg = await res.json();
      if (cfg?.API_BASE) {
        API_BASE = String(cfg.API_BASE).replace(/\/+$/, ''); // bez trailing slash
      }
    }
    console.log('[api] API_BASE =', API_BASE);
  } catch (e) {
    console.warn('[api] Nie udało się wczytać config.json. Zostaje domyślne:', API_BASE);
  }
})();

// 2) Helpery HTTP

export async function api(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  let data = null;
  try { data = await res.json(); } catch {}

  if (res.status === 401 || res.status === 403) {
    const next = encodeURIComponent(location.pathname + location.search);
    if (!location.pathname.endsWith('/login.html')) {
      location.href = `/login.html?next=${next}`;
    }
    throw new Error(data?.message || 'Wymagane zalogowanie');
  }
  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return data;
}

export async function apiWithStatus(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, data };
}

// 3) Szybki endpoint do profilu
export async function getProfile() {
  const { status, data } = await apiWithStatus('/api/users/profile');
  return status === 200 ? data : null;
}
