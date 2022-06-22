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

import { App } from '../app';
import { getStorage } from '../storage/index';
import { FirebaseError } from '../utils/error';
import * as validator from '../utils/validator';
import { deepCopy } from '../utils/deep-copy';
import * as utils from '../utils';
import {
  MachineLearningApiClient, ModelResponse, ModelUpdateOptions, isGcsTfliteModelOptions,
  ListModelsOptions, ModelOptions,
} from './machine-learning-api-client';
import { FirebaseMachineLearningError } from './machine-learning-utils';

/** Response object for a listModels operation. */
export interface ListModelsResult {
  /** A list of models in your project. */
  readonly models: Model[];

  /**
   * A token you can use to retrieve the next page of results. If null, the
   * current page is the final page.
   */
  readonly pageToken?: string;
}

/**
 * A TensorFlow Lite Model output object
 *
 * One of either the `gcsTfliteUri` or `automlModel` properties will be
 * defined.
 */
export interface TFLiteModel {
  /** The size of the model. */
  readonly sizeBytes: number;

  /** The URI from which the model was originally provided to Firebase. */
  readonly gcsTfliteUri?: string;
  /**
   * The AutoML model reference from which the model was originally provided
   * to Firebase.
   */
  readonly automlModel?: string;
}

/**
 * The Firebase `MachineLearning` service interface.
 */
export class MachineLearning {

  private readonly client: MachineLearningApiClient;
  private readonly appInternal: App;

  /**
   * @param app - The app for this ML service.
   * @constructor
   * @internal
   */
  constructor(app: App) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseError({
        code: 'machine-learning/invalid-argument',
        message: 'First argument passed to admin.machineLearning() must be a ' +
            'valid Firebase app instance.',
      });
    }

    this.appInternal = app;
    this.client = new MachineLearningApiClient(app);
  }

  /**
   *  The {@link firebase-admin.app#App} associated with the current `MachineLearning`
   *  service instance.
   */
  public get app(): App {
    return this.appInternal;
  }

  /**
   * Creates a model in the current Firebase project.
   *
   * @param model - The model to create.
   *
   * @returns A Promise fulfilled with the created model.
   */
  public createModel(model: ModelOptions): Promise<Model> {
    return this.signUrlIfPresent(model)
      .then((modelContent) => this.client.createModel(modelContent))
      .then((operation) => this.client.handleOperation(operation))
      .then((modelResponse) => new Model(modelResponse, this.client));
  }

  /**
   * Updates a model's metadata or model file.
   *
   * @param modelId - The ID of the model to update.
   * @param model - The model fields to update.
   *
   * @returns A Promise fulfilled with the updated model.
   */
  public updateModel(modelId: string, model: ModelOptions): Promise<Model> {
    const updateMask = utils.generateUpdateMask(model);
    return this.signUrlIfPresent(model)
      .then((modelContent) => this.client.updateModel(modelId, modelContent, updateMask))
      .then((operation) => this.client.handleOperation(operation))
      .then((modelResponse) => new Model(modelResponse, this.client));
  }

  /**
   * Publishes a Firebase ML model.
   *
   * A published model can be downloaded to client apps.
   *
   * @param modelId - The ID of the model to publish.
   *
   * @returns A Promise fulfilled with the published model.
   */
  public publishModel(modelId: string): Promise<Model> {
    return this.setPublishStatus(modelId, true);
  }

  /**
   * Unpublishes a Firebase ML model.
   *
   * @param modelId - The ID of the model to unpublish.
   *
   * @returns A Promise fulfilled with the unpublished model.
   */
  public unpublishModel(modelId: string): Promise<Model> {
    return this.setPublishStatus(modelId, false);
  }

  /**
   * Gets the model specified by the given ID.
   *
   * @param modelId - The ID of the model to get.
   *
   * @returns A Promise fulfilled with the model object.
   */
  public getModel(modelId: string): Promise<Model> {
    return this.client.getModel(modelId)
      .then((modelResponse) => new Model(modelResponse, this.client));
  }

  /**
   * Lists the current project's models.
   *
   * @param options - The listing options.
   *
   * @returns A promise that
   *     resolves with the current (filtered) list of models and the next page
   *     token. For the last page, an empty list of models and no page token
   *     are returned.
   */
  public listModels(options: ListModelsOptions = {}): Promise<ListModelsResult> {
    return this.client.listModels(options)
      .then((resp) => {
        if (!validator.isNonNullObject(resp)) {
          throw new FirebaseMachineLearningError(
            'invalid-argument',
            `Invalid ListModels response: ${JSON.stringify(resp)}`);
        }
        let models: Model[] = [];
        if (resp.models) {
          models = resp.models.map((rs) =>  new Model(rs, this.client));
        }
        const result: { models: Model[]; pageToken?: string } = { models };
        if (resp.nextPageToken) {
          result.pageToken = resp.nextPageToken;
        }
        return result;
      });
  }

  /**
   * Deletes a model from the current project.
   *
   * @param modelId - The ID of the model to delete.
   */
  public deleteModel(modelId: string): Promise<void> {
    return this.client.deleteModel(modelId);
  }

  private setPublishStatus(modelId: string, publish: boolean): Promise<Model> {
    const updateMask = ['state.published'];
    const options: ModelUpdateOptions = { state: { published: publish } };
    return this.client.updateModel(modelId, options, updateMask)
      .then((operation) => this.client.handleOperation(operation))
      .then((modelResponse) => new Model(modelResponse, this.client));
  }

  private signUrlIfPresent(options: ModelOptions): Promise<ModelOptions> {
    const modelOptions = deepCopy(options);
    if (isGcsTfliteModelOptions(modelOptions)) {
      return this.signUrl(modelOptions.tfliteModel.gcsTfliteUri)
        .then((uri: string) => {
          modelOptions.tfliteModel.gcsTfliteUri = uri;
          return modelOptions;
        })
        .catch((err: Error) => {
          throw new FirebaseMachineLearningError(
            'internal-error',
            `Error during signing upload url: ${err.message}`);
        });
    }
    return Promise.resolve(modelOptions);
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
    const bucket = getStorage(this.app).bucket(bucketName);
    const blob = bucket.file(blobName);
    return blob.getSignedUrl({
      action: 'read',
      expires: Date.now() + URL_VALID_DURATION,
    }).then((signUrl) => signUrl[0]);
  }
}

