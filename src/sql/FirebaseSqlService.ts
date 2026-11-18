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

import type { App } from '../app';
import { FirebaseSql } from './FirebaseSql';
import { type ServiceConfig, validateServiceConfig, copyServiceConfig, freezeServiceConfig } from './serviceConfig';
import { Code, FirebaseSqlError, FirebaseSqlErrorCategory } from './error';
import { resolvePostgrestUrl } from './url';

export class FirebaseSqlService {

  private readonly appInternal: App;
  private sqlInstances: Map<string, FirebaseSql> = new Map();

  constructor(app: App) {
    this.appInternal = app;
  }

  getSql(serviceConfig: ServiceConfig): FirebaseSql {
    const validatedServiceConfig = copyServiceConfig(serviceConfig);
    freezeServiceConfig(validatedServiceConfig);
    validateServiceConfig(validatedServiceConfig);

    const projectId = this.appInternal.options.projectId;
    if (typeof projectId !== 'string' || projectId.length === 0) {
      throw new FirebaseSqlError(
        Code.INVALID_ARGUMENT,
        'Project ID must be provided in FirebaseApp',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }

    const id = getInstanceIdentifier(validatedServiceConfig, projectId);
    const sql = this.sqlInstances.get(id);
    if (sql) {
      return sql;
    }

    const newInstance = new FirebaseSql(serviceConfig, this.appInternal);
    this.sqlInstances.set(id, newInstance);
    return newInstance;
  }

  get app(): App {
    return this.appInternal;
  }
}

function getInstanceIdentifier(
  serviceConfig: ServiceConfig,
  projectId: string
): string {
  const resolvedUrl = resolvePostgrestUrl(serviceConfig, projectId);
  return JSON.stringify({
    resolvedUrl,
    schemaName: serviceConfig.schemaName
  });
}
