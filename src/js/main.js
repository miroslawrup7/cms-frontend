// src/js/main.js
import { configPromise, getApiBase, api, getProfile } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1) Poczekaj aż API_BASE zostanie ustawione z /config/config.json
  await configPromise;

  // 2) Start aplikacji (lista artykułów)
  await startApp();
});

function buildThumbPath(path) {
  if (!path) return null;
  const base = getApiBase();
  const clean = String(path).replace(/^\/+/, '');
  return `${base}/${clean}`;
}

async function startApp() {
  console.log('[main] Start. API_BASE =', getApiBase());

  // Niejawne sprawdzenie profilu (nie blokuje UI)
  try {
    const me = await getProfile();
    console.log('[main] Profil użytkownika:', me || null);
  } catch (e) {
    console.warn('[main] getProfile error:', e?.message || e);
  }

  // --- Stan listy ---
  const limit = 5;
  let totalPages = 1;
  let currentPage = 1;
  let q = '';
  let sort = 'newest';

  // --- Elementy DOM ---
  const container = document.getElementById('articles-container');
  const pageInfo = document.getElementById('page-info');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const qInput = document.getElementById('q');
  const sortSel = document.getElementById('sort');

  // --- URL <-> stan ---
  function readStateFromUrl() {
    const p = new URLSearchParams(location.search);
    currentPage = Math.max(1, parseInt(p.get('page') || '1', 10));
    q = (p.get('q') || '').trim();
    sort = p.get('sort') || 'newest';
    if (qInput) qInput.value = q;
    if (sortSel) sortSel.value = sort;
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (currentPage > 1) p.set('page', String(currentPage));
    if (q) p.set('q', q);
    if (sort && sort !== 'newest') p.set('sort', sort);
    const newUrl = p.toString() ? `/?${p.toString()}` : '/';
    history.replaceState(null, '', newUrl);
    try { sessionStorage.setItem('cms:lastListURL', newUrl); } catch {}
  }

  // --- Render ---
  function renderArticles(list) {
    if (!container) return;
    if (!list?.length) {
      container.innerHTML = '<p>Brak artykułów.</p>';
      return;
    }

    const html = list.map(a => {
      const href = `/article.html?id=${a._id}`;
      const thumb = buildThumbPath(a.thumbnail);
      const txt = String(a.content || '');
      const excerpt = txt.length > 180 ? `${txt.slice(0, 180)}…` : txt;

      return `
        <article class="article-card">
          ${thumb ? `<a class="article-cover" href="${href}"><img class="article-thumb" src="${thumb}" alt=""></a>` : ''}
          <div class="article-body">
            <h2 class="article-title"><a href="${href}">${a.title}</a></h2>
            <p class="article-excerpt">${excerpt}</p>
            <div class="article-meta">
              <span>👍 ${a.likesCount || 0}</span>
              <span>💬 ${a.commentCount || 0}</span>
            </div>
          </div>
        </article>`;
    }).join('');

    container.innerHTML = html;
  }

  function updatePaginationUI() {
    if (pageInfo) pageInfo.textContent = `Strona ${currentPage} z ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    const wrap = document.getElementById('pagination');
    if (wrap) wrap.style.display = totalPages > 1 ? '' : 'none';
  }

  // --- Pobranie listy ---
  async function loadArticles(page = 1) {
    if (container) container.innerHTML = '<p>Ładowanie…</p>';
    if (pageInfo) pageInfo.textContent = '';

    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(q ? { q } : {}),
      ...(sort ? { sort } : {})
    });

    try {
      const data = await api(`/api/articles?${query.toString()}`, { method: 'GET' });
      const list = data.articles || [];
      const total = Number(data.total || 0);
      const newTotalPages = Math.max(1, Math.ceil(total / limit));

      if (total === 0) {
        currentPage = 1;
        totalPages = 1;
        if (container) container.innerHTML = '<p>Brak artykułów.</p>';
        updatePaginationUI();
        syncUrl();
        return;
      }

      if (page > newTotalPages) {
        currentPage = newTotalPages;
        totalPages = newTotalPages;
        syncUrl();
        await loadArticles(currentPage);
        return;
      }

      totalPages = newTotalPages;
      renderArticles(list);
      updatePaginationUI();
    } catch (err) {
      if (container) container.innerHTML = `<p style="color:crimson">${err.message || 'Błąd ładowania'}</p>`;
      if (pageInfo) pageInfo.textContent = '';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
    }
  }

  // --- Handlery ---
  prevBtn?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      syncUrl();
      loadArticles(currentPage);
    }
  });

  nextBtn?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      syncUrl();
      loadArticles(currentPage);
    }
  });

  let qTimer = null;
  qInput?.addEventListener('input', () => {
    q = qInput.value.trim();
    if (qTimer) clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      currentPage = 1;
      syncUrl();
      loadArticles(currentPage);
    }, 300);
  });

  sortSel?.addEventListener('change', () => {
    sort = sortSel.value;
    currentPage = 1;
    syncUrl();
    loadArticles(currentPage);
  });

  window.addEventListener('pageshow', (e) => {
    const nav = performance.getEntriesByType?.('navigation')?.[0];
    if (e.persisted || (nav && nav.type === 'back_forward')) {
      readStateFromUrl();
      loadArticles(currentPage);
    }
  });

  window.addEventListener('popstate', () => {
    readStateFromUrl();
    loadArticles(currentPage);
  });

  // --- Start ---
  readStateFromUrl();
  syncUrl();
  loadArticles(currentPage);
}
