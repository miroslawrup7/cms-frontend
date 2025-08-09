// src/js/article.js
import { loadConfig, getApiBase, api, getProfile } from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  await startArticle();
});

async function startArticle() {
  const API_BASE = getApiBase();

  // elementy
  const titleEl   = document.getElementById("article-title");
  const metaEl    = document.getElementById("article-meta");
  const contentEl = document.getElementById("article-content");
  const galleryEl = document.getElementById("article-gallery");

  const p = new URLSearchParams(location.search);
  const id = p.get("id");
  if (!id) { location.href = "/"; return; }

  try {
    const data = await api(`/api/articles/${id}`, { method: "GET" });

    // tytuł i meta
    titleEl.textContent = data.title || "Bez tytułu";
    metaEl.textContent = new Date(data.createdAt).toLocaleString();

    // galeria (0..n obrazów)
    if (Array.isArray(data.images) && data.images.length) {
      const imgs = data.images.map(rel =>
        `<img src="${API_BASE}/${String(rel).replace(/^\/+/, "")}" alt="">`
      ).join("");
      galleryEl.innerHTML = imgs;
    } else if (data.thumbnail) {
      galleryEl.innerHTML = `<img src="${API_BASE}/${String(data.thumbnail).replace(/^\/+/, "")}" alt="">`;
    } else {
      galleryEl.innerHTML = "";
    }

    // treść
    contentEl.innerHTML = (data.content || "").replace(/\n/g, "<br>");
  } catch (e) {
    titleEl.textContent = "Nie znaleziono artykułu";
    metaEl.textContent = "";
    contentEl.textContent = e?.message || "Błąd pobierania";
    galleryEl.innerHTML = "";
  }
}
