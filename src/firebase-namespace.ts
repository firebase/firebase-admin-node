import {deepExtend} from './utils/deep-copy';
import {AppHook, FirebaseApp, FirebaseAppOptions} from './firebase-app';
import {FirebaseServiceFactory, FirebaseServiceInterface} from './firebase-service';

const DEFAULT_APP_NAME = '[DEFAULT]';

interface FirebaseServiceNamespace <T extends FirebaseServiceInterface> {
  (app?: FirebaseApp): T;
}

class FirebaseNamespaceInternals {
  public serviceFactories: {[serviceName: string]: FirebaseServiceFactory} = {};

  private apps_: {[appName: string]: FirebaseApp} = {};
  private appHooks_: {[service: string]: AppHook} = {};

  constructor(public firebase_) {}

  /**
   * Initializes the FirebaseApp instance.
   *
   * @param {FirebaseAppOptions} options Options for the FirebaseApp instance.
   * @param {string} [appName] Optional name of the FirebaseApp instance.
   *
   * @return {FirebaseApp} A new FirebaseApp instance.
   */
  public initializeApp(options: FirebaseAppOptions, appName = DEFAULT_APP_NAME): FirebaseApp {
    if (typeof appName !== 'string' || appName === '') {
      throw new Error(`Illegal Firebase app name '${appName}' provided. App name must be a non-empty string.`);
    } else if (appName in this.apps_) {
      throw new Error(`Firebase app named '${appName}' already exists.`);
    }

    let app = new FirebaseApp(options, appName, this);

    this.apps_[appName] = app;

    this.callAppHooks_(app, 'create');

    return app;
  }

  /**
   * Returns the FirebaseApp instance with the provided name (or the default FirebaseApp instance
   * if no name is provided).
   *
   * @param {string} [appName=DEFAULT_APP_NAME] Optional name of the FirebaseApp instance to return.
   * @return {FirebaseApp} The FirebaseApp instance which has the provided name.
   */
  public app(appName = DEFAULT_APP_NAME): FirebaseApp {
    if (typeof appName !== 'string' || appName === '') {
      throw new Error(`Illegal Firebase app name '${appName}' provided. App name must be a non-empty string.`);
    } else if (!(appName in this.apps_)) {
      throw new Error(`No Firebase app named '${appName}' exists.`);
    }

    return this.apps_[appName];
  }

  /*
   * Returns an array of all the non-deleted FirebaseApp instances.
   *
   * @return {Array<FirebaseApp>} An array of all the non-deleted FirebaseApp instances
   */
  public get apps(): FirebaseApp[] {
    // Return a copy so the caller cannot mutate the array
    return Object.keys(this.apps_).map((appName) => this.apps_[appName]);
  }

  /*
   * Removes the specified FirebaseApp instance.
   *
   * @param {string} appName The name of the FirebaseApp instance to remove.
   */
  public removeApp(appName: string): void {
    if (typeof appName === 'undefined') {
      throw new Error(`No Firebase app name provided. App name must be a non-empty string.`);
    }

    let appToRemove = this.app(appName);
    this.callAppHooks_(appToRemove, 'delete');
    delete this.apps_[appName];
  }

  /*
   * Registers a new service on this Firebase namespace.
   *
   * @param {string} serviceName The name of the Firebase service to register.
   * @param {FirebaseServiceFactory} createService A factory method to generate an instance of the Firebase service.
   * @param {Object} [serviceProperties] Optional properties to extend this Firebase namespace with.
   * @param {AppHook} [appHook] Optional callback that handles app-related events like app creation and deletion.
   * @return {FirebaseServiceNamespace<FirebaseServiceInterface>} The Firebase service's namespace.
   */
  public registerService(serviceName: string,
                         createService: FirebaseServiceFactory,
                         serviceProperties?: Object,
                         appHook?: AppHook): FirebaseServiceNamespace<FirebaseServiceInterface> {
    if (typeof serviceName === 'undefined') {
      throw new Error(`No service name provided. Service name must be a non-empty string.`);
    } else if (typeof serviceName !== 'string' || serviceName === '') {
      throw new Error(`Illegal service name '${serviceName}' provided. Service name must be a non-empty string.`);
    } else if (serviceName in this.serviceFactories) {
      throw new Error(`Firebase service named '${serviceName}' has already been registered.`);
    }

    this.serviceFactories[serviceName] = createService;
    if (appHook) {
      this.appHooks_[serviceName] = appHook;
    }

    let serviceNamespace: FirebaseServiceNamespace<FirebaseServiceInterface>;

    // The service namespace is an accessor function which takes a FirebaseApp instance
    // or uses the default app if no FirebaseApp instance is provided
    serviceNamespace = (appArg?: FirebaseApp) => {
      if (typeof appArg === 'undefined') {
        appArg = this.app();
      }

      // Forward service instance lookup to the FirebaseApp
      return (appArg as any)[serviceName]();
    };

    // ... and a container for service-level properties.
    if (serviceProperties !== undefined) {
      deepExtend(serviceNamespace, serviceProperties);
    }

    // Monkey-patch the service namespace onto the Firebase namespace
    this.firebase_[serviceName] = serviceNamespace;

    return serviceNamespace;
  }

  /**
   * Calls the app hooks corresponding to the provided event name for each service within the
   * provided FirebaseApp instance.
   *
   * @param {FirebaseApp} app The FirebaseApp instance whose app hooks to call.
   * @param {string} eventName The event name representing which app hooks to call.
   */
  private callAppHooks_(app: FirebaseApp, eventName: string) {
    Object.keys(this.serviceFactories).forEach((serviceName) => {
      if (this.appHooks_[serviceName]) {
        this.appHooks_[serviceName](eventName, app);
      }
    });
  }
}


/**
 * Global Firebase context object.
 */
class FirebaseNamespace {
  public SDK_VERSION = '<XXX_SDK_VERSION_XXX>';
  public INTERNAL: FirebaseNamespaceInternals;

  /* tslint:disable */
  // TODO(jwenger): Database is the only consumer of firebase.Promise. We should update it to use
  // use the native Promise and then remove this.
  public Promise: any = Promise;
  /* tslint:enable */

  constructor() {
    this.INTERNAL = new FirebaseNamespaceInternals(this);
  }

  /**
   * Firebase services available off of a FirebaseNamespace instance. These are monkey-patched via
   * firebase.registerService(), but we need to include a dummy implementation to get TypeScript to
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
   * Initializes the FirebaseApp instance.
   *
   * @param {FirebaseAppOptions} options Options for the FirebaseApp instance.
   * @param {string} [appName] Optional name of the FirebaseApp instance.
   *
   * @return {FirebaseApp} A new FirebaseApp instance.
   */
  public initializeApp(options: FirebaseAppOptions, appName?: string): FirebaseApp {
    return this.INTERNAL.initializeApp(options, appName);
  }

  /**
   * Returns the FirebaseApp instance with the provided name (or the default FirebaseApp instance
   * if no name is provided).
   *
   * @param {string} [appName] Optional name of the FirebaseApp instance to return.
   * @return {FirebaseApp} The FirebaseApp instance which has the provided name.
   */
  public app(appName?: string): FirebaseApp {
    return this.INTERNAL.app(appName);
  }

  /*
   * Returns an array of all the non-deleted FirebaseApp instances.
   *
   * @return {Array<FirebaseApp>} An array of all the non-deleted FirebaseApp instances
   */
  public get apps(): FirebaseApp[] {
    return this.INTERNAL.apps;
  }
};

export {
  FirebaseNamespace,
  FirebaseNamespaceInternals
};
