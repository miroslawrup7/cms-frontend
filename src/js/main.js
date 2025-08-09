import { api, getProfile, loadConfig } from './api.js'

// Konfiguracja i start aplikacji
loadConfig()
  .then(() => {
    console.log('✅ Konfiguracja załadowana')
    startApp()
  })
  .catch(err => {
    console.error('❌ Błąd ładowania konfiguracji:', err)
  })

// Start aplikacji po załadowaniu API_BASE
async function startApp() {
  const profile = await getProfile()
  console.log('👤 Profil użytkownika:', profile)

  const limit = 5
  let totalPages = 1
  let currentPage = 1
  let q = ''
  let sort = 'newest'

  const container = document.getElementById('articles-container')
  const pageInfo = document.getElementById('page-info')
  const prevBtn = document.getElementById('prev')
  const nextBtn = document.getElementById('next')
  const qInput = document.getElementById('q')
  const sortSel = document.getElementById('sort')

  function readStateFromUrl() {
    const p = new URLSearchParams(location.search)
    currentPage = Math.max(1, parseInt(p.get('page') || '1', 10))
    q = (p.get('q') || '').trim()
    sort = p.get('sort') || 'newest'
    if (qInput) qInput.value = q
    if (sortSel) sortSel.value = sort
  }

  function syncUrl() {
    const p = new URLSearchParams()
    if (currentPage > 1) p.set('page', String(currentPage))
    if (q) p.set('q', q)
    if (sort && sort !== 'newest') p.set('sort', sort)
    const newUrl = p.toString() ? `/?${p.toString()}` : '/'
    history.replaceState(null, '', newUrl)
    try {
      sessionStorage.setItem('cms:lastListURL', newUrl)
    } catch {}
  }

  function renderArticles(list) {
    if (!list || list.length === 0) {
      container.innerHTML = '<p>Brak artykułów.</p>'
      return
    }

    const html = list.map(a => {
      const href = `/article.html?id=${a._id}`
      const thumbSrc = a.thumbnail ? `${API_BASE}/${a.thumbnail}` : ''
      const thumb = a.thumbnail ? `<img class="article-thumb" src="${thumbSrc}" alt="">` : ''
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

  function updatePaginationUI() {
    pageInfo.textContent = `Strona ${currentPage} z ${totalPages}`
    prevBtn.disabled = currentPage <= 1
    nextBtn.disabled = currentPage >= totalPages
    const wrap = document.getElementById('pagination')
    if (wrap) wrap.style.display = totalPages > 1 ? '' : 'none'
  }

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
      const data = await api(`/api/articles?${query.toString()}`)
      const articles = data.articles || []
      const total = Number(data.total || 0)
      const newTotalPages = Math.max(1, Math.ceil(total / limit))

      if (total === 0) {
        currentPage = 1
        totalPages = 1
        container.innerHTML = '<p>Brak artykułów.</p>'
        updatePaginationUI()
        syncUrl()
        return
      }

      if (page > newTotalPages) {
        currentPage = newTotalPages
        totalPages = newTotalPages
        syncUrl()
        await loadArticles(currentPage)
        return
      }

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

  // Handlery
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

  window.addEventListener('pageshow', (e) => {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0]
    if (e.persisted || (nav && nav.type === 'back_forward')) {
      readStateFromUrl()
      loadArticles(currentPage)
    }
  })

  window.addEventListener('popstate', () => {
    readStateFromUrl()
    loadArticles(currentPage)
  })

  // Start listy
  readStateFromUrl()
  syncUrl()
  loadArticles(currentPage)
}
