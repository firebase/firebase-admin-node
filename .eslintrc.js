/*!
 * Copyright 2020 Google Inc.
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

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Following checks are temporarily disabled. We shall incrementally enable them in the
    // future, fixing any violations as we go.
    '@typescript-eslint/no-non-null-assertion': 0,

    // Disabled checks
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-use-before-define': 0,

    // Required checks
    'indent': ['error', 2],
    'keyword-spacing': ['error'],
    'max-len': [
      'error',
      {
        'code': 120,
        'ignoreUrls': true
      }
    ],
    'object-curly-spacing': [2, 'always'],
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        'allowExpressions': true,
        'allowTypedFunctionExpressions': true,
        'allowHigherOrderFunctions': true
      }
    ],
    'no-unused-vars': 'off', // Must be disabled to enable the next rule
    '@typescript-eslint/no-unused-vars': ['error'],
    'quotes': ['error', 'single', {'avoidEscape': true}]
  }
};
