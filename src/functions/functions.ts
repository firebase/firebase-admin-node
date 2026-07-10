/*!
 * @license
 * Copyright 2021 Google LLC
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

import { App } from '../app';
import { FunctionsApiClient, InternalFunctionScope } from './functions-api-client-internal';
import { FirebaseFunctionsError } from './error';
import { TaskOptions, FunctionScope } from './functions-api';
import * as validator from '../utils/validator';

/**
 * The Firebase `Functions` service interface.
 */
export class Functions {

  private readonly client: FunctionsApiClient;
  
  /**
   * @param app - The app for this `Functions` service.
   * @constructor
   * @internal
   */
  constructor(readonly app: App) {
    this.client = new FunctionsApiClient(app);
  }

  /**
   * Creates a reference to a {@link TaskQueue} for a given function name.
   * The function name can be either:
   *
   * 1) A fully qualified function resource name:
   *     `projects/{project}/locations/{location}/functions/{functionName}`
   *
   * 2) A partial resource name with location and function name, in which case
   *     the runtime project ID is used:
   *     `locations/{location}/functions/{functionName}`
   *
   * 3) A partial function name, in which case the runtime project ID and the default location,
   *     `us-central1`, is used:
   *     `{functionName}`
   * 
   * @param functionName - The name of the function.
   * @param scope - Optional FunctionScope configuration. Only needed if targeting a scope other than the current one.
   * @returns A promise that fulfills with a `TaskQueue`.
   */
  public taskQueue<Args = Record<string, any>>(
    functionName: string,
    scope?: FunctionScope
  ): TaskQueue<Args>;
  /**
   * Creates a reference to a {@link TaskQueue} for a given function name.
   *
   * @param functionName - The name of the function.
   * @param deprecatedExtensionId - Optional Firebase extension ID.
   * @returns A promise that fulfills with a `TaskQueue`.
   * @deprecated Use scope parameter instead.
   */
  public taskQueue<Args = Record<string, any>>(
    functionName: string,
    deprecatedExtensionId: string
  ): TaskQueue<Args>;
  public taskQueue<Args = Record<string, any>>(
    functionName: string,
    extensionIdOrScope: string | FunctionScope = { scope: 'current' }
  ): TaskQueue<Args> {
    const scope: FunctionScope = typeof extensionIdOrScope === 'string'
      ? (extensionIdOrScope === ''
        ? { scope: 'current' }
        : { scope: 'extensionOrKit' as any, instance: extensionIdOrScope })
      : extensionIdOrScope;
    return new TaskQueue(functionName, this.client, scope);
  }
}

/**
 * The `TaskQueue` interface.
 */
export class TaskQueue<Args = Record<string, any>> {

  private readonly scope: InternalFunctionScope;

  /**
   * @param functionName - The name of the function.
   * @param client - The `FunctionsApiClient` instance.
   * @param scope - Optional FunctionScope configuration. Only needed if targeting a scope other than the current one.
   * @constructor
   * @internal
   */
  constructor(
    functionName: string,
    client: FunctionsApiClient,
    scope?: FunctionScope
  );
  /**
   * @param functionName - The name of the function.
   * @param client - The `FunctionsApiClient` instance.
   * @param deprecatedExtensionId - Optional canonical ID of the extension.
   * @constructor
   * @internal
   * @deprecated Use scope parameter instead.
   */
  constructor(
    functionName: string,
    client: FunctionsApiClient,
    deprecatedExtensionId: string
  );
  /**
   * @param functionName - The name of the function.
   * @param client - The `FunctionsApiClient` instance.
   * @param extensionIdOrScope - Optional canonical ID of the extension or FunctionScope.
   * @constructor
   * @internal
   */
  constructor(
    private readonly functionName: string,
    private readonly client: FunctionsApiClient,
    extensionIdOrScope: string | InternalFunctionScope = { scope: 'current' }
  ) {
    if (!validator.isNonEmptyString(functionName)) {
      throw new FirebaseFunctionsError({
        code: 'invalid-argument',
        message: '`functionName` must be a non-empty string.'
      });
    }
    if (!validator.isNonNullObject(client) || !('enqueue' in client)) {
      throw new FirebaseFunctionsError({
        code: 'invalid-argument',
        message: 'Must provide a valid FunctionsApiClient instance to create a new TaskQueue.'
      });
    }

    if (typeof extensionIdOrScope === 'string') {
      this.scope = extensionIdOrScope === ''
        ? { scope: 'current' }
        : { scope: 'extensionOrKit', instance: extensionIdOrScope };
    } else if (validator.isNonNullObject(extensionIdOrScope)) {
      const scope = (extensionIdOrScope as any).scope;
      if (scope === 'current' || scope === 'global') {
        this.scope = extensionIdOrScope as InternalFunctionScope;
      } else if (scope === 'extension' || scope === 'kit' || scope === 'extensionOrKit') {
        const instance = (extensionIdOrScope as any).instance;
        if (!validator.isNonEmptyString(instance)) {
          throw new FirebaseFunctionsError({
            code: 'invalid-argument',
            message: `\`instance\` must be a non-empty string for scope "${scope}".`
          });
        }
        this.scope = extensionIdOrScope as InternalFunctionScope;
      } else {
        // TODO: Update error message to include 'kit' when kit type becomes public.
        throw new FirebaseFunctionsError({
          code: 'invalid-argument',
          message: '`scope` must be one of "current", "global", or "extension".'
        });
      }
    } else {
      throw new FirebaseFunctionsError({
        code: 'invalid-argument',
        message: '`extensionIdOrScope` must be a string or a FunctionScope object.'
      });
    }

    if (this.scope.scope === 'extensionOrKit') {
      const instance = this.scope.instance;
      const extInstanceId = process.env.EXT_INSTANCE_ID;
      const kitInstanceId = process.env.FIREBASE_KIT_INSTANCE_ID;
      if (validator.isNonEmptyString(extInstanceId) && extInstanceId === instance) {
        (this.scope as any).scope = 'extension';
        console.warn(
          'Targeting your own extension no longer requires a second parameter. ' +
          `Please change the call taskQueue('${functionName}', '${instance}') to taskQueue('${functionName}')`
        );
      } else if (validator.isNonEmptyString(kitInstanceId) && kitInstanceId === instance) {
        (this.scope as any).scope = 'kit';
        console.warn(
          'Targeting your own extension or kit no longer requires a second parameter, ' +
          'which can have performance implications. Please change the call ' +
          `taskQueue('${functionName}', '${instance}') to taskQueue('${functionName}') ` +
          `or taskQueue('${functionName}', { scope: "current" })`
        );
      }
    }
  }

