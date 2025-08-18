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
 *  id: String!
 *  subject: String!
 *  date: Date!
 *  text: String!
 *  from: User!
 * }
*/
type Email = {
  subject: string;
  date: string;
  text: string;
  from: User;
  id: string;
};

interface GetUserVariables {
  id: { id: string; };
}

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

interface GetEmailVariables {
  id: string
}

interface GetEmailResponse {
  email: Email;
}

interface EmailUpsertResponse {
  email_upsert: { id: string; };
}

interface InsertEmailVariables {
  id: string;
}

interface InsertEmailResponse {
  email_insert: { id: string; };
}

interface InsertEmailResponse {
  email_insert: { id: string; };
}

interface ListEmailsResponse {
  emails: Email[];
}

interface DeleteResponse {
  email_deleteMany: number
  user_deleteMany: number
}

const connectorConfig: ConnectorConfig = {
  location: 'us-central1',
  serviceId: 'my-service',
  connector: 'example'
};

const fredUser = { id: 'fred_id', address: '32 Elm St.', name: 'Fred' };
const fredrickUser = { id: fredUser.id, address: '64 Elm St. North', name: 'Fredrick' };

const jeffUser = { id: 'jeff_id', address: '99 Oak St.', name: 'Jeff' };

const expectedUserIds = [fredUser.id, jeffUser.id];

const jeffEmail = { 
  id: 'fred_email_id',
  subject: 'free bitcoin inside', 
  date: '1999-12-31', 
  text: 'get pranked! LOL!', 
  fromId: jeffUser.id
};

