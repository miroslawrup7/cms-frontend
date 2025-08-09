// src/js/api.js
let API_BASE = "http://localhost:5000";

/**
 * Ładuje /config/config.json i ustawia API_BASE.
 * Wołamy to TYLKO w plikach "startowych" (main.js, article.js).
 */
export async function loadConfig() {
  try {
    const res = await fetch("/config/config.json", { cache: "no-store" });
    if (res.ok) {
      const cfg = await res.json();
      if (cfg?.API_BASE) {
        API_BASE = cfg.API_BASE;
      }
    }
  } catch (_) {
    // zostawiamy fallback z góry
  }

  // --- DODANE: runtime override w zależności od hosta ---
  // Lokalnie (localhost) zostawiamy jak jest (z .env/config.json).
  // Na Render (hostname kończy się na onrender.com) wymuszamy backend z Rendera.
  if (/onrender\.com$/i.test(location.hostname)) {
    API_BASE = "https://cms-backend-o96s.onrender.com";
  }

  console.log("[api] API_BASE =", API_BASE);
}

export function getApiBase() {
  return API_BASE;
}

/** Helper z obsługą 401/403 i JSON */
export async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let data = null;
  try { data = await res.json(); } catch {}

  if (res.status === 401 || res.status === 403) {
    const next = encodeURIComponent(location.pathname + location.search);
    if (!location.pathname.endsWith("/login.html")) {
      location.href = `/login.html?next=${next}`;
    }
    throw new Error(data?.message || "Wymagane zalogowanie");
  }
  if (!res.ok) {
    throw new Error(data?.message || `Błąd ${res.status}`);
  }
  return data;
}

/** Wariant z pełnym statusem (użyteczne przy 409 itp.) */
export async function apiWithStatus(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, data };
}

/** Zwraca profil lub null */
export async function getProfile() {
  const { status, data } = await apiWithStatus("/api/users/profile", { method: "GET" });
  return status === 200 ? data : null;
}
