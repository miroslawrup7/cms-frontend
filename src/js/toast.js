// src/js/toast.js

// --- zwykłe toasty (na dole ekranu) ---
function ensureToastRoot() {
  let root = document.getElementById('toast-root')
  if (!root) {
    root = document.createElement('div')
    root.id = 'toast-root'
    root.className = 'toast-layer'
    document.body.appendChild(root)
  } else {
    root.classList.add('toast-layer')
  }
  return root
}

export function toast(message, type = 'info', timeout = 3000) {
  const root = ensureToastRoot()
  const el = document.createElement('div')
  el.className = 'toast'

  const map = {
    success: 'toast--success',
    error: 'toast--error',
    info: 'toast--info',
    warn: 'toast--warn',
    warning: 'toast--warning'
  }
  el.classList.add(map[type] || map.info)

  el.innerHTML = `<span class="toast-msg">${message}</span>`
  root.appendChild(el)

  const remove = () => {
    el.classList.add('toast--hide')
    el.addEventListener('transitionend', () => el.remove(), { once: true })
  }
  const t = setTimeout(remove, timeout)
  el.addEventListener('click', () => { clearTimeout(t); remove() })
}

export function toastError(message, timeout = 4000) {
  toast(message, 'error', timeout)
}

// --- confirm modal (wyśrodkowany w viewport, z overlay) ---
export function confirmToast({
  message,
  okText = 'OK',
  cancelText = 'Anuluj',
  timeout = 0 // 0 = bez auto-zamykania
} = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'toast-overlay'

    const modal = document.createElement('div')
    modal.className = 'toast toast--confirm'
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-modal', 'true')

    modal.innerHTML = `
      <div class="toast__msg">${message || 'Potwierdzić?'}</div>
      <div class="toast__actions">
        <button type="button" class="btn btn--primary toast__ok">${okText}</button>
        <button type="button" class="btn btn--ghost toast__cancel">${cancelText}</button>
      </div>
    `

    document.body.appendChild(overlay)
    document.body.appendChild(modal)

    const okBtn = modal.querySelector('.toast__ok')
    const cancelBtn = modal.querySelector('.toast__cancel')
    const prevActive = document.activeElement
    okBtn?.focus()

    const cleanup = (val) => {
      modal.classList.add('toast--hide')
      overlay.classList.add('toast-overlay--hide')
      const done = () => {
        modal.remove()
        overlay.remove()
        prevActive && prevActive.focus?.()
        resolve(val)
      }
      let left = 0
      const onEnd = () => { if (++left === 2) done() }
      modal.addEventListener('transitionend', onEnd, { once: true })
      overlay.addEventListener('transitionend', onEnd, { once: true })
      // fallback gdyby nie było transitionend
      setTimeout(done, 250)
    }

    const onKey = (e) => {
      if (e.key === 'Escape') cleanup(false)
      if (e.key === 'Enter')  cleanup(true)
    }

    okBtn?.addEventListener('click', () => cleanup(true))
    cancelBtn?.addEventListener('click', () => cleanup(false))
    overlay.addEventListener('click', () => cleanup(false))
    document.addEventListener('keydown', onKey)

    // auto-close (jeśli ustawiono)
    let timer = null
    if (timeout > 0) timer = setTimeout(() => cleanup(false), timeout)

    // posprzątaj nasłuch klawiatury przy zamknięciu
    const stopKeys = () => document.removeEventListener('keydown', onKey)
    modal.addEventListener('transitionend', stopKeys, { once: true })
  })
}
