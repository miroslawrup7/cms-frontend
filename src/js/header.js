// src/js/header.js
import { getApiBase, getProfile } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[header] API_BASE =', getApiBase());

  // Jeśli masz elementy UI w nagłówku (np. imię użytkownika, link "Zaloguj/ Wyloguj"),
  // to tutaj możesz je zaktualizować na podstawie profilu.
  try {
    const me = await getProfile();
    // przykład:
    // document.querySelector('#userEmail')?.textContent = me?.email || 'Gość';
  } catch {
    // brak sesji — zostaw jak jest
  }
});
