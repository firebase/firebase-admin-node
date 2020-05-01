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

import { HttpRequestConfig, HttpClient, HttpError, AuthorizedHttpClient } from '../utils/api-request';
import { PrefixedFirebaseError } from '../utils/error';
import { FirebaseMachineLearningError, MachineLearningErrorCode } from './machine-learning-utils';
import * as utils from '../utils/index';
import * as validator from '../utils/validator';
import { FirebaseApp } from '../firebase-app';

const ML_V1BETA2_API = 'https://firebaseml.googleapis.com/v1beta2';
const FIREBASE_VERSION_HEADER = {
  'X-Firebase-Client': 'fire-admin-node/<XXX_SDK_VERSION_XXX>',
};

export interface StatusErrorResponse {
    readonly code: number;
    readonly message: string;
}

/**
 * A Firebase ML Model input object
 */
export interface ModelOptions {
  displayName?: string;
  tags?: string[];

  tfliteModel?: { gcsTfliteUri: string };
}

export interface ModelUpdateOptions extends ModelOptions {
  state?: { published?: boolean };
}

/** Interface representing listModels options. */
export interface ListModelsOptions {
  filter?: string;
  pageSize?: number;
  pageToken?: string;
}

export interface ModelContent {
  readonly displayName?: string;
  readonly tags?: string[];
  readonly state?: {
    readonly validationError?: StatusErrorResponse;
    readonly published?: boolean;
  };
  readonly tfliteModel?: {
    readonly gcsTfliteUri: string;
    readonly sizeBytes: number;
  };
}

export interface ModelResponse extends ModelContent {
  readonly name: string;
  readonly createTime: string;
  readonly updateTime: string;
  readonly etag: string;
  readonly modelHash?: string;
}

export interface ListModelsResponse {
  readonly models?: ModelResponse[];
  readonly nextPageToken?: string;
}

export interface OperationResponse {
  readonly name?: string;
  readonly done: boolean;
  readonly error?: StatusErrorResponse;
  readonly response?: ModelResponse;
}


/**
 * Class that facilitates sending requests to the Firebase ML backend API.
 *
 * @private
 */
export class MachineLearningApiClient {
  private readonly httpClient: HttpClient;
  private projectIdPrefix?: string;

  constructor(private readonly app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseMachineLearningError(
        'invalid-argument',
        'First argument passed to admin.machineLearning() must be a valid '
          + 'Firebase app instance.');
    }

