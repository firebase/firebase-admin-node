'use strict';

import {expect} from 'chai';
import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import {FirebaseApp} from '../src/firebase-app';
import {FirebaseNamespace} from '../src/firebase-namespace';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);


const mockAppName = 'mock-app-name';
const mockServiceNames = ['mock-service-name-1', 'mock-service-name-2'];
const mockOptions = {
  foo: 'bar',
  baz: false,
} as FirebaseAppOptions;


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
    mockApp = new FirebaseApp(mockOptions, mockAppName, firebaseNamespaceInternals);
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
        }).to.throw(`Firebase app named '${mockAppName}' has already been deleted.`);
      });
    });

    it('should return the app\'s name', () => {
      expect(mockApp.name).to.equal(mockAppName);
    });

    it('should be case sensitive', () => {
      const newMockAppName = mockAppName.toUpperCase();
      mockApp = new FirebaseApp(mockOptions, newMockAppName, firebaseNamespaceInternals);
      expect(mockApp.name).to.not.equal(mockAppName);
      expect(mockApp.name).to.equal(newMockAppName);
    });

    it('should respect leading and trailing whitespace', () => {
      const newMockAppName = '  ' + mockAppName + '  ';
      mockApp = new FirebaseApp(mockOptions, newMockAppName, firebaseNamespaceInternals);
      expect(mockApp.name).to.not.equal(mockAppName);
      expect(mockApp.name).to.equal(newMockAppName);
    });

    it('should be read-only', () => {
      expect(() => {
        mockApp.name = 'foo';
      }).to.throw(`Cannot set property name of #<FirebaseApp> which has only a getter`);
    });
  });

  describe('#options', () => {
    it('should throw if the app has already been deleted', () => {
      return mockApp.delete().then(() => {
        expect(() => {
          return mockApp.options;
        }).to.throw(`Firebase app named '${mockAppName}' has already been deleted.`);
      });
    });

    it('should return the app\'s options', () => {
      expect(mockApp.options).to.deep.equal(mockOptions);
    });

    it('should be read-only', () => {
      expect(() => {
        mockApp.options = {};
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
        }).to.throw(`Firebase app named '${mockAppName}' has already been deleted.`);
      });
    });

    it('should call removeApp() on the Firebase namespace internals', () => {
      return mockApp.delete().then(() => {
        expect(firebaseNamespaceInternals.removeApp)
          .to.have.been.calledOnce
          .and.calledWith(mockAppName);
      });
    });

    it('should call delete() on each service\'s internals', () => {
      firebaseNamespace.INTERNAL.registerService(mockServiceNames[0], mockServiceFactory);
      firebaseNamespace.INTERNAL.registerService(mockServiceNames[1], mockServiceFactory);

      const app = firebaseNamespace.initializeApp(mockOptions, mockAppName);

      app[mockServiceNames[0]]();
      app[mockServiceNames[1]]();

      return app.delete().then(() => {
        expect(deleteSpy).to.have.been.calledTwice;
        expect(deleteSpy.firstCall.args).to.deep.equal([mockAppName]);
        expect(deleteSpy.secondCall.args).to.deep.equal([mockAppName]);
      });
    });
  });

  describe('#[service]()', () => {
    it('should throw if the app has already been deleted', () => {
      firebaseNamespace.INTERNAL.registerService(mockServiceNames[0], mockServiceFactory);

      const app = firebaseNamespace.initializeApp(mockOptions, mockAppName);

      return app.delete().then(() => {
        expect(() => {
          return app[mockServiceNames[0]]();
        }).to.throw(`Firebase app named '${mockAppName}' has already been deleted.`);
      });
    });

    it('should return the service namespace', () => {
      firebaseNamespace.INTERNAL.registerService(mockServiceNames[0], mockServiceFactory);

      const app = firebaseNamespace.initializeApp(mockOptions, mockAppName);

      const serviceNamespace = app[mockServiceNames[0]]();
      expect(serviceNamespace).to.have.keys(['app', 'INTERNAL']);
    });

    it('should return a cached version of the service on subsequent calls', () => {
      const createServiceSpy = sinon.spy();
      firebaseNamespace.INTERNAL.registerService(mockServiceNames[0], createServiceSpy);

      const app = firebaseNamespace.initializeApp(mockOptions, mockAppName);

      expect(createServiceSpy).to.not.have.been.called;

      const serviceNamespace1 = app[mockServiceNames[0]]();
      expect(createServiceSpy).to.have.been.calledOnce;

      const serviceNamespace2 = app[mockServiceNames[0]]();
      expect(createServiceSpy).to.have.been.calledOnce;
      expect(serviceNamespace1).to.deep.equal(serviceNamespace2);
    });
  });
});
