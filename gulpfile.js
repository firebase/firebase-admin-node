/*!
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**************/
/*  REQUIRES  */
/**************/
var fs = require('fs');
var _ = require('lodash');
var gulp = require('gulp');
var pkg = require('./package.json');

// File I/O
var fs = require('fs');
var ts = require('gulp-typescript');
var del = require('del');
var header = require('gulp-header');
var replace = require('gulp-replace');
var filter = require('gulp-filter');


/****************/
/*  FILE PATHS  */
/****************/
var paths = {
  src: [
    'src/**/*.ts',
  ],

  test: [
    'test/**/*.ts',
    '!test/integration/typescript/src/example*.ts',
  ],

  databaseSrc: [
    'src/**/*.js'
  ],

  build: 'lib/',

  curatedTypings: ['lib/database.d.ts'],
};

// Create a separate project for buildProject that overrides the rootDir
// This ensures that the generated production files are in their own root
// rather than including both src and test in the lib dir.
var buildProject = ts.createProject('tsconfig.json', { rootDir: 'src' });

var buildTest = ts.createProject('tsconfig.json');

var buildAutogenTyping = ts.createProject('tsconfig.json', { rootDir: 'src', declaration: true });

var banner = `/*! firebase-admin v${pkg.version} */\n`;

/***********/
/*  TASKS  */
/***********/

gulp.task('cleanup', function() {
  return del([
    paths.build,
  ]);
});

gulp.task('compile', function() {
  return gulp.src(paths.src)
    // Compile Typescript into .js and .d.ts files
    .pipe(buildProject())

    // Add header
    .pipe(header(banner))

    // Write to build directory
    .pipe(gulp.dest(paths.build))
});

/**
 * Task only used to capture typescript compilation errors in the test suite.
 * Output is discarded.
 */
gulp.task('compile_test', function() {
  return gulp.src(paths.test)
    // Compile Typescript into .js and .d.ts files
    .pipe(buildTest())
});

/**
 * Task used to verify TypeScript auto-generated typings. First, it builds
 * the project generating both *.js and *.d.ts files. After, it removes
 * declarations for all files terminating in -internal.d.ts because we do not
 * want to expose internally exposed types to developers. As auto-generated
 * typings are a work-in-progress, we remove the *.d.ts files for modules
 * which we do not intend to auto-generate typings for yet.
 */
gulp.task('compile_autogen_typing', function() {
  return gulp.src(paths.src)
    // Compile Typescript into .js and .d.ts files
    .pipe(buildAutogenTyping())

    // Exclude typings that are unintended (only database is expected to
    // produce typings so far). Moreover, all *-internal.d.ts typings
    // should not be exposed to developers as it denotes internally used
    // types.
    .pipe(filter([
      'lib/**/*.js',
      'lib/**/*.d.ts',
      '!lib/*-internal.d.ts',
      '!lib/default-namespace.d.ts',
      '!lib/firebase-namespace.d.ts',
      '!lib/firebase-app.d.ts',
      '!lib/firebase-service.d.ts',
      '!lib/auth/*.d.ts',
      '!lib/firestore/*.d.ts',
      '!lib/instance-id/*.d.ts',
      '!lib/machine-learning/*.d.ts',
      '!lib/messaging/*.d.ts',
      '!lib/project-management/*.d.ts',
      '!lib/remote-config/*.d.ts',
      '!lib/security-rules/*.d.ts',
      '!lib/storage/*.d.ts',
      '!lib/utils/*.d.ts']))

    // Write to build directory
    .pipe(gulp.dest(paths.build))
});

gulp.task('copyDatabase', function() {
  return gulp.src(paths.databaseSrc)
    // Add headers
    .pipe(header(fs.readFileSync('third_party/database-license.txt', 'utf8')))
    .pipe(header(banner))

    // Write to build directory
    .pipe(gulp.dest(paths.build))
});

gulp.task('copyTypings', function() {
  return gulp.src('src/*.d.ts')
    // Add header
    .pipe(header(banner))

    // Write to build directory
    .pipe(gulp.dest(paths.build))
});

gulp.task('removeCuratedTypings', function() {
  return del(paths.curatedTypings);
});

gulp.task('compile_all', gulp.series('compile', 'copyDatabase', 'copyTypings', 'compile_test'));

// Regenerates js every time a source file changes
gulp.task('watch', function() {
  gulp.watch(paths.src.concat(paths.test), { ignoreInitial: false }, gulp.series('compile_all'));
});

// Build task
gulp.task('build', gulp.series('cleanup', 'compile', 'copyDatabase', 'copyTypings'));

// Build typings
gulp.task('build_typings', gulp.series('cleanup', 'compile_autogen_typing', 'copyTypings', 'removeCuratedTypings'));

// Default task
gulp.task('default', gulp.series('build'));
