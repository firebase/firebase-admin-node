/*!
 * @license
 * Copyright 2024 Google LLC
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
import { expect } from 'chai';
import * as sinon from 'sinon';
import { ConnectorConfig, validateAdminArgs } from '../../../src/data-connect';
import { DataConnect, DataConnectService } from '../../../src/data-connect/data-connect';
import { OperationOptions } from '../../../lib/data-connect';
import { 
  DATA_CONNECT_ERROR_CODE_MAPPING,
  FirebaseDataConnectError
} from '../../../src/data-connect/data-connect-api-client-internal';
import firebase from '@firebase/app-compat';
import { projectId } from '../../resources/mocks';
import { apiKey } from '../../integration/setup';

interface IdVars {
  id: string
}

describe('validateAdminArgs()', () => {
  before(() => {
    firebase.initializeApp({
      apiKey,
      authDomain: projectId + '.firebaseapp.com',
    });
  });
  
  const connectorConfig: ConnectorConfig = {
    location: 'us-west2',
    serviceId: 'my-service',
    connector: 'my-connector',
  };
  const stubDcInstance = { connectorConfig: connectorConfig, source: 'STUB' } as unknown as DataConnect;
  const getDataConnectStub = sinon.stub(DataConnectService.prototype, 'getDataConnect').returns(
    stubDcInstance
  );
  const providedDcInstance = { connectorConfig: connectorConfig, source: 'PROVIDED' } as unknown as DataConnect;
  const variables: IdVars = { id: 'stephenarosaj' };
  const options: OperationOptions = { impersonate: { unauthenticated: true } };

  const invalidVariablesError = new FirebaseDataConnectError(
    DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
    'Variables required.'
  );

  describe('with no variadic args', () => {
    it('should call getDataConnect to generate a DataConnect instance', () => {
      const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(connectorConfig);
      expect(getDataConnectStub.calledOnce).to.be.true;
      expect(dcInstance).to.deep.equal(stubDcInstance);
      expect(inputVars).to.be.undefined;
      expect(inputOpts).to.be.undefined;
    });
  });

  describe('with one variadic arg', () => {
    it('should successfully parse the provided DataConnect', () => {
      const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
        connectorConfig, providedDcInstance
      );
      expect(dcInstance).to.deep.equal(providedDcInstance);
      expect(inputVars).to.be.undefined;
      expect(inputOpts).to.be.undefined;
    });

    it('should successfully parse the provided options', () => {
      const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs<object>(
        connectorConfig, options
      );
      expect(dcInstance).to.deep.equal(stubDcInstance);
      expect(inputVars).to.be.undefined;
      expect(inputOpts).to.be.deep.equal(options);
    });
  });

  describe('with two variadic args', () => {
    it('should successfully parse the provided DataConnect instance and options', () => {
      const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
        connectorConfig, providedDcInstance, options
      );
      expect(dcInstance).to.deep.equal(providedDcInstance);
      expect(inputVars).to.be.undefined;
      expect(inputOpts).to.be.deep.equal(options);
    });
  });

  describe('with four variadic args and hasVars = true', () => {
    describe('and the first argument is a DataConnect instance', () => {
      it('and variables and options are undefined', () => {
        const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
          connectorConfig, providedDcInstance, undefined, undefined, true
        );
        expect(dcInstance).to.deep.equal(providedDcInstance);
        expect(inputVars).to.be.undefined;
        expect(inputOpts).to.be.undefined;
      });

      it('and variables are provided, options undefined', () => {
        const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
          connectorConfig, providedDcInstance, variables, undefined, true
        );
        expect(dcInstance).to.deep.equal(providedDcInstance);
        expect(inputVars).to.deep.equal(variables);
        expect(inputOpts).to.be.undefined;
      });

      it('and options are provided, variables undefined', () => {
        const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
          connectorConfig, providedDcInstance, undefined, options, true
        );
        expect(dcInstance).to.deep.equal(providedDcInstance);
        expect(inputVars).to.deep.be.undefined;
        expect(inputOpts).to.deep.equal(options);
      });

      it('and variables and options are provided', () => {
        const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
          connectorConfig, providedDcInstance, variables, options, true
        );
        expect(dcInstance).to.deep.equal(providedDcInstance);
        expect(inputVars).to.deep.equal(variables);
        expect(inputOpts).to.deep.equal(options);
      });
    });

    describe('and the first argument is variables', () => {
      it('and variables and options are undefined', () => {
        const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
          connectorConfig, undefined, undefined, undefined, true
        );
        expect(dcInstance).to.deep.equal(stubDcInstance);
        expect(inputVars).to.be.undefined;
        expect(inputOpts).to.be.undefined;
      });

      it('and variables are provided, options undefined', () => {
        const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
          connectorConfig, variables, undefined, undefined, true
        );
        expect(dcInstance).to.deep.equal(stubDcInstance);
        expect(inputVars).to.deep.equal(variables);
        expect(inputOpts).to.be.undefined;
      });

      it('and options are provided, variables undefined', () => {
        const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
          connectorConfig, undefined, options, undefined, true
        );
        expect(dcInstance).to.deep.equal(stubDcInstance);
        expect(inputVars).to.deep.be.undefined;
        expect(inputOpts).to.deep.equal(options);
      });

      it('and variables and options are provided', () => {
        const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
          connectorConfig, variables, options, undefined, true
        );
        expect(dcInstance).to.deep.equal(stubDcInstance);
        expect(inputVars).to.deep.equal(variables);
        expect(inputOpts).to.deep.equal(options);
      });
    });
  });

  describe('with five variadic args', () => {
    describe('and validateVars = true', () => {
      describe('should succeed if vars WERE provided', () => {
        it('and the first argument is a DataConnect instance', () => {
          expect(() => {
            const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
              connectorConfig, providedDcInstance, variables, undefined, true, true
            );
            expect(dcInstance).to.deep.equal(providedDcInstance);
            expect(inputVars).to.deep.equal(inputVars);
            expect(inputOpts).to.be.undefined;
          }).to.not.throw(invalidVariablesError);          
        });

        it('and the first argument is variables instance', () => {
          expect(() => {
            const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
              connectorConfig, variables, undefined, undefined, true, true
            );
            expect(dcInstance).to.deep.equal(stubDcInstance);
            expect(inputVars).to.deep.equal(inputVars);
            expect(inputOpts).to.be.undefined;
          }).to.not.throw(invalidVariablesError);
        });
      });

      describe('should throw if vars were NOT provided', () => {
        it('and the first argument is a DataConnect instance', () => {
          expect(() => {
            validateAdminArgs(connectorConfig, providedDcInstance, undefined, undefined, true, true);
          }).to.throw().and.have.property('code', invalidVariablesError.code);
        });

        it('and the first argument is undefined variables', () => {
          expect(validateAdminArgs(
            connectorConfig, undefined, undefined, undefined, true, true
          )).to.throw().and.have.property('code', invalidVariablesError.code);
        });
      });
    });

    describe('and validateVars = false', () => {
      describe('should succeed if vars WERE provided', () => {
        it('and the first argument is a DataConnect instance', () => {
          expect(() => {
            const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
              connectorConfig, providedDcInstance, variables, undefined, true, false
            );
            expect(dcInstance).to.deep.equal(providedDcInstance);
            expect(inputVars).to.be.undefined;
            expect(inputOpts).to.be.undefined;
          }).to.not.throw(invalidVariablesError);
        });

        it('and the first argument is variables instance', () => {
          expect(() => {
            validateAdminArgs(connectorConfig, variables, undefined, undefined, true, false);
          }).to.not.throw(invalidVariablesError);
          
          const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
            connectorConfig, variables, undefined, undefined, true, false
          );
          expect(dcInstance).to.deep.equal(stubDcInstance);
          expect(inputVars).to.deep.equal(inputVars);
          expect(inputOpts).to.be.undefined;
        });
      });

      describe('should succeed if vars were NOT provided', () => {
        it('and the first argument is a DataConnect instance', () => {
          expect(() => {
            const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
              connectorConfig, providedDcInstance, undefined, undefined, true, false
            );
            expect(dcInstance).to.deep.equal(providedDcInstance);
            expect(inputVars).to.deep.equal(inputVars);
            expect(inputOpts).to.be.undefined;
          }).to.not.throw(invalidVariablesError);
        });

        it('and the first argument is undefined variables', () => {
          expect(() => {
            const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(
              connectorConfig, undefined, undefined, undefined, true, false
            );
            expect(dcInstance).to.deep.equal(stubDcInstance);
            expect(inputVars).to.be.undefined;
            expect(inputOpts).to.be.undefined;
          }).to.not.throw(invalidVariablesError);          
        });
      });
    });
  });
});
