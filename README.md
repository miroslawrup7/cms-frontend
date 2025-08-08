# CMS Frontend

Statyczny frontend (HTML + ES Modules + SCSS).

## Opcja A: skrypty npm (prosty dev server)
```bash
cd frontend
npm install
npm run build:css      # SCSS → CSS (src/scss/main.scss → src/css/main.css)
npm run watch:css      # obserwowanie zmian SCSS
npm run serve          # serwowanie ./src na http://localhost:3000
```

    ## Opcja B: z Gulp (na podstawie dostarczonego `gulpfile.js`)
    Dostępne taski:
    - `build`
- `clean`
- `default`

    Przykładowe komendy (dopasuj do swoich tasków):
    ```bash
    gulp styles        # kompilacja SCSS → CSS (src/scss/**/*.scss → src/css)
    gulp watch         # watch SCSS/HTML/JS (src/scss/**/*.scss, src/**/*.html, src/js/**/*.js)
    gulp serve         # uruchom BrowserSync (baseDir: dist, port: 3000)
    ```

## Konfiguracja API
- Front odwołuje się do API przez `src/js/api.js` (`API_BASE = "http://localhost:5000"`).
- Można też dodać `src/config/config.json` (obecnie pusty) i czytać bazowy URL stamtąd.

## Deploy
- Skompiluj SCSS do `src/css/main.css` i opublikuj zawartość `src/` za reverse proxy / CDN.



## Uwaga: Gulp i nowoczesny JavaScript

Jeśli korzystasz z `gulp-terser` do minifikacji kodu JavaScript, upewnij się, że:

- Nie używasz `await` na najwyższym poziomie pliku (`top-level await`), ponieważ może to powodować błąd `Unexpected token: name (fetch)` przy buildzie.
- W plikach JS, które muszą dynamicznie ładować konfigurację (np. `fetch('/config/config.json')`), używaj `.then()` zamiast `async/await`.

Przykład poprawnej formy:
```js
fetch('/config/config.json')
  .then(res => res.ok ? res.json() : null)
  .then(cfg => {
    if (cfg?.API_BASE) API_BASE = cfg.API_BASE
  })
```

Dzięki temu kod frontendowy będzie kompatybilny z Gulp + Terser i nie wykrzaczy się podczas minifikacji.
