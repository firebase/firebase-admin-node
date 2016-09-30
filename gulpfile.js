'use strict';

/**************/
/*  REQUIRES  */
/**************/
var _ = require('lodash');
var gulp = require('gulp');
var pkg = require('./package.json');
var runSequence = require('run-sequence');

// File I/O
var fs = require('fs');
var exit = require('gulp-exit');
var tslint = require('gulp-tslint');
var ts = require('gulp-typescript');
var del = require('del');
var merge = require('merge2');
var header = require('gulp-header');
var replace = require('gulp-replace');

// Testing
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');


/****************/
/*  FILE PATHS  */
/****************/
var paths = {
  src: [
    'src/**/*.ts',
    'typings/index.d.ts'
  ],

  vendor: [
    'src/**/*.js'
  ],

  tests: [
    'test/*.spec.ts',
    'test/resources/mocks.ts'
  ],

  resources: [
    'test/resources/*.json'
  ],

  build: 'lib/',

  testBuild: '.tmp/',

  testRunner: ['.tmp/test/index.spec.js']
};

var project = ts.createProject('tsconfig.json');

/***********/
/*  TASKS  */
/***********/

gulp.task('cleanup', function() {
  return del([
    paths.build,
    paths.testBuild
  ]);
});

gulp.task('compile', function() {
  var banner = [
    `/*! firebase-admin v${pkg.version}`,
    `    https://developers.google.com/terms */`,
    ``].join('\n');

  return gulp.src(paths.src)
    // Compile TypeScript
    .pipe(ts(project)).js

    // Replace SDK version
    .pipe(replace(/\<XXX_SDK_VERSION_XXX\>/g, pkg.version))

    // Add header
    .pipe(header(banner))

    // Write to build directory
    .pipe(gulp.dest(paths.build));
});

gulp.task('vendor', function() {
  return gulp.src(paths.vendor)
    .pipe(gulp.dest(paths.build))
});

// Lints the source and test files
gulp.task('lint', function() {
  let filesToLint = _.clone(paths.src.concat(paths.tests));
  filesToLint.splice(filesToLint.indexOf('typings/index.d.ts'), 1)
  return gulp.src(filesToLint)
    .pipe(tslint())
    .pipe(tslint.report({
      summarizeFailureOutput: true
    }));
});

// Runs the test suite
gulp.task('test', function() {
  merge(
    gulp.src(paths.tests.concat(paths.src), {base: '.'})
      .pipe(ts(project))
      .pipe(gulp.dest(paths.testBuild)),
    gulp.src(paths.resources, {base: '.'})
      .pipe(gulp.dest(paths.testBuild))
  ).on('finish', function() {
    return gulp.src(paths.testBuild + 'src/**/*.js')
      .pipe(istanbul())
      .pipe(istanbul.hookRequire())
      .on('finish', function() {
        return gulp.src(paths.testRunner)
          .pipe(mocha({
            reporter: 'spec',
            timeout: 5000
          }))
          .pipe(istanbul.writeReports())
          .on('finish', function() {
            return del(paths.testBuild).then(exit);
          });
      });
  })
});

// Re-runs the linter and regenerates js every time a source file changes
gulp.task('watch', function() {
  gulp.watch(paths.src, ['lint', 'compile']);
});

// Build task
gulp.task('build', function(done) {
  runSequence('cleanup', 'compile', 'vendor', function(error) {
    done(error && error.err);
  });
});

// Default task
gulp.task('default', function(done) {
  runSequence('lint', 'build', 'test', function(error) {
    done(error && error.err);
  });
});
