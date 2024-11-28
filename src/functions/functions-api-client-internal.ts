/*!
 * @license
 * Copyright 2021 Google Inc.
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
import { FirebaseApp } from '../app/firebase-app';
import {
  AuthorizedHttpClient, HttpClient, HttpRequestConfig, RequestResponse, RequestResponseError
} from '../utils/api-request';
import { PrefixedFirebaseError } from '../utils/error';
import * as utils from '../utils/index';
import * as validator from '../utils/validator';
import { TaskOptions } from './functions-api';
import { ApplicationDefaultCredential } from '../app/credential-internal';

const CLOUD_TASKS_API_RESOURCE_PATH = 'projects/{projectId}/locations/{locationId}/queues/{resourceId}/tasks';
const CLOUD_TASKS_API_URL_FORMAT = 'https://cloudtasks.googleapis.com/v2/' + CLOUD_TASKS_API_RESOURCE_PATH;
const FIREBASE_FUNCTION_URL_FORMAT = 'https://{locationId}-{projectId}.cloudfunctions.net/{resourceId}';
export const EMULATED_SERVICE_ACCOUNT_DEFAULT = 'emulated-service-acct@email.com';

const FIREBASE_FUNCTIONS_CONFIG_HEADERS = {
  'X-Firebase-Client': `fire-admin-node/${utils.getSdkVersion()}`
};

// Default canonical location ID of the task queue.
const DEFAULT_LOCATION = 'us-central1';

/**
 * Class that facilitates sending requests to the Firebase Functions backend API.
 *
 * @internal
 */
export class FunctionsApiClient {
  private readonly httpClient: HttpClient;
  private projectId?: string;
  private accountId?: string;

