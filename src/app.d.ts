// TODO(jwenger): clean up / organize this file

/**
 * A struct containing information needed to authenticate requests to Firebase.
 */
declare interface AccessToken {
  /* tslint:disable:variable-name */
  access_token: string;
  expires_in: number;
  /* tslint:enable:variable-name */
}

/**
 * A struct containing the fields necessary to use service-account JSON credentials.
 */
declare interface CertificateInterface {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  // TODO(jwenger): add this static method (and the constructor) to this interface
  // fromPath(path: string): CertificateInterface;
}

/**
 * Interface for things that generate access tokens.
 * Should possibly be moved to a Credential namespace before making public.
 */
declare interface CredentialInterface {
  getAccessToken(): Promise<AccessToken>;
  getCertificate(): CertificateInterface;
}

declare type FirebaseAppOptions = {
 databaseURL?: string,
 credential?: CredentialInterface,
 serviceAccount?: string|Object,
 databaseAuthVariableOverride?: Object
};

declare interface FirebaseAuthTokenData {
  accessToken?: string;
  refreshToken?: string;
  expirationTime: number;
}

declare interface FirebaseAppInternals {
  getToken?(): Promise<FirebaseAuthTokenData>;
  addAuthTokenListener?(fn: (token?: string) => void): void;
  removeAuthTokenListener?(fn: (token?: string) => void): void;
}

declare interface FirebaseAppInterface {
  name: string;
  options: FirebaseAppOptions;
  INTERNAL: FirebaseAppInternals;

  delete(): void;
  auth?(): FirebaseServiceInterface;
  database?(): FirebaseServiceInterface;
}


declare interface FirebaseServiceInternals {
  delete(): Promise<void>;
}

// Services are exposed through instances - each of which is associated with a
// FirebaseApp.
declare interface FirebaseServiceInterface {
  app: FirebaseAppInterface;
  INTERNAL: FirebaseServiceInternals;
}

/**
 * Firebase Services create instances given a Firebase App instance and can
 * optionally add properties and methods to each FirebaseApp via the extendApp()
 * function.
 */
declare interface FirebaseServiceFactory {
  (app: FirebaseAppInterface,
   extendApp?: (props: Object) => void): FirebaseServiceInterface;
}


declare type AppHook = (event: string, app: FirebaseAppInterface) => void;


declare interface FirebaseServiceNamespace <T extends FirebaseServiceInterface> {
  (app?: FirebaseAppInterface): T;
}

declare interface FirebaseNamespaceInternalsInterface {
  apps: FirebaseAppInterface[];
  serviceFactories: {[serviceName: string]: FirebaseServiceFactory};

  app(appName: string): FirebaseAppInterface;
  removeApp(appName: string): void;
  initializeApp(options: FirebaseAppOptions, appName: string): FirebaseAppInterface;
  registerService(serviceName: string,
                  createService: FirebaseServiceFactory,
                  serviceProperties?: {[prop: string]: any},
                  appHook?: AppHook): FirebaseServiceNamespace<FirebaseServiceInterface>;
}

declare interface FirebaseNamespaceInterface {
  apps: FirebaseAppInterface[];
  Promise: any;
  SDK_VERSION: string;
  INTERNAL: FirebaseNamespaceInternalsInterface;

  app(appName: string): FirebaseAppInterface;
  initializeApp(options: FirebaseAppOptions, appName: string): FirebaseAppInterface;
}
