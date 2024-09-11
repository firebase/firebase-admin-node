/*!
 * Copyright 2024 Google Inc.
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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { getDataConnect, ConnectorConfig } from '../../lib/data-connect/index';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

interface UserResponse {
  users: [
    user: {
      id: string;
      name: string;
      address: string;
    }
  ];
}

interface UserVariables {
  id: string;
}

const connectorConfig: ConnectorConfig = {
  location: 'us-west2',
  serviceId: 'my-service',
};

describe('getDataConnect()', () => {

  const query = 'query ListUsers @auth(level: PUBLIC) { users { uid, name, address } }';
  const mutation = 'mutation user { user_insert(data: {uid: "QVBJcy5ndXJ2", address: "Address", name: "Name"}) }'

  describe('executeGraphql()', () => {
    it('executeGraphql() successfully executes a GraphQL', async () => {
      const resp = await getDataConnect(connectorConfig).executeGraphql<UserResponse, UserVariables>(query, {});
      //console.dir(resp.data.users);
      expect(resp.data.users).to.be.not.empty;
      expect(resp.data.users[0].name).to.be.not.undefined;
      expect(resp.data.users[0].address).to.be.not.undefined;
    });
  });

  describe('executeGraphqlRead()', () => {
    it('executeGraphqlRead() successfully executes a read-only GraphQL', async () => {
      const resp = await getDataConnect(connectorConfig).executeGraphqlRead<UserResponse, UserVariables>(query, {});
      expect(resp.data.users).to.be.not.empty;
      expect(resp.data.users[0].name).to.be.not.undefined;
      expect(resp.data.users[0].address).to.be.not.undefined;
    });

    it('executeGraphqlRead() should throw for a GraphQL mutation', async () => {
      return getDataConnect(connectorConfig).executeGraphqlRead<UserResponse, UserVariables>(mutation, {})
        .should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
    });
  });
});