  constructor(private readonly app: App) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseFunctionsError(
        'invalid-argument',
        'First argument passed to getFunctions() must be a valid Firebase app instance.');
    }
    this.httpClient = new AuthorizedHttpClient(app as FirebaseApp);
  }
  /**
   * Deletes a task from a queue.
   *
   * @param id - The ID of the task to delete.
   * @param functionName - The function name of the queue.
   * @param extensionId - Optional canonical ID of the extension.
   */
  public async delete(id: string, functionName: string, extensionId?: string): Promise<void> {
    if (!validator.isNonEmptyString(functionName)) {
      throw new FirebaseFunctionsError(
        'invalid-argument', 'Function name must be a non empty string');
    }
    if (!validator.isTaskId(id)) {
      throw new FirebaseFunctionsError(
        'invalid-argument', 'id can contain only letters ([A-Za-z]), numbers ([0-9]), '
      + 'hyphens (-), or underscores (_). The maximum length is 500 characters.');
    }

    let resources: utils.ParsedResource;
    try {
      resources = utils.parseResourceName(functionName, 'functions');
    } catch (err) {
      throw new FirebaseFunctionsError(
        'invalid-argument', 'Function name must be a single string or a qualified resource name');
    }
    resources.projectId = resources.projectId || await this.getProjectId();
    resources.locationId = resources.locationId || DEFAULT_LOCATION;
    if (!validator.isNonEmptyString(resources.resourceId)) {
      throw new FirebaseFunctionsError(
        'invalid-argument', 'No valid function name specified to enqueue tasks for.');
    }
    if (typeof extensionId !== 'undefined' && validator.isNonEmptyString(extensionId)) {
      resources.resourceId = `ext-${extensionId}-${resources.resourceId}`;
    }

    try {
      const serviceUrl = tasksEmulatorUrl(resources)?.concat('/', id)
        ?? await this.getUrl(resources, CLOUD_TASKS_API_URL_FORMAT.concat('/', id));
      const request: HttpRequestConfig = {
        method: 'DELETE',
        url: serviceUrl,
        headers: FIREBASE_FUNCTIONS_CONFIG_HEADERS,
      };
      await this.httpClient.send(request);
    } catch (err: unknown) {
      if (err instanceof RequestResponseError) {
        if (err.response.status === 404) {
          // if no task with the provided ID exists, then ignore the delete.
          return;
        }
        throw this.toFirebaseError(err);
      } else {
        throw err;
      }
    }
  }

  /**
   * Creates a task and adds it to a queue.
   *
   * @param data - The data payload of the task.
   * @param functionName - The functionName of the queue.
   * @param extensionId - Optional canonical ID of the extension.
   * @param opts - Optional options when enqueuing a new task.
   */
  public async enqueue(
    data: any,
    functionName: string,
    extensionId?: string,
    opts?: TaskOptions): Promise<RequestResponse | void> {
    if (!validator.isNonEmptyString(functionName)) {
      throw new FirebaseFunctionsError(
        'invalid-argument', 'Function name must be a non empty string');
    }

    let resources: utils.ParsedResource;
    try {
      resources = utils.parseResourceName(functionName, 'functions');
    } catch (err) {
      throw new FirebaseFunctionsError(
        'invalid-argument', 'Function name must be a single string or a qualified resource name');
    }
    resources.projectId = resources.projectId || await this.getProjectId();
    resources.locationId = resources.locationId || DEFAULT_LOCATION;
    if (!validator.isNonEmptyString(resources.resourceId)) {
      throw new FirebaseFunctionsError(
        'invalid-argument', 'No valid function name specified to enqueue tasks for.');
    }
    if (typeof extensionId !== 'undefined' && validator.isNonEmptyString(extensionId)) {
      resources.resourceId = `ext-${extensionId}-${resources.resourceId}`;
    }

    const task = this.validateTaskOptions(data, resources, opts);
    try {
      const serviceUrl =
        tasksEmulatorUrl(resources) ??
        await this.getUrl(resources, CLOUD_TASKS_API_URL_FORMAT);

      const taskPayload = await this.updateTaskPayload(task, resources, extensionId);
      const request: HttpRequestConfig = {
        method: 'POST',
        url: serviceUrl,
        headers: FIREBASE_FUNCTIONS_CONFIG_HEADERS,
        data: {
          task: taskPayload,
        }
      };
      return await this.httpClient.send(request);
    } catch (err: unknown) {
      if (err instanceof RequestResponseError) {
        if (err.response.status === 409) {
          throw new FirebaseFunctionsError('task-already-exists', `A task with ID ${opts?.id} already exists`);
        } else {
          throw this.toFirebaseError(err);
        }
      } else {
        throw err;
      }
    }
  }

  private getUrl(resourceName: utils.ParsedResource, urlFormat: string): Promise<string> {
    let { locationId } = resourceName;
    const { projectId, resourceId } = resourceName;
    if (typeof locationId === 'undefined' || !validator.isNonEmptyString(locationId)) {
      locationId = DEFAULT_LOCATION;
    }
    return Promise.resolve()
      .then(() => {
        if (typeof projectId !== 'undefined' && validator.isNonEmptyString(projectId)) {
          return projectId;
        }
        return this.getProjectId();
      })
      .then((projectId) => {
        const urlParams = {
          projectId,
          locationId,
          resourceId,
        };
        // Formats a string of form 'project/{projectId}/{api}' and replaces
        // with corresponding arguments {projectId: '1234', api: 'resource'}
        // and returns output: 'project/1234/resource'.
        return utils.formatString(urlFormat, urlParams);
      });
  }

  private getProjectId(): Promise<string> {
    if (this.projectId) {
      return Promise.resolve(this.projectId);
    }
    return utils.findProjectId(this.app)
      .then((projectId) => {
        if (!validator.isNonEmptyString(projectId)) {
          throw new FirebaseFunctionsError(
            'unknown-error',
            'Failed to determine project ID. Initialize the '
            + 'SDK with service account credentials or set project ID as an app option. '
            + 'Alternatively, set the GOOGLE_CLOUD_PROJECT environment variable.');
        }
        this.projectId = projectId;
        return projectId;
      });
  }

  private getServiceAccount(): Promise<string> {
    if (this.accountId) {
      return Promise.resolve(this.accountId);
    }
    return utils.findServiceAccountEmail(this.app)
      .then((accountId) => {
        if (!validator.isNonEmptyString(accountId)) {
          throw new FirebaseFunctionsError(
            'unknown-error',
            'Failed to determine service account. Initialize the '
            + 'SDK with service account credentials or set service account ID as an app option.');
        }
        this.accountId = accountId;
        return accountId;
      });
  }

  private validateTaskOptions(data: any, resources: utils.ParsedResource, opts?: TaskOptions): Task {
    const task: Task = {
      httpRequest: {
        url: '',
        oidcToken: {
          serviceAccountEmail: '',
        },
        body: Buffer.from(JSON.stringify({ data })).toString('base64'),
        headers: {
          'Content-Type': 'application/json',
          ...opts?.headers,
        }
      }
    }

    if (typeof opts !== 'undefined') {
      if (!validator.isNonNullObject(opts)) {
        throw new FirebaseFunctionsError(
          'invalid-argument', 'TaskOptions must be a non-null object');
      }
      if ('scheduleTime' in opts && 'scheduleDelaySeconds' in opts) {
        throw new FirebaseFunctionsError(
          'invalid-argument', 'Both scheduleTime and scheduleDelaySeconds are provided. '
        + 'Only one value should be set.');
      }
      if ('scheduleTime' in opts && typeof opts.scheduleTime !== 'undefined') {
        if (!(opts.scheduleTime instanceof Date)) {
          throw new FirebaseFunctionsError(
            'invalid-argument', 'scheduleTime must be a valid Date object.');
        }
        task.scheduleTime = opts.scheduleTime.toISOString();
      }
      if ('scheduleDelaySeconds' in opts && typeof opts.scheduleDelaySeconds !== 'undefined') {
        if (!validator.isNumber(opts.scheduleDelaySeconds) || opts.scheduleDelaySeconds < 0) {
          throw new FirebaseFunctionsError(
            'invalid-argument', 'scheduleDelaySeconds must be a non-negative duration in seconds.');
        }
        const date = new Date();
        date.setSeconds(date.getSeconds() + opts.scheduleDelaySeconds);
        task.scheduleTime = date.toISOString();
      }
      if (typeof opts.dispatchDeadlineSeconds !== 'undefined') {
        if (!validator.isNumber(opts.dispatchDeadlineSeconds) || opts.dispatchDeadlineSeconds < 15
          || opts.dispatchDeadlineSeconds > 1800) {
          throw new FirebaseFunctionsError(
            'invalid-argument', 'dispatchDeadlineSeconds must be a non-negative duration in seconds '
          + 'and must be in the range of 15s to 30 mins.');
        }
        task.dispatchDeadline = `${opts.dispatchDeadlineSeconds}s`;
      }
      if ('id' in opts && typeof opts.id !== 'undefined') {
        if (!validator.isTaskId(opts.id)) {
          throw new FirebaseFunctionsError(
            'invalid-argument', 'id can contain only letters ([A-Za-z]), numbers ([0-9]), '
          + 'hyphens (-), or underscores (_). The maximum length is 500 characters.');
        }
        const resourcePath = utils.formatString(CLOUD_TASKS_API_RESOURCE_PATH, {
          projectId: resources.projectId,
          locationId: resources.locationId,
          resourceId: resources.resourceId,
        });
        task.name = resourcePath.concat('/', opts.id);
      }
      if (typeof opts.uri !== 'undefined') {
        if (!validator.isURL(opts.uri)) {
          throw new FirebaseFunctionsError(
            'invalid-argument', 'uri must be a valid URL string.');
        }
        task.httpRequest.url = opts.uri;
      }
    }
    return task;
  }

  private async updateTaskPayload(task: Task, resources: utils.ParsedResource, extensionId?: string): Promise<Task> {
    const defaultUrl = process.env.CLOUD_TASKS_EMULATOR_HOST ?
      ''
      : await this.getUrl(resources, FIREBASE_FUNCTION_URL_FORMAT);

    const functionUrl = validator.isNonEmptyString(task.httpRequest.url)
      ? task.httpRequest.url
      : defaultUrl;

    task.httpRequest.url = functionUrl;
    // When run from a deployed extension, we should be using ComputeEngineCredentials
    if (validator.isNonEmptyString(extensionId) && this.app.options.credential
    instanceof ApplicationDefaultCredential && await this.app.options.credential.isComputeEngineCredential()) {
      const idToken = await this.app.options.credential.getIDToken(functionUrl);
      task.httpRequest.headers = { ...task.httpRequest.headers, 'Authorization': `Bearer ${idToken}` };
      // Don't send httpRequest.oidcToken if we set Authorization header, or Cloud Tasks will overwrite it.
      delete task.httpRequest.oidcToken;
    } else {
      try {
        const account = await this.getServiceAccount();
        task.httpRequest.oidcToken = { serviceAccountEmail: account };
      } catch (e) {
        if (process.env.CLOUD_TASKS_EMULATOR_HOST) {
          task.httpRequest.oidcToken = { serviceAccountEmail: EMULATED_SERVICE_ACCOUNT_DEFAULT };
        } else {
          throw e;
        }
      }
    }
    return task;
  }

  private toFirebaseError(err: RequestResponseError): PrefixedFirebaseError {
    if (err instanceof PrefixedFirebaseError) {
      return err;
    }

    const response = err.response;
    if (!response.isJson()) {
      return new FirebaseFunctionsError(
        'unknown-error',
        `Unexpected response with status: ${response.status} and body: ${response.text}`);
    }

    const error: Error = (response.data as ErrorResponse).error || {};
    let code: FunctionsErrorCode = 'unknown-error';
    if (error.status && error.status in FUNCTIONS_ERROR_CODE_MAPPING) {
      code = FUNCTIONS_ERROR_CODE_MAPPING[error.status];
    }
    const message = error.message || `Unknown server error: ${response.text}`;
    return new FirebaseFunctionsError(code, message);
  }
}

