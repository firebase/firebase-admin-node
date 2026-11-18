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


import { FirebaseSqlErrorCategory, Code, FirebaseSqlError } from './error';

export interface ServiceConfig {
  schemaName?: string | undefined;
  serviceId: string;
  location: string;
  host?: string | undefined;
  port?: number | undefined;
  sslEnabled?: boolean | undefined;
}

export function copyServiceConfig(serviceConfig: ServiceConfig): ServiceConfig {
  return Object.assign({}, serviceConfig);
}

export function freezeServiceConfig(serviceConfig: ServiceConfig): void {
  Object.freeze(serviceConfig);
}

function validatePort(port: unknown): void {
  if (port === undefined) {
    return;
  }
  if (
    typeof port !== 'number' ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      `Port must be a valid integer between 1 and 65535 if provided. Received: ${String(port)}.`,
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
}

export function validateServiceConfig(
  serviceConfig: ServiceConfig
): void {
  if (!serviceConfig.serviceId) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'serviceId is required.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  if (!serviceConfig.location) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'location is required.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  validatePort(serviceConfig.port);
}
