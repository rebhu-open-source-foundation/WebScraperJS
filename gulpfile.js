const gulp = require('gulp')
const browserify = require('browserify')
const watchify = require('watchify')
const source = require('vinyl-source-stream')
const notify = require('gulp-notify')
const karma = require('karma')
const path = require('path')
const babelify = require('babelify')
const mocha = require('gulp-mocha')
// We do karma in gulp instead of npm because we need to recompute all the generated bundles that are loaded to the browser
const runTests = (function () {
  let builds = 0
  return function (done = function () {}) {
    builds++
    // One build per bundle
    if (builds % 3 === 0) {
      runKarma(done)
      runNodeTests()
    }
  }
})()

function runKarma (done) {  // const server = new Server({
     //configFile: path.join(__dirname, 'karma.conf.js'),
     //singleRun: true
  // }, done)
  //const cfg = karma.config;
  const parseConfig = karma.config.parseConfig;
  const Server = karma.Server
  parseConfig(
    path.resolve('./karma.conf.js'),
    { port: 9876 },
    { promiseConfig: true, throwErrors: true }
  ).then(
    (karmaConfig) => {
      const server = new Server(karmaConfig, function doneCallback(exitCode) {
        console.log('Karma has exited with ' + exitCode)
        process.exit(exitCode)
      })
    },
    (rejectReason) => { /* respond to the rejection reason error */ }
  );
  
}

function runNodeTests () {
  return gulp.src([
    'tests/jsdomSpec.js',
    'tests/spec/*Spec.js',
    'tests/spec/Selector/*Spec.js',
    'tests/spec/jsdom/*Spec.js',
    'tests/spec/headless/*Spec.js'
  ])
    .pipe(mocha({
      require: ['babel-register']
    }).on('error', console.error))
}

gulp.task('build:watch', () => generateBuilder(true, true))
gulp.task('build', () => generateBuilder(false, false))

gulp.task('default', gulp.series('build:watch'))

function generateBuilder (isWatch, debug) {
  const wrapper = isWatch ? watchify : (x) => x
  const bundlerBackground = wrapper(browserify({
    standalone: 'backgroundScraper',
    entries: [
      'extension/background_page/background_script.js'
    ],
    debug
  }))
  const bundlerScraper = wrapper(browserify({
    standalone: 'contentScraper',
    entries: [
      'extension/content_script/content_scraper_browser.js'
    ],
    debug
  }))
  const bundlerDevtools = wrapper(browserify({
    standalone: 'contentScraper',
    entries: [
      'extension/scripts/App.js'
    ],
    debug
  }))

  setBundler(bundlerBackground, 'background-scraper.js')
  setBundler(bundlerScraper, 'content-scraper.js')
  setBundler(bundlerDevtools, 'devtools-scraper.js')
  function gulpBundle (bundler, file) {
    bundler.bundle()
      .on('error', function (err) {
        return notify().write(err)
      })
      .pipe(source(file))
      .pipe(gulp.dest('extension/generated/'))
      .on('error', function (e) {
        console.error(e)
      })
      .on('end', function () {
        runTests()
        console.log('finished bundling')
        // TODO launch tests
      })
  }

  function setBundler (bundler, file) {
    bundler
      .transform(babelify, {})
      .on('update', function () {
        gulpBundle(bundler, file)
      })
      .on('error', function (err) {
        return notify().write(err)
      })
      .on('log', function (log) {
        console.log(log)
      })
    return gulpBundle(bundler, file)
  }
}
