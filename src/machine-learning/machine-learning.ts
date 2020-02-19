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

import {FirebaseApp} from '../firebase-app';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {Storage} from '../storage/storage';
import {MachineLearningApiClient, ModelResponse, OperationResponse} from './machine-learning-api-client';
import {FirebaseError} from '../utils/error';

import * as validator from '../utils/validator';
import {FirebaseMachineLearningError} from './machine-learning-utils';
import { deepCopy } from '../utils/deep-copy';

/**
 * Internals of an ML instance.
 */
class MachineLearningInternals implements FirebaseServiceInternalsInterface {
  /**
   * Deletes the service and its associated resources.
   *
   * @return {Promise<void>} An empty Promise that will be resolved when the
   *     service is deleted.
   */
  public delete(): Promise<void> {
    // There are no resources to clean up.
    return Promise.resolve();
  }
}

/** Interface representing listModels options. */
export interface ListModelsOptions {
  listFilter?: string;
  pageSize?: number;
  pageToken?: string;
}

/** Response object for a listModels operation. */
export interface ListModelsResult {
  models: Model[];
  pageToken?: string;
}

/**
 * The Firebase Machine Learning class
 */
export class MachineLearning implements FirebaseServiceInterface {
  public readonly INTERNAL = new MachineLearningInternals();

  private readonly client: MachineLearningApiClient;
  private readonly appInternal: FirebaseApp;
  private readonly storage: Storage;

  /**
   * @param {FirebaseApp} app The app for this ML service.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseError({
        code: 'machine-learning/invalid-argument',
        message: 'First argument passed to admin.machineLearning() must be a ' +
            'valid Firebase app instance.',
      });
    }

    this.storage = app.storage();
    this.appInternal = app;
    this.client = new MachineLearningApiClient(app);
  }

  /**
   * Returns the app associated with this ML instance.
   *
   * @return {FirebaseApp} The app associated with this ML instance.
   */
  public get app(): FirebaseApp {
    return this.appInternal;
  }

  /**
   * Creates a model in Firebase ML.
   *
   * @param {ModelOptions} model The model to create.
   *
   * @return {Promise<Model>} A Promise fulfilled with the created model.
   */
  public createModel(model: ModelOptions): Promise<Model> {
    return this.convertOptionstoContent(model, true)
      .then((modelContent) => this.client.createModel(modelContent))
      .then((operation) => handleOperation(operation));
  }

  /**
   * Updates a model in Firebase ML.
   *
   * @param {string} modelId The id of the model to update.
   * @param {ModelOptions} model The model fields to update.
   *
   * @return {Promise<Model>} A Promise fulfilled with the updated model.
   */
  public updateModel(modelId: string, model: ModelOptions): Promise<Model> {
    throw new Error('NotImplemented');
  }

  /**
   * Publishes a model in Firebase ML.
   *
   * @param {string} modelId The id of the model to publish.
   *
   * @return {Promise<Model>} A Promise fulfilled with the published model.
   */
  public publishModel(modelId: string): Promise<Model> {
    throw new Error('NotImplemented');
  }

  /**
   * Unpublishes a model in Firebase ML.
   *
   * @param {string} modelId The id of the model to unpublish.
   *
   * @return {Promise<Model>} A Promise fulfilled with the unpublished model.
   */
  public unpublishModel(modelId: string): Promise<Model> {
    throw new Error('NotImplemented');
  }

  /**
   * Gets a model from Firebase ML.
   *
   * @param {string} modelId The id of the model to get.
   *
   * @return {Promise<Model>} A Promise fulfilled with the unpublished model.
   */
  public getModel(modelId: string): Promise<Model> {
    return this.client.getModel(modelId)
      .then((modelResponse) => {
         return new Model(modelResponse);
      });
  }

  /**
   * Lists models from Firebase ML.
   *
   * @param {ListModelsOptions} options The listing options.
   *
   * @return {Promise<{models: Model[], pageToken?: string}>} A promise that
   *     resolves with the current (filtered) list of models and the next page
   *     token. For the last page, an empty list of models and no page token are
   *     returned.
   */
  public listModels(options: ListModelsOptions): Promise<ListModelsResult> {
    throw new Error('NotImplemented');
  }

  /**
   * Deletes a model from Firebase ML.
   *
   * @param {string} modelId The id of the model to delete.
   */
  public deleteModel(modelId: string): Promise<void> {
    return this.client.deleteModel(modelId);
  }

