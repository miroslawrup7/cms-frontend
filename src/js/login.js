// src/js/login.js
import { API_BASE } from './api.js'
import { toast, toastError } from './toast.js' // jeśli nie używasz toastów, usuń importy i wywołania

function isEmail(s) {
  return /^\S+@\S+\.\S+$/.test(String(s || '').trim())
}

function showError(msg) {
  const el = document.getElementById('error')
  if (el) {
    el.textContent = msg
    el.hidden = false
    el.style.display = ''
  }
  if (typeof toastError === 'function') toastError(msg)
}

function showSuccess(msg) {
  if (typeof toast === 'function') toast(msg, 'success')
}

/** Bezpieczne wyliczenie adresu docelowego po logowaniu */
function computeSafeRedirect(role) {
  const params = new URLSearchParams(location.search)
  let next = params.get('next') || '/'

  try {
    const url = new URL(next, location.origin)

    // 1) tylko ten sam origin
    if (url.origin !== location.origin) return '/'

    // 2) nigdy nie kieruj na login/register (by uniknąć pętli)
    const p = url.pathname.toLowerCase()
    if (p.endsWith('/login.html') || p.endsWith('/register.html')) return '/'

    // 3) jeśli next=/admin.html, ale user nie jest adminem → fallback na /
    if (p.endsWith('/admin.html') && role !== 'admin') return '/'

    // OK — zwróć ścieżkę (zachowaj parametry)
    return url.pathname + url.search + url.hash
  } catch {
    return '/'
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm')
  if (!form) return
  form.addEventListener('submit', onSubmit)
})

async function onSubmit(e) {
  e.preventDefault()

  const emailEl = document.getElementById('email')
  const passEl  = document.getElementById('password')
  const errorEl = document.getElementById('error')
  const submitBtn = e.submitter || document.querySelector('#loginForm button[type="submit"]')

  if (errorEl) errorEl.textContent = ''

  const email = emailEl?.value?.trim()
  const password = passEl?.value || ''

  // Walidacja frontowa
  if (!isEmail(email)) return showError('Podaj prawidłowy adres e-mail.')
  if (password.length < 6) return showError('Hasło musi mieć co najmniej 6 znaków.')

  if (submitBtn) submitBtn.disabled = true

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    })

    let data = {}
    try { data = await res.json() } catch {}

    if (!res.ok) {
      if (res.status === 429) return showError(data?.message || 'Zbyt wiele prób logowania. Spróbuj ponownie za kilka minut.')
      if (res.status === 400 || res.status === 401) return showError(data?.message || 'Nieprawidłowy e-mail lub hasło.')
      return showError(data?.message || `Błąd serwera (${res.status}).`)
    }

    showSuccess('Zalogowano pomyślnie.')

    // (opcjonalnie) sprawdź rolę — wykorzystamy do bezpiecznego redirectu
    let role = null
    try {
      const pRes = await fetch(`${API_BASE}/api/users/profile`, { credentials: 'include' })
      if (pRes.ok) {
        const p = await pRes.json()
        role = p?.role || null
      }
    } catch {}

    // —— BEZPIECZNY REDIRECT ——
    // Priorytet: ?next= (zweryfikowany), w przeciwnym razie:
    // admin → /admin.html, inni → /
    let target = computeSafeRedirect(role)
    if (!target || target === '/') {
      target = (role === 'admin') ? '/admin.html' : '/'
    }

    // nie zostawiaj login.html w historii
    setTimeout(() => { location.replace(target) }, 300)

  } catch {
    showError('Błąd połączenia z serwerem.')
  } finally {
    if (submitBtn) submitBtn.disabled = false
  }
}
