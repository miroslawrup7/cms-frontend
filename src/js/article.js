// src/js/article.js
import { loadConfig, getApiBase, api, getProfile } from './api.js'

// DOM
const titleEl   = document.getElementById('article-title')
const metaEl    = document.getElementById('article-meta')
const contentEl = document.getElementById('article-content')
const galleryEl = document.getElementById('article-gallery')
const commentsBox = document.getElementById('comments-container')

const formSection = document.getElementById('comment-form-section')
const formEl      = document.getElementById('comment-form')
const textareaEl  = document.getElementById('comment-text')
const formErrorEl = document.getElementById('comment-error')

// helpers
function getIdFromUrl() {
  const p = new URLSearchParams(location.search)
  return p.get('id') || ''
}

function renderGallery(images = []) {
  const API_BASE = getApiBase()
  if (!images || !images.length) {
    galleryEl.innerHTML = ''
    return
  }

  // prosta galeria: main + thumbs
  const main = images[0]
  const thumbs = images.map(
    (img, i) => `<img data-i="${i}" src="${API_BASE}/${img}" alt="" />`
  ).join('')

  galleryEl.innerHTML = `
    <div class="gallery-main">
      <img id="g-main" src="${API_BASE}/${main}" alt="" />
    </div>
    <div class="thumbs" id="g-thumbs">${thumbs}</div>
  `

  const gMain = document.getElementById('g-main')
  const gThumbs = document.getElementById('g-thumbs')
  if (gThumbs) {
    gThumbs.addEventListener('click', (e) => {
      const t = e.target
      if (t && t.tagName === 'IMG') {
        const idx = Number(t.dataset.i || 0)
        gMain.src = `${API_BASE}/${images[idx]}`
        gThumbs.querySelectorAll('img').forEach(img => img.classList.remove('active'))
        t.classList.add('active')
      }
    })
    // zaznacz pierwszy
    const first = gThumbs.querySelector('img')
    if (first) first.classList.add('active')
  }
}

function renderComments(list = []) {
  if (!list.length) {
    commentsBox.innerHTML = '<p>Brak komentarzy.</p>'
    return
  }

  commentsBox.innerHTML = list.map(c => `
    <div class="comment">
      <p class="comment-text">${c.text}</p>
      <div class="comment-meta">
        <span>${new Date(c.createdAt).toLocaleString()}</span>
        <span>•</span>
        <span>${c.author?.username || c.author?.email || 'użytkownik'}</span>
      </div>
    </div>
  `).join('')
}

async function loadArticleAndComments(id) {
  try {
    // artykuł
    const a = await api(`/api/articles/${id}`)
    titleEl.textContent = a.title || 'Artykuł'
    metaEl.textContent = a.createdAt
      ? new Date(a.createdAt).toLocaleString()
      : ''
    contentEl.innerHTML = a.content || ''

    const images = Array.isArray(a.images) ? a.images : (a.thumbnail ? [a.thumbnail] : [])
    renderGallery(images)

    // komentarze
    const cmts = await api(`/api/articles/${id}/comments`)
    renderComments(Array.isArray(cmts) ? cmts : (cmts.comments || []))
  } catch (err) {
    console.error('[article] Błąd pobierania artykułu:', err)
    titleEl.textContent = 'Błąd'
    contentEl.innerHTML = `<p style="color:crimson">${err.message || 'Nie udało się wczytać artykułu.'}</p>`
    commentsBox.innerHTML = ''
  }
}

async function initCommentFormVisibility() {
  try {
    const me = await getProfile()
    if (me) {
      formSection.style.display = ''
    } else {
      formSection.style.display = 'none'
    }
  } catch {
    formSection.style.display = 'none'
  }
}

function bindCommentForm(id) {
  if (!formEl) return
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault()
    formErrorEl.style.display = 'none'
    const text = (textareaEl.value || '').trim()
    if (!text) {
      formErrorEl.textContent = 'Komentarz nie może być pusty.'
      formErrorEl.style.display = 'block'
      return
    }

    try {
      await api(`/api/articles/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text })
      })
      textareaEl.value = ''
      // przeładuj komentarze
      const cmts = await api(`/api/articles/${id}/comments`)
      renderComments(Array.isArray(cmts) ? cmts : (cmts.comments || []))
    } catch (err) {
      formErrorEl.textContent = err.message || 'Nie udało się dodać komentarza.'
      formErrorEl.style.display = 'block'
    }
  })
}

// boot
;(async () => {
  try {
    await loadConfig()
    console.log('[article] API_BASE =', getApiBase())

    const id = getIdFromUrl()
    if (!id) {
      titleEl.textContent = 'Brak ID artykułu'
      return
    }

    await initCommentFormVisibility()
    await loadArticleAndComments(id)
    bindCommentForm(id)
  } catch (e) {
    console.error('[article] Błąd inicjalizacji:', e)
  }
})()
