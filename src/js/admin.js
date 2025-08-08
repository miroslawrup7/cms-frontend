import { toast, toastError, confirmToast } from './toast.js'
import { API_BASE, getProfile } from './api.js'

let currentPage = 1
const limit = 10
let totalPages = 1

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const me = await getProfile()
    if (!me || me.role !== 'admin') {
      toastError('Brak dostępu')
      return
    }

    insertSearchAndPagination()
    bindSearch()
    await loadPendingUsers()
  } catch {
    toastError('Błąd ładowania danych administratora')
  }
})

function insertSearchAndPagination() {
  const table = document.querySelector('#pendingTable')
  if (!table) return

  const search = document.createElement('input')
  search.type = 'text'
  search.id = 'search-input'
  search.className = 'admin__search'
  search.placeholder = 'Szukaj…'

  const pagination = document.createElement('div')
  pagination.className = 'pagination'
  pagination.innerHTML = `
    <button class="pagination__btn" id="prev-page">Poprzednia</button>
    <span class="pagination__info" id="pagination-info">Strona 1 z 1</span>
    <button class="pagination__btn" id="next-page">Następna</button>
  `

  table.parentElement.insertBefore(search, table)
  table.parentElement.appendChild(pagination)
}

function bindSearch() {
  document.getElementById('search-input')?.addEventListener('input', async () => {
    currentPage = 1
    await loadPendingUsers()
  })

  document.getElementById('prev-page')?.addEventListener('click', async () => {
    if (currentPage > 1) {
      currentPage--
      await loadPendingUsers()
    }
  })

  document.getElementById('next-page')?.addEventListener('click', async () => {
    if (currentPage < totalPages) {
      currentPage++
      await loadPendingUsers()
    }
  })
}

async function loadPendingUsers() {
  const search = document.getElementById('search-input')?.value || ''

  try {
    const res = await fetch(`${API_BASE}/api/admin/pending-users?search=${encodeURIComponent(search)}&page=${currentPage}&limit=${limit}`, {
      credentials: 'include'
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Błąd ładowania wniosków')

    renderTable(data.pendingUsers || [])
    updatePagination(data.total, data.page, data.totalPages)
  } catch (err) {
    toastError(err.message || 'Błąd pobierania danych')
  }
}

function renderTable(users = []) {
  const tbody = document.getElementById('pendingBody')
  if (!tbody) return

  tbody.innerHTML = users.length
    ? users.map(user => `
        <tr>
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>${user.role}</td>
          <td>
            <button class="btn--sm btn-approve" data-id="${user._id}">Zatwierdź</button>
            <button class="btn--sm btn--danger btn-reject" data-id="${user._id}">Odrzuć</button>
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="4">Brak wyników.</td></tr>`

  document.querySelectorAll('.btn-approve').forEach(btn =>
    btn.addEventListener('click', () => handleDecision(btn.dataset.id, true))
  )

  document.querySelectorAll('.btn-reject').forEach(btn =>
    btn.addEventListener('click', () => handleDecision(btn.dataset.id, false))
  )
}

function updatePagination(total, page, totalPg) {
  totalPages = totalPg || 1
  currentPage = page || 1

  const wrapper = document.querySelector('.pagination')
  const info = document.getElementById('pagination-info')

  wrapper.style.display = totalPages > 1 ? 'flex' : 'none'
  if (info) info.textContent = `Strona ${currentPage} z ${totalPages}`

  document.getElementById('prev-page').disabled = currentPage <= 1
  document.getElementById('next-page').disabled = currentPage >= totalPages
}

async function handleDecision(id, approve) {
  const confirmed = await confirmToast({
    message: approve ? 'Zatwierdzić tego użytkownika?' : 'Odrzucić tego użytkownika?',
    okText: approve ? 'Zatwierdź' : 'Odrzuć',
    cancelText: 'Anuluj'
  })
  if (!confirmed) return

  try {
    const res = await fetch(`${API_BASE}/api/admin/${approve ? 'approve' : 'reject'}/${id}`, {
      method: 'POST',
      credentials: 'include'
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Błąd operacji')

    toast(approve ? 'Zatwierdzono.' : 'Odrzucono.', 'success')
    await loadPendingUsers()
  } catch (err) {
    toastError(err.message || 'Błąd operacji')
  }
}
