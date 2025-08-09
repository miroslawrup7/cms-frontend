// src/js/nav.js
import { getApiBase, getProfile } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[nav] API_BASE =', getApiBase());

  const applyRoleVisibility = (role) => {
    document.querySelectorAll('[data-role]').forEach(el => {
      const req = el.getAttribute('data-role'); // np. "authorOrAdmin", "admin", "user"
      const isAuth = !!role;

      let show = false;
      if (req === 'any') show = true;
      else if (req === 'authorOrAdmin') show = role === 'author' || role === 'admin';
      else if (req === 'loggedIn') show = isAuth;
      else if (req === 'loggedOut') show = !isAuth;
      else show = role === req;

      el.classList.toggle('hidden', !show);
    });
  };

  try {
    const me = await getProfile();
    applyRoleVisibility(me?.role || null);
  } catch {
    applyRoleVisibility(null);
  }
});
