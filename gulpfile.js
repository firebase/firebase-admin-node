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
};

// Create a separate project for buildProject that overrides the rootDir
// This ensures that the generated production files are in their own root
// rather than including both src and test in the lib dir.
var buildProject = ts.createProject('tsconfig.json', {rootDir: 'src'});

var buildTest = ts.createProject('tsconfig.json');

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

    // Replace SDK version
    .pipe(replace(/\<XXX_SDK_VERSION_XXX\>/g, pkg.version))

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

gulp.task('copyDatabase', function() {
  return gulp.src(paths.databaseSrc)
    // Add headers
    .pipe(header(fs.readFileSync('third_party/database-license.txt', 'utf8')))
    .pipe(header(banner))

    // Write to build directory
    .pipe(gulp.dest(paths.build))
});

gulp.task('copyTypings', function() {
  return gulp.src('src/index.d.ts')
    // Add header
    .pipe(header(banner))

    // Write to build directory
    .pipe(gulp.dest(paths.build))
});

gulp.task('compile_all', gulp.series('compile', 'copyDatabase', 'copyTypings', 'compile_test'));

// Regenerates js every time a source file changes
gulp.task('watch', function() {
  gulp.watch(paths.src.concat(paths.test), {ignoreInitial: false}, gulp.series('compile_all'));
});

// Build task
gulp.task('build', gulp.series('cleanup', 'compile', 'copyDatabase', 'copyTypings'));

// Default task
gulp.task('default', gulp.series('build'));
