/*!
 * @license
 * Copyright 2026 Google LLC
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

import { FirebaseError } from '../utils/error';

export type FirebaseSqlErrorCode =
  | 'other'
  | 'already-initialized'
  | 'not-initialized'
  | 'not-supported'
  | 'invalid-argument'
  | 'partial-error'
  | 'unauthorized';

export type Code = FirebaseSqlErrorCode;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Code = Object.freeze({
  OTHER: 'other' as const satisfies FirebaseSqlErrorCode,
  ALREADY_INITIALIZED:
    'already-initialized' as const satisfies FirebaseSqlErrorCode,
  NOT_INITIALIZED: 'not-initialized' as const satisfies FirebaseSqlErrorCode,
  NOT_SUPPORTED: 'not-supported' as const satisfies FirebaseSqlErrorCode,
  INVALID_ARGUMENT: 'invalid-argument' as const satisfies FirebaseSqlErrorCode,
  PARTIAL_ERROR: 'partial-error' as const satisfies FirebaseSqlErrorCode,
  UNAUTHORIZED: 'unauthorized' as const satisfies FirebaseSqlErrorCode
});

export type FirebaseSqlErrorCategory =
  'sql-postgrest' | 'sql-platform' | 'sql-client';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const FirebaseSqlErrorCategory = Object.freeze({
  SQL_POSTGREST: 'sql-postgrest' as const satisfies FirebaseSqlErrorCategory,
  SQL_PLATFORM: 'sql-platform' as const satisfies FirebaseSqlErrorCategory,
  SQL_CLIENT: 'sql-client' as const satisfies FirebaseSqlErrorCategory
});

export interface SerializedFirebaseSqlError {
  name: string;
  code: string;
  message: string;
  category: string;
  details?: string | undefined;
  hint?: string | undefined;
  status?: number | undefined;
}

export class FirebaseSqlError extends FirebaseError {
  readonly name: string = 'FirebaseSqlError';
  readonly code: string;
  readonly category: string;
  readonly details?: string | undefined;
  readonly hint?: string | undefined;
  readonly status?: number | undefined;

  constructor(
    code: string,
    message: string,
    category: string,
    details?: string | undefined,
    hint?: string | undefined,
    status?: number | undefined
  ) {
    super({ code, message });
    this.code = code;
    this.category = category;
    this.details = details;
    this.hint = hint;
    this.status = status;
  }

  toJSON(): SerializedFirebaseSqlError {
    const serialized: SerializedFirebaseSqlError = {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category
    };
    if (this.details !== undefined) {
      serialized.details = this.details;
    }
    if (this.hint !== undefined) {
      serialized.hint = this.hint;
    }
    if (this.status !== undefined) {
      serialized.status = this.status;
    }
    return serialized;
  }

  /** @internal */
  toString(): string {
    const detailsText = this.details ? ` (details: ${this.details})` : '';
    const hintText = this.hint ? ` (hint: ${this.hint})` : '';
    return `${this.name}[code=${this.code}]: ${this.message}${detailsText}${hintText}`.trim();
  }
}
