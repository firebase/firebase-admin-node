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
import { getDataConnect, ConnectorConfig, GraphqlOptions } from '../../lib/data-connect/index';

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
*/
type User = {
  uid?: string;
  name?: string;
  address?: string;
  // Generated
  emails_on_from?: Email[];
};

/*
// Schema
type Email @table {
  subject: String!
  date: Date!
  text: String!
  from: User!
}
*/
type Email = {
  subject?: string;
  date?: string;
  text?: string;
  from?: User;
  // Generated
  id?: string;
};

interface UserResponse {
  user: User;
}

interface UsersResponse {
  users: User[];
}

interface UserUpsertResponse {
  user_upsert: { uid: string; };
}

interface UserUpdateResponse {
  user_update: { uid: string; };
}

interface EmailsResponse {
  emails: Email[];
}

interface UserVariables {
  id: { uid: string; };
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

  const queryListUsersImpersonation = `
    query ListUsers @auth(level: USER) {
      users(where: { uid: { eq_expr: "auth.uid" } }) { uid, name, address }
    }`;

  const multipleQueries = `
  ${queryListUsers}
  ${queryListEmails}
  `;

  const mutation = `mutation user { user_insert(data: {uid: "${userId}", address: "32 St", name: "Fred Car"}) }`;

  const updateImpersonatedUser = `
    mutation UpdateUser @auth(level: USER) {
      user_update(key: { uid_expr: "auth.uid" }, data: { address: "32 Elm St.", name: "Fredrick" })
    }`;

  const upsertUser = `mutation UpsertUser($id: String) { 
  user_upsert(data: { uid: $id, address: "32 St.", name: "Fred" }) }`;

  const testUser = {
    name: 'Fred',
    address: '32 St.',
    uid: userId
  }

  const expectedUsers = [
    testUser,
    {
      name: 'Jeff',
      address: '99 Oak St. N',
      uid: 'QVBJcy5ndXJ1'
    }
  ];

  describe('executeGraphql()', () => {
    it('executeGraphql() successfully executes a GraphQL mutation', async () => {
      const resp = await getDataConnect(connectorConfig).executeGraphql<UserUpsertResponse, unknown>(
        upsertUser, { variables: { id: userId } }
      );
      //{ data: { user_insert: { uid: 'QVBJcy5ndXJ3' } } }
      expect(resp.data.user_upsert.uid).to.be.not.empty;
      expect(resp.data.user_upsert.uid).equals(userId);
    });

    it('executeGraphql() successfully executes a GraphQL', async () => {
      const resp = await getDataConnect(connectorConfig).executeGraphql<UsersResponse, UserVariables>(queryListUsers);
      expect(resp.data.users).to.be.not.empty;
      expect(resp.data.users.length).to.be.greaterThan(1);
      expectedUsers.forEach((expectedUser) => {
        expect(resp.data.users).to.deep.include(expectedUser);
      });
    });

    it('executeGraphql() use the operationName when multiple queries are provided', async () => {
      const resp = await getDataConnect(connectorConfig).executeGraphql<EmailsResponse, unknown>(
        multipleQueries,
        { operationName: 'ListEmails' }
      );
      expect(resp.data.emails).to.be.not.empty;
      expect(resp.data.emails.length).equals(1);
      expect(resp.data.emails[0].id).to.be.not.undefined;
      expect(resp.data.emails[0].from?.name).to.equal('Jeff');
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
      expect(resp.data.user.uid).to.equal(testUser.uid);
      expect(resp.data.user.name).to.equal(testUser.name);
      expect(resp.data.user.address).to.be.undefined;
    });
  });

  describe('executeGraphqlRead()', () => {
    it('executeGraphqlRead() successfully executes a read-only GraphQL', async () => {
      const resp =
        await getDataConnect(connectorConfig).executeGraphqlRead<UsersResponse, UserVariables>(queryListUsers);
      expect(resp.data.users).to.be.not.empty;
      expect(resp.data.users.length).to.be.greaterThan(1);
      expectedUsers.forEach((expectedUser) => {
        expect(resp.data.users).to.deep.include(expectedUser);
      });
    });

    it('executeGraphqlRead() should throw for a GraphQL mutation', async () => {
      return getDataConnect(connectorConfig).executeGraphqlRead(mutation)
        .should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
    });
  });

