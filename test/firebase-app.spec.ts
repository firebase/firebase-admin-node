'use strict';

import {expect} from 'chai';
import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from './resources/mocks';

import {FirebaseApp} from '../src/firebase-app';
import {FirebaseNamespace} from '../src/firebase-namespace';
import {FirebaseServiceInterface} from '../src/firebase-service';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);


const deleteSpy = sinon.spy();
function mockServiceFactory(app: FirebaseApp): FirebaseServiceInterface {
  return {
    app,
    INTERNAL: {
      delete: deleteSpy.bind(null, app.name),
    },
  } as FirebaseServiceInterface;
}


describe('FirebaseApp', () => {
  let mockApp: FirebaseApp;
  let firebaseNamespace: FirebaseNamespace;
  let firebaseNamespaceInternals;

  beforeEach(() => {
    firebaseNamespace = new FirebaseNamespace();
    firebaseNamespaceInternals = firebaseNamespace.INTERNAL;

    sinon.stub(firebaseNamespaceInternals, 'removeApp');
    mockApp = new FirebaseApp(mocks.appOptions, mocks.appName, firebaseNamespaceInternals);
  });

  afterEach(() => {
    deleteSpy.reset();
    (firebaseNamespaceInternals.removeApp as any).restore();
  });

  describe('#name', () => {
    it('should throw if the app has already been deleted', () => {
      return mockApp.delete().then(() => {
        expect(() => {
          return mockApp.name;
        }).to.throw(`Firebase app named '${mocks.appName}' has already been deleted.`);
      });
    });

    it('should return the app\'s name', () => {
      expect(mockApp.name).to.equal(mocks.appName);
    });

    it('should be case sensitive', () => {
      const newMockAppName = mocks.appName.toUpperCase();
      mockApp = new FirebaseApp(mocks.appOptions, newMockAppName, firebaseNamespaceInternals);
      expect(mockApp.name).to.not.equal(mocks.appName);
      expect(mockApp.name).to.equal(newMockAppName);
    });

    it('should respect leading and trailing whitespace', () => {
      const newMockAppName = '  ' + mocks.appName + '  ';
      mockApp = new FirebaseApp(mocks.appOptions, newMockAppName, firebaseNamespaceInternals);
      expect(mockApp.name).to.not.equal(mocks.appName);
      expect(mockApp.name).to.equal(newMockAppName);
    });

    it('should be read-only', () => {
      expect(() => {
        (mockApp as any).name = 'foo';
      }).to.throw(`Cannot set property name of #<FirebaseApp> which has only a getter`);
    });
  });

  describe('#options', () => {
    it('should throw if the app has already been deleted', () => {
      return mockApp.delete().then(() => {
        expect(() => {
          return mockApp.options;
        }).to.throw(`Firebase app named '${mocks.appName}' has already been deleted.`);
      });
    });

    it('should return the app\'s options', () => {
      expect(mockApp.options).to.deep.equal(mocks.appOptions);
    });

    it('should be read-only', () => {
      expect(() => {
        (mockApp as any).options = {};
      }).to.throw(`Cannot set property options of #<FirebaseApp> which has only a getter`);
    });

    it('should not return an object which can mutate the underlying options', () => {
      const original = _.clone(mockApp.options);
      (mockApp.options as any).foo = 'changed';
      expect(mockApp.options).to.deep.equal(original);
    });
  });

  describe('#delete()', () => {
    it('should throw if the app has already been deleted', () => {
      return mockApp.delete().then(() => {
        expect(() => {
          return mockApp.delete();
        }).to.throw(`Firebase app named '${mocks.appName}' has already been deleted.`);
      });
    });

    it('should call removeApp() on the Firebase namespace internals', () => {
      return mockApp.delete().then(() => {
        expect(firebaseNamespaceInternals.removeApp)
          .to.have.been.calledOnce
          .and.calledWith(mocks.appName);
      });
    });

    it('should call delete() on each service\'s internals', () => {
      firebaseNamespace.INTERNAL.registerService(mocks.serviceName, mockServiceFactory);
      firebaseNamespace.INTERNAL.registerService(mocks.serviceName + '2', mockServiceFactory);

      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      app[mocks.serviceName]();
      app[mocks.serviceName + '2']();

      return app.delete().then(() => {
        expect(deleteSpy).to.have.been.calledTwice;
        expect(deleteSpy.firstCall.args).to.deep.equal([mocks.appName]);
        expect(deleteSpy.secondCall.args).to.deep.equal([mocks.appName]);
      });
    });
  });

  describe('#[service]()', () => {
    it('should throw if the app has already been deleted', () => {
      firebaseNamespace.INTERNAL.registerService(mocks.serviceName, mockServiceFactory);

      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      return app.delete().then(() => {
        expect(() => {
          return app[mocks.serviceName]();
        }).to.throw(`Firebase app named '${mocks.appName}' has already been deleted.`);
      });
    });

    it('should return the service namespace', () => {
      firebaseNamespace.INTERNAL.registerService(mocks.serviceName, mockServiceFactory);

      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      const serviceNamespace = app[mocks.serviceName]();
      expect(serviceNamespace).to.have.keys(['app', 'INTERNAL']);
    });

    it('should return a cached version of the service on subsequent calls', () => {
      const createServiceSpy = sinon.spy();
      firebaseNamespace.INTERNAL.registerService(mocks.serviceName, createServiceSpy);

      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      expect(createServiceSpy).to.not.have.been.called;

      const serviceNamespace1 = app[mocks.serviceName]();
      expect(createServiceSpy).to.have.been.calledOnce;

      const serviceNamespace2 = app[mocks.serviceName]();
      expect(createServiceSpy).to.have.been.calledOnce;
      expect(serviceNamespace1).to.deep.equal(serviceNamespace2);
    });
  });
});
