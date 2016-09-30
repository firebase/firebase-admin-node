import {deepCopy, deepExtend} from './utils/deep-copy';

/**
 * Global context object for a collection of services using a shared authentication state.
 */
class FirebaseApp implements FirebaseAppInterface {
  public INTERNAL: FirebaseAppInternals;

  private name_: string;
  private options_: FirebaseAppOptions;
  private services_: {[name: string]: FirebaseServiceInterface} = {};
  private isDeleted_ = false;

  constructor(options: FirebaseAppOptions, name: string, private firebaseInternals_: FirebaseNamespaceInternalsInterface) {
    this.name_ = name;
    this.options_ = deepCopy(options) as FirebaseAppOptions;

    Object.keys(firebaseInternals_.serviceFactories).forEach((serviceName) => {
      // Defer calling createService() until the service is accessed
      this[serviceName] = this.getService_.bind(this, serviceName);
    });
  }

  /**
   * Returns the name of the FirebaseApp instance.
   *
   * @returns {string} The name of the FirebaseApp instance.
   */
  get name(): string {
    this.checkDestroyed_();
    return this.name_;
  }

  /**
   * Returns the options for the FirebaseApp instance.
   *
   * @returns {FirebaseAppOptions} The options for the FirebaseApp instance.
   */
  get options(): FirebaseAppOptions {
    this.checkDestroyed_();
    return deepCopy(this.options_) as FirebaseAppOptions;
  }

  /**
   * Deletes the FirebaseApp instance.
   *
   * @returns {Promise<void>} An empty Promise fulfilled once the FirebaseApp instance is deleted.
   */
  public delete(): Promise<void> {
    this.checkDestroyed_();
    this.firebaseInternals_.removeApp(this.name_);

    return Promise.all(Object.keys(this.services_).map((serviceName) => {
      return this.services_[serviceName].INTERNAL.delete();
    })).then(() => {
      this.services_ = {};
      this.isDeleted_ = true;
    });
  }

  /**
   * Returns the service instance associated with this FirebaseApp instance (creating it on demand
   * if needed).
   *
   * @param {string} serviceName The name of the service instance to return.
   * @return {FirebaseServiceInterface} The service instance with the provided name.
   */
  private getService_(serviceName: string): FirebaseServiceInterface {
    this.checkDestroyed_();

    if (!(serviceName in this.services_)) {
      this.services_[serviceName] = this.firebaseInternals_.serviceFactories[serviceName](
        this,
        this.extendApp_.bind(this)
      );
    }

    return this.services_[serviceName];
  }

  /**
   * Callback function used to extend an App instance at the time of service instance creation.
   */
  private extendApp_(props: {[prop: string]: any}): void {
    deepExtend(this, props);
  }

  /**
   * Throws an Error if the FirebaseApp instance has already been deleted.
   */
  private checkDestroyed_(): void {
    if (this.isDeleted_) {
      throw new Error(`Firebase app named '${this.name_}' has already been deleted.`);
    }
  }
};

export {FirebaseApp};
