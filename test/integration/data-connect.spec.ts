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
import firebase from '@firebase/app-compat';
import { apiKey, projectId } from './setup';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

/**
 * // Schema
 * type User @table(key: ["id"]) {
 *   id: String!
 *   name: String!
 *   address: String!
 * }
 */
type User = {
  id: string;
  name: string;
  address: string;
  // Generated
  emails_on_from?: Email[];
};

/**
 * // Schema
 * type Email @table {
 * 	id: String!
 * 	subject: String!
 * 	date: Date!
 * 	text: String!
 * 	from: User!
 * }
*/
type Email = {
  subject: string;
  date: string;
  text: string;
  from: User;
  id: string;
};

interface GetUserResponse {
  user: User;
}

interface ListUsersResponse {
  users: User[];
}

interface UserUpsertResponse {
  user_upsert: { id: string; };
}

interface UserUpdateResponse {
  user_update: { id: string; };
}

interface EmailUpsertResponse {
  email_upsert: { id: string; };
}

interface ListEmailsResponse {
  emails: Email[];
}

interface QueryUserVariables {
  id: { id: string; };
}

const connectorConfig: ConnectorConfig = {
  location: 'us-west2',
  serviceId: 'my-service',
};

const fredUser = { id: '00000000000000000000000000000000', address: '32 Elm St.', name: 'Fred' }
const fredrickUser = { id: fredUser.id, address: '64 Elm St. North', name: 'Fredrick' }

const jeffUser = { id: '11111111111111111111111111111111', address: '99 Oak St.', name: 'Jeff' }

const expectedUserIds = [fredUser.id, jeffUser.id]

const fredEmail = { 
  id: '99999999999999999999999999999999',
  subject: 'free bitcoin inside', 
  date: '1999-12-31', 
  text: 'get pranked! LOL!', 
  fromId: fredUser.id
}

