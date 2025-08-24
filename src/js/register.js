document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    const username = document.getElementById("username").value
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    const role = document.getElementById("role").value

    try {
        const res = await fetch("http://localhost:5000/api/auth/register-pending", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, email, password, role })
        })

        const data = await res.json()

        if (res.ok) {
            document.getElementById("success").textContent = "Wniosek rejestracyjny został przesłany do zatwierdzenia."
            document.getElementById("error").textContent = ""
            e.target.reset()
        } else {
            document.getElementById("error").textContent = data.message || "Błąd rejestracji"
            document.getElementById("success").textContent = ""
        }

        // po sukcesie logowania:
        const params = new URLSearchParams(location.search)
        const next = params.get("next")
        location.href = next || "/"

    } catch (err) {
        document.getElementById("error").textContent = "Błąd połączenia z serwerem"
    }
})
