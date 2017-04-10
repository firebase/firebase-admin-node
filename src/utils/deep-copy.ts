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

/**
 * Returns a deep copy of an object or array.
 *
 * @param {Object|array} value The object or array to deep copy.
 * @return {Object|array} A deep copy of the provided object or array.
 */
export function deepCopy<T>(value: T): T {
  return deepExtend(undefined, value);
}


/**
 * Copies properties from source to target (recursively allows extension of objects and arrays).
 * Scalar values in the target are over-written. If target is undefined, an object of the
 * appropriate type will be created (and returned).
 *
 * We recursively copy all child properties of plain objects in the source - so that namespace-like
 * objects are merged.
 *
 * Note that the target can be a function, in which case the properties in the source object are
 * copied onto it as static properties of the function.
 *
 * @param {any} target The value which is being extended.
 * @param {any} source The value whose properties are extending the target.
 * @return {any} The target value.
 */
export function deepExtend(target: any, source: any): any {
  if (!(source instanceof Object)) {
    return source;
  }

  switch (source.constructor) {
  case Date:
    // Treat Dates like scalars; if the target date object had any child
    // properties - they will be lost!
    let dateValue = (source as any) as Date;
    return new Date(dateValue.getTime());

  case Object:
    if (target === undefined) {
      target = {};
    }
    break;

  case Array:
    // Always copy the array source and overwrite the target.
    target = [];
    break;

  default:
    // Not a plain Object - treat it as a scalar.
    return source;
  }

  for (let prop in source) {
    if (!source.hasOwnProperty(prop)) {
      continue;
    }
    target[prop] = deepExtend(target[prop], source[prop]);
  }

  return target;
}