describe('getDataConnect()', () => {

  before(() => {
    firebase.initializeApp({
      apiKey,
      authDomain: projectId + '.firebaseapp.com',
    });
  });

  const queryListUsersPublicLevel = 'query ListUsers @auth(level: PUBLIC) { users { id, name, address } }';
  const queryListEmailsNoAccess = 
    'query ListEmails @auth(level: NO_ACCESS) { emails { id subject text date from { name } } }';
  const queryGetUserById = 'query GetUser($id: User_Key!) { user(key: $id) { id name } }';

  const queryListUsersImpersonationUserLevel = `
    query ListUsers @auth(level: USER) {
      users(where: { id: { eq_expr: "auth.uid" } }) { id, name, address }
    }`;
  
  const multipleQueries = `
    ${queryListUsersPublicLevel}
    ${queryListEmailsNoAccess}
  `;

  /** hardcoded upsert fredUser query, with non-impersonateable id */
  const upsertFredUser = 
    `mutation user {
      user_upsert(data: {id: "${fredUser.id}", address: "${fredUser.address}", name: "${fredUser.name}"})
    }`;

  /** hardcoded upsert fredrickUser query, with impersonateable id */
  const updateFredrickUserImpersonated = 
    `mutation upsertFredrickUserImpersonated @auth(level: USER) {
      user_update(
        key: { id_expr: "auth.uid" }, 
        data: { address: "${fredrickUser.address}", name: "${fredrickUser.name}" }
      )
    }`;
  
  /** hardcoded upsert jeffUser query, with non-impersonateable id */
  const upsertJeffUser = 
    `mutation user {
      user_upsert(data: {id: "${jeffUser.id}", address: "${jeffUser.address}", name: "${jeffUser.name}"})
    }`;

  /** hardcoded upsert fredEmail query, with non-impersonateable id */
  const upsertFredEmail = `mutation email {
    email_upsert(data: {
      id:"${fredEmail.id}",
      subject: "${fredEmail.subject}",
      date: "${fredEmail.date}",
      text: "${fredEmail.text}",
      fromId: "${fredEmail.fromId}"
    })
  }`;

  describe('executeGraphql()', () => {
    it('executeGraphql() successfully executes a GraphQL mutation', async () => {
      const fredResponse = await getDataConnect(connectorConfig).executeGraphql<UserUpsertResponse, unknown>(
        upsertFredUser
      );
      //{ data: { user_insert: { id: '00000000000000000000000000000000' } } }
      expect(fredResponse.data.user_upsert.id).to.be.not.empty;
      expect(fredResponse.data.user_upsert.id).equals(fredUser.id);

      const jeffResponse = await getDataConnect(connectorConfig).executeGraphql<UserUpsertResponse, unknown>(
        upsertJeffUser
      );
      //{ data: { user_insert: { id: '11111111111111111111111111111111' } } }
      expect(jeffResponse.data.user_upsert.id).to.be.not.empty;
      expect(jeffResponse.data.user_upsert.id).equals(jeffUser.id);

      const emailResponse = await getDataConnect(connectorConfig).executeGraphql<EmailUpsertResponse, unknown>(
        upsertFredEmail
      );
      //{ data: { email_upsert: { id: '99999999999999999999999999999999' } } }
      expect(emailResponse.data.email_upsert.id).to.be.not.empty;
    });

    it('executeGraphql() successfully executes a GraphQL query', async () => {
      const resp = await getDataConnect(connectorConfig)
        .executeGraphql<ListUsersResponse, QueryUserVariables>(queryListUsersPublicLevel);
      expect(resp.data.users).to.be.not.empty;
      expect(resp.data.users.length).to.greaterThan(1);
      resp.data.users.forEach((user) => {
        expect(expectedUserIds).to.include(user.id);
      });
    });

    it('executeGraphql() use the operationName when multiple queries are provided', async () => {
      const resp = await getDataConnect(connectorConfig).executeGraphql<ListEmailsResponse, unknown>(
        multipleQueries,
        { operationName: 'ListEmails' }
      );
      expect(resp.data.emails).to.be.not.empty;
      expect(resp.data.emails.length).equals(1);
      expect(resp.data.emails[0].id).to.be.not.undefined;
      expect(resp.data.emails[0].from?.name).to.equal(fredUser.name);
    });

    it('executeGraphql() should throw for a query error when no variables are provided', async () => {
      return getDataConnect(connectorConfig).executeGraphql(queryGetUserById)
        .should.eventually.be.rejected.and.have.property('code', 'data-connect/query-error');
    });

    it('executeGraphql() successfully executes a GraphQL query with variables', async () => {
      const resp = await getDataConnect(connectorConfig).executeGraphql<GetUserResponse, QueryUserVariables>(
        queryGetUserById,
        { variables: { id: { id: fredUser.id } } }
      );
      expect(resp.data.user.id).to.equal(fredUser.id);
      expect(resp.data.user.name).to.equal(fredUser.name);
      expect(resp.data.user.address).to.be.undefined;
    });
  });

  describe('executeGraphqlRead()', () => {
    it('executeGraphqlRead() successfully executes a read-only GraphQL', async () => {
      const resp = await getDataConnect(connectorConfig)
        .executeGraphqlRead<ListUsersResponse, QueryUserVariables>(queryListUsersPublicLevel);
      expect(resp.data.users).to.be.not.empty;
      expect(resp.data.users.length).to.be.greaterThan(1);
      resp.data.users.forEach((user) => {
        expect(expectedUserIds).to.include(user.id);
      });
    });

    it('executeGraphqlRead() should throw for a GraphQL mutation', async () => {
      return getDataConnect(connectorConfig).executeGraphqlRead(upsertFredUser)
        .should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
    });
  });

  describe('Impersonation', () => {
    const optsAuthorizedFredClaims: GraphqlOptions<undefined> = {
      impersonate: {
        authClaims: {
          sub: fredUser.id,
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
          await getDataConnect(connectorConfig).executeGraphqlRead<ListUsersResponse, undefined>(
            queryListUsersImpersonationUserLevel, 
            optsAuthorizedFredClaims
          );
        expect(resp.data.users).to.be.not.empty;
        expect(resp.data.users.length).equals(1);
        expect(resp.data.users[0]).to.deep.equal(fredUser);
      });

      it('executeGraphqlRead() should throw for impersonated query with unauthenticated claims', async () => {
        return getDataConnect(connectorConfig).executeGraphqlRead(
          queryListUsersImpersonationUserLevel, 
          optsUnauthorizedClaims
        )
          .should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
      });

      it('executeGraphql() successfully executes an impersonated query with authenticated claims', async () => {
        const resp = await getDataConnect(connectorConfig).executeGraphqlRead<ListUsersResponse, undefined>(
          queryListUsersImpersonationUserLevel, optsAuthorizedFredClaims);
        expect(resp.data.users).to.be.not.empty;
        expect(resp.data.users.length).equals(1);
        expect(resp.data.users[0]).to.deep.equal(fredUser);
      });

      it('executeGraphql() should throw for impersonated query with unauthenticated claims', async () => {
        return getDataConnect(connectorConfig).executeGraphql(
          queryListUsersImpersonationUserLevel, optsUnauthorizedClaims)
          .should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
      });

      it('executeGraphql() should return an empty list for an impersonated query with non-existing authenticated ' + 
        'claims',
      async () => {
        const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, undefined>(
          queryListUsersImpersonationUserLevel, optsNonExistingClaims);
        // Should find no data
        expect(resp.data.users).to.be.empty;
      });

      it('executeGraphql() successfully executes an impersonated mutation with authenticated claims',
        async () => {
          const resp = await getDataConnect(connectorConfig).executeGraphql<UserUpdateResponse, undefined>(
            updateFredrickUserImpersonated, 
            { ...optsAuthorizedFredClaims });
          // Fred -> Fredrick
          expect(resp.data.user_update.id).equals(fredUser.id);
        });

      it('executeGraphql() should throw for impersonated mutation with unauthenticated claims', async () => {
        return getDataConnect(connectorConfig).executeGraphql(updateFredrickUserImpersonated, optsUnauthorizedClaims)
          .should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
      });

      it('executeGraphql() should return null for an impersonated mutation with non-existing authenticated claims',
        async () => {
          console.log('test')
          const resp = await getDataConnect(connectorConfig).executeGraphql<UserUpdateResponse, undefined>(
            updateFredrickUserImpersonated, { ...optsNonExistingClaims });
          // Should mutate no data
          expect(resp.data.user_update).to.be.null;
        });
    });

    describe('PUBLIC Auth Policy', () => {
      it('executeGraphql() successfully executes an impersonated query with authenticated claims', async () => {
        const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, undefined>(
          queryListUsersPublicLevel, optsAuthorizedFredClaims);
        expect(resp.data.users).to.be.not.empty;
        expect(resp.data.users.length).to.be.greaterThan(1);
        resp.data.users.forEach((user) => {
          expect(expectedUserIds).to.include(user.id);
        });
      });

      it('executeGraphql() successfully executes an impersonated query with unauthenticated claims', async () => {
        const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, undefined>(
          queryListUsersPublicLevel, optsUnauthorizedClaims);
        expect(resp.data.users).to.be.not.empty;
        expect(resp.data.users.length).to.be.greaterThan(1);
        resp.data.users.forEach((user) => {
          expect(expectedUserIds).to.include(user.id);
        });
      });

      it('executeGraphql() successfully executes an impersonated query with non-existing authenticated claims',
        async () => {
          const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, undefined>(
            queryListUsersPublicLevel, optsNonExistingClaims);
          expect(resp.data.users).to.be.not.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach((user) => {
            expect(expectedUserIds).to.include(user.id);
          });
        });
    });

    describe('NO_ACCESS Auth Policy', () => {
      it('executeGraphql() should throw for an impersonated query with authenticated claims', async () => {
        return await getDataConnect(connectorConfig).executeGraphql(queryListEmailsNoAccess, optsAuthorizedFredClaims)
          .should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
      });

      it('executeGraphql() should throw for an impersonated query with unauthenticated claims', async () => {
        return await getDataConnect(connectorConfig).executeGraphql(queryListEmailsNoAccess, optsUnauthorizedClaims)
          .should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
      });

      it('executeGraphql() should throw for an impersonated query with non-existing authenticated claims',
        async () => {
          return await getDataConnect(connectorConfig).executeGraphql(queryListEmailsNoAccess, optsNonExistingClaims)
            .should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
        });
    });
  });
});
