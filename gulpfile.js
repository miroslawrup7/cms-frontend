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
        entry: 'src/scss/main.scss',
        watch: 'src/scss/**/*.scss',
        dest: 'dist/css/' 
    },
    config: { src: 'src/config/**/*.json', dest: 'dist/config/' },
    img: { src: 'src/img/**/*', dest: 'dist/img/' }
}

async function clean() {
    const dir = path.resolve('dist')
    await fs.rm(dir, { recursive: true, force: true })
}

function html() {
    return src(paths.html.src).pipe(dest(paths.html.dest))
}

function config() {
    return src(paths.config.src).pipe(dest(paths.config.dest))
}

function images() {
    return src(paths.img.src, { allowEmpty: true }).pipe(dest(paths.img.dest))
}

function js() {
    return src(paths.js.src)
        .pipe(sourcemaps.init())
        .pipe(terser({ ecma: 2017 }).on('error', function(e){
            console.error(e.message)
            this.emit('end')
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(dest(paths.js.dest))
}

function scss() {
    return src(paths.scss.entry)
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(postcss([autoprefixer(), cssnano()]))
        .pipe(sourcemaps.write('.'))
        .pipe(dest(paths.scss.dest))
        .pipe(browserSync.stream()) // <-- live reload CSS bez pełnego przeładowania
}

function cacheBust() {
    const timestamp = new Date().getTime()
    return src('dist/**/*.html')
        .pipe(replace(/cache_bust=\d+/g, `cache_bust=${timestamp}`))
        .pipe(dest('dist'))
}

function serve() {
    browserSync.init({
        server: { baseDir: 'dist' },
        notify: false,
        port: 3000
    })

    watch(paths.html.src, series(html, cacheBust)).on('change', browserSync.reload)
    watch(paths.scss.watch, scss) 
    watch(paths.js.src, series(js, cacheBust)).on('change', browserSync.reload)
    watch(paths.config.src, series(config, cacheBust)).on('change', browserSync.reload)
    watch(paths.img.src, series(images, cacheBust)).on('change', browserSync.reload)
}

exports.clean = clean
exports.build = series(clean, parallel(html, scss, js, config, images), cacheBust)
exports.default = series(clean, parallel(html, scss, js, config, images), cacheBust, serve)
