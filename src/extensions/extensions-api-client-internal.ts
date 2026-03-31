/*!
 * @license
 * Copyright 2022 Google LLC
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
import { FirebaseAppError, PrefixedFirebaseError, ErrorInfo } from '../utils/error';
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
      throw new FirebaseAppError({
        code: 'invalid-argument',
        message: 'First argument passed to getExtensions() must be a valid Firebase app instance.'
      });
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
      return new FirebaseExtensionsError({
        code: 'unknown-error',
        message: `Unexpected response with status: ${response.status} and body: ${response.text}`,
        httpResponse: err.response,
        cause: err
      });
    }
    const error = response.data?.error;
    const message = error?.message || `Unknown server error: ${response.text}`;
    switch (error.code) {
    case 403:
      return new FirebaseExtensionsError({ code: 'forbidden', message, httpResponse: err.response, cause: err });
    case 404:
      return new FirebaseExtensionsError({ code: 'not-found', message, httpResponse: err.response, cause: err });
    case 500:
      return new FirebaseExtensionsError({ code: 'internal-error', message, httpResponse: err.response, cause: err });
    }
    return new FirebaseExtensionsError({ code: 'unknown-error', message, httpResponse: err.response, cause: err });
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

/**
 * Extensions client error codes and their default messages.
 */
export type ExtensionsErrorCode = 'invalid-argument' | 'not-found' | 'forbidden' | 'internal-error' | 'unknown-error';
/**
 * Firebase Extensions error code structure. This extends PrefixedFirebaseError.
 */
export class FirebaseExtensionsError extends PrefixedFirebaseError {
  /**
   * @param info - The error code info.
   * @param message - The error message. If provided, this will override the default message.
   */
  constructor(info: ErrorInfo, message?: string) {
    super('Extensions', info.code, message || info.message, info.httpResponse, info.cause);

  }
}
