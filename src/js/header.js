import { API_BASE, getProfile } from './api.js'

/* Zbuduj HTML nagłówka */
function buildHeader() {
  return `
<header class="site-header">
  <div class="nav-wrap">
    <a class="brand" href="/">CMS</a>
    <nav class="nav-actions">
      <a id="btnLogin" class="btn btn--ghost" href="/login.html">Zaloguj</a>
      <a id="btnRegister" class="btn btn--primary" href="/register.html">Zarejestruj</a>

      <a id="adminNavBtn" data-role="admin" class="btn btn--ghost hidden" href="/admin.html">Panel admina</a>

      <div id="userMenu" class="user-menu" style="display:none">
        <button id="userToggle" class="user-chip" aria-expanded="false">
          <span id="userName">Użytkownik</span>
          <span class="user-avatar" aria-hidden="true">👤</span>
        </button>
        <div id="userDropdown" class="user-dropdown" hidden>
          <a id="newArticleBtn" href="/new-article.html" data-role="authorOrAdmin" class="btn btn--primary hidden">Dodaj artykuł</a>
          <a id="linkAdmin" href="/admin.html" style="display:none">Panel admina</a>
          <button id="btnLogout" type="button">Wyloguj</button>
        </div>
      </div>
    </nav>
  </div>
</header>`
}

/* Wstrzyknij nagłówek na początek <body> (raz) */
function injectHeader() {
  if (document.querySelector(".site-header")) return
  const wrapper = document.createElement("div")
  wrapper.innerHTML = buildHeader()
  document.body.prepend(wrapper.firstElementChild)
}

/* ?next= – dodaj powrót na bieżącą stronę do linków logowania/rejestracji */
function attachNextParam() {

  if (location.pathname.endsWith('/login.html') || location.pathname.endsWith('/register.html')) return

  const next = encodeURIComponent(location.pathname + location.search)
  const btnLogin = document.getElementById("btnLogin")
  const btnRegister = document.getElementById("btnRegister")
  if (btnLogin)    btnLogin.href = `/login.html?next=${next}`
  if (btnRegister) btnRegister.href = `/register.html?next=${next}`
}

/* Pobierz profil (jeśli zalogowany) */
async function getMe() {
  return await getProfile() // zwraca obiekt lub null
}

/* Zapobiegaj przeładowaniu, gdy klikamy link prowadzący na tę samą stronę */
function preventReloadOnSamePage(link) {
  if (!link) return
  link.addEventListener('click', (e) => {
    // Normalizujemy docelową ścieżkę linku i obecną ścieżkę
    const targetPath = new URL(link.getAttribute('href'), location.origin).pathname
    const currentPath = location.pathname
    if (targetPath === currentPath) {
      e.preventDefault() // już tu jesteśmy – nic nie rób
    }
  })
}

