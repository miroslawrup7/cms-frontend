const { src, dest, watch, series, parallel } = require('gulp')
const sass = require('gulp-sass')(require('sass'))
const postcss = require('gulp-postcss')
const sourcemaps = require('gulp-sourcemaps')
const terser = require('gulp-terser')
const browserSync = require('browser-sync').create()
const replace = require('gulp-replace')
const fs = require('fs/promises')
const path = require('path')

const autoprefixer = require('autoprefixer')
const cssnano = require('cssnano')

const paths = {
    html: { src: 'src/**/*.html', dest: 'dist/' },
    js: { src: 'src/js/**/*.js', dest: 'dist/js/' },
    scss: { 
        entry: 'src/scss/main.scss', // <- tylko main.scss jako punkt wejścia
        watch: 'src/scss/**/*.scss', // <- do obserwacji wszystkich podmodułów
        dest: 'dist/css/' 
    },
    config: { src: 'src/config/**/*.json', dest: 'dist/config/' },
    img: { src: 'src/img/**/*', dest: 'dist/img/' }
}

// Czyszczenie folderu dist
async function clean() {
    const dir = path.resolve('dist')
    try {
        await fs.rm(dir, { recursive: true, force: true })
    } catch (err) {
        console.warn('Nie udało się usunąć katalogu dist:', err)
    }
}

// HTML
function html() {
    return src(paths.html.src).pipe(dest(paths.html.dest))
}

// Konfiguracja (np. JSON)
function config() {
    return src(paths.config.src).pipe(dest(paths.config.dest))
}

// Obrazki
function images() {
    return src(paths.img.src, { allowEmpty: true }).pipe(dest(paths.img.dest))
}

// JS
function js() {
    return src(paths.js.src)
        .pipe(sourcemaps.init())
        .pipe(terser({ ecma: 2017 }))
        .pipe(sourcemaps.write('.'))
        .pipe(dest(paths.js.dest))
}

// SCSS → CSS z autoprefixerem i minifikacją
function scss() {
    return src(paths.scss.entry) // <- Tylko main.scss
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(postcss([autoprefixer(), cssnano()]))
        .pipe(sourcemaps.write('.'))
        .pipe(dest(paths.scss.dest))
}

// Cache busting
function cacheBust() {
    const timestamp = new Date().getTime()
    return src('dist/**/*.html')
        .pipe(replace(/cache_bust=\d+/g, `cache_bust=${timestamp}`))
        .pipe(dest('dist'))
}

// Live reload
function serve() {
    browserSync.init({
        server: { baseDir: 'dist' },
        notify: false,
        port: 3000
    })

    watch(paths.html.src, html).on('change', browserSync.reload)
    watch(paths.scss.watch, scss).on('change', browserSync.reload) // <- obserwuj wszystkie SCSS
    watch(paths.js.src, js).on('change', browserSync.reload)
    watch(paths.config.src, config).on('change', browserSync.reload)
    watch(paths.img.src, images).on('change', browserSync.reload)
}

// Zadania
exports.clean = clean
exports.build = series(clean, parallel(html, scss, js, config, images), cacheBust)
exports.default = series(clean, parallel(html, scss, js, config, images), cacheBust, serve)
