import { API_BASE } from './api.js'
const limit = 5
let totalPages = 1

let currentPage = 1
let q = ''
let sort = 'newest'

// === Elementy DOM ===
const container = document.getElementById('articles-container')
const pageInfo  = document.getElementById('page-info')
const prevBtn   = document.getElementById('prev')
const nextBtn   = document.getElementById('next')
const qInput    = document.getElementById('q')
const sortSel   = document.getElementById('sort')

// === Odczyt stanu z URL i wypełnienie kontrolek ===
function readStateFromUrl() {
  const p = new URLSearchParams(location.search)
  currentPage = Math.max(1, parseInt(p.get('page') || '1', 10))
  q = (p.get('q') || '').trim()
  sort = p.get('sort') || 'newest'
  if (qInput)  qInput.value = q
  if (sortSel) sortSel.value = sort
}

// === Zapis stanu do URL (bez przeładowania) ===
function syncUrl() {
  const p = new URLSearchParams()
  if (currentPage > 1) p.set('page', String(currentPage))
  if (q)               p.set('q', q)
  if (sort && sort !== 'newest') p.set('sort', sort)
  const newUrl = p.toString() ? `/?${p.toString()}` : '/'
  history.replaceState(null, '', newUrl)

  // NEW: zapamiętaj ostatni adres listy (z filtrami/stroną)
  try {
    sessionStorage.setItem('cms:lastListURL', newUrl)
  } catch {}
}

// === Render listy ===
function renderArticles(list) {
  if (!list || list.length === 0) {
    container.innerHTML = '<p>Brak artykułów.</p>'
    return
  }

  const html = list.map(a => {
    const href = `/article.html?id=${a._id}`
    const thumb = a.thumbnail ? `<img class="article-thumb" src="${API_BASE}/${a.thumbnail}" alt="">` : ''
    const excerpt = (a.content || '').slice(0, 180) + (a.content && a.content.length > 180 ? '…' : '')
    const meta = `
      <div class="article-meta">
        <span>👍 ${a.likesCount || 0}</span>
        <span>💬 ${a.commentCount || 0}</span>
      </div>`

    return `
      <article class="article-card">
        <a class="article-cover" href="${href}">${thumb}</a>
        <div class="article-body">
          <h2 class="article-title"><a href="${href}">${a.title}</a></h2>
          <p class="article-excerpt">${excerpt}</p>
          ${meta}
        </div>
      </article>
    `
  }).join('')

  container.innerHTML = html
}

// === Paginacja UI ===
function updatePaginationUI() {
  pageInfo.textContent = `Strona ${currentPage} z ${totalPages}`
  prevBtn.disabled = currentPage <= 1
  nextBtn.disabled = currentPage >= totalPages

  const wrap = document.getElementById('pagination')
  if (wrap) wrap.style.display = totalPages > 1 ? '' : 'none'
}

// === Pobranie listy ===
async function loadArticles(page = 1) {
  container.innerHTML = '<p>Ładowanie…</p>'
  pageInfo.textContent = ''

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(q ? { q } : {}),
    ...(sort ? { sort } : {})
  })

  try {
    const res = await fetch(`${API_BASE}/api/articles?${query.toString()}`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || `Błąd ${res.status}`)

    const articles = data.articles || []
    const total = Number(data.total || 0)
    const newTotalPages = Math.max(1, Math.ceil(total / limit))

    // --- PRZYPADKI KRAWĘDZIOWE PO USUNIĘCIU / FILTRACH ---

    // 1) Nie ma żadnych artykułów w ogóle (total=0)
    if (total === 0) {
      currentPage = 1
      totalPages = 1
      container.innerHTML = '<p>Brak artykułów.</p>'
      updatePaginationUI()
      // dopnij czysty URL (bez page), ale zachowaj q/sort
      syncUrl()
      return
    }

    // 2) Bieżąca strona > liczby stron (np. byłeś na page=2 i ostatni wpis usunięto)
    if (page > newTotalPages) {
      currentPage = newTotalPages
      totalPages = newTotalPages
      // zaktualizuj URL, a potem pobierz jeszcze raz już z poprawną stroną
      syncUrl()
      await loadArticles(currentPage)
      return
    }

    // --- normalny render ---
    totalPages = newTotalPages
    renderArticles(articles)
    updatePaginationUI()

  } catch (err) {
    container.innerHTML = `<p style="color:crimson">${err.message || 'Błąd ładowania'}</p>`
    pageInfo.textContent = ''
    prevBtn.disabled = true
    nextBtn.disabled = true
  }
}


// === Handlery paginacji ===
prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--
    syncUrl()
    loadArticles(currentPage)
  }
})
nextBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++
    syncUrl()
    loadArticles(currentPage)
  }
})

// === Filtry ===
let qTimer = null
qInput.addEventListener('input', () => {
  q = qInput.value.trim()
  if (qTimer) clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    currentPage = 1
    syncUrl()
    loadArticles(currentPage)
  }, 300)
})

sortSel.addEventListener('change', () => {
  sort = sortSel.value
  currentPage = 1
  syncUrl()
  loadArticles(currentPage)
})

// === Odśwież po powrocie z historii (BFCache / back-forward) ===
window.addEventListener('pageshow', (e) => {
  // e.persisted — safari/firefox BFCache
  // performance.navigation — wykrycie back/forward w nowoczesnych przeglądarkach
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0]
  if (e.persisted || (nav && nav.type === 'back_forward')) {
    readStateFromUrl()
    loadArticles(currentPage)
  }
})

// Fallback — zmiana stanu historii (np. ręczne cofnięcie/naprzód)
window.addEventListener('popstate', () => {
  readStateFromUrl()
  loadArticles(currentPage)
})

// === Start ===
readStateFromUrl()
syncUrl()
loadArticles(currentPage)
