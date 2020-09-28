import * as _admin from './index.d';

export namespace admin.machineLearning {
  /**
   * Firebase ML Model input objects
   */
  interface ModelOptionsBase {
    displayName?: string;
    tags?: string[];
  }
  interface GcsTfliteModelOptions extends ModelOptionsBase {
    tfliteModel: {
      gcsTfliteUri: string;
    };
  }
  interface AutoMLTfliteModelOptions extends ModelOptionsBase {
    tfliteModel: {
      automlModel: string;
    };
  }
  type ModelOptions = ModelOptionsBase | GcsTfliteModelOptions | AutoMLTfliteModelOptions;

  /**
   * A TensorFlow Lite Model output object
   *
   * One of either the `gcsTfliteUri` or `automlModel` properties will be
   * defined.
   */
  interface TFLiteModel {
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
   * A Firebase ML Model output object
   */
  interface Model {
    /** The ID of the model. */
    readonly modelId: string;

    /**
     * The model's name. This is the name you use from your app to load the
     * model.
     */
    readonly displayName: string;

    /**
     * The model's tags, which can be used to group or filter models in list
     * operations.
     */
    readonly tags?: string[];

    /** The timestamp of the model's creation. */
    readonly createTime: string;

    /** The timestamp of the model's most recent update. */
    readonly updateTime: string;

    /** Error message when model validation fails. */
    readonly validationError?: string;

    /** True if the model is published. */
    readonly published: boolean;

    /**
     * The ETag identifier of the current version of the model. This value
     * changes whenever you update any of the model's properties.
     */
    readonly etag: string;

    /**
     * The hash of the model's `tflite` file. This value changes only when
     * you upload a new TensorFlow Lite model.
     */
    readonly modelHash?: string;

    /**
     * True if the model is locked by a server-side operation. You can't make
     * changes to a locked model. See {@link waitForUnlocked `waitForUnlocked()`}.
     */
    readonly locked: boolean;

    /**
     * Wait for the model to be unlocked.
     *
     * @param {number} maxTimeMillis The maximum time in milliseconds to wait.
     *     If not specified, a default maximum of 2 minutes is used.
     *
     * @return {Promise<void>} A promise that resolves when the model is unlocked
     *   or the maximum wait time has passed.
     */
    waitForUnlocked(maxTimeMillis?: number): Promise<void>;

    /**
     * Return the model as a JSON object.
     */
    toJSON(): {[key: string]: any};

    /** Metadata about the model's TensorFlow Lite model file. */
    readonly tfliteModel?: TFLiteModel;
  }

  /**
   * Interface representing options for listing Models.
   */
  interface ListModelsOptions {
    /**
     * An expression that specifies how to filter the results.
     *
     * Examples:
     *
     * ```
     * display_name = your_model
     * display_name : experimental_*
     * tags: face_detector AND tags: experimental
     * state.published = true
     * ```
     *
     * See https://firebase.google.com/docs/ml/manage-hosted-models#list_your_projects_models
     */
    filter?: string;

    /** The number of results to return in each page. */
    pageSize?: number;

    /** A token that specifies the result page to return. */
    pageToken?: string;
  }

  /** Response object for a listModels operation. */
  interface ListModelsResult {
    /** A list of models in your project. */
    readonly models: Model[];

    /**
     * A token you can use to retrieve the next page of results. If null, the
     * current page is the final page.
     */
    readonly pageToken?: string;
  }

  /**
   * The Firebase `MachineLearning` service interface.
   *
   * Do not call this constructor directly. Instead, use
   * [`admin.machineLearning()`](admin.machineLearning#machineLearning).
   */
  interface MachineLearning {
    /**
     *  The {@link admin.app.App} associated with the current `MachineLearning`
     *  service instance.
     */
    app: _admin.app.App;

    /**
     * Creates a model in the current Firebase project.
     *
     * @param {ModelOptions} model The model to create.
     *
     * @return {Promise<Model>} A Promise fulfilled with the created model.
     */
    createModel(model: ModelOptions): Promise<Model>;

    /**
     * Updates a model's metadata or model file.
     *
     * @param {string} modelId The ID of the model to update.
     * @param {ModelOptions} model The model fields to update.
     *
     * @return {Promise<Model>} A Promise fulfilled with the updated model.
     */
    updateModel(modelId: string, model: ModelOptions): Promise<Model>;

    /**
     * Publishes a Firebase ML model.
     *
     * A published model can be downloaded to client apps.
     *
     * @param {string} modelId The ID of the model to publish.
     *
     * @return {Promise<Model>} A Promise fulfilled with the published model.
     */
    publishModel(modelId: string): Promise<Model>;

    /**
     * Unpublishes a Firebase ML model.
     *
     * @param {string} modelId The ID of the model to unpublish.
     *
     * @return {Promise<Model>} A Promise fulfilled with the unpublished model.
     */
    unpublishModel(modelId: string): Promise<Model>;

    /**
     * Gets the model specified by the given ID.
     *
     * @param {string} modelId The ID of the model to get.
     *
     * @return {Promise<Model>} A Promise fulfilled with the model object.
     */
    getModel(modelId: string): Promise<Model>;

    /**
     * Lists the current project's models.
     *
     * @param {ListModelsOptions} options The listing options.
     *
     * @return {Promise<ListModelsResult>} A promise that
     *     resolves with the current (filtered) list of models and the next page
     *     token. For the last page, an empty list of models and no page token
     *     are returned.
     */
    listModels(options?: ListModelsOptions): Promise<ListModelsResult>;

    /**
     * Deletes a model from the current project.
     *
     * @param {string} modelId The ID of the model to delete.
     */
    deleteModel(modelId: string): Promise<void>;
  }

}