/**
 * A Firebase ML Model output object.
 */
export class Model {
  private model: ModelResponse;
  private readonly client?: MachineLearningApiClient;

  /**
   * @internal
   */
  constructor(model: ModelResponse, client: MachineLearningApiClient) {
    this.model = Model.validateAndClone(model);
    this.client = client;
  }

  /** The ID of the model. */
  get modelId(): string {
    return extractModelId(this.model.name);
  }

  /**
   * The model's name. This is the name you use from your app to load the
   * model.
   */
  get displayName(): string {
    return this.model.displayName!;
  }

  /**
   * The model's tags, which can be used to group or filter models in list
   * operations.
   */
  get tags(): string[] {
    return this.model.tags || [];
  }

  /** The timestamp of the model's creation. */
  get createTime(): string {
    return new Date(this.model.createTime).toUTCString();
  }

  /** The timestamp of the model's most recent update. */
  get updateTime(): string {
    return new Date(this.model.updateTime).toUTCString();
  }

  /** Error message when model validation fails. */
  get validationError(): string | undefined {
    return this.model.state?.validationError?.message;
  }

  /** True if the model is published. */
  get published(): boolean {
    return this.model.state?.published || false;
  }

  /**
   * The ETag identifier of the current version of the model. This value
   * changes whenever you update any of the model's properties.
   */
  get etag(): string {
    return this.model.etag;
  }

  /**
   * The hash of the model's `tflite` file. This value changes only when
   * you upload a new TensorFlow Lite model.
   */
  get modelHash(): string | undefined {
    return this.model.modelHash;
  }

  /** Metadata about the model's TensorFlow Lite model file. */
  get tfliteModel(): TFLiteModel | undefined {
    // Make a copy so people can't directly modify the private this.model object.
    return deepCopy(this.model.tfliteModel);
  }

  /**
   * True if the model is locked by a server-side operation. You can't make
   * changes to a locked model. See {@link Model.waitForUnlocked}.
   */
  public get locked(): boolean {
    return (this.model.activeOperations?.length ?? 0) > 0;
  }

  /**
   * Return the model as a JSON object.
   */
  public toJSON(): {[key: string]: any} {
    // We can't just return this.model because it has extra fields and
    // different formats etc. So we build the expected model object.
    const jsonModel: {[key: string]: any}  = {
      modelId: this.modelId,
      displayName: this.displayName,
      tags: this.tags,
      createTime: this.createTime,
      updateTime: this.updateTime,
      published: this.published,
      etag: this.etag,
      locked: this.locked,
    };

    // Also add possibly undefined fields if they exist.

    if (this.validationError) {
      jsonModel['validationError'] = this.validationError;
    }

    if (this.modelHash) {
      jsonModel['modelHash'] = this.modelHash;
    }

    if (this.tfliteModel) {
      jsonModel['tfliteModel'] = this.tfliteModel;
    }

    return jsonModel;
  }

  /**
   * Wait for the model to be unlocked.
   *
   * @param maxTimeMillis - The maximum time in milliseconds to wait.
   *     If not specified, a default maximum of 2 minutes is used.
   *
   * @returns A promise that resolves when the model is unlocked
   *   or the maximum wait time has passed.
   */
  public waitForUnlocked(maxTimeMillis?: number): Promise<void> {
    if ((this.model.activeOperations?.length ?? 0) > 0) {
      // The client will always be defined on Models that have activeOperations
      // because models with active operations came back from the server and
      // were constructed with a non-empty client.
      return this.client!.handleOperation(this.model.activeOperations![0], { wait: true, maxTimeMillis })
        .then((modelResponse) => {
          this.model = Model.validateAndClone(modelResponse);
        });
    }
    return Promise.resolve();
  }

  private static validateAndClone(model: ModelResponse): ModelResponse {
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
    const tmpModel = deepCopy(model);

    // If tflite Model is specified, it must have a source consisting of
    // oneof {gcsTfliteUri, automlModel}
    if (model.tfliteModel &&
        !validator.isNonEmptyString(model.tfliteModel.gcsTfliteUri) &&
        !validator.isNonEmptyString(model.tfliteModel.automlModel)) {
      // If we have some other source, ignore the whole tfliteModel.
      delete (tmpModel as any).tfliteModel;
    }

    // Remove '@type' field. We don't need it.
    if ((tmpModel as any)['@type']) {
      delete (tmpModel as any)['@type'];
    }
    return tmpModel;
  }
}

function extractModelId(resourceName: string): string {
  return resourceName.split('/').pop()!;
}