/* Zachowanie menu użytkownika, przełączenia widoczności, logout */
function wireUserMenu(me) {
  const btnLogin    = document.getElementById("btnLogin")
  const btnRegister = document.getElementById("btnRegister")
  const userMenu    = document.getElementById("userMenu")
  const userName    = document.getElementById("userName")
  const linkAdmin   = document.getElementById("linkAdmin")
  const adminNavBtn = document.getElementById("adminNavBtn")
  const btnLogout   = document.getElementById("btnLogout")
  const userToggle  = document.getElementById("userToggle")
  const dropdown    = document.getElementById("userDropdown")

  if (!btnLogin || !btnRegister || !userMenu) return

  // — ZAWSZE zamknij dropdown na starcie —
  if (dropdown) {
    dropdown.setAttribute("hidden", "")
    dropdown.style.display = "none"
    userToggle?.setAttribute("aria-expanded", "false")
  }

  if (me) {
    // zalogowany
    btnLogin.style.display = "none"
    btnRegister.style.display = "none"
    userMenu.style.display = ""

    userName.textContent = me.username || me.email || "Użytkownik"
    if (me.role === "admin") {
      if (linkAdmin)   linkAdmin.style.display = "block"
      if (adminNavBtn) adminNavBtn.style.display = "inline-flex"
    } else {
      if (linkAdmin)   linkAdmin.style.display = "none"
      if (adminNavBtn) adminNavBtn.style.display = "none"
    }

    // Zapobiegaj przeładowaniu, gdy już jesteśmy na admin.html
    preventReloadOnSamePage(adminNavBtn)
    preventReloadOnSamePage(linkAdmin)

    function closeDropdown() {
      if (!dropdown) return
      dropdown.setAttribute("hidden", "")
      dropdown.style.display = "none"
      userToggle?.setAttribute("aria-expanded", "false")
    }
    function openDropdown() {
      if (!dropdown) return
      dropdown.removeAttribute("hidden")
      dropdown.style.display = ""
      userToggle?.setAttribute("aria-expanded", "true")
    }

    // Toggle dropdowna
    userToggle?.addEventListener("click", (e) => {
      e.stopPropagation()
      const open = dropdown && !dropdown.hasAttribute("hidden")
      open ? closeDropdown() : openDropdown()
    })

    // Zamknij po kliknięciu poza menu
    document.addEventListener("click", (e) => {
      if (dropdown && !dropdown.hasAttribute("hidden") && !e.target.closest(".user-menu")) {
        closeDropdown()
      }
    })

    // Logout
    btnLogout?.addEventListener("click", async () => {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" })
      } catch {}
      location.href = "/"
    })
  } else {
    // niezalogowany
    btnLogin.style.display = ""
    btnRegister.style.display = ""
    userMenu.style.display = "none"
    attachNextParam()
  }
}

/* Strażnik strony admina */
function guardAdminPage(me) {
  const isAdminPage = /\/admin\.html($|\?)/.test(location.pathname + location.search)
  if (!isAdminPage) return

  if (!me) {
    const next = encodeURIComponent(location.pathname + location.search)
    location.href = `/login.html?next=${next}`
    return
  }
  if (me.role !== "admin") {
    location.href = "/"
  }
}

/* Ustaw UI nagłówka w zależności od stanu zalogowania */
function setHeaderUI(me) {
  const loginBtn   = document.getElementById("btnLogin")
  const registerBtn= document.getElementById("btnRegister")
  const adminBtn   = document.getElementById("adminNavBtn")
  const userMenu   = document.getElementById("userMenu")
  const userName   = document.getElementById("userName")

  const isLogged = !!me
  const isAdmin  = me?.role === "admin"

  if (loginBtn)    loginBtn.style.display = isLogged ? "none" : ""
  if (registerBtn) registerBtn.style.display = isLogged ? "none" : ""
  if (userMenu)    userMenu.style.display   = isLogged ? "" : "none"
  if (userName)    userName.textContent     = isLogged ? (me.username || me.email) : ""
  if (adminBtn)    adminBtn.style.display   = isAdmin ? "" : "none"

  // obsługa elementów z data-role
  document.querySelectorAll("[data-role]").forEach(el => {
    const need = el.getAttribute("data-role")
    const visible =
      (need === "user" && isLogged) ||
      (need === "admin" && isAdmin) ||
      (need === "authorOrAdmin" && (me?.role === "author" || isAdmin))
    el.classList.toggle("hidden", !visible)
  })
}

/* Ogólny guard – używaj na stronach wymagających roli */
function guardPage(requiredRole = null, me = null) {
  if (!me) {
    const next = encodeURIComponent(location.pathname + location.search)
    location.href = `/login.html?next=${next}`
    return
  }
  if (!requiredRole) return
  const ok =
    requiredRole === "user" ||
    me.role === requiredRole ||
    (requiredRole === "authorOrAdmin" && (me.role === "author" || me.role === "admin"))
  if (!ok) location.href = "/"
}

/* Inicjalizacja */
document.addEventListener("DOMContentLoaded", async () => {
  injectHeader()
  attachNextParam()

  const me = await getMe()       // pobranie profilu (lub null)
  setHeaderUI(me)                // przestaw widoczność elementów
  guardAdminPage(me)             // zostaw – Twój istniejący guard admina
  wireUserMenu(me)               // menu użytkownika / logout
})
