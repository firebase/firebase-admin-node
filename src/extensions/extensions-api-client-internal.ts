/*!
 * @license
 * Copyright 2022 Google Inc.
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
import { AuthorizedHttpClient, HttpClient, RequestResponseError, HttpRequestConfig } from '../utils/api-request';
import { FirebaseAppError, PrefixedFirebaseError } from '../utils/error';
import * as validator from '../utils/validator';
import * as utils from '../utils';

const FIREBASE_FUNCTIONS_CONFIG_HEADERS = {
  'X-Firebase-Client': `fire-admin-node/${utils.getSdkVersion()}`
};
const EXTENSIONS_API_VERSION = 'v1beta';
// Note - use getExtensionsApiUri() instead so that changing environments is consistent.
const EXTENSIONS_URL = 'https://firebaseextensions.googleapis.com';

/**
 * Class that facilitates sending requests to the Firebase Extensions backend API.
 *
 * @internal
 */
export class ExtensionsApiClient {
  private readonly httpClient: HttpClient;
  
  constructor(private readonly app: App) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseAppError(
        'invalid-argument',
        'First argument passed to getExtensions() must be a valid Firebase app instance.');
    }
    this.httpClient = new AuthorizedHttpClient(this.app as FirebaseApp);
  }

  async updateRuntimeData(
    projectId: string,
    instanceId: string,
    runtimeData: RuntimeData
  ): Promise<RuntimeDataResponse> {
    const url = this.getRuntimeDataUri(projectId, instanceId);
    const request: HttpRequestConfig = {
      method: 'PATCH',
      url,
      headers: FIREBASE_FUNCTIONS_CONFIG_HEADERS,
      data: runtimeData,
    };
    try {
      const res = await this.httpClient.send(request);
      return res.data
    } catch (err: any) {
      throw this.toFirebaseError(err);
    }
  }

  private getExtensionsApiUri(): string {
    return process.env['FIREBASE_EXT_URL'] ?? EXTENSIONS_URL;
  }

  private getRuntimeDataUri(projectId: string, instanceId: string): string {
    return `${
      this.getExtensionsApiUri()
    }/${EXTENSIONS_API_VERSION}/projects/${projectId}/instances/${instanceId}/runtimeData`;
  }

  private toFirebaseError(err: RequestResponseError): PrefixedFirebaseError {
    if (err instanceof PrefixedFirebaseError) {
      return err;
    }

    const response = err.response;
    if (!response?.isJson()) {
      return new FirebaseExtensionsError(
        'unknown-error',
        `Unexpected response with status: ${response.status} and body: ${response.text}`);
    }
    const error = response.data?.error;
    const message = error?.message || `Unknown server error: ${response.text}`;
    switch (error.code) {
    case 403:
      return  new FirebaseExtensionsError('forbidden', message);
    case 404:
      return new FirebaseExtensionsError('not-found', message);
    case 500:
      return new FirebaseExtensionsError('internal-error', message);
    }
    return new FirebaseExtensionsError('unknown-error', message);
  }
}

interface RuntimeData {

  //oneof
  processingState?: ProcessingState;
  fatalError?: FatalError;
}

interface RuntimeDataResponse extends RuntimeData{
  name: string,
  updateTime: string,
}

interface FatalError {
  errorMessage: string;
}

interface ProcessingState {
  detailMessage: string;
  state: State;
}

type State = 'STATE_UNSPECIFIED' |
  'NONE' |
  'PROCESSING' |
  'PROCESSING_COMPLETE' |
  'PROCESSING_WARNING' |
  'PROCESSING_FAILED';

type ExtensionsErrorCode = 'invalid-argument' | 'not-found' | 'forbidden' | 'internal-error' | 'unknown-error';
/**
 * Firebase Extensions error code structure. This extends PrefixedFirebaseError.
 *
 * @param code - The error code.
 * @param message - The error message.
 * @constructor
 */
export class FirebaseExtensionsError extends PrefixedFirebaseError {
  constructor(code: ExtensionsErrorCode, message: string) {
    super('Extensions', code, message);

    /* tslint:disable:max-line-length */
    // Set the prototype explicitly. See the following link for more details:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    /* tslint:enable:max-line-length */
    (this as any).__proto__ = FirebaseExtensionsError.prototype;
  }
}
