/**
 * Renames properties on an object given a mapping from old to new property names.
 *
 * For example, this can be used to map underscore_cased properties to camelCase.
 *
 * @param {obj} Object The object whose properties to rename.
 * @param {keyMap} Object The mapping from old to new property names.
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
