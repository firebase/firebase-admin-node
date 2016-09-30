'use strict';

import {expect} from 'chai';
import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import {FirebaseNamespace} from '../src/firebase-namespace';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);


const DEFAULT_APP_NAME = '[DEFAULT]';

const mockAppName = 'mock-app-name';
const mockServiceName = 'mock-service-name';
const mockOptions = {} as FirebaseAppOptions;


describe('FirebaseNamespace', () => {
  let firebaseNamespace;

  beforeEach(() => {
    firebaseNamespace = new FirebaseNamespace();
  });

  describe('#SDK_VERSION', () => {
    it('should return the SDK version', () => {
      expect(firebaseNamespace.SDK_VERSION).to.equal('<XXX_SDK_VERSION_XXX>');
    });
  });

  describe('#apps', () => {
    it('should return an empty array if there are no apps within this namespace', () => {
      expect(firebaseNamespace.apps).to.deep.equal([]);
    });

    it('should return an array of apps within this namespace', () => {
      const appNames = ['one', 'two', 'three'];
      const apps = appNames.map(appName => {
        return firebaseNamespace.initializeApp(mockOptions, appName);
      });

      expect(firebaseNamespace.apps).to.have.length(apps.length);
      expect(firebaseNamespace.apps).to.deep.equal(apps);
    });

    it('should not include apps which have been deleted', () => {
      const appNames = ['one', 'two', 'three'];
      const apps = appNames.map(appName => {
        return firebaseNamespace.initializeApp(mockOptions, appName);
      });

      return apps[0].delete().then(() => {
        apps.shift();
        expect(firebaseNamespace.apps).to.have.length(apps.length);
        expect(firebaseNamespace.apps).to.deep.equal(apps);
      });
    });

    it('should be read-only', () => {
      expect(() => {
        firebaseNamespace.apps = 'foo';
      }).to.throw(`Cannot set property apps of #<FirebaseNamespace> which has only a getter`);
    });
  });

  describe('#app()', () => {
    const invalidAppNames = [null, NaN, 0, 1, true, false, [], ['a'], {}, { a: 1 }, _.noop];
    invalidAppNames.forEach((invalidAppName) => {
      it('should throw given non-string app name: ' + JSON.stringify(invalidAppName), () => {
        expect(() => {
          return firebaseNamespace.app(invalidAppName);
        }).to.throw(`Illegal Firebase app name '${invalidAppName}' provided. App name must be a non-empty string.`);
      });
    });

    it('should throw given empty string app name', () => {
      expect(() => {
        return firebaseNamespace.app('');
      }).to.throw(`Illegal Firebase app name '' provided. App name must be a non-empty string.`);
    });

    it('should throw given an app name which does not correspond to an existing app', () => {
      expect(() => {
        return firebaseNamespace.app(mockAppName);
      }).to.throw(`No Firebase app named '${mockAppName}' exists.`);
    });

    it('should throw given a deleted app', () => {
      const app = firebaseNamespace.initializeApp(mockOptions, mockAppName);
      return app.delete().then(() => {
        expect(() => {
          return firebaseNamespace.app(mockAppName);
        }).to.throw(`No Firebase app named '${mockAppName}' exists.`);
      });
    });

    it('should throw given no app name if the default app does not exist', () => {
      expect(() => {
        return firebaseNamespace.app();
      }).to.throw(`No Firebase app named '${DEFAULT_APP_NAME}' exists.`);
    });

    it('should return the app associated with the provided app name', () => {
      const app = firebaseNamespace.initializeApp(mockOptions, mockAppName);
      expect(firebaseNamespace.app(mockAppName)).to.deep.equal(app);
    });

    it('should return the default app if no app name is provided', () => {
      const app = firebaseNamespace.initializeApp(mockOptions);
      expect(firebaseNamespace.app()).to.deep.equal(app);
    });

    it('should return the default app if the default app name is provided', () => {
      const app = firebaseNamespace.initializeApp(mockOptions);
      expect(firebaseNamespace.app(DEFAULT_APP_NAME)).to.deep.equal(app);
    });
  });

  describe('#initializeApp()', () => {
    const invalidAppNames = [null, NaN, 0, 1, true, false, [], ['a'], {}, { a: 1 }, _.noop];
    invalidAppNames.forEach((invalidAppName) => {
      it('should throw given non-string app name: ' + JSON.stringify(invalidAppName), () => {
        expect(() => {
          firebaseNamespace.initializeApp(mockOptions, invalidAppName);
        }).to.throw(`Illegal Firebase app name '${invalidAppName}' provided. App name must be a non-empty string.`);
      });
    });

    it('should throw given empty string app name', () => {
      expect(() => {
        firebaseNamespace.initializeApp(mockOptions, '');
      }).to.throw(`Illegal Firebase app name '' provided. App name must be a non-empty string.`);
    });

    it('should throw given a name corresponding to an existing app', () => {
      expect(() => {
        firebaseNamespace.initializeApp(mockOptions, mockAppName);
        firebaseNamespace.initializeApp(mockOptions, mockAppName);
      }).to.throw(`Firebase app named '${mockAppName}' already exists.`);
    });

    it('should throw given no app name if the default app already exists', () => {
      expect(() => {
        firebaseNamespace.initializeApp(mockOptions);
        firebaseNamespace.initializeApp(mockOptions);
      }).to.throw(`Firebase app named '${DEFAULT_APP_NAME}' already exists.`);

      expect(() => {
        firebaseNamespace.initializeApp(mockOptions);
        firebaseNamespace.initializeApp(mockOptions, DEFAULT_APP_NAME);
      }).to.throw(`Firebase app named '${DEFAULT_APP_NAME}' already exists.`);

      expect(() => {
        firebaseNamespace.initializeApp(mockOptions, DEFAULT_APP_NAME);
        firebaseNamespace.initializeApp(mockOptions);
      }).to.throw(`Firebase app named '${DEFAULT_APP_NAME}' already exists.`);

      expect(() => {
        firebaseNamespace.initializeApp(mockOptions, DEFAULT_APP_NAME);
        firebaseNamespace.initializeApp(mockOptions, DEFAULT_APP_NAME);
      }).to.throw(`Firebase app named '${DEFAULT_APP_NAME}' already exists.`);
    });

    it('should return a new app with the provided options and app name', () => {
      const app = firebaseNamespace.initializeApp(mockOptions, mockAppName);
      expect(app.name).to.equal(mockAppName);
      expect(app.options).to.deep.equal(mockOptions);
    });

    it('should return an app with the default app name if no app name is provided', () => {
      const app = firebaseNamespace.initializeApp(mockOptions);
      expect(app.name).to.deep.equal(DEFAULT_APP_NAME);
    });

    it('should allow re-use of a deleted app name', () => {
      let app = firebaseNamespace.initializeApp(mockOptions, mockAppName);
      return app.delete().then(() => {
        app = firebaseNamespace.initializeApp(mockOptions, mockAppName);
        expect(firebaseNamespace.app(mockAppName)).to.deep.equal(app);
      });
    });

    it('should add the new app to the namespace\'s app list', () => {
      const app = firebaseNamespace.initializeApp(mockOptions, mockAppName);
      expect(firebaseNamespace.app(mockAppName)).to.deep.equal(app);
    });

    it('should call the "create" app hook for the new app', () => {
      const appHook = sinon.spy();
      firebaseNamespace.INTERNAL.registerService(mockServiceName, _.noop, undefined, appHook);

      const app = firebaseNamespace.initializeApp(mockOptions, mockAppName);

      expect(appHook).to.have.been.calledOnce.and.calledWith('create', app);
    });
  });

  describe('#INTERNAL.removeApp()', () => {
    const invalidAppNames = [null, NaN, 0, 1, true, false, [], ['a'], {}, { a: 1 }, _.noop];
    invalidAppNames.forEach((invalidAppName) => {
      it('should throw given non-string app name: ' + JSON.stringify(invalidAppName), () => {
        expect(() => {
          firebaseNamespace.INTERNAL.removeApp(invalidAppName);
        }).to.throw(`Illegal Firebase app name '${invalidAppName}' provided. App name must be a non-empty string.`);
      });
    });

    it('should throw given empty string app name', () => {
      expect(() => {
        firebaseNamespace.INTERNAL.removeApp('');
      }).to.throw(`Illegal Firebase app name '' provided. App name must be a non-empty string.`);
    });

    it('should throw given an app name which does not correspond to an existing app', () => {
      expect(() => {
        firebaseNamespace.INTERNAL.removeApp(mockAppName);
      }).to.throw(`No Firebase app named '${mockAppName}' exists.`);
    });

    it('should throw given no app name if the default app does not exist', () => {
      expect(() => {
        firebaseNamespace.INTERNAL.removeApp();
      }).to.throw(`No Firebase app name provided. App name must be a non-empty string.`);
    });

    it('should throw given no app name even if the default app exists', () => {
      firebaseNamespace.initializeApp(mockOptions);
      expect(() => {
        firebaseNamespace.INTERNAL.removeApp();
      }).to.throw(`No Firebase app name provided. App name must be a non-empty string.`);
    });

    it('should remove the app corresponding to the provided app name from the namespace\'s app list', () => {
      firebaseNamespace.initializeApp(mockOptions, mockAppName);
      firebaseNamespace.INTERNAL.removeApp(mockAppName);
      expect(() => {
        return firebaseNamespace.app(mockAppName);
      }).to.throw(`No Firebase app named '${mockAppName}' exists.`);
    });

    it('should remove the default app from the namespace\'s app list if the default app name is provided', () => {
      firebaseNamespace.initializeApp(mockOptions);
      firebaseNamespace.INTERNAL.removeApp(DEFAULT_APP_NAME);
      expect(() => {
        return firebaseNamespace.app();
      }).to.throw(`No Firebase app named '${DEFAULT_APP_NAME}' exists.`);
    });

    it('should not be idempotent', () => {
      firebaseNamespace.initializeApp(mockOptions, mockAppName);
      firebaseNamespace.INTERNAL.removeApp(mockAppName);
      expect(() => {
        firebaseNamespace.INTERNAL.removeApp(mockAppName);
      }).to.throw(`No Firebase app named '${mockAppName}' exists.`);
    });

    it('should call the "delete" app hook for the deleted app', () => {
      const appHook = sinon.spy();
      firebaseNamespace.INTERNAL.registerService(mockServiceName, _.noop, undefined, appHook);

      const app = firebaseNamespace.initializeApp(mockOptions, mockAppName);

      appHook.reset();

      firebaseNamespace.INTERNAL.removeApp(mockAppName);

      expect(appHook).to.have.been.calledOnce.and.calledWith('delete', app);
    });
  });

  describe('#INTERNAL.registerService()', () => {
    // TODO(jwenger): finish writing tests for regsiterService() to get more code coverage

    it('should throw given no service name', () => {
      expect(() => {
        firebaseNamespace.INTERNAL.registerService(undefined, _.noop);
      }).to.throw(`No service name provided. Service name must be a non-empty string.`);
    });

    const invalidServiceNames = [null, NaN, 0, 1, true, false, [], ['a'], {}, { a: 1 }, _.noop];
    invalidServiceNames.forEach((invalidServiceName) => {
      it('should throw given non-string service name: ' + JSON.stringify(invalidServiceName), () => {
        expect(() => {
          firebaseNamespace.INTERNAL.registerService(invalidServiceName, _.noop);
        }).to.throw(`Illegal service name '${invalidServiceName}' provided. Service name must be a non-empty string.`);
      });
    });

    it('should throw given an empty string service name', () => {
      expect(() => {
        firebaseNamespace.INTERNAL.registerService('', _.noop);
      }).to.throw(`Illegal service name '' provided. Service name must be a non-empty string.`);
    });

    it('should throw given a service name which has already been registered', () => {
      firebaseNamespace.INTERNAL.registerService(mockServiceName, _.noop);
      expect(() => {
        firebaseNamespace.INTERNAL.registerService(mockServiceName, _.noop);
      }).to.throw(`Firebase service named '${mockServiceName}' has already been registered.`);
    });

    it('should throw given a service name which has already been registered', () => {
      firebaseNamespace.INTERNAL.registerService(mockServiceName, _.noop);
      expect(() => {
        firebaseNamespace.INTERNAL.registerService(mockServiceName, _.noop);
      }).to.throw(`Firebase service named '${mockServiceName}' has already been registered.`);
    });
  });
});
