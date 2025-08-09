// src/js/login.js
import { loadConfig, getApiBase, api, getProfile } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  console.log('[login] API_BASE =', getApiBase());

  const form      = document.getElementById('loginForm');
  const emailEl   = document.getElementById('email');
  const passEl    = document.getElementById('password');
  const errorEl   = document.getElementById('error');   // <p id="error">
  const showPwEl  = document.getElementById('togglePassword'); // np. <input type="checkbox" id="togglePassword">
  const submitBtn = form?.querySelector('button[type="submit"]');

  // Jeśli już zalogowany, nie pokazuj formularza – przekieruj
  try {
    const me = await getProfile();
    if (me) {
      const params = new URLSearchParams(location.search);
      location.replace(params.get('next') || '/');
      return;
    }
  } catch { /* brak profilu = niezalogowany */ }

  if (!form) return;

  // Pokaż/ukryj hasło (opcjonalne – jeśli element istnieje)
  if (showPwEl && passEl) {
    showPwEl.addEventListener('change', () => {
      passEl.type = showPwEl.checked ? 'text' : 'password';
    });
  }

  // ENTER w polu hasła
  passEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') form.requestSubmit();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email = (emailEl?.value || '').trim();
    const password = (passEl?.value || '').trim();

    if (!email || !password) {
      return setError('Podaj email i hasło.');
    }

    setBusy(true);

    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const params = new URLSearchParams(location.search);
      const next = params.get('next') || '/';
      location.href = next;
    } catch (err) {
      setError(err?.message || 'Błąd logowania');
    } finally {
      setBusy(false);
    }
  });

  function setBusy(busy) {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.dataset.loading = busy ? '1' : '0';
    submitBtn.textContent = busy ? 'Loguję…' : 'Zaloguj';
  }

  function setError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    } else {
      alert(msg);
    }
  }

  function clearError() {
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = '';
    }
  }
});