  private convertOptionstoContent(options: ModelOptions, forUpload?: boolean): Promise<object> {
    const modelContent = deepCopy(options);

    if (forUpload && modelContent.tfliteModel?.gcsTfliteUri) {
      return this.signUrl(modelContent.tfliteModel.gcsTfliteUri)
        .then ((uri: string) => {
          modelContent.tfliteModel!.gcsTfliteUri = uri;
          return modelContent;
        })
        .catch((err: Error) => {
          throw new FirebaseMachineLearningError(
            'internal-error',
            `Error during signing upload url: ${err.message}`);

        });
    }

    return Promise.resolve(modelContent);
  }

  private signUrl(unsignedUrl: string): Promise<string> {
    const MINUTES_IN_MILLIS = 60 * 1000;
    const URL_VALID_DURATION = 10 * MINUTES_IN_MILLIS;

    const gcsRegex = /^gs:\/\/([a-z0-9_.-]{3,63})\/(.+)$/;
    const matches = gcsRegex.exec(unsignedUrl);
    if (!matches) {
      throw new FirebaseMachineLearningError(
        'invalid-argument',
        `Invalid unsigned url: ${unsignedUrl}`);
    }
    const bucketName = matches[1];
    const blobName = matches[2];
    const bucket = this.storage.bucket(bucketName);
    const blob = bucket.file(blobName);
    return blob.getSignedUrl({
      action: 'read',
      expires: Date.now() + URL_VALID_DURATION,
    }).then((x) => {
      return x[0];
    });
  }
}


/**
 * A Firebase ML Model output object.
 */
export class Model {
  public readonly modelId: string;
  public readonly displayName: string;
  public readonly tags?: string[];
  public readonly createTime: string;
  public readonly updateTime: string;
  public readonly validationError?: string;
  public readonly published: boolean;
  public readonly etag: string;
  public readonly modelHash?: string;

  public readonly tfliteModel?: TFLiteModel;

  constructor(model: ModelResponse) {
    if (!validator.isNonNullObject(model) ||
      !validator.isNonEmptyString(model.name) ||
      !validator.isNonEmptyString(model.createTime) ||
      !validator.isNonEmptyString(model.updateTime) ||
      !validator.isNonEmptyString(model.displayName) ||
      !validator.isNonEmptyString(model.etag)) {
        throw new FirebaseMachineLearningError(
          'invalid-server-response',
          `Invalid Model response: ${JSON.stringify(model)}`);
    }

    this.modelId = extractModelId(model.name);
    this.displayName = model.displayName;
    this.tags = model.tags || [];
    this.createTime = new Date(model.createTime).toUTCString();
    this.updateTime = new Date(model.updateTime).toUTCString();
    if (model.state?.validationError?.message) {
      this.validationError = model.state?.validationError?.message;
    }
    this.published = model.state?.published || false;
    this.etag = model.etag;
    if (model.modelHash) {
      this.modelHash = model.modelHash;
    }
    if (model.tfliteModel) {
      this.tfliteModel = {
        gcsTfliteUri: model.tfliteModel.gcsTfliteUri,
        sizeBytes: model.tfliteModel.sizeBytes,
      };
    }

  }

  public get locked(): boolean {
    // Backend does not currently return locked models.
    // This will likely change in future.
    return false;
  }

  public waitForUnlocked(maxTimeSeconds?: number): Promise<void> {
    // Backend does not currently return locked models.
    // This will likely change in future.
    return Promise.resolve();
  }
}

/**
 * A TFLite Model output object
 */
export interface TFLiteModel {
  readonly sizeBytes: number;

  readonly gcsTfliteUri: string;
}


/**
 * A Firebase ML Model input object
 */
export class ModelOptions {
  public displayName?: string;
  public tags?: string[];

  public tfliteModel?: { gcsTfliteUri: string; };
}


function extractModelId(resourceName: string): string {
  return resourceName.split('/').pop()!;
}


function handleOperation(op: OperationResponse): Model {
  // Backend currently does not return operations that are not done.
  if (op.done) {
    // Done operations must have either a response or an error.
    if (op.response) {
      return new Model(op.response);
    } else if (op.error) {
      throw FirebaseMachineLearningError.fromOperationError(
        op.error.code, op.error.message);
    }
  }
  throw new FirebaseMachineLearningError(
    'invalid-server-response',
    `Invalid Operation response: ${JSON.stringify(op)}`);
}
