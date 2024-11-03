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

/*
// Schema
type User @table(key: "uid") {
	uid: String!
	name: String!
	address: String!
}

type Email @table {
	subject: String!
	date: Date!
	text: String!
	from: User!
}
*/

interface UserResponse {
  user: {
    name: string;
    uid: string;
  }
}

interface UsersResponse {
  users: [
    user: {
      id: string;
      name: string;
      address: string;
    }
  ];
}

interface UserUpdateResponse {
  user_upsert: { uid: string }
}

interface EmailsResponse {
  emails: [
    email: {
      text: string;
      subject: string;
      id: string;
      date: string;
      from: {
        name: string;
      }
    }
  ];
}

interface UserVariables {
  id: { uid: string };
}

const connectorConfig: ConnectorConfig = {
  location: 'us-west2',
  serviceId: 'my-service',
};

const userId = 'QVBJcy5ndXJ3';

describe('getDataConnect()', () => {

  const queryListUsers = 'query ListUsers @auth(level: PUBLIC) { users { uid, name, address } }';
  const queryListEmails = 'query ListEmails @auth(level: NO_ACCESS) { emails { id subject text date from { name } } }';
  const queryGetUserById = 'query GetUser($id: User_Key!) { user(key: $id) { uid name } }';
  const multipleQueries = `
  ${queryListUsers}
  ${queryListEmails}
  `;
  const mutation = `mutation user { user_insert(data: {uid: "${userId}", address: "32 St", name: "Fred Car"}) }`;
  const upsertUser = `mutation UpsertUser($id: String) { 
  user_upsert(data: { uid: $id, address: "32 St.", name: "Fred" }) }`;

  describe('executeGraphql()', () => {
    it('executeGraphql() successfully executes a GraphQL mutation', async () => {
      const resp = await getDataConnect(connectorConfig).executeGraphql<UserUpdateResponse, unknown>(
        upsertUser, { variables: { id: userId } }
      );
      //{ data: { user_insert: { uid: 'QVBJcy5ndXJ3' } } }
      expect(resp.data.user_upsert.uid).to.be.not.empty;
      expect(resp.data.user_upsert.uid).equals(userId);
    });

    it('executeGraphql() successfully executes a GraphQL', async () => {
      const resp = await getDataConnect(connectorConfig).executeGraphql<UsersResponse, UserVariables>(queryListUsers);
      expect(resp.data.users).to.be.not.empty;
      expect(resp.data.users[0].name).to.be.not.undefined;
      expect(resp.data.users[0].address).to.be.not.undefined;
    });

    it('executeGraphql() use the operationName when multiple queries are provided', async () => {
      const resp = await getDataConnect(connectorConfig).executeGraphql<EmailsResponse, unknown>(
        multipleQueries, 
        { operationName: 'ListEmails' }
      );
      expect(resp.data.emails).to.be.not.empty;
      expect(resp.data.emails[0].id).to.be.not.undefined;
      expect(resp.data.emails[0].from.name).to.be.not.undefined;
    });

    it('executeGraphql() should throw for a query error', async () => {
      return getDataConnect(connectorConfig).executeGraphql(mutation)
        .should.eventually.be.rejected.and.have.property('code', 'data-connect/query-error');
    });

    it('executeGraphql() successfully executes a GraphQL query with variables', async () => {
      const resp = await getDataConnect(connectorConfig).executeGraphql<UserResponse, UserVariables>(
        queryGetUserById,
        { variables: { id: { uid: userId } } }
      );
      expect(resp.data.user.name).to.be.not.undefined;
      expect(resp.data.user.uid).equals(userId);
    });
  });

  describe('executeGraphqlRead()', () => {
    it('executeGraphqlRead() successfully executes a read-only GraphQL', async () => {
      const resp =
        await getDataConnect(connectorConfig).executeGraphqlRead<UsersResponse, UserVariables>(queryListUsers);
      expect(resp.data.users).to.be.not.empty;
      expect(resp.data.users[0].name).to.be.not.undefined;
      expect(resp.data.users[0].address).to.be.not.undefined;
    });

    it('executeGraphqlRead() should throw for a GraphQL mutation', async () => {
      return getDataConnect(connectorConfig).executeGraphqlRead(mutation)
        .should.eventually.be.rejected;
    });
  });
});
