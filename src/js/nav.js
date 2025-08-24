import { API_BASE } from './api.js'

// helper: pobierz parametr z URL
function getParam(name) {
    const url = new URL(window.location.href)
    return url.searchParams.get(name)
}

// Ustal „next” przy klikaniu Logowanie/Rejestracja
function attachNextParam() {
    const next = encodeURIComponent(location.pathname + location.search)
    const login = document.getElementById("btnLogin")
    const register = document.getElementById("btnRegister")
    if (login)    login.href = `/login.html?next=${next}`
    if (register) register.href = `/register.html?next=${next}`
}

// Pokaż/ukryj menu zależnie od sesji
async function hydrateUserMenu() {
    const btnLogin = document.getElementById("btnLogin")
    const btnRegister = document.getElementById("btnRegister")
    const userMenu = document.getElementById("userMenu")
    const userName = document.getElementById("userName")
    const linkAdmin = document.getElementById("linkAdmin")
    const btnLogout = document.getElementById("btnLogout")
    const userToggle = document.getElementById("userToggle")
    const dropdown = document.getElementById("userDropdown")

    // brak elementów – nic nie robimy
    if (!btnLogin || !btnRegister || !userMenu) return

    try {
        const res = await fetch(`${API_BASE}/api/users/profile`, { credentials: "include" })
        if (!res.ok) throw new Error()
        const me = await res.json()

        // zalogowany
        btnLogin.style.display = "none"
        btnRegister.style.display = "none"
        userMenu.style.display = ""

        userName.textContent = me.username || me.email || "Użytkownik"
        if (me.role === "admin") linkAdmin.style.display = "block"

        // dropdown toggle
        userToggle.addEventListener("click", () => {
            const open = dropdown.hasAttribute("hidden") ? false : true
            if (open) { dropdown.setAttribute("hidden", ""); userToggle.setAttribute("aria-expanded","false") }
            else { dropdown.removeAttribute("hidden"); userToggle.setAttribute("aria-expanded","true") }
        })

        // wylogowanie
        btnLogout.addEventListener("click", async () => {
            await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" })
            location.href = "/" // powrót na stronę główną
        })
    } catch {
        // niezalogowany
        btnLogin.style.display = ""
        btnRegister.style.display = ""
        userMenu.style.display = "none"
        attachNextParam()
    }
}

document.addEventListener("DOMContentLoaded", () => {
    hydrateUserMenu()
    attachNextParam()
})