  describe('Impersonation', () => {
    const optsAuthorizedClaims: GraphqlOptions<undefined> = {
      impersonate: {
        authClaims: {
          sub: userId,
          email_verified: true
        }
      }
    };

    const optsNonExistingClaims: GraphqlOptions<undefined> = {
      impersonate: {
        authClaims: {
          sub: 'non-exisiting-id',
          email_verified: true
        }
      }
    };

    const optsUnauthorizedClaims: GraphqlOptions<undefined> = {
      impersonate: {
        unauthenticated: true
      }
    };

    describe('USER Auth Policy', () => {
      it('executeGraphqlRead() successfully executes an impersonated query with authenticated claims', async () => {
        const resp =
          await getDataConnect(connectorConfig).executeGraphqlRead<UsersResponse, undefined>(
            queryListUsersImpersonation, optsAuthorizedClaims);
        expect(resp.data.users).to.be.not.empty;
        expect(resp.data.users.length).equals(1);
        expect(resp.data.users[0]).to.deep.equal(testUser);
      });

      it('executeGraphqlRead() should throw for impersonated query with unauthenticated claims', async () => {
        return getDataConnect(connectorConfig).executeGraphqlRead(queryListUsersImpersonation, optsUnauthorizedClaims)
          .should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
      });

      it('executeGraphql() successfully executes an impersonated query with authenticated claims', async () => {
        const resp =
          await getDataConnect(connectorConfig).executeGraphqlRead<UsersResponse, undefined>(
            queryListUsersImpersonation, optsAuthorizedClaims);
        expect(resp.data.users).to.be.not.empty;
        expect(resp.data.users.length).equals(1);
        expect(resp.data.users[0]).to.deep.equal(testUser);
      });

      it('executeGraphql() should throw for impersonated query with unauthenticated claims', async () => {
        return getDataConnect(connectorConfig).executeGraphql(queryListUsersImpersonation, optsUnauthorizedClaims)
          .should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
      });

      it('executeGraphql() should return an empty list for an impersonated query with non-existing authenticated ' + 
        'claims',
      async () => {
        const resp = await getDataConnect(connectorConfig).executeGraphql<UsersResponse, undefined>(
          queryListUsersImpersonation, optsNonExistingClaims);
        // Should find no data
        expect(resp.data.users).to.be.empty;
      });

      it('executeGraphql() successfully executes an impersonated mutation with authenticated claims',
        async () => {
          const resp = await getDataConnect(connectorConfig).executeGraphql<UserUpdateResponse, undefined>(
            updateImpersonatedUser, optsAuthorizedClaims);
          // Fred -> Fredrick
          expect(resp.data.user_update.uid).equals(userId);
        });

      it('executeGraphql() should throw for impersonated mutation with unauthenticated claims', async () => {
        return getDataConnect(connectorConfig).executeGraphql(updateImpersonatedUser, optsUnauthorizedClaims)
          .should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
      });

      it('executeGraphql() should return null for an impersonated mutation with non-existing authenticated claims',
        async () => {
          const resp = await getDataConnect(connectorConfig).executeGraphql<UserUpdateResponse, undefined>(
            updateImpersonatedUser, optsNonExistingClaims);
          // Should mutate no data
          expect(resp.data.user_update).to.be.null;
        });
    });

    describe('PUBLIC Auth Policy', () => {
      const expectedUsers = [
        {
          name: 'Fredrick',
          address: '32 Elm St.',
          uid: userId
        },
        {
          name: 'Jeff',
          address: '99 Oak St. N',
          uid: 'QVBJcy5ndXJ1'
        }
      ];

      it('executeGraphql() successfully executes an impersonated query with authenticated claims', async () => {
        const resp = await getDataConnect(connectorConfig).executeGraphql<UsersResponse, undefined>(
          queryListUsers, optsAuthorizedClaims);
        expect(resp.data.users).to.be.not.empty;
        expect(resp.data.users.length).to.be.greaterThan(1);
        expectedUsers.forEach((expectedUser) => {
          expect(resp.data.users).to.deep.include(expectedUser);
        })
      });

      it('executeGraphql() successfully executes an impersonated query with unauthenticated claims', async () => {
        const resp = await getDataConnect(connectorConfig).executeGraphql<UsersResponse, undefined>(
          queryListUsers, optsUnauthorizedClaims);
        expect(resp.data.users).to.be.not.empty;
        expect(resp.data.users.length).to.be.greaterThan(1);
        expectedUsers.forEach((expectedUser) => {
          expect(resp.data.users).to.deep.include(expectedUser);
        });
      });

      it('executeGraphql() successfully executes an impersonated query with non-existing authenticated claims',
        async () => {
          const resp = await getDataConnect(connectorConfig).executeGraphql<UsersResponse, undefined>(
            queryListUsers, optsNonExistingClaims);
          expect(resp.data.users).to.be.not.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          expectedUsers.forEach((expectedUser) => {
            expect(resp.data.users).to.deep.include(expectedUser);
          });
        });
    });

    describe('NO_ACCESS Auth Policy', () => {
      it('executeGraphql() should throw for an impersonated query with authenticated claims', async () => {
        return await getDataConnect(connectorConfig).executeGraphql(queryListEmails, optsAuthorizedClaims)
          .should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
      });

      it('executeGraphql() should throw for an impersonated query with unauthenticated claims', async () => {
        return await getDataConnect(connectorConfig).executeGraphql(queryListEmails, optsUnauthorizedClaims)
          .should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
      });

      it('executeGraphql() should throw for an impersonated query with non-existing authenticated claims',
        async () => {
          return await getDataConnect(connectorConfig).executeGraphql(queryListEmails, optsNonExistingClaims)
            .should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
        });
    });
  });
});
