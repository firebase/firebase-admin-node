import * as sinon from 'sinon';
import * as mocks from '../../resources/mocks';
import { ConnectorConfig, DataConnect, getDataConnect, OperationOptions } from '../../../src/data-connect';
import { expect } from 'chai';
import { DataConnectApiClient } from '../../../src/data-connect/data-connect-api-client-internal';
import { FirebaseApp } from '../../../src/app/firebase-app';
import * as appIndex from '../../../src/app/lifecycle';

describe('DataConnect', () => {
  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
  };
  const connectorConfig: ConnectorConfig = {
    location: 'us-west2',
    serviceId: 'my-service',
    connector: 'my-connector',
  };
  let mockApp: FirebaseApp;
  let dc: DataConnect;

  interface RequiredVariables {
    limit: number;
  }

  type OptionalVariables = Partial<RequiredVariables> | undefined;

  interface Data {
    data: number;
  }

  const operationName = 'operation';
  const requiredVariables: RequiredVariables = { limit: 1 };
  const optionalVariables: OptionalVariables = { limit: 2 };
  const options: OperationOptions = { impersonate: { unauthenticated: true } };
  const data: Data = { data: 99 };

  let executeQueryStub: sinon.SinonStub;
  let executeMutationStub: sinon.SinonStub;
  let getAppStub: sinon.SinonStub;

  beforeEach(() => {
    mockApp = mocks.appWithOptions(mockOptions);
    getAppStub = sinon.stub(appIndex, 'getApp').returns(mockApp);
    executeQueryStub = sinon
      .stub(DataConnectApiClient.prototype, 'executeQuery')
      .resolves(data);
    executeMutationStub = sinon
      .stub(DataConnectApiClient.prototype, 'executeMutation')
      .resolves(data);
    dc = getDataConnect(connectorConfig);
  });

  afterEach(() => {
    executeQueryStub.restore();
    executeMutationStub.restore();
    getAppStub.restore();
    return mockApp.delete();
  });

  describe('executeQuery()', () => {
    describe('should handle method and argument overload correctly', async () => {
      describe('with required variables', () => {
        describe('with a Variable type parameter provided', () => {
          describe('with variables provided', () => {
            it('with options provided', async () => {
              await dc.executeQuery<Data, RequiredVariables>(operationName, requiredVariables, options);
              expect(executeQueryStub.calledOnceWithExactly(operationName, requiredVariables, options)).to.be.true;
            });
            
            it('WITHOUT options provided', async () => {
              await dc.executeQuery<Data, RequiredVariables>(operationName, requiredVariables);
              expect(executeQueryStub.calledOnceWithExactly(operationName, requiredVariables, undefined)).to.be.true;
            });
          });
        });

        describe('WITHOUT a Variable type parameter provided', () => {
          describe('with variables provided', () => {
            it('with options provided', async () => {
              await dc.executeQuery(operationName, requiredVariables, options);
              expect(executeQueryStub.calledOnceWithExactly(operationName, requiredVariables, options)).to.be.true;
            });

            it('WITHOUT options provided', async () => {
              await dc.executeQuery(operationName, requiredVariables);
              expect(executeQueryStub.calledOnceWithExactly(operationName, requiredVariables, undefined)).to.be.true;
            });
          });
        });
      });

      describe('with optional variables', () => {
        describe('with a Variable type parameter provided', () => {
          describe('with variables provided', () => {
            it('with options provided', async () => {
              await dc.executeQuery<Data, OptionalVariables>(operationName, optionalVariables, options);
              expect(executeQueryStub.calledOnceWithExactly(operationName, optionalVariables, options)).to.be.true;
            });

            it('WITHOUT options provided', async () => {
              await dc.executeQuery<Data, OptionalVariables>(operationName, optionalVariables);
              expect(executeQueryStub.calledOnceWithExactly(operationName, optionalVariables, undefined)).to.be.true;
            });
          });

          describe('WITHOUT variables provided', () => {
            it('with options provided', async () => {
              await dc.executeQuery<Data, OptionalVariables>(operationName, undefined, options);
              expect(executeQueryStub.calledOnceWithExactly(operationName, undefined, options)).to.be.true;
            });

            it('WITHOUT options provided', async () => {
              await dc.executeQuery<Data, OptionalVariables>(operationName, undefined);
              expect(executeQueryStub.calledOnceWithExactly(operationName, undefined, undefined)).to.be.true;
            });
          });
        });

        describe('WITHOUT a Variable type parameter provided', () => {
          describe('with variables provided', async () => {
            it('with options provided', async () => {
              await dc.executeQuery(operationName, optionalVariables, options);
              expect(executeQueryStub.calledOnceWithExactly(operationName, optionalVariables, options)).to.be.true;
            });

            it('WITHOUT options provided', async () => {
              await dc.executeQuery(operationName, optionalVariables);
              expect(executeQueryStub.calledOnceWithExactly(operationName, optionalVariables, undefined)).to.be.true;
            });
          });

          describe('WITHOUT variables provided', async () => {
            it('WITHOUT options provided', async () => {
              await dc.executeQuery(operationName);
              expect(executeQueryStub.calledOnceWithExactly(operationName, undefined, undefined)).to.be.true;
            });
          });
        });
      });
    });
  });

  describe('executeMutation()', () => {
    describe('should handle method and argument overload correctly', async () => {
      describe('with required variables', () => {
        describe('with a Variable type parameter provided', () => {
          describe('with variables provided', () => {
            it('with options provided', async () => {
              await dc.executeMutation<Data, RequiredVariables>(operationName, requiredVariables, options);
              expect(executeMutationStub.calledOnceWithExactly(operationName, requiredVariables, options)).to.be.true;
            });
            
            it('WITHOUT options provided', async () => {
              await dc.executeMutation<Data, RequiredVariables>(operationName, requiredVariables);
              expect(executeMutationStub.calledOnceWithExactly(operationName, requiredVariables, undefined)).to.be.true;
            });
          });
        });

        describe('WITHOUT a Variable type parameter provided', () => {
          describe('with variables provided', () => {
            it('with options provided', async () => {
              await dc.executeMutation(operationName, requiredVariables, options);
              expect(executeMutationStub.calledOnceWithExactly(operationName, requiredVariables, options)).to.be.true;
            });

            it('WITHOUT options provided', async () => {
              await dc.executeMutation(operationName, requiredVariables);
              expect(executeMutationStub.calledOnceWithExactly(operationName, requiredVariables, undefined)).to.be.true;
            });
          });
        });
      });

      describe('with optional variables', () => {
        describe('with a Variable type parameter provided', () => {
          describe('with variables provided', () => {
            it('with options provided', async () => {
              await dc.executeMutation<Data, OptionalVariables>(operationName, optionalVariables, options);
              expect(executeMutationStub.calledOnceWithExactly(operationName, optionalVariables, options)).to.be.true;
            });

            it('WITHOUT options provided', async () => {
              await dc.executeMutation<Data, OptionalVariables>(operationName, optionalVariables);
              expect(executeMutationStub.calledOnceWithExactly(operationName, optionalVariables, undefined)).to.be.true;
            });
          });

          describe('WITHOUT variables provided', () => {
            it('with options provided', async () => {
              await dc.executeMutation<Data, OptionalVariables>(operationName, undefined, options);
              expect(executeMutationStub.calledOnceWithExactly(operationName, undefined, options)).to.be.true;
            });

            it('WITHOUT options provided', async () => {
              await dc.executeMutation<Data, OptionalVariables>(operationName, undefined);
              expect(executeMutationStub.calledOnceWithExactly(operationName, undefined, undefined)).to.be.true;
            });
          });
        });

        describe('WITHOUT a Variable type parameter provided', () => {
          describe('with variables provided', async () => {
            it('with options provided', async () => {
              await dc.executeMutation(operationName, optionalVariables, options);
              expect(executeMutationStub.calledOnceWithExactly(operationName, optionalVariables, options)).to.be.true;
            });

            it('WITHOUT options provided', async () => {
              await dc.executeMutation(operationName, optionalVariables);
              expect(executeMutationStub.calledOnceWithExactly(operationName, optionalVariables, undefined)).to.be.true;
            });
          });

          describe('WITHOUT variables provided', async () => {
            it('WITHOUT options provided', async () => {
              await dc.executeMutation(operationName);
              expect(executeMutationStub.calledOnceWithExactly(operationName, undefined, undefined)).to.be.true;
            });
          });
        });
      });
    });
  });
});

