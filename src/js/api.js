// src/js/api.js
let API_BASE = "http://localhost:5000"

fetch('/config/config.json', { cache: 'no-store' })
    .then(res => res.ok ? res.json() : null)
    .then(cfg => {
        if (cfg?.API_BASE) API_BASE = cfg.API_BASE
    })
    .catch(() => {
        console.warn("Nie udało się wczytać config.json, używam domyślnego API_BASE:", API_BASE)
    })

export { API_BASE }

// ogólny helper: rzuca błędem przy !ok; przy 401/403 dodatkowo kieruje na login (z ?next=)
export async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  })
  let data = null
  try { data = await res.json() } catch {}

  if (res.status === 401 || res.status === 403) {
    const next = encodeURIComponent(location.pathname + location.search)
    // nie przekierowujemy, jeśli już jesteśmy na stronie logowania
    if (!location.pathname.endsWith("/login.html")) {
      location.href = `/login.html?next=${next}`
    }
    throw new Error(data?.message || "Wymagane zalogowanie")
  }
  if (!res.ok) {
    throw new Error(data?.message || `Błąd ${res.status}`)
  }
  return data
}

// wariant do świadomej obsługi statusu (np. dla 409 itp.)
export async function apiWithStatus(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  })
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, ok: res.ok, data }
}

// pobranie profilu; zwraca obiekt lub null
export async function getProfile() {
  const { status, data } = await apiWithStatus('/api/users/profile')
  return status === 200 ? data : null
}
