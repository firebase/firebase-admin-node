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

import url = require('url');

/**
 * Validates that a value is a byte buffer.
 *
 * @param {any} value The value to validate.
 * @return {boolean} Whether the value is byte buffer or not.
 */
export function isBuffer(value: any): value is Buffer {
  return value instanceof Buffer;
}

/**
 * Validates that a value is an array.
 *
 * @param {any} value The value to validate.
 * @return {boolean} Whether the value is an array or not.
 */
export function isArray<T>(value: any): value is T[] {
  return Array.isArray(value);
}

/**
 * Validates that a value is a non-empty array.
 *
 * @param {any} value The value to validate.
 * @return {boolean} Whether the value is a non-empty array or not.
 */
export function isNonEmptyArray<T>(value: any): value is T[] {
  return isArray(value) && value.length !== 0;
}


/**
 * Validates that a value is a boolean.
 *
 * @param {any} value The value to validate.
 * @return {boolean} Whether the value is a boolean or not.
 */
export function isBoolean(value: any): boolean {
  return typeof value === 'boolean';
}


/**
 * Validates that a value is a number.
 *
 * @param {any} value The value to validate.
 * @return {boolean} Whether the value is a number or not.
 */
export function isNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value);
}


/**
 * Validates that a value is a string.
 *
 * @param {any} value The value to validate.
 * @return {boolean} Whether the value is a string or not.
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}


/**
 * Validates that a value is a base64 string.
 *
 * @param {any} value The value to validate.
 * @return {boolean} Whether the value is a base64 string or not.
 */
export function isBase64String(value: any): boolean {
  if (!isString(value)) {
    return false;
  }
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
}


/**
 * Validates that a value is a non-empty string.
 *
 * @param {any} value The value to validate.
 * @return {boolean} Whether the value is a non-empty string or not.
 */
export function isNonEmptyString(value: any): value is string {
  return isString(value) && value !== '';
}


/**
 * Validates that a value is a nullable object.
 *
 * @param {any} value The value to validate.
 * @return {boolean} Whether the value is an object or not.
 */
export function isObject(value: any): boolean {
  return typeof value === 'object' && !isArray(value);
}


/**
 * Validates that a value is a non-null object.
 *
 * @param {any} value The value to validate.
 * @return {boolean} Whether the value is a non-null object or not.
 */
export function isNonNullObject<T>(value: T | null | undefined): value is T {
  return isObject(value) && value !== null;
}


/**
 * Validates that a string is a valid Firebase Auth uid.
 *
 * @param {any} uid The string to validate.
 * @return {boolean} Whether the string is a valid Firebase Auth uid.
 */
export function isUid(uid: any): boolean {
  return typeof uid === 'string' && uid.length > 0 && uid.length <= 128;
}


/**
 * Validates that a string is a valid Firebase Auth password.
 *
 * @param {any} password The password string to validate.
 * @return {boolean} Whether the string is a valid Firebase Auth password.
 */
export function isPassword(password: any): boolean {
  // A password must be a string of at least 6 characters.
  return typeof password === 'string' && password.length >= 6;
}


/**
 * Validates that a string is a valid email.
 *
 * @param {any} email The string to validate.
 * @return {boolean} Whether the string is valid email or not.
 */
export function isEmail(email: any): boolean {
  if (typeof email !== 'string') {
    return false;
  }
  // There must at least one character before the @ symbol and another after.
  const re = /^[^@]+@[^@]+$/;
  return re.test(email);
}


/**
 * Validates that a string is a valid phone number.
 *
 * @param {any} phoneNumber The string to validate.
 * @return {boolean} Whether the string is a valid phone number or not.
 */
export function isPhoneNumber(phoneNumber: any): boolean {
  if (typeof phoneNumber !== 'string') {
    return false;
  }
  // Phone number validation is very lax here. Backend will enforce E.164
  // spec compliance and will normalize accordingly.
  // The phone number string must be non-empty and starts with a plus sign.
  const re1 = /^\+/;
  // The phone number string must contain at least one alphanumeric character.
  const re2 = /[\da-zA-Z]+/;
  return re1.test(phoneNumber) && re2.test(phoneNumber);
}

/**
 * Validates that a string is a valid ISO date string.
 *
 * @param dateString The string to validate.
 * @return Whether the string is a valid ISO date string.
 */
export function isISODateString(dateString: any): boolean {
  try {
    return isNonEmptyString(dateString) &&
        (new Date(dateString).toISOString() === dateString);
  } catch (e) {
    return false;
  }
}


/**
 * Validates that a string is a valid UTC date string.
 *
 * @param dateString The string to validate.
 * @return Whether the string is a valid UTC date string.
 */
export function isUTCDateString(dateString: any): boolean {
  try {
    return isNonEmptyString(dateString) &&
        (new Date(dateString).toUTCString() === dateString);
  } catch (e) {
    return false;
  }
}


/**
 * Validates that a string is a valid web URL.
 *
 * @param {any} urlStr The string to validate.
 * @return {boolean} Whether the string is valid web URL or not.
 */
export function isURL(urlStr: any): boolean {
  if (typeof urlStr !== 'string') {
    return false;
  }
  // Lookup illegal characters.
  const re = /[^a-z0-9:/?#[\]@!$&'()*+,;=.\-_~%]/i;
  if (re.test(urlStr)) {
    return false;
  }
  try {
    const uri = url.parse(urlStr);
    const scheme = uri.protocol;
    const slashes = uri.slashes;
    const hostname = uri.hostname;
    const pathname = uri.pathname;
    if ((scheme !== 'http:' && scheme !== 'https:') || !slashes) {
      return false;
    }
    // Validate hostname: Can contain letters, numbers, underscore and dashes separated by a dot.
    // Each zone must not start with a hyphen or underscore.
    if (!hostname || !/^[a-zA-Z0-9]+[\w-]*([.]?[a-zA-Z0-9]+[\w-]*)*$/.test(hostname)) {
      return false;
    }
    // Allow for pathnames: (/chars+)*/?
    // Where chars can be a combination of: a-z A-Z 0-9 - _ . ~ ! $ & ' ( ) * + , ; = : @ %
    const pathnameRe = /^(\/[\w\-.~!$'()*+,;=:@%]+)*\/?$/;
    // Validate pathname.
    if (pathname &&
        pathname !== '/' &&
        !pathnameRe.test(pathname)) {
      return false;
    }
    // Allow any query string and hash as long as no invalid character is used.
  } catch (e) {
    return false;
  }
  return true;
}


/**
 * Validates that the provided topic is a valid FCM topic name.
 *
 * @param {any} topic The topic to validate.
 * @return {boolean} Whether the provided topic is a valid FCM topic name.
 */
export function isTopic(topic: any): boolean {
  if (typeof topic !== 'string') {
    return false;
  }

  const VALID_TOPIC_REGEX = /^(\/topics\/)?(private\/)?[a-zA-Z0-9-_.~%]+$/;
  return VALID_TOPIC_REGEX.test(topic);
}