describe('getDataConnect() caching', () => {
  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
  };
  let mockApp: FirebaseApp;
  let getAppStub: sinon.SinonStub;

  beforeEach(() => {
    mockApp = mocks.appWithOptions(mockOptions);
    getAppStub = sinon.stub(appIndex, 'getApp').returns(mockApp);
  });

  afterEach(() => {
    getAppStub.restore();
    return mockApp.delete();
  });

  describe('should cache DataConnect instances correctly', () => {
    it('should return the same instance for identical connector configs', () => {
      const config: ConnectorConfig = {
        location: 'us-west2',
        serviceId: 'my-service',
        connector: 'my-connector',
      };

      const dc1 = getDataConnect(config);
      const dc2 = getDataConnect(config);

      expect(dc1).to.equal(dc2);
    });

    it('should return different instances for different connectors with same location and serviceId', () => {
      const config1: ConnectorConfig = {
        location: 'us-west2',
        serviceId: 'my-service',
        connector: 'connector-a',
      };
      const config2: ConnectorConfig = {
        location: 'us-west2',
        serviceId: 'my-service',
        connector: 'connector-b',
      };

      const dc1 = getDataConnect(config1);
      const dc2 = getDataConnect(config2);

      expect(dc1).to.not.equal(dc2);
      expect(dc1.connectorConfig.connector).to.equal('connector-a');
      expect(dc2.connectorConfig.connector).to.equal('connector-b');
    });

    it('should return different instances for different locations', () => {
      const config1: ConnectorConfig = {
        location: 'us-west2',
        serviceId: 'my-service',
        connector: 'my-connector',
      };
      const config2: ConnectorConfig = {
        location: 'us-east1',
        serviceId: 'my-service',
        connector: 'my-connector',
      };

      const dc1 = getDataConnect(config1);
      const dc2 = getDataConnect(config2);

      expect(dc1).to.not.equal(dc2);
    });

    it('should return different instances for different serviceIds', () => {
      const config1: ConnectorConfig = {
        location: 'us-west2',
        serviceId: 'service-a',
        connector: 'my-connector',
      };
      const config2: ConnectorConfig = {
        location: 'us-west2',
        serviceId: 'service-b',
        connector: 'my-connector',
      };

      const dc1 = getDataConnect(config1);
      const dc2 = getDataConnect(config2);

      expect(dc1).to.not.equal(dc2);
    });

    it('should handle connector being undefined vs defined', () => {
      const configWithConnector: ConnectorConfig = {
        location: 'us-west2',
        serviceId: 'my-service',
        connector: 'my-connector',
      };
      const configWithoutConnector: ConnectorConfig = {
        location: 'us-west2',
        serviceId: 'my-service',
      };

      const dc1 = getDataConnect(configWithConnector);
      const dc2 = getDataConnect(configWithoutConnector);

      expect(dc1).to.not.equal(dc2);
      expect(dc1.connectorConfig.connector).to.equal('my-connector');
      expect(dc2.connectorConfig.connector).to.be.undefined;
    });
  });
});
