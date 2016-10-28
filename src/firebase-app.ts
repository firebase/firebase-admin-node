import {Credential} from './auth/credential';
import {FirebaseAccessToken} from './auth/auth';
import {deepCopy, deepExtend} from './utils/deep-copy';
import {FirebaseServiceInterface} from './firebase-service';
import {FirebaseNamespaceInternals} from './firebase-namespace';


/**
 * Type representing a callback which is called every time an app lifecycle event occurs.
 */
type AppHook = (event: string, app: FirebaseApp) => void;


/**
 * Type representing the options object passed into initializeApp().
 */
type FirebaseAppOptions = {
 databaseURL?: string,
 credential?: Credential,
 serviceAccount?: string|Object,
 databaseAuthVariableOverride?: Object
};


/**
 * Interface representing the internals of a FirebaseApp instance.
 */
interface FirebaseAppInternalsInterface {
  getToken?(): Promise<FirebaseAccessToken>;
  addAuthTokenListener?(fn: (token?: string) => void): void;
  removeAuthTokenListener?(fn: (token?: string) => void): void;
}


/**
 * Global context object for a collection of services using a shared authentication state.
 */
class FirebaseApp {
  public INTERNAL: FirebaseAppInternalsInterface;

  private name_: string;
  private options_: FirebaseAppOptions;
  private services_: {[name: string]: FirebaseServiceInterface} = {};
  private isDeleted_ = false;

  constructor(options: FirebaseAppOptions, name: string, private firebaseInternals_: FirebaseNamespaceInternals) {
    this.name_ = name;
    this.options_ = deepCopy(options) as FirebaseAppOptions;

    if (typeof this.options_ !== 'object' || this.options_ === null) {
      // Ensure the options are a non-null object
      this.options_ = {};
    }

    const hasCredential = ('credential' in this.options_);
    const hasServiceAccount = ('serviceAccount' in this.options_);

    let errorMessage: string;
    if (!hasCredential && !hasServiceAccount) {
      errorMessage = 'The first argument passed to initializeApp() must be an object containing ' +
      'at least a "credential" property.';
    } else if (hasCredential && hasServiceAccount) {
      errorMessage = 'The first argument passed to initializeApp() cannot specify both the ' +
        '"credential" and "serviceAccount" properties.';
    }
    // TODO(jwenger): NEXT MAJOR RELEASE - throw error if the "credential" property is not specified

    if (typeof errorMessage !== 'undefined') {
      throw new Error(
        `Invalid Firebase app options passed as the first argument to initializeApp(). ${errorMessage}`
      );
    }

    // TODO(jwenger): NEXT MAJOR RELEASE - remove "serviceAccount" property deprecation warning
    if (hasServiceAccount) {
      /* tslint:disable:no-console */
      console.log(
        'WARNING: The "serviceAccount" property specified in the first argument to initializeApp() ' +
        'is deprecated and will be removed in the next major version. You should instead use the ' +
        '"credential" property.'
      );
      /* tslint:enable:no-console */
    }

    Object.keys(firebaseInternals_.serviceFactories).forEach((serviceName) => {
      // Defer calling createService() until the service is accessed
      this[serviceName] = this.getService_.bind(this, serviceName);
    });
  }

  /**
   * Firebase services available off of a FirebaseApp instance. These are monkey-patched via
   * registerService(), but we need to include a dummy implementation to get TypeScript to
   * compile it without errors.
   */
  /* istanbul ignore next */
  public auth(): FirebaseServiceInterface {
    throw new Error('Firebase auth() service has not been registered');
  }

  /* istanbul ignore next */
  public database(): FirebaseServiceInterface {
    throw new Error('Firebase database() service has not been registered');
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


export {
  AppHook,
  FirebaseApp,
  FirebaseAppOptions,
};
