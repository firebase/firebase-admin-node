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

  curatedTypings: [
    'src/*.d.ts',
    '!src/instance-id.d.ts',
    '!src/security-rules.d.ts',
    '!src/project-management.d.ts',
    '!src/remote-config.d.ts',
    '!src/messaging.d.ts',
  ],
};

const TEMPORARY_TYPING_EXCLUDES = [
  '!lib/default-namespace.d.ts',
  '!lib/firebase-namespace.d.ts',
  '!lib/firebase-app.d.ts',
  '!lib/firebase-service.d.ts',
  '!lib/auth/*.d.ts',
  '!lib/database/*.d.ts',
  '!lib/firestore/*.d.ts',
  '!lib/machine-learning/*.d.ts',
  '!lib/storage/*.d.ts',
  '!lib/utils/*.d.ts',
];

// Create a separate project for buildProject that overrides the rootDir.
// This ensures that the generated production files are in their own root
// rather than including both src and test in the lib dir. Declaration
// is used by TypeScript to determine if auto-generated typings should be
// emitted.
const declaration = process.env.TYPE_GENERATION_MODE === 'auto';
var buildProject = ts.createProject('tsconfig.json', { rootDir: 'src', declaration });

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
  
  // Exclude typings that are unintended (currently excludes all auto-generated
  // typings, but as services are refactored to auto-generate typings this will
  // change). Moreover, all *-internal.d.ts typings should not be exposed to 
  // developers as it denotes internally used types.
  if (declaration) {
    const configuration = [
      'lib/**/*.js',
      'lib/**/*.d.ts',
      '!lib/**/*-internal.d.ts',
    ].concat(TEMPORARY_TYPING_EXCLUDES);

    workflow = workflow.pipe(filter(configuration));
  }

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

gulp.task('copyDatabase', function() {
  return gulp.src(paths.databaseSrc)
    // Add headers
    .pipe(header(fs.readFileSync('third_party/database-license.txt', 'utf8')))
    .pipe(header(banner))

    // Write to build directory
    .pipe(gulp.dest(paths.build))
});

gulp.task('copyTypings', function() {
  let workflow = gulp.src('src/*.d.ts')
    // Add header
    .pipe(header(banner));
  
  if (declaration) {
    workflow = workflow.pipe(filter(paths.curatedTypings));
  }

  // Write to build directory
  return workflow.pipe(gulp.dest(paths.build))
});

gulp.task('compile_all', gulp.series('compile', 'copyDatabase', 'copyTypings', 'compile_test'));

// Regenerates js every time a source file changes
gulp.task('watch', function() {
  gulp.watch(paths.src.concat(paths.test), { ignoreInitial: false }, gulp.series('compile_all'));
});

// Build task
gulp.task('build', gulp.series('cleanup', 'compile', 'copyDatabase', 'copyTypings'));

// Default task
gulp.task('default', gulp.series('build'));
