let API_BASE = 'http://localhost:5000'

// Ładowanie konfiguracji z config.json
function loadConfig() {
  return fetch('/config/config.json', { cache: 'no-store' })
    .then(res => res.ok ? res.json() : null)
    .then(cfg => {
      if (cfg?.API_BASE) {
        API_BASE = cfg.API_BASE
        console.log('📦 API_BASE ustawione na:', API_BASE)
      } else {
        console.warn('⚠️ Brak API_BASE w config.json, używam domyślnego:', API_BASE)
      }
    })
    .catch(() => {
      console.warn('⚠️ Nie udało się wczytać config.json, używam domyślnego API_BASE:', API_BASE)
    })
}

// Główna funkcja do API (z obsługą błędów i redirectem)
async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  let data = null
  try { data = await res.json() } catch {}

  if (res.status === 401 || res.status === 403) {
    const next = encodeURIComponent(location.pathname + location.search)
    if (!location.pathname.endsWith('/login.html')) {
      location.href = `/login.html?next=${next}`
    }
    throw new Error(data?.message || 'Wymagane zalogowanie')
  }

  if (!res.ok) {
    throw new Error(data?.message || `Błąd ${res.status}`)
  }

  return data
}

// API z odpowiedzią i statusem (do sprawdzania logowania itd.)
async function apiWithStatus(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, ok: res.ok, data }
}

// Pobranie profilu użytkownika (lub null)
async function getProfile() {
  const { status, data } = await apiWithStatus('/api/users/profile')
  return status === 200 ? data : null
}

export {
  api,
  apiWithStatus,
  getProfile,
  loadConfig,
  API_BASE 
}
