import { getProfile, API_BASE } from './api.js'
import { toast, toastError, confirmToast } from './toast.js'

const urlParams = new URLSearchParams(window.location.search)
const articleId = urlParams.get('id')

const titleEl = document.getElementById('article-title')
const contentEl = document.getElementById('article-content')
const metaEl = document.getElementById('article-meta')
const galleryEl = document.getElementById('article-gallery')

let likesCount = 0
let likedByMe = false

async function loadArticle() {
  titleEl.textContent = 'Ładowanie…'
  contentEl.innerHTML = ''
  metaEl.textContent = ''
  galleryEl.innerHTML = ''

  try {
    const res = await fetch(`${API_BASE}/api/articles/${articleId}`, {
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || `Błąd ${res.status}`)
    const a = data.article || data

    likesCount = Array.isArray(a.likes) ? a.likes.length : (a.likesCount || 0)

    let me = null
    try { me = await getProfile() } catch {}
    const isOwner = me && (me.role === 'admin' || String(me._id) === String(a.author?._id || a.author))
    likedByMe = !!(me && Array.isArray(a.likes) && a.likes.some(id => String(id) === String(me._id)))

    const images = Array.isArray(a.images) ? a.images : []
    const commentCount = typeof a.commentCount === 'number' ? a.commentCount : (data.commentCount || 0)
    const authorLabel = a.author?.email || a.author?.username || 'Autor'

    titleEl.textContent = a.title || '(bez tytułu)'
    contentEl.innerHTML = (a.content || '').replace(/\n/g, '<br>')

    const parts = []
    if (authorLabel) parts.push(authorLabel)
    if (a.createdAt) parts.push(fmtDate(a.createdAt))
    parts.push(`👍 <span id="likes-count">${likesCount}</span>`)
    parts.push(`💬 ${commentCount}`)

    metaEl.innerHTML = `
    <div class="meta-left">
        ${parts.join(' • ')}
    </div>
    <div class="meta-right">
        ${(!isOwner && me) ? `
        <button id="like-btn"
                class="btn btn--ghost btn--like"
                aria-pressed="${likedByMe ? 'true' : 'false'}"
                aria-label="${likedByMe ? 'Cofnij polubienie' : 'Polub artykuł'}">
            <span class="like-label">${likedByMe ? 'Lubisz' : 'Lubię to'}</span>
        </button>
        ` : ''}
        ${isOwner ? `
        <a id="editArticleBtn" class="btn btn--ghost" href="/new-article.html?id=${a._id}">
            Edytuj artykuł
        </a>
        <button id="deleteArticleBtn" class="btn btn--danger">Usuń artykuł</button>
        ` : ''}
    </div>
    `

    if (me && !isOwner) {
      document.getElementById('like-btn')?.addEventListener('click', handleLikeToggle)
    }

    if (isOwner) {
      document.getElementById('deleteArticleBtn')?.addEventListener('click', handleDeleteArticle)
    }

    renderGallery(images)
  } catch (err) {
    titleEl.textContent = 'Błąd'
    metaEl.textContent = ''
    contentEl.innerHTML = `<p style="color:crimson">${err.message || 'Nie udało się wczytać artykułu.'}</p>`
    galleryEl.innerHTML = ''
  }
}

async function loadComments() {
  const container = document.getElementById('comments-container')
  if (!container) return

  container.innerHTML = '<p>Ładowanie komentarzy…</p>'

  try {
    // pobierz listę
    const res = await fetch(`${API_BASE}/api/comments/${articleId}`)
    const comments = await res.json()

    // kto jest zalogowany (żeby wiedzieć czy pokazywać Edytuj/Usuń)
    let me = null
    try { me = await getProfile() } catch {}

    // render
    if (!Array.isArray(comments) || comments.length === 0) {
      container.innerHTML = '<p>Brak komentarzy.</p>'
      return
    }

    container.innerHTML = comments.map(c => {
      const isAuthor = me && String(me._id) === String(c.author?._id || c.author)
      const isAdmin  = me && me.role === 'admin'
      const canEdit  = !!(isAuthor || isAdmin)

      return `
        <div class="comment" data-id="${c._id}">
          <p class="comment-text">${c.text}</p>
          <div class="comment-meta">
            <span>${c.author?.username || 'Anonim'}</span> •
            <span>${new Date(c.createdAt).toLocaleString()}</span>
            ${canEdit ? `
              <button class="btn--sm btn-edit-comment">Edytuj</button>
              <button class="btn--sm btn--danger btn-delete-comment">Usuń</button>
            ` : ''}
          </div>
        </div>
      `
    }).join('')
  } catch (err) {
    container.innerHTML = '<p style="color:crimson">Błąd ładowania komentarzy</p>'
    toastError('Błąd ładowania komentarzy')
  }
}

// === Formularz komentarza ===
document.getElementById("comment-form").addEventListener("submit", async (e) => {
  e.preventDefault()

  const textarea = document.getElementById("comment-text")
  const commentText = (textarea?.value || "").trim()

  // Walidacja frontowa (krótka)
  if (!commentText || commentText.length < 6) {
    toastError("Komentarz musi mieć przynajmniej 6 znaków.")
    textarea?.focus()
    return
  }

  try {
    const res = await fetch(`${API_BASE}/api/comments/${articleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text: commentText })
    })

    let data = {}
    try { data = await res.json() } catch {}

    if (!res.ok) {
      const msg = data?.message || "Błąd serwera"
      toastError(msg)

      // Jeśli po sanitacji komentarz jest pusty lub backend zgłasza 400 – czyść i fokusuj
      if (
        res.status === 400 &&
        /pusty po odfiltrowaniu|co najmniej 6 znaków|nie może być pusty/i.test(msg)
      ) {
        if (textarea) {
          textarea.value = ""
          textarea.focus()
        }
      }
      return
    }

    // Sukces — czyść pole i odśwież listę
    if (textarea) textarea.value = ""
    await loadComments()
  } catch (err) {
    toastError(err?.message || "Błąd połączenia z serwerem")
    textarea?.focus()
  }
})

function renderComments(comments, me) {
    const list = document.getElementById('comments-list')
    if (!list) return

    list.innerHTML = comments.map(c => {
        const canEdit = me && (me._id === c.author._id || me.role === 'admin')
        return `
        <div class="comment" data-id="${c._id}">
            <p class="comment-text">${c.text}</p>
            <div class="comment-meta">
                <span>${c.author.username}</span> • 
                <span>${new Date(c.createdAt).toLocaleString()}</span>
                ${canEdit ? `
                    <button class="btn--sm btn-edit-comment">Edytuj</button>
                    <button class="btn--sm btn--danger btn-delete-comment">Usuń</button>
                ` : ''}
            </div>
        </div>
        `
    }).join('')
}

document.getElementById('comments-list')?.addEventListener('click', async e => {
    const commentEl = e.target.closest('.comment')
    if (!commentEl) return
    const id = commentEl.dataset.id

    // Usuń komentarz
    if (e.target.classList.contains('btn-delete-comment')) {
        confirmToast({
            message: 'Usunąć ten komentarz?',
            okText: 'Usuń',
            cancelText: 'Anuluj',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_BASE}/api/comments/${id}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    })
                    if (!res.ok) throw new Error((await res.json())?.message || `Błąd ${res.status}`)
                    commentEl.remove()
                    toast('Komentarz usunięty.', 'success')
                } catch (err) {
                    toastError(err.message || 'Błąd usuwania komentarza.')
                }
            }
        })
    }

    // Edytuj komentarz
    if (e.target.classList.contains('btn-edit-comment')) {
        const textEl = commentEl.querySelector('.comment-text')
        const oldText = textEl.textContent
        textEl.innerHTML = `<textarea class="edit-comment-text">${oldText}</textarea>
            <div class="edit-actions">
                <button class="btn--sm btn-save-comment">Zapisz</button>
                <button class="btn--sm btn-cancel-edit">Anuluj</button>
            </div>`
    }

    // Anuluj edycję
    if (e.target.classList.contains('btn-cancel-edit')) {
        const textEl = commentEl.querySelector('.comment-text')
        const original = textEl.dataset.original || ''
        textEl.textContent = original || textEl.textContent
    }

    // Zapisz edycję
    if (e.target.classList.contains('btn-save-comment')) {
        const newText = commentEl.querySelector('.edit-comment-text')?.value.trim()
        if (!newText || newText.length < 6) {
            toastError('Komentarz musi mieć co najmniej 6 znaków.')
            return
        }
        try {
            const res = await fetch(`${API_BASE}/api/comments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ text: newText })
            })
            if (!res.ok) throw new Error((await res.json())?.message || `Błąd ${res.status}`)
            const updated = await res.json()
            commentEl.querySelector('.comment-text').textContent = updated.text
            toast('Komentarz zaktualizowany.', 'success')
        } catch (err) {
            toastError(err.message || 'Błąd zapisu komentarza.')
        }
    }
})