  /**
   * Creates a task and adds it to the queue. Tasks cannot be updated after creation.
   * This action requires `cloudtasks.tasks.create` IAM permission on the service account.
   *
   * @param data - The data payload of the task.
   * @param opts - Optional options when enqueuing a new task.
   * @returns A promise that resolves when the task has successfully been added to the queue.
   */
  public async enqueue(data: Args, opts?: TaskOptions): Promise<void> {
    if (this.scope.scope !== 'extensionOrKit') {
      await this.client.enqueue(data, this.functionName, this.scope, opts);
      return;
    }

    // Note: The extensionOrKit scope and the associated fallback logic exist purely 
    // to support migration from legacy extension ID string parameters, and can be 
    // removed in the next major version release after extensions turndown.
    try {
      await this.client.enqueue(data, this.functionName, this.scope, opts);
    } catch (err: any) {
      const isNotFound = err.code === 'not-found' || 
        (err instanceof FirebaseFunctionsError && err.httpResponse?.status === 404);
      if (isNotFound) {
        const tempKitScope = { scope: 'kit' as const, instance: this.scope.instance };
        await this.client.enqueue(data, this.functionName, tempKitScope, opts);
        // Only upgrade the stateful scope to kit if the retry request succeeds
        (this.scope as any).scope = 'kit';
        this.logFallbackWarning(this.functionName, this.scope.instance);
        return;
      }
      throw err;
    }
  }

  /**
   * Deletes an enqueued task if it has not yet completed.
   * @param id - the ID of the task, relative to this queue.
   * @returns A promise that resolves when the task has been deleted.
   */
  public async delete(id: string): Promise<void> {
    if (this.scope.scope !== 'extensionOrKit') {
      try {
        await this.client.delete(id, this.functionName, this.scope);
      } catch (err: any) {
        const isNotFound = err.code === 'not-found' || 
          (err instanceof FirebaseFunctionsError && err.httpResponse?.status === 404);
        if (isNotFound) {
          return;
        }
        throw err;
      }
      return;
    }

    // Note: The extensionOrKit scope and the associated fallback logic exist purely 
    // to support migration from legacy extension ID string parameters, and can be 
    // removed in the next major version release after extensions turndown.
    try {
      await this.client.delete(id, this.functionName, this.scope);
    } catch (err: any) {
      const isNotFound = err.code === 'not-found' || 
        (err instanceof FirebaseFunctionsError && err.httpResponse?.status === 404);
      if (isNotFound) {
        try {
          const tempKitScope = { scope: 'kit' as const, instance: this.scope.instance };
          await this.client.delete(id, this.functionName, tempKitScope);
          // Only upgrade the stateful scope to kit if the retry request succeeds
          (this.scope as any).scope = 'kit';
          this.logFallbackWarning(this.functionName, this.scope.instance);
        } catch (retryErr: any) {
          const isRetryNotFound = retryErr.code === 'not-found' || 
            (retryErr instanceof FirebaseFunctionsError && retryErr.httpResponse?.status === 404);
          if (isRetryNotFound) {
            // Ignore if both fail with not-found
            return;
          }
          throw retryErr;
        }
        return;
      }
      throw err;
    }
  }

  private logFallbackWarning(functionName: string, instance: string): void {
    const kitInstanceId = process.env.FIREBASE_KIT_INSTANCE_ID;
    if (validator.isNonEmptyString(kitInstanceId) && kitInstanceId === instance) {
      // Note: It is OK to warn about kits here because targeting a kit requires the kit to be deployed first.
      console.warn(
        'Targeting your own extension or kit no longer requires a second parameter, ' +
        'which can have performance implications. Please change the call ' +
        `taskQueue('${functionName}', '${instance}') to taskQueue('${functionName}') ` +
        `or taskQueue('${functionName}', { scope: "current" })`
      );
    } else {
      console.warn(
        `Targeting kit ${instance} with the legacy extensions API, ` +
        'which has performance implications. Please change the call ' +
        `taskQueue('${functionName}', '${instance}') to ` +
        `taskQueue('${functionName}', { scope: "kit", instance: '${instance}' })`
      );
    }
  }
}
