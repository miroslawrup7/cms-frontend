import { getProfile, API_BASE } from './api.js'
import { toast, toastError } from './toast.js'

// Guard: tylko author/admin
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const me = await getProfile()
    if (!me || !['author', 'admin'].includes(me.role)) {
      toastError('Brak uprawnień.')
      location.href = '/'
      return
    }
    init()
  } catch {
    toastError('Błąd autoryzacji.')
    location.href = '/'
  }
})

const pageUrl = new URL(location.href)
const articleId = pageUrl.searchParams.get('id')

const form = document.getElementById('article-form')
const titleEl = document.getElementById('title')
const contentEl = document.getElementById('content')
const imagesInput = document.getElementById('images')
const preview = document.getElementById('preview')
const existingWrap = document.getElementById('existing-images')
const submitBtn = document.getElementById('submit-btn')

const MAX_FILES = 5
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

function init() {
  // <form novalidate> żeby HTML nie blokował własnych komunikatów
  if (form && !form.hasAttribute('novalidate')) form.setAttribute('novalidate', '')

  if (articleId) {
    const pt = document.getElementById('page-title')
    if (pt) pt.textContent = 'Edytuj artykuł'
    loadArticleForEdit()
  }

  if (imagesInput) imagesInput.addEventListener('change', handleFilesPreview)
  if (form) form.addEventListener('submit', onSubmit)
}

function handleFilesPreview(e) {
  if (preview) preview.innerHTML = ''
  const files = Array.from((e && e.target && e.target.files) ? e.target.files : [])

  if (files.length > MAX_FILES) {
    toastError(`Maksymalnie ${MAX_FILES} plików.`)
    if (imagesInput) imagesInput.value = ''
    return
  }

  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (!f.type || !f.type.startsWith('image/')) {
      toastError('Dozwolone tylko obrazy.')
      if (imagesInput) imagesInput.value = ''
      return
    }
    if (f.size > MAX_SIZE) {
      toastError('Każdy obraz ≤ 5MB.')
      if (imagesInput) imagesInput.value = ''
      return
    }
    const objUrl = URL.createObjectURL(f)
    const img = document.createElement('img')
    img.src = objUrl
    img.alt = f.name
    if (preview) preview.appendChild(img)
  }
}

async function loadArticleForEdit() {
  try {
    const res = await fetch(`${API_BASE}/api/articles/${articleId}`, { credentials: 'include' })
    const data = await res.json()
    if (!res.ok) throw new Error((data && data.message) || `Błąd ${res.status}`)

    const a = data.article || data
    if (titleEl) titleEl.value = a.title || ''
    if (contentEl) contentEl.value = a.content || ''

    if (Array.isArray(a.images) && a.images.length && existingWrap) {
      existingWrap.style.display = ''
      existingWrap.innerHTML = [
        '<p>Istniejące obrazy (zaznacz, aby usunąć podczas zapisu):</p>',
        '<div class="existing-grid">',
        a.images.map((p, i) => {
          const src = `${API_BASE}/${String(p).replace(/^\/+/, '')}`
          return (
            '<label class="ex-item">' +
              `<input type="checkbox" name="removeImages" value="${String(p)}">` +
              `<img src="${src}" alt="img${i}">` +
            '</label>'
          )
        }).join(''),
        '</div>'
      ].join('')
    }
  } catch (err) {
    toastError((err && err.message) ? err.message : 'Nie udało się wczytać artykułu do edycji.')
  }
}

async function onSubmit(e) {
  e.preventDefault()
  if (submitBtn) submitBtn.disabled = true

  try {
    const title = (titleEl && titleEl.value ? titleEl.value : '').trim()
    const content = (contentEl && contentEl.value ? contentEl.value : '').trim()

    if (title.length < 5) throw new Error('Tytuł musi mieć min. 5 znaków.')
    if (content.length < 20) throw new Error('Treść musi mieć min. 20 znaków.')

    const fd = new FormData()
    fd.append('title', title)
    fd.append('content', content)

    // obrazy do usunięcia (przy edycji)
    if (existingWrap) {
      const checks = existingWrap.querySelectorAll('input[name="removeImages"]:checked')
      checks.forEach(chk => {
        if (chk && chk.value != null) fd.append('removeImages', chk.value)
      })
    }

    // nowe pliki
    const files = Array.from(imagesInput && imagesInput.files ? imagesInput.files : [])
    if (files.length > MAX_FILES) throw new Error(`Maksymalnie ${MAX_FILES} plików.`)
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (!f.type || !f.type.startsWith('image/')) throw new Error('Dozwolone tylko obrazy (MIME).')
      if (f.size > MAX_SIZE) throw new Error('Każdy obraz ≤ 5MB.')
      fd.append('images', f)
    }

    const method = articleId ? 'PUT' : 'POST'
    const endpoint = articleId
      ? `${API_BASE}/api/articles/${articleId}`
      : `${API_BASE}/api/articles`

    const res = await fetch(endpoint, { method, credentials: 'include', body: fd })
    let data = {}
    try { data = await res.json() } catch {}

    if (res.status === 403) throw new Error((data && data.message) || 'Brak uprawnień.')
    if (!res.ok) throw new Error((data && data.message) || `Błąd ${res.status}`)

    const id = (data && data.article && data.article._id) ? data.article._id : (articleId || '')
    if (id) {
      location.href = `/article.html?id=${id}`
    } else {
      location.href = '/'
    }
  } catch (err) {
    toastError((err && err.message) ? err.message : 'Błąd zapisu.')
  } finally {
    if (submitBtn) submitBtn.disabled = false
  }
}