interface ErrorResponse {
  error?: Error;
}

interface Error {
  code?: number;
  message?: string;
  status?: string;
}

/**
 * Task is a limited subset of https://cloud.google.com/tasks/docs/reference/rest/v2/projects.locations.queues.tasks#resource:-task
 * containing the relevant fields for enqueueing tasks that tirgger Cloud Functions.
 */
export interface Task {
  name?: string;
  // A timestamp in RFC3339 UTC "Zulu" format, with nanosecond resolution and up to nine fractional
  // digits. Examples: "2014-10-02T15:01:23Z" and "2014-10-02T15:01:23.045123456Z".
  scheduleTime?: string;
  // A duration in seconds with up to nine fractional digits, terminated by 's'. Example: "3.5s".
  dispatchDeadline?: string;
  httpRequest: {
    url: string;
    oidcToken?: {
      serviceAccountEmail: string;
    };
    // A base64-encoded string.
    body: string;
    headers: { [key: string]: string };
  };
}

export const FUNCTIONS_ERROR_CODE_MAPPING: { [key: string]: FunctionsErrorCode } = {
  ABORTED: 'aborted',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_CREDENTIAL: 'invalid-credential',
  INTERNAL: 'internal-error',
  FAILED_PRECONDITION: 'failed-precondition',
  PERMISSION_DENIED: 'permission-denied',
  UNAUTHENTICATED: 'unauthenticated',
  NOT_FOUND: 'not-found',
  UNKNOWN: 'unknown-error',
};

export type FunctionsErrorCode =
  'aborted'
  | 'invalid-argument'
  | 'invalid-credential'
  | 'internal-error'
  | 'failed-precondition'
  | 'permission-denied'
  | 'unauthenticated'
  | 'not-found'
  | 'unknown-error'
  | 'task-already-exists';

/**
 * Firebase Functions error code structure. This extends PrefixedFirebaseError.
 *
 * @param code - The error code.
 * @param message - The error message.
 * @constructor
 */
export class FirebaseFunctionsError extends PrefixedFirebaseError {
  constructor(code: FunctionsErrorCode, message: string) {
    super('functions', code, message);

    /* tslint:disable:max-line-length */
    // Set the prototype explicitly. See the following link for more details:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    /* tslint:enable:max-line-length */
    (this as any).__proto__ = FirebaseFunctionsError.prototype;
  }
}

function tasksEmulatorUrl(resources: utils.ParsedResource): string | undefined {
  if (process.env.CLOUD_TASKS_EMULATOR_HOST) {
    return `http://${process.env.CLOUD_TASKS_EMULATOR_HOST}/projects/${resources.projectId}/locations/${resources.locationId}/queues/${resources.resourceId}/tasks`;
  }
  return undefined;
}
