/*!
 * @license
 * Copyright 2022 Google Inc.
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

import * as sinon from 'sinon';
import { expect } from 'chai';

import * as mocks from '../../resources/mocks';
import * as utils from '../utils';
import { FirebaseApp } from '../../../src/app/firebase-app';
import { Extensions } from '../../../src/extensions/extensions';
import { FirebaseAppError } from '../../../src/utils/error';
import { HttpClient, HttpRequestConfig } from '../../../src/utils/api-request';
import { SettableProcessingState } from '../../../src/extensions/extensions-api';
import { FirebaseExtensionsError } from '../../../src/extensions/extensions-api-client-internal';

describe('Extensions', () => {
  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
  };

  let extensions: Extensions;
  let mockApp: FirebaseApp;

  beforeEach(() => {
    mockApp = mocks.appWithOptions(mockOptions);
    extensions = new Extensions(mockApp);
  });

  afterEach(() => {
    return mockApp.delete();
  });

  describe('Constructor', () => {
    it('should reject when the app is null', () => {
      expect(() => new Extensions(null as unknown as FirebaseApp))
        .to.throw(FirebaseAppError);
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(extensions.app).to.equal(mockApp);
    });
  });

  describe('Runtime', () => {
    let processEnvCopy: Record<string, string>;
    beforeEach(() => {
      processEnvCopy = JSON.parse(JSON.stringify(process.env)) as Record<string, string>;
    });

    afterEach(() => {
      process.env = processEnvCopy;
    });

    describe('Constructor', () => {
      it('should error if called without PROJECT_ID', () => {
        process.env['EXT_INSTANCE_ID'] = 'test-instance';
        expect(() => extensions.runtime())
          .to.throw('PROJECT_ID must not be undefined in Extensions runtime environment');
      });
  
  
      it('should error if called without EXT_INSTANCE_ID', () => {
        process.env['PROJECT_ID'] = 'test-project';
        expect(() => extensions.runtime())
          .to.throw('Runtime is only available from within a running Extension instance.');
      });
  
      it('should not error if called from an extension', () => {
        process.env['PROJECT_ID'] = 'test-project';
        process.env['EXT_INSTANCE_ID'] = 'test-instance';
        expect(() => extensions.runtime()).not.to.throw();
      });
    });
    
    describe('setProcessingState', () => {
      let httpClientStub: sinon.SinonStub;
      beforeEach(() => {
        process.env['PROJECT_ID'] = 'test-project';
        process.env['EXT_INSTANCE_ID'] = 'test-instance';
        httpClientStub = sinon.stub(HttpClient.prototype, 'send');
      });
  
      afterEach(() => {
        httpClientStub.restore();
      });
  
      for (const state of ['PROCESSING_FAILED', 'PROCESSING_WARNING','PROCESSING_COMPLETE', 'NONE']) {
        it(`should set ${state} state`, async () => {
          const expectedRuntimeData = {
            processingState: {
              state: state as SettableProcessingState,
              detailMessage: 'done processing',
            },
          }
          const expected =  sinon.match((req: HttpRequestConfig) => { 
            const url = 'https://firebaseextensions.googleapis.com/' +
              'v1beta/projects/test-project/instances/test-instance/runtimeData';
            return req.method == 'PATCH' &&
              req.url == url &&
              JSON.stringify(req.data) == JSON.stringify(expectedRuntimeData);
          }, 'Incorrect URL or Method');
          httpClientStub.withArgs(expected).resolves(utils.responseFrom(expectedRuntimeData, 200));


          await extensions.runtime().setProcessingState(state as SettableProcessingState, 'done processing');
          expect(httpClientStub).to.have.been.calledOnce;
        });
      }
  
      it('should covert errors in FirebaseErrors', async () => {
        httpClientStub.rejects(utils.errorFrom('Something went wrong', 404));
        await expect(extensions.runtime().setProcessingState('PROCESSING_COMPLETE', 'a message'))
          .to.eventually.be.rejectedWith(FirebaseExtensionsError);
      });
    });

    describe('setFatalError', () => {
      let httpClientStub: sinon.SinonStub;
      beforeEach(() => {
        process.env['PROJECT_ID'] = 'test-project';
        process.env['EXT_INSTANCE_ID'] = 'test-instance';
        httpClientStub = sinon.stub(HttpClient.prototype, 'send');
      });
  
      afterEach(() => {
        httpClientStub.restore();
      });
  
      it('should set fatal error', async () => {
        const expectedRuntimeData = {
          fatalError: {
            errorMessage: 'A bad error!',
          },
        };
        const expected =  sinon.match((req: HttpRequestConfig) => { 
          const url = 'https://firebaseextensions.googleapis.com/' +
            'v1beta/projects/test-project/instances/test-instance/runtimeData';
          return req.method == 'PATCH' &&
            req.url == url &&
            JSON.stringify(req.data) == JSON.stringify(expectedRuntimeData);
        }, 'Incorrect URL or Method');
        httpClientStub.withArgs(expected).resolves(utils.responseFrom(expectedRuntimeData, 200));


        await extensions.runtime().setFatalError('A bad error!');
        expect(httpClientStub).to.have.been.calledOnce;
      });
        
      it('should error if errorMessage is empty', async () => {
        await expect(extensions.runtime().setFatalError(''))
          .to.eventually.be.rejectedWith(FirebaseExtensionsError, 'errorMessage must not be empty');
      });
  
      it('should convert errors in FirebaseErrors', async () => {
        httpClientStub.rejects(utils.errorFrom('Something went wrong', 404));
        await expect(extensions.runtime().setFatalError('a message'))
          .to.eventually.be.rejectedWith(FirebaseExtensionsError);
      });
    })
  });
});
