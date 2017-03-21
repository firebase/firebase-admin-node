/**
 * Renames properties on an object given a mapping from old to new property names.
 *
 * For example, this can be used to map underscore_cased properties to camelCase.
 *
 * @param {Object} obj The object whose properties to rename.
 * @param {Object} keyMap The mapping from old to new property names.
 */
export function renameProperties(obj: Object, keyMap: { [key: string]: string }): void {
  Object.keys(keyMap).forEach((oldKey) => {
    if (oldKey in obj) {
      const newKey = keyMap[oldKey];
      // The old key's value takes precedence over the new key's value.
      obj[newKey] = obj[oldKey];
      delete obj[oldKey];
    }
  });
}

/**
 * Defines a new read-only property directly on an object and returns the object.
 *
 * @param {Object} obj The object on which to define the property.
 * @param {string} prop The name of the property to be defined or modified.
 * @param {any} value The value associated with the property.
 *
 * @return {Object} The object that was passed to the function.
 */
export function addReadonlyGetter(obj: Object, prop: string, value: any): void {
  Object.defineProperty(obj, prop, {
    value,
    // Make this property read-only.
    writable: false,
    // Include this property during enumeration of obj's properties.
    enumerable: true,
  });
}
