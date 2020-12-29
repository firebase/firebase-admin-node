/*!
 * @license
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
var _ = require('lodash');
var gulp = require('gulp');
var pkg = require('./package.json');

// File I/O
var ts = require('gulp-typescript');
var del = require('del');
var header = require('gulp-header');
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

  build: 'lib/',
};

// Create a separate project for buildProject that overrides the rootDir.
// This ensures that the generated production files are in their own root
// rather than including both src and test in the lib dir. Declaration
// is used by TypeScript to determine if auto-generated typings should be
// emitted.
var buildProject = ts.createProject('tsconfig.json', { rootDir: 'src', declarationMap: true });

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

// Task used to compile the TypeScript project. If automatic typings
// are set to be generated (determined by TYPE_GENERATION_MODE), declarations
// for files terminating in -internal.d.ts are removed because we do not
// want to expose internally used types to developers. As auto-generated
// typings are a work-in-progress, we remove the *.d.ts files for modules
// which we do not intend to auto-generate typings for yet.
gulp.task('compile', function() {
  let workflow = gulp.src(paths.src)
    // Compile Typescript into .js and .d.ts files
    .pipe(buildProject())

    // Add header
    .pipe(header(banner));

  const configuration = [
    'lib/**/*.js',
    'lib/**/index.d.ts',
    'lib/firebase-namespace-api.d.ts',
    '!lib/utils/index.d.ts',
  ];

  workflow = workflow.pipe(filter(configuration));

  // Write to build directory
  return workflow.pipe(gulp.dest(paths.build))
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

gulp.task('copyTypings', function() {
  return gulp.src(['src/index.d.ts', 'src/firebase-namespace.d.ts'])
    // Add header
    .pipe(header(banner))
    .pipe(gulp.dest(paths.build))
});

gulp.task('compile_all', gulp.series('compile', 'copyTypings', 'compile_test'));

// Regenerates js every time a source file changes
gulp.task('watch', function() {
  gulp.watch(paths.src.concat(paths.test), { ignoreInitial: false }, gulp.series('compile_all'));
});

// Build task
gulp.task('build', gulp.series('cleanup', 'compile', 'copyTypings'));

// Default task
gulp.task('default', gulp.series('build'));