document.getElementById('comments-container')?.addEventListener('click', async (e) => {
  const container = e.currentTarget
  const commentEl = e.target.closest('.comment')
  if (!commentEl) return
  const id = commentEl.dataset.id

  // ========== USUŃ ==========
  if (e.target.closest('.btn-delete-comment')) {
    const ok = await confirmToast({
      message: 'Usunąć ten komentarz?',
      okText: 'Usuń',
      cancelText: 'Anuluj'
    })
    if (!ok) return

    try {
      const res = await fetch(`${API_BASE}/api/comments/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error((await res.json())?.message || `Błąd ${res.status}`)
      commentEl.remove()
      toast('Komentarz usunięty.', 'success')

      if (!container.querySelector('.comment')) {
        container.innerHTML = '<p>Brak komentarzy.</p>'
      }
    } catch (err) {
      toastError(err.message || 'Błąd usuwania komentarza.')
    }
    return
  }

  // ========== WEJDŹ W TRYB EDYCJI ==========
  if (e.target.closest('.btn-edit-comment')) {
    // jeśli już edytujemy ten komentarz – nic nie rób
    if (commentEl.classList.contains('is-editing') ||
        commentEl.querySelector('.edit-comment-text')) return

    const textWrap = commentEl.querySelector('.comment-text')
    if (!textWrap) return

    // zapamiętaj oryginalny HTML (mogą być linki itp.)
    commentEl.dataset.originalHtml = textWrap.innerHTML

    const oldText = textWrap.textContent
    textWrap.innerHTML = `
      <textarea class="edit-comment-text">${oldText}</textarea>
      <div class="edit-actions">
        <button class="btn--sm btn-save-comment">Zapisz</button>
        <button class="btn--sm btn-cancel-edit">Anuluj</button>
      </div>
    `
    commentEl.classList.add('is-editing')

    // zablokuj przycisk "Edytuj" na czas edycji (opcjonalnie)
    const editBtn = commentEl.querySelector('.btn-edit-comment')
    if (editBtn) editBtn.disabled = true

    // autofocus
    commentEl.querySelector('.edit-comment-text')?.focus()
    return
  }

  // ========== ANULUJ EDYCJĘ ==========
  if (e.target.closest('.btn-cancel-edit')) {
    const textWrap = commentEl.querySelector('.comment-text')
    const original = commentEl.dataset.originalHtml || textWrap?.textContent || ''
    if (textWrap) textWrap.innerHTML = original

    commentEl.classList.remove('is-editing')
    delete commentEl.dataset.originalHtml

    const editBtn = commentEl.querySelector('.btn-edit-comment')
    if (editBtn) editBtn.disabled = false
    return
  }

  // ========== ZAPISZ EDYCJĘ ==========
  if (e.target.closest('.btn-save-comment')) {
    const area = commentEl.querySelector('.edit-comment-text')
    const newText = (area?.value || '').trim()
    if (newText.length < 6) {
      toastError('Komentarz musi mieć co najmniej 6 znaków.')
      area?.focus()
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: newText })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || `Błąd ${res.status}`)

      // backend zwraca zsanityzowany HTML w data.text
      const textWrap = commentEl.querySelector('.comment-text')
      if (textWrap) textWrap.innerHTML = data.text

      toast('Komentarz zaktualizowany.', 'success')
    } catch (err) {
      toastError(err.message || 'Błąd zapisu komentarza.')
      // w razie błędu możesz zostawić edycję otwartą – to wygodniejsze dla usera
      return
    } finally {
      commentEl.classList.remove('is-editing')
      delete commentEl.dataset.originalHtml
      const editBtn = commentEl.querySelector('.btn-edit-comment')
      if (editBtn) editBtn.disabled = false
    }
  }
})

function fmtDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return '' }
}

function renderGallery(images = []) {
  galleryEl.innerHTML = ''
  if (!images || images.length === 0) return

  const safe = images.map(src => `${API_BASE}/${String(src).replace(/^\/+/, '')}`)

  const main = document.createElement('div')
  main.className = 'gallery-main'
  main.innerHTML = `<img src="${safe[0]}" alt="">`

  const thumbs = document.createElement('div')
  thumbs.className = 'thumbs'
  thumbs.innerHTML = safe.map((s, i) =>
    `<img src="${s}" alt="" data-idx="${i}" class="${i === 0 ? 'active' : ''}">`
  ).join('')

  thumbs.addEventListener('click', (e) => {
    const img = e.target.closest('img[data-idx]')
    if (!img) return
    const idx = Number(img.dataset.idx)
    main.querySelector('img').src = safe[idx]
    thumbs.querySelectorAll('img').forEach(t => t.classList.remove('active'))
    img.classList.add('active')
  })

  galleryEl.appendChild(main)
  if (safe.length > 1) galleryEl.appendChild(thumbs)
}

let likeBusy = false

async function handleLikeToggle(e) {
  if (likeBusy) return
  likeBusy = true
  const btn = e.currentTarget
  btn.disabled = true

  const countEl = document.getElementById('likes-count')
  const prevLiked = likedByMe
  const prevCount = likesCount

  likedByMe = !likedByMe
  likesCount += likedByMe ? 1 : -1
  if (countEl) countEl.textContent = String(Math.max(0, likesCount))
  btn.querySelector('.like-label').textContent = likedByMe ? 'Lubisz' : 'Lubię to'
  btn.setAttribute('aria-pressed', likedByMe ? 'true' : 'false')
  btn.setAttribute('aria-label', likedByMe ? 'Cofnij polubienie' : 'Polub artykuł')

  try {
    const res = await fetch(`${API_BASE}/api/articles/${articleId}/like`, {
      method: 'POST',
      credentials: 'include'
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || `Błąd ${res.status}`)

    if (typeof data.totalLikes === 'number') {
      likesCount = data.totalLikes
      if (countEl) countEl.textContent = String(Math.max(0, likesCount))
    }
    likedByMe = !!data.liked
    btn.querySelector('.like-label').textContent = likedByMe ? 'Lubisz' : 'Lubię to'
    btn.setAttribute('aria-pressed', likedByMe ? 'true' : 'false')
    btn.setAttribute('aria-label', likedByMe ? 'Cofnij polubienie' : 'Polub artykuł')
  } catch (err) {
    likedByMe = prevLiked
    likesCount = prevCount
    if (countEl) countEl.textContent = String(Math.max(0, likesCount))
    btn.querySelector('.like-label').textContent = likedByMe ? 'Lubisz' : 'Lubię to'
    btn.setAttribute('aria-pressed', likedByMe ? 'true' : 'false')
    btn.setAttribute('aria-label', likedByMe ? 'Cofnij polubienie' : 'Polub artykuł')
    toastError(err.message || 'Nie udało się zapisać polubienia.')
  } finally {
    btn.disabled = false
    likeBusy = false
  }
}

async function handleDeleteArticle() {
  const ok = await confirmToast({
    message: "Na pewno usunąć ten artykuł? Tej operacji nie można cofnąć.",
    okText: "Usuń",
    cancelText: "Anuluj"
  })
  if (!ok) return

  const btn = document.getElementById('deleteArticleBtn')
  btn.disabled = true
  try {
    const res = await fetch(`${API_BASE}/api/articles/${articleId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (res.status === 204) {
      toast("Artykuł został usunięty.", "success")
      setTimeout(() => {
        const r = document.referrer || ''
        if (r.startsWith(location.origin) && new URL(r).pathname === '/') {
          location.href = r
        } else {
          location.href = '/'
        }
      }, 600)
      return
    }
    const data = await res.json().catch(() => ({}))
    if (res.status === 403) {
      toastError(data?.message || 'Brak uprawnień do usunięcia.')
      document.getElementById('editArticleBtn')?.remove()
      btn?.remove()
      return
    }
    throw new Error(data?.message || `Błąd ${res.status}`)
  } catch (err) {
    toastError(err.message || 'Nie udało się usunąć artykułu.')
  } finally {
    btn.disabled = false
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadArticle()
  await loadComments()

  const back = document.getElementById('backToListBtn')
  if (back) {
    try {
      const saved = sessionStorage.getItem('cms:lastListURL')
      if (saved) back.setAttribute('href', saved)
    } catch {}

    back.addEventListener('click', (e) => {
      try {
        const saved = sessionStorage.getItem('cms:lastListURL')
        if (saved) {
          e.preventDefault()
          location.href = saved
          return
        }
      } catch {}

      const r = document.referrer || ''
      if (r.startsWith(location.origin)) {
        e.preventDefault()
        history.back()
        return
      }

      e.preventDefault()
      location.href = '/'
    })
  }

  try {
    const me = await getProfile()
    const section = document.getElementById("comment-form-section")
    if (section) section.style.display = me ? "" : "none"
  } catch {
    const section = document.getElementById("comment-form-section")
    if (section) section.style.display = "none"
  }
})