describe('getDataConnect()', () => {

  before(() => {
    firebase.initializeApp({
      apiKey,
      authDomain: projectId + '.firebaseapp.com',
    });
  });

  after(() => {
    describe('cleanup', () => {
      it('executeGraphql() should successfully clean up database after all tests are completed', async () => {
        const resp = await getDataConnect(connectorConfig).executeGraphql<DeleteResponse, unknown>(
          `mutation delete {
            email_deleteMany(all: true)
            user_deleteMany(all: true)
          }`
        );
        expect(resp.data.email_deleteMany).to.be.greaterThan(0);
        expect(resp.data.user_deleteMany).to.be.greaterThan(0);
      })
    })
  });

  /** @auth(level: PUBLIC) */
  const queryListUsers = 'query ListUsers @auth(level: PUBLIC) { users { id, name, address } }';
  /** @auth(level: NO_ACCESS) */
  const queryListEmails = 
    'query ListEmails @auth(level: NO_ACCESS) { emails { id subject text date from { id name address } } }';
  /** no @auth specified - default permissions */
  const queryGetUser = 'query GetUser($id: User_Key!) @auth(level: NO_ACCESS) { user(key: $id) { id name } }';

  /** @auth(level: USER) */
  const queryListUsersImpersonation = `
    query ListUsersImpersonation @auth(level: USER) {
      users(where: { id: { eq_expr: "auth.uid" } }) { id, name, address }
    }`;
  
  const multipleQueries = `
    ${queryListUsers}
    ${queryListEmails}
  `;

  /** hardcoded upsert fredUser query, with non-impersonateable id */
  const upsertFredUser = 
    `mutation upsertFredUser @auth(level: NO_ACCESS) {
      user_upsert(data: {id: "${fredUser.id}", address: "${fredUser.address}", name: "${fredUser.name}"})
    }`;

  /** hardcoded upsert fredrickUser query, with impersonateable id */
  const updateFredrickUserImpersonation = 
    `mutation updateFredrickUserImpersonation @auth(level: USER) {
      user_update(
        key: { id_expr: "auth.uid" }, 
        data: { address: "${fredrickUser.address}", name: "${fredrickUser.name}" }
      )
    }`;
  
  /** hardcoded upsert jeffUser query, with non-impersonateable id */
  const upsertJeffUser = 
    `mutation upsertJeffUser @auth(level: NO_ACCESS) {
      user_upsert(data: {id: "${jeffUser.id}", address: "${jeffUser.address}", name: "${jeffUser.name}"})
    }`;

  /** hardcoded upsertJeffEmail query, with non-impersonateable id */
  const upsertJeffEmail = `mutation upsertJeffEmail @auth(level: NO_ACCESS) {
    email_upsert(data: {
      id:"${jeffEmail.id}",
      subject: "${jeffEmail.subject}",
      date: "${jeffEmail.date}",
      text: "${jeffEmail.text}",
      fromId: "${jeffEmail.fromId}"
    })
  }`;

  const optsUnauthorizedClaims: GraphqlOptions<undefined> = {
    impersonate: {
      unauthenticated: true
    }
  };

  const optsAuthorizedFredAnonClaims: GraphqlOptions<undefined> = {
    impersonate: {
      authClaims: {
        sub: fredUser.id,
        firebase: {
          identities: { who: 'me' },
          sign_in_provider: 'anonymous'
        }
      }
    }
  };

  const optsAuthorizedFredClaims: GraphqlOptions<undefined> = {
    impersonate: {
      authClaims: {
        sub: fredUser.id,
      }
    }
  };

  const optsAuthorizedFredEmailVerifiedClaims: GraphqlOptions<undefined> = {
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

  describe('executeGraphql* API', () => {
    describe('executeGraphql()', () => {
      it('executeGraphql() successfully executes a GraphQL mutation', async () => {
        const fredResponse = await getDataConnect(connectorConfig).executeGraphql<UserUpsertResponse, unknown>(
          upsertFredUser
        );
        //{ data: { user_insert: { id: 'fred_id' } } }
        expect(fredResponse.data.user_upsert.id).to.be.not.empty;
        expect(fredResponse.data.user_upsert.id).equals(fredUser.id);

        const jeffResponse = await getDataConnect(connectorConfig).executeGraphql<UserUpsertResponse, unknown>(
          upsertJeffUser
        );
        //{ data: { user_insert: { id: 'jeff_id' } } }
        expect(jeffResponse.data.user_upsert.id).to.be.not.empty;
        expect(jeffResponse.data.user_upsert.id).equals(jeffUser.id);

        const emailResponse = await getDataConnect(connectorConfig).executeGraphql<EmailUpsertResponse, unknown>(
          upsertJeffEmail
        );
        //{ data: { email_upsert: { id: 'email_id' } } }
        expect(emailResponse.data.email_upsert.id).to.be.not.empty;
      });

      it('executeGraphql() successfully executes a GraphQL query', async () => {
        const resp = await getDataConnect(connectorConfig)
          .executeGraphql<ListUsersResponse, undefined>(queryListUsers);
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
        expect(resp.data.emails[0].id).to.be.not.undefined;
        expect(resp.data.emails[0].from?.id).to.equal(jeffUser.id);
      });

      it(`executeGraphql() should throw for a query error when no variables are provided 
          to a query which requires variables`, async () => {
        return getDataConnect(connectorConfig).executeGraphql(queryGetUser)
          .should.eventually.be.rejected.and.have.property('code', 'data-connect/query-error');
      });

      it('executeGraphql() successfully executes a GraphQL query with variables', async () => {
        const resp = await getDataConnect(connectorConfig).executeGraphql<GetUserResponse, GetUserVariables>(
          queryGetUser,
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
          .executeGraphqlRead<ListUsersResponse, undefined>(queryListUsers);
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

    describe('executeGraphql* impersonation', () => {
      describe('USER Auth Policy', () => {
        it('executeGraphqlRead() successfully executes an impersonated query with authenticated claims', async () => {
          const resp =
            await getDataConnect(connectorConfig).executeGraphqlRead<ListUsersResponse, undefined>(
              queryListUsersImpersonation, 
              optsAuthorizedFredClaims
            );
          expect(resp.data.users).to.be.not.empty;
          expect(resp.data.users.length).equals(1);
          expect(resp.data.users[0]).to.deep.equal(fredUser);
        });

        it('executeGraphqlRead() should throw for impersonated query with unauthenticated claims', async () => {
          return getDataConnect(connectorConfig).executeGraphqlRead(
            queryListUsersImpersonation, 
            optsUnauthorizedClaims
          )
            .should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('executeGraphql() successfully executes an impersonated query with authenticated claims', async () => {
          const resp = await getDataConnect(connectorConfig).executeGraphqlRead<ListUsersResponse, undefined>(
            queryListUsersImpersonation, optsAuthorizedFredClaims);
          expect(resp.data.users).to.be.not.empty;
          expect(resp.data.users.length).equals(1);
          expect(resp.data.users[0]).to.deep.equal(fredUser);
        });

        it('executeGraphql() should throw for impersonated query with unauthenticated claims', async () => {
          return getDataConnect(connectorConfig).executeGraphql(
            queryListUsersImpersonation, optsUnauthorizedClaims)
            .should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('executeGraphql() should return an empty list for an impersonated query with non-existing authenticated ' + 
          'claims',
        async () => {
          const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, undefined>(
            queryListUsersImpersonation, optsNonExistingClaims);
          // Should find no data
          expect(resp.data.users).to.be.empty;
        });

        it('executeGraphql() successfully executes an impersonated mutation with authenticated claims',
          async () => {
            const resp = await getDataConnect(connectorConfig).executeGraphql<UserUpdateResponse, undefined>(
              updateFredrickUserImpersonation, 
              { ...optsAuthorizedFredClaims });
            // Fred -> Fredrick
            expect(resp.data.user_update.id).equals(fredUser.id);
          });

        it('executeGraphql() should throw for impersonated mutation with unauthenticated claims', async () => {
          return getDataConnect(connectorConfig).executeGraphql(updateFredrickUserImpersonation, optsUnauthorizedClaims)
            .should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('executeGraphql() should return null for an impersonated mutation with non-existing authenticated claims',
          async () => {
            const resp = await getDataConnect(connectorConfig).executeGraphql<UserUpdateResponse, undefined>(
              updateFredrickUserImpersonation, { ...optsNonExistingClaims });
            // Should mutate no data
            expect(resp.data.user_update).to.be.null;
          });
      });

      describe('PUBLIC Auth Policy', () => {
        it('executeGraphql() successfully executes an impersonated query with authenticated claims', async () => {
          const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, undefined>(
            queryListUsers, optsAuthorizedFredClaims);
          expect(resp.data.users).to.be.not.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach((user) => {
            expect(expectedUserIds).to.include(user.id);
          });
        });

        it('executeGraphql() successfully executes an impersonated query with unauthenticated claims', async () => {
          const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, undefined>(
            queryListUsers, optsUnauthorizedClaims);
          expect(resp.data.users).to.be.not.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach((user) => {
            expect(expectedUserIds).to.include(user.id);
          });
        });

        it('executeGraphql() successfully executes an impersonated query with non-existing authenticated claims',
          async () => {
            const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, undefined>(
              queryListUsers, optsNonExistingClaims);
            expect(resp.data.users).to.be.not.empty;
            expect(resp.data.users.length).to.be.greaterThan(1);
            resp.data.users.forEach((user) => {
              expect(expectedUserIds).to.include(user.id);
            });
          });
      });

      describe('NO_ACCESS Auth Policy', () => {
        it('executeGraphql() should throw for an impersonated query with authenticated claims', async () => {
          return await getDataConnect(connectorConfig).executeGraphql(queryListEmails, optsAuthorizedFredClaims)
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

  describe('impersonate* API', () => {
    describe('impersonateQuery()', () => {
      describe('with unauthenticated impersonation', () => {
        it('should successfully execute a query with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsUnauthorizedClaims, operationName: 'ListUsersPublic' }
          );
          expect(resp.data.users).to.be.not.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach((user) => {
            expect(expectedUserIds).to.include(user.id);
          });
        });

        it('should fail to execute a query with @auth(level: USER_ANON)', () => {
          return getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsUnauthorizedClaims, operationName: 'ListUsersUserAnon' }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a query with @auth(level: USER)', async () => {
          return getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsUnauthorizedClaims, operationName: 'ListUsersUser' }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a query with @auth(level: USER_EMAIL_VERIFIED)', () => {
          return getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsUnauthorizedClaims, operationName: 'ListUsersUserEmailVerified' }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a query with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsUnauthorizedClaims, operationName: 'ListUsersNoAccess' }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
        });
      });

      describe('with authenticated anonymous impersonation', () => {
        it('should successfully execute a query with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredAnonClaims, operationName: 'ListUsersPublic' }
          );
          expect(resp.data.users).to.not.be.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach(user => {
            expect(expectedUserIds).to.include(user.id);
          });
        });
        
        it('should successfully execute a query with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredAnonClaims, operationName: 'ListUsersUserAnon' }
          );
          expect(resp.data.users).to.not.be.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach(user => {
            expect(expectedUserIds).to.include(user.id);
          });
        });

        it('should fail to execute a query with @auth(level: USER)', async () => {
          return getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredAnonClaims, operationName: 'ListUsersUser' }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a query with @auth(level: USER_EMAIL_VERIFIED)', async () => {
          return getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredAnonClaims, operationName: 'ListUsersUserEmailVerified' }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a query with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredAnonClaims, operationName: 'ListUsersNoAccess' }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
        });

        it("should use the impersonated user's auth.uid", async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredAnonClaims, operationName: 'ListUsersImpersonationAnon' }
          );
          expect(resp.data.users).to.not.be.empty;
          expect(resp.data.users.length).to.equal(1);
          expect(resp.data.users[0].id).to.equal(fredUser.id);
        });
      });

      describe('with authenticated user impersonation', () => {
        it('should successfully execute a query with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredClaims, operationName: 'ListUsersPublic' }
          );
          expect(resp.data.users).to.not.be.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach(user => {
            expect(expectedUserIds).to.include(user.id);
          });
        });

        it('should successfully execute a query with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredClaims, operationName: 'ListUsersUserAnon' }
          );
          expect(resp.data.users).to.not.be.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach(user => {
            expect(expectedUserIds).to.include(user.id);
          });
        });

        it('should successfully execute a query with @auth(level: USER)', async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredClaims, operationName: 'ListUsersUser' }
          );
          expect(resp.data.users).to.not.be.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach(user => {
            expect(expectedUserIds).to.include(user.id);
          });
        });

        it('should fail to execute a query with @auth(level: USER_EMAIL_VERIFIED)', async () => {
          return getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredClaims, operationName: 'ListUsersUserEmailVerified' }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a query with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredClaims, operationName: 'ListUsersNoAccess' }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
        });

        it("should use the impersonated user's auth.uid", async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredClaims, operationName: 'ListUsersImpersonationAnon' }
          );
          expect(resp.data.users).to.not.be.empty;
          expect(resp.data.users.length).to.equal(1);
          expect(resp.data.users[0].id).to.equal(fredUser.id);
        });
      });

      describe('with authenticated email verified user impersonation', () => {
        it('should successfully execute a query with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredEmailVerifiedClaims, operationName: 'ListUsersPublic' }
          );
          expect(resp.data.users).to.not.be.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach(user => {
            expect(expectedUserIds).to.include(user.id);
          });
        });

        it('should successfully execute a query with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredEmailVerifiedClaims, operationName: 'ListUsersUserAnon' }
          );
          expect(resp.data.users).to.not.be.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach(user => {
            expect(expectedUserIds).to.include(user.id);
          });
        });

        it('should successfully execute a query with @auth(level: USER)', async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredEmailVerifiedClaims, operationName: 'ListUsersUser' }
          );
          expect(resp.data.users).to.not.be.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach(user => {
            expect(expectedUserIds).to.include(user.id);
          });
        });

        it('should successfully execute a query with @auth(level: USER_EMAIL_VERIFIED)', async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredEmailVerifiedClaims, operationName: 'ListUsersUserEmailVerified' }
          );
          expect(resp.data.users).to.not.be.empty;
          expect(resp.data.users.length).to.be.greaterThan(1);
          resp.data.users.forEach(user => {
            expect(expectedUserIds).to.include(user.id);
          });
        });

        it('should fail to execute a query with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredEmailVerifiedClaims, operationName: 'ListUsersNoAccess' }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
        });

        it("should use the impersonated user's auth.uid", async () => {
          const resp = await getDataConnect(connectorConfig).impersonateQuery<ListUsersResponse, undefined>(
            { ...optsAuthorizedFredEmailVerifiedClaims, operationName: 'ListUsersImpersonationAnon' }
          );
          expect(resp.data.users).to.not.be.empty;
          expect(resp.data.users.length).to.equal(1);
          expect(resp.data.users[0].id).to.equal(fredUser.id);
        });
      });
    });

    describe('impersonateMutation()', () => {
      describe('with unauthenticated impersonation', () => {
        it('should successfully execute a mutation with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsUnauthorizedClaims, 
                operationName: 'InsertEmailPublic', 
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            );
          expect(resp.data.email_insert.id).to.be.not.undefined;
        });

        it('should fail to execute a mutation with @auth(level: USER_ANON)', () => {
          return getDataConnect(connectorConfig).impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
            { 
              ...optsUnauthorizedClaims, 
              operationName: 'InsertEmailUserAnon', 
              variables: { id: `email_id_${Math.random() * 1000}` }
            }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a mutation with @auth(level: USER)', async () => {
          return getDataConnect(connectorConfig).impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
            { 
              ...optsUnauthorizedClaims, 
              operationName: 'InsertEmailUser',
              variables: { id: `email_id_${Math.random() * 1000}` }
            }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a mutation with @auth(level: USER_EMAIL_VERIFIED)', () => {
          return getDataConnect(connectorConfig).impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
            { 
              ...optsUnauthorizedClaims, 
              operationName: 'InsertEmailUserEmailVerified',
              variables: { id: `email_id_${Math.random() * 1000}` }
            }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a mutation with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
            { 
              ...optsUnauthorizedClaims,
              operationName: 'InsertEmailNoAccess',
              variables: { id: `email_id_${Math.random() * 1000}` }
            }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
        });
      });

      describe('with authenticated anonymous impersonation', () => {
        it('should successfully execute a mutation with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsAuthorizedFredAnonClaims, 
                operationName: 'InsertEmailPublic',
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            );
          expect(resp.data.email_insert.id).to.be.not.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsAuthorizedFredAnonClaims, 
                operationName: 'InsertEmailUserAnon',
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            );
          expect(resp.data.email_insert.id).to.be.not.undefined;
        });

        it('should fail to execute a mutation with @auth(level: USER)', async () => {
          return getDataConnect(connectorConfig).impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
            { 
              ...optsAuthorizedFredAnonClaims,
              operationName: 'InsertEmailUser',
              variables: { id: `email_id_${Math.random() * 1000}` }
            }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a mutation with @auth(level: USER_EMAIL_VERIFIED)', () => {
          return getDataConnect(connectorConfig).impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
            { 
              ...optsAuthorizedFredAnonClaims,
              operationName: 'InsertEmailUserEmailVerified',
              variables: { id: `email_id_${Math.random() * 1000}` }
            }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a mutation with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
            { 
              ...optsAuthorizedFredAnonClaims,
              operationName: 'InsertEmailNoAccess',
              variables: { id: `email_id_${Math.random() * 1000}` }
            }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
        });

        it("should use the impersonated user's auth.uid", async () => {
          const insertResp = await getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsAuthorizedFredAnonClaims,
                operationName: 'InsertEmailImpersonation',
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            );
          expect(insertResp.data.email_insert.id).to.be.not.undefined;
          const queryResp = await getDataConnect(connectorConfig).impersonateQuery<GetEmailResponse, GetEmailVariables>(
            { 
              ...optsAuthorizedFredAnonClaims, 
              operationName: 'GetEmail', 
              variables: { id: insertResp.data.email_insert.id }
            }
          );
          expect(queryResp.data.email.from.id).to.equal(fredUser.id);
        });
      });

      describe('with authenticated user impersonation', () => {
        it('should successfully execute a mutation with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsAuthorizedFredClaims,
                operationName: 'InsertEmailPublic',
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            );
          expect(resp.data.email_insert.id).to.be.not.undefined;
        });

        it('should fail to execute a mutation with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsAuthorizedFredClaims,
                operationName: 'InsertEmailUserAnon',
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            );
          expect(resp.data.email_insert.id).to.be.not.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsAuthorizedFredClaims,
                operationName: 'InsertEmailUser',
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            );
          expect(resp.data.email_insert.id).to.be.not.undefined;
        });

        it('should fail to execute a mutation with @auth(level: USER_EMAIL_VERIFIED)', () => {
          return getDataConnect(connectorConfig).impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
            { 
              ...optsAuthorizedFredClaims,
              operationName: 'InsertEmailUserEmailVerified',
              variables: { id: `email_id_${Math.random() * 1000}` }
            }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a mutation with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
            { 
              ...optsAuthorizedFredClaims,
              operationName: 'InsertEmailNoAccess',
              variables: { id: `email_id_${Math.random() * 1000}` }
            }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
        });

        it("should use the impersonated user's auth.uid", async () => {
          const insertResp = await getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsAuthorizedFredClaims,
                operationName: 'InsertEmailImpersonation',
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            );
          expect(insertResp.data.email_insert.id).to.be.not.undefined;
          const queryResp = await getDataConnect(connectorConfig).impersonateQuery<GetEmailResponse, GetEmailVariables>(
            { 
              ...optsAuthorizedFredClaims, 
              operationName: 'GetEmail',
              variables: { id: insertResp.data.email_insert.id }
            }
          );
          expect(queryResp.data.email.from.id).to.equal(fredUser.id);
        });
      });

      describe('with authenticated email verified user impersonation', () => {
        it('should successfully execute a mutation with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsAuthorizedFredEmailVerifiedClaims,
                operationName: 'InsertEmailPublic',
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            );
          expect(resp.data.email_insert.id).to.be.not.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsAuthorizedFredEmailVerifiedClaims,
                operationName: 'InsertEmailUserAnon',
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            )
          expect(resp.data.email_insert.id).to.be.not.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsAuthorizedFredEmailVerifiedClaims,
                operationName: 'InsertEmailUser',
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            )
          expect(resp.data.email_insert.id).to.be.not.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER_EMAIL_VERIFIED)', async () => {
          const resp = await  getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsAuthorizedFredEmailVerifiedClaims,
                operationName: 'InsertEmailUserEmailVerified',
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            )
          expect(resp.data.email_insert.id).to.be.not.undefined;
        });

        it('should fail to execute a mutation with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
            { ...optsAuthorizedFredEmailVerifiedClaims, 
              operationName: 'InsertEmailNoAccess',
              variables: { id: `email_id_${Math.random() * 1000}` }
            }
          ).should.eventually.be.rejected.and.has.property('code', 'data-connect/permission-denied');
        });

        it("should use the impersonated user's auth.uid", async () => {
          const insertResp = await getDataConnect(connectorConfig)
            .impersonateMutation<InsertEmailResponse, InsertEmailVariables>(
              { 
                ...optsAuthorizedFredEmailVerifiedClaims,
                operationName: 'InsertEmailImpersonation',
                variables: { id: `email_id_${Math.random() * 1000}` }
              }
            );
          expect(insertResp.data.email_insert.id).to.be.not.undefined;
          const queryResp = await getDataConnect(connectorConfig).impersonateQuery<GetEmailResponse, GetEmailVariables>(
            { 
              ...optsAuthorizedFredEmailVerifiedClaims, 
              operationName: 'GetEmail',
              variables: { id: insertResp.data.email_insert.id }
            }
          );
          expect(queryResp.data.email.from.id).to.equal(fredUser.id);
        });
      });
    });
  });
});