    this.httpClient = new AuthorizedHttpClient(app);
  }

  public createModel(model: ModelOptions): Promise<OperationResponse> {
    if (!validator.isNonNullObject(model) ||
        !validator.isNonEmptyString(model.displayName)) {
      const err = new FirebaseMachineLearningError('invalid-argument', 'Invalid model content.');
      return Promise.reject(err);
    }
    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'POST',
          url: `${url}/models`,
          data: model,
        };
        return this.sendRequest<OperationResponse>(request);
      });
  }

  public updateModel(modelId: string, model: ModelUpdateOptions, updateMask: string[]): Promise<OperationResponse> {
    if (!validator.isNonEmptyString(modelId) ||
        !validator.isNonNullObject(model) ||
        !validator.isNonEmptyArray(updateMask)) {
      const err = new FirebaseMachineLearningError('invalid-argument', 'Invalid model or mask content.');
      return Promise.reject(err);
    }
    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'PATCH',
          url: `${url}/models/${modelId}?updateMask=${updateMask.join()}`,
          data: model,
        };
        return this.sendRequest<OperationResponse>(request);
      });
  }


  public getModel(modelId: string): Promise<ModelResponse> {
    return Promise.resolve()
      .then(() => {
        return this.getModelName(modelId);
      })
      .then((modelName) => {
        return this.getResource<ModelResponse>(modelName);
      });
  }

  public listModels(options: ListModelsOptions = {}): Promise<ListModelsResponse> {
    if (!validator.isNonNullObject(options)) {
      const err = new FirebaseMachineLearningError('invalid-argument', 'Invalid ListModelsOptions');
      return Promise.reject(err);
    }
    if (typeof options.filter !== 'undefined' && !validator.isNonEmptyString(options.filter)) {
      const err = new FirebaseMachineLearningError('invalid-argument', 'Invalid list filter.');
      return Promise.reject(err);
    }
    if (typeof options.pageSize !== 'undefined') {
      if (!validator.isNumber(options.pageSize)) {
        const err = new FirebaseMachineLearningError('invalid-argument', 'Invalid page size.');
        return Promise.reject(err);
      }
      if (options.pageSize < 1 || options.pageSize > 100) {
        const err = new FirebaseMachineLearningError(
          'invalid-argument', 'Page size must be between 1 and 100.');
        return Promise.reject(err);
      }
    }
    if (typeof options.pageToken !== 'undefined' && !validator.isNonEmptyString(options.pageToken)) {
      const err = new FirebaseMachineLearningError(
        'invalid-argument', 'Next page token must be a non-empty string.');
      return Promise.reject(err);
    }
    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'GET',
          url: `${url}/models`,
          data: options,
        };
        return this.sendRequest<ListModelsResponse>(request);
      });
  }

  public deleteModel(modelId: string): Promise<void> {
    return this.getUrl()
      .then((url) => {
        const modelName = this.getModelName(modelId);
        const request: HttpRequestConfig = {
          method: 'DELETE',
          url: `${url}/${modelName}`,
        };
        return this.sendRequest<void>(request);
      });
  }

  /**
   * Gets the specified resource from the ML API. Resource names must be the short names without project
   * ID prefix (e.g. `models/123456789`).
   *
   * @param {string} name Full qualified name of the resource to get.
   * @returns {Promise<T>} A promise that fulfills with the resource.
   */
  private getResource<T>(name: string): Promise<T> {
    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'GET',
          url: `${url}/${name}`,
        };
        return this.sendRequest<T>(request);
      });
  }

  private sendRequest<T>(request: HttpRequestConfig): Promise<T> {
    request.headers = FIREBASE_VERSION_HEADER;
    return this.httpClient.send(request)
      .then((resp) => {
        return resp.data as T;
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  private toFirebaseError(err: HttpError): PrefixedFirebaseError {
    if (err instanceof PrefixedFirebaseError) {
      return err;
    }

    const response = err.response;
    if (!response.isJson()) {
      return new FirebaseMachineLearningError(
        'unknown-error',
        `Unexpected response with status: ${response.status} and body: ${response.text}`);
    }

    const error: Error = (response.data as ErrorResponse).error || {};
    let code: MachineLearningErrorCode = 'unknown-error';
    if (error.status && error.status in ERROR_CODE_MAPPING) {
      code = ERROR_CODE_MAPPING[error.status];
    }
    const message = error.message || `Unknown server error: ${response.text}`;
    return new FirebaseMachineLearningError(code, message);
  }

  private getUrl(): Promise<string> {
    return this.getProjectIdPrefix()
      .then((projectIdPrefix) => {
        return `${ML_V1BETA2_API}/${projectIdPrefix}`;
      });
  }

  private getProjectIdPrefix(): Promise<string> {
    if (this.projectIdPrefix) {
      return Promise.resolve(this.projectIdPrefix);
    }

    return utils.findProjectId(this.app)
      .then((projectId) => {
        if (!validator.isNonEmptyString(projectId)) {
          throw new FirebaseMachineLearningError(
            'invalid-argument',
            'Failed to determine project ID. Initialize the SDK with service account credentials, or '
            + 'set project ID as an app option. Alternatively, set the GOOGLE_CLOUD_PROJECT '
            + 'environment variable.');
        }

        this.projectIdPrefix = `projects/${projectId}`;
        return this.projectIdPrefix;
      });
  }

  private getModelName(modelId: string): string {
    if (!validator.isNonEmptyString(modelId)) {
      throw new FirebaseMachineLearningError(
        'invalid-argument', 'Model ID must be a non-empty string.');
    }

    if (modelId.indexOf('/') !== -1) {
      throw new FirebaseMachineLearningError(
        'invalid-argument', 'Model ID must not contain any "/" characters.');
    }

    return `models/${modelId}`;
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

const ERROR_CODE_MAPPING: {[key: string]: MachineLearningErrorCode} = {
  INVALID_ARGUMENT: 'invalid-argument',
  NOT_FOUND: 'not-found',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  UNAUTHENTICATED: 'authentication-error',
  UNKNOWN: 'unknown-error',
};
