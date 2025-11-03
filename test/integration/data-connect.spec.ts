/*!
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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { getDataConnect, ConnectorConfig } from '../../lib/data-connect/index';
import firebase from '@firebase/app-compat';
import { apiKey, projectId } from './setup';
import { OperationOptions } from '../../lib/data-connect/data-connect-api';

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

interface InsertUserVariables {
  id: string;
  name: string;
  address: string;
}

interface InsertUserResponse {
  user_insert: { id: string; };
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
  location: 'us-west2',
  serviceId: 'my-service',
  connector: 'my-connector'
};

const fredUser = { id: 'fred_id', address: '32 Elm St.', name: 'Fred' }
const fredrickUser = { id: fredUser.id, address: '64 Elm St. North', name: 'Fredrick' }

const jeffUser = { id: 'jeff_id', address: '99 Oak St.', name: 'Jeff' }

const fredEmail = { 
  id: 'email_id',
  subject: 'free bitcoin inside', 
  date: '1999-12-31', 
  text: 'get pranked! LOL!', 
  from: { id: fredUser.id }
}

describe('getDataConnect()', () => {

  before(() => {
    firebase.initializeApp({
      apiKey,
      authDomain: projectId + '.firebaseapp.com',
    });
  });

  afterEach(async () => {
    await cleanupDatabase();
  })

  beforeEach(async () => {
    await initializeDatabase();
  });

  /** initial state of database after calling initializeDatabase() */
  const initialState = { users: [fredUser, jeffUser], emails: [fredEmail] };

  /** helper function which sets initial state of the database before each test */
  async function initializeDatabase(): Promise<void> {
    await getDataConnect(connectorConfig).executeGraphql<UserUpsertResponse, unknown>(
      upsertFredUser
    );
    await getDataConnect(connectorConfig).executeGraphql<UserUpsertResponse, unknown>(
      upsertJeffUser
    );
    await getDataConnect(connectorConfig).executeGraphql<EmailUpsertResponse, unknown>(
      upsertFredEmail
    );
  }

  /** helper function which clears state of the database after each test */
  async function cleanupDatabase(): Promise<void> {
    await getDataConnect(connectorConfig).executeGraphql<DeleteResponse, unknown>(deleteAll);
  }
  /** @auth(level: PUBLIC) */
  const queryListUsers = 'query ListUsers @auth(level: PUBLIC) { users { id, name, address } }';
  /** @auth(level: NO_ACCESS) */
  const queryListEmails = 
    'query ListEmails @auth(level: NO_ACCESS) { emails { id subject text date from { id } } }';
  /** @auth(level: NO_ACCESS) */
  const queryGetEmail = 
    'query GetEmail($id: String!) @auth(level: NO_ACCESS) { email(id: $id) { id subject text date from { id } } }';
  /** no @auth specified - default permissions */
  const queryGetUserById = 'query GetUser($id: User_Key!) { user(key: $id) { id name address } }';

  /** @auth(level: USER) */
  const queryListUsersImpersonation = `
    query ListUsers @auth(level: USER) {
      users(where: { id: { eq_expr: "auth.uid" } }) { id, name, address }
    }`;
  
  const multipleQueries = `
    ${queryListUsers}
    ${queryListEmails}
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
      fromId: "${fredEmail.from.id}"
    })
  }`;

  /** hardcoded delete all mutation, for cleanup */
  const deleteAll = `mutation delete {
      email_deleteMany(all: true)
      user_deleteMany(all: true)
    }`

  const optsUnauthorizedClaims: OperationOptions = {
    impersonate: {
      unauthenticated: true
    }
  };

  const optsAuthorizedFredAnonClaims: OperationOptions = {
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

  const optsAuthorizedFredClaims: OperationOptions = {
    impersonate: {
      authClaims: {
        sub: fredUser.id,
      }
    }
  };

  const optsAuthorizedFredEmailVerifiedClaims: OperationOptions = {
    impersonate: {
      authClaims: {
        sub: fredUser.id,
        email_verified: true
      }
    }
  };

  const optsNonExistingClaims: OperationOptions = {
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
        expect(fredResponse.data.user_upsert.id).equals(fredUser.id);

        const jeffResponse = await getDataConnect(connectorConfig).executeGraphql<UserUpsertResponse, unknown>(
          upsertJeffUser
        );
        //{ data: { user_insert: { id: 'jeff_id' } } }
        expect(jeffResponse.data.user_upsert.id).equals(jeffUser.id);

        const upsertEmailResponse = await getDataConnect(connectorConfig).executeGraphql<EmailUpsertResponse, unknown>(
          upsertFredEmail
        );
        //{ data: { email_upsert: { id: 'email_id' } } }
        expect(upsertEmailResponse.data.email_upsert.id).to.not.be.empty;
        const queryGetEmailResponse = 
          await getDataConnect(connectorConfig).executeGraphql<GetEmailResponse, GetEmailVariables>(
            queryGetEmail, { variables: { id: upsertEmailResponse.data.email_upsert.id } }
          );
        expect(queryGetEmailResponse.data.email).to.deep.equal(fredEmail);

        const deleteResponse = await getDataConnect(connectorConfig).executeGraphql<DeleteResponse, unknown>(deleteAll);
        expect(deleteResponse.data.email_deleteMany).to.equal(1);
        expect(deleteResponse.data.user_deleteMany).to.equal(2);
      });

      it('executeGraphql() successfully executes a GraphQL query', async () => {
        const resp = await getDataConnect(connectorConfig)
          .executeGraphql<ListUsersResponse, unknown>(queryListUsers);
        expect(resp.data.users).to.deep.equal(initialState.users);
      });

      it('executeGraphql() use the operationName when multiple queries are provided', async () => {
        const resp = await getDataConnect(connectorConfig).executeGraphql<ListEmailsResponse, unknown>(
          multipleQueries,
          { operationName: 'ListEmails' }
        );
        expect(resp.data.emails).to.deep.equal(initialState.emails);
      });

      it('executeGraphql() should throw for a query error when no variables are provided', async () => {
        return getDataConnect(connectorConfig).executeGraphql(queryGetUserById)
          .should.eventually.be.rejected.and.have.property('code', 'data-connect/query-error');
      });

      it('executeGraphql() successfully executes a GraphQL query with variables', async () => {
        const resp = await getDataConnect(connectorConfig).executeGraphql<GetUserResponse, GetUserVariables>(
          queryGetUserById,
          { variables: { id: { id: initialState.users[0].id } } }
        );
        expect(resp.data.user).to.deep.equal(initialState.users[0]);
      });
    });

    describe('executeGraphqlRead()', () => {
      it('executeGraphqlRead() successfully executes a read-only GraphQL', async () => {
        const resp = await getDataConnect(connectorConfig)
          .executeGraphqlRead<ListUsersResponse, unknown>(queryListUsers);
        expect(resp.data.users).to.deep.equal(initialState.users);
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
            await getDataConnect(connectorConfig).executeGraphqlRead<ListUsersResponse, unknown>(
              queryListUsersImpersonation, optsAuthorizedFredClaims);
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
          const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, unknown>(
            queryListUsersImpersonation, optsAuthorizedFredClaims);
          expect(resp.data.users.length).equals(1);
          expect(resp.data.users[0]).to.deep.equal(fredUser);
        });

        it('executeGraphql() should throw for impersonated query with unauthenticated claims', async () => {
          return getDataConnect(connectorConfig).executeGraphql(queryListUsersImpersonation, optsUnauthorizedClaims)
            .should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('executeGraphql() should return an empty list for an impersonated query with non-existing authenticated ' + 
          'claims',
        async () => {
          const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, unknown>(
            queryListUsersImpersonation, optsNonExistingClaims);
          // Should find no data
          expect(resp.data.users).to.be.empty;
        });

        it('executeGraphql() successfully executes an impersonated mutation with authenticated claims',
          async () => {
            const updateResp = await getDataConnect(connectorConfig).executeGraphql<UserUpdateResponse, unknown>(
              updateFredrickUserImpersonated, optsAuthorizedFredClaims);
            // Fred -> Fredrick
            expect(updateResp.data.user_update.id).equals(fredUser.id);
            const queryResp = await getDataConnect(connectorConfig).executeGraphql<GetUserResponse, GetUserVariables>(
              queryGetUserById, { variables: { id: { id: fredUser.id } } });
            expect(queryResp.data.user).to.deep.equal(fredrickUser);
          });

        it('executeGraphql() should throw for impersonated mutation with unauthenticated claims', async () => {
          return getDataConnect(connectorConfig).executeGraphql(updateFredrickUserImpersonated, optsUnauthorizedClaims)
            .should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('executeGraphql() should return null for an impersonated mutation with non-existing authenticated claims',
          async () => {
            const resp = await getDataConnect(connectorConfig).executeGraphql<UserUpdateResponse, unknown>(
              updateFredrickUserImpersonated, optsNonExistingClaims);
            // Should mutate no data
            expect(resp.data.user_update).to.be.null;
          });
      });

      describe('PUBLIC Auth Policy', () => {
        it('executeGraphql() successfully executes an impersonated query with authenticated claims', async () => {
          const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, unknown>(
            queryListUsers, optsAuthorizedFredClaims);
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('executeGraphql() successfully executes an impersonated query with unauthenticated claims', async () => {
          const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, unknown>(
            queryListUsers, optsUnauthorizedClaims);
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('executeGraphql() successfully executes an impersonated query with non-existing authenticated claims',
          async () => {
            const resp = await getDataConnect(connectorConfig).executeGraphql<ListUsersResponse, unknown>(
              queryListUsers, optsNonExistingClaims);
            expect(resp.data.users).to.deep.equal(initialState.users);
          });
      });

      describe('NO_ACCESS Auth Policy', () => {
        it('executeGraphql() should throw for an impersonated query with authenticated claims', async () => {
          return await getDataConnect(connectorConfig).executeGraphql(queryListEmails, optsAuthorizedFredClaims)
            .should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
        });

        it('executeGraphql() should throw for an impersonated query with unauthenticated claims', async () => {
          return await getDataConnect(connectorConfig).executeGraphql(queryListEmails, optsUnauthorizedClaims)
            .should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
        });

        it('executeGraphql() should throw for an impersonated query with non-existing authenticated claims',
          async () => {
            return await getDataConnect(connectorConfig).executeGraphql(queryListEmails, optsNonExistingClaims)
              .should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
          });
      });
    });
  });

  describe('executeQuery|Mutation API', () => {
    describe('executeQuery()', () => {
      it("should fail when executing a query which doesn't exist", async () => {
        return getDataConnect(connectorConfig).executeQuery(
          'DOES_NOT_EXIST!!!',
          undefined,
          optsUnauthorizedClaims
        ).should.eventually.be.rejected.and.have.property('code', 'data-connect/not-found');
      });

      it('should execute a query with variables', async () => {
        const resp = await getDataConnect(connectorConfig).executeQuery<GetUserResponse, GetUserVariables>(
          'GetUser',
          { id: { id: fredUser.id } },
        );
        expect(resp.data.user).to.deep.equal(fredUser);
      });

      describe('with unauthenticated impersonation', () => {
        it('should successfully execute a query with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersPublic',
            undefined,
            optsUnauthorizedClaims
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should fail to execute a query with @auth(level: USER_ANON)', () => {
          return getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersUserAnon', undefined, optsUnauthorizedClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a query with @auth(level: USER)', async () => {
          return getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersUser', undefined, optsUnauthorizedClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a query with @auth(level: USER_EMAIL_VERIFIED)', () => {
          return getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersUserEmailVerified', undefined, optsUnauthorizedClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a query with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersNoAccess', undefined, optsUnauthorizedClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
        });
      });

      describe('with authenticated anonymous impersonation', () => {
        it('should successfully execute a query with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersPublic', undefined, optsAuthorizedFredAnonClaims
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });
        
        it('should successfully execute a query with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersUserAnon', undefined, optsAuthorizedFredAnonClaims
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should fail to execute a query with @auth(level: USER)', async () => {
          return getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersUser', undefined, optsAuthorizedFredAnonClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a query with @auth(level: USER_EMAIL_VERIFIED)', async () => {
          return getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersUserEmailVerified', undefined, optsAuthorizedFredAnonClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a query with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersNoAccess', undefined, optsAuthorizedFredAnonClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
        });

        it("should use the impersonated user's auth.uid", async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersImpersonationAnon', undefined, optsAuthorizedFredAnonClaims
          );
          expect(resp.data.users.length).equals(1);
          expect(resp.data.users[0]).to.deep.equal(fredUser);
        });
      });

      describe('with authenticated user impersonation', () => {
        it('should successfully execute a query with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersPublic', undefined, optsAuthorizedFredClaims
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should successfully execute a query with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersUserAnon', undefined, optsAuthorizedFredClaims
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should successfully execute a query with @auth(level: USER)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersUser', undefined, optsAuthorizedFredClaims
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should fail to execute a query with @auth(level: USER_EMAIL_VERIFIED)', async () => {
          return getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersUserEmailVerified', undefined, optsAuthorizedFredClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a query with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersNoAccess', undefined, optsAuthorizedFredClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
        });

        it("should use the impersonated user's auth.uid", async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersImpersonationAnon', undefined, optsAuthorizedFredClaims
          );
          expect(resp.data.users.length).equals(1);
          expect(resp.data.users[0]).to.deep.equal(fredUser);
        });
      });

      describe('with authenticated email verified user impersonation', () => {
        it('should successfully execute a query with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersPublic', undefined, optsAuthorizedFredEmailVerifiedClaims
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should successfully execute a query with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersUserAnon', undefined, optsAuthorizedFredEmailVerifiedClaims
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should successfully execute a query with @auth(level: USER)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersUser', undefined, optsAuthorizedFredEmailVerifiedClaims
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should successfully execute a query with @auth(level: USER_EMAIL_VERIFIED)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersUserEmailVerified', undefined, optsAuthorizedFredEmailVerifiedClaims
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should fail to execute a query with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersNoAccess', undefined, optsAuthorizedFredEmailVerifiedClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
        });

        it("should use the impersonated user's auth.uid", async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse, undefined>(
            'ListUsersImpersonationAnon', undefined, optsAuthorizedFredEmailVerifiedClaims
          );
          expect(resp.data.users.length).equals(1);
          expect(resp.data.users[0]).to.deep.equal(fredUser);
        });
      });

      describe('with no impersonation, bypassing auth policies', () => {
        it('should successfully execute a query with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse>(
            'ListUsersPublic'
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should successfully execute a query with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse>(
            'ListUsersUserAnon'
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should successfully execute a query with @auth(level: USER)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse>(
            'ListUsersUser'
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should successfully execute a query with @auth(level: USER_EMAIL_VERIFIED)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse>(
            'ListUsersUserEmailVerified'
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it('should successfully execute a query with @auth(level: NO_ACCESS)', async () => {
          const resp = await getDataConnect(connectorConfig).executeQuery<ListUsersResponse>(
            'ListUsersNoAccess'
          );
          expect(resp.data.users).to.deep.equal(initialState.users);
        });

        it("should fail to execute a query using the impersonated user's auth.uid", async () => {
          return getDataConnect(connectorConfig).executeQuery<ListUsersResponse>(
            'ListUsersImpersonationAnon'
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/query-error');
        });
      });
    });

    describe('executeMutation()', () => {
      function generateEmailId(): string {
        return `email_id_${Math.random() * 1000}`;
      }

      it("should fail when executing a mutation which doesn't exist", async () => {
        return getDataConnect(connectorConfig).executeMutation(
          'DOES_NOT_EXIST!!!', optsUnauthorizedClaims
        ).should.eventually.be.rejected.and.have.property('code', 'data-connect/not-found');
      });

      it('should execute a mutation with variables', async () => {
        const user = { id: 'USER_ID', name: 'USER_NAME', address: 'USER_ADDRESS' };
        const insertResp = await getDataConnect(connectorConfig)
          .executeMutation<InsertUserResponse, InsertUserVariables>('InsertUser', user);
        expect(insertResp.data.user_insert).to.deep.equal({ id: user.id });
        
        const getResp = await getDataConnect(connectorConfig).executeQuery<GetUserResponse, GetUserVariables>(
          'GetUser',
          { id: { id: user.id } },
        );
        expect(getResp.data.user).to.deep.equal(user);
      })

      describe('with unauthenticated impersonation', () => {
        it('should successfully execute a mutation with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailPublic',
              { id: generateEmailId() },
              optsUnauthorizedClaims
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should fail to execute a mutation with @auth(level: USER_ANON)', () => {
          return getDataConnect(connectorConfig).executeMutation<InsertEmailResponse, InsertEmailVariables>(
            'InsertEmailUserAnon',
            { id: generateEmailId() },
            optsUnauthorizedClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a mutation with @auth(level: USER)', async () => {
          return getDataConnect(connectorConfig).executeMutation<InsertEmailResponse, InsertEmailVariables>(
            'InsertEmailUser',
            { id: generateEmailId() },
            optsUnauthorizedClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a mutation with @auth(level: USER_EMAIL_VERIFIED)', () => {
          return getDataConnect(connectorConfig).executeMutation<InsertEmailResponse, InsertEmailVariables>(
            'InsertEmailUserEmailVerified',
            { id: generateEmailId() },
            optsUnauthorizedClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a mutation with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).executeMutation<InsertEmailResponse, InsertEmailVariables>(
            'InsertEmailNoAccess',
            { id: generateEmailId() },
            optsUnauthorizedClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
        });
      });

      describe('with authenticated anonymous impersonation', () => {
        it('should successfully execute a mutation with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailPublic',
              { id: generateEmailId() },
              optsAuthorizedFredAnonClaims
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailUserAnon',
              { id: generateEmailId() },
              optsAuthorizedFredAnonClaims
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should fail to execute a mutation with @auth(level: USER)', async () => {
          return getDataConnect(connectorConfig).executeMutation<InsertEmailResponse, InsertEmailVariables>(
            'InsertEmailUser',
            { id: generateEmailId() },
            optsAuthorizedFredAnonClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a mutation with @auth(level: USER_EMAIL_VERIFIED)', () => {
          return getDataConnect(connectorConfig).executeMutation<InsertEmailResponse, InsertEmailVariables>(
            'InsertEmailUserEmailVerified',
            { id: generateEmailId() },
            optsAuthorizedFredAnonClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a mutation with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).executeMutation<InsertEmailResponse, InsertEmailVariables>(
            'InsertEmailNoAccess',
            { id: generateEmailId() },
            optsAuthorizedFredAnonClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
        });

        it("should use the impersonated user's auth.uid", async () => {
          const insertResp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailImpersonation',
              { id: generateEmailId() },
              optsAuthorizedFredAnonClaims
            );
          expect(insertResp.data.email_insert.id).to.not.be.undefined;
          const queryResp = await getDataConnect(connectorConfig).executeQuery<GetEmailResponse, GetEmailVariables>(
            'GetEmail',
            { id: insertResp.data.email_insert.id },
            optsAuthorizedFredAnonClaims
          );
          expect(queryResp.data.email.from.id).to.equal(fredUser.id);
        });
      });

      describe('with authenticated user impersonation', () => {
        it('should successfully execute a mutation with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailPublic',
              { id: generateEmailId() },
              optsAuthorizedFredClaims
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should fail to execute a mutation with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailUserAnon',
              { id: generateEmailId() },
              optsAuthorizedFredClaims
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailUser',
              { id: generateEmailId() },
              optsAuthorizedFredClaims
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should fail to execute a mutation with @auth(level: USER_EMAIL_VERIFIED)', () => {
          return getDataConnect(connectorConfig).executeMutation<InsertEmailResponse, InsertEmailVariables>(
            'InsertEmailUserEmailVerified',
            { id: generateEmailId() },
            optsAuthorizedFredClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/unauthenticated');
        });

        it('should fail to execute a mutation with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).executeMutation<InsertEmailResponse, InsertEmailVariables>(
            'InsertEmailNoAccess',
            { id: generateEmailId() },
            optsAuthorizedFredClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
        });

        it("should use the impersonated user's auth.uid", async () => {
          const insertResp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailImpersonation',
              { id: generateEmailId() },
              optsAuthorizedFredClaims
            );
          expect(insertResp.data.email_insert.id).to.not.be.undefined;
          const queryResp = await getDataConnect(connectorConfig).executeQuery<GetEmailResponse, GetEmailVariables>(
            'GetEmail',
            { id: insertResp.data.email_insert.id },
            optsAuthorizedFredClaims
          );
          expect(queryResp.data.email.from.id).to.equal(fredUser.id);
        });
      });

      describe('with authenticated email verified user impersonation', () => {
        it('should successfully execute a mutation with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailPublic',
              { id: generateEmailId() },
              optsAuthorizedFredEmailVerifiedClaims
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailUserAnon',
              { id: generateEmailId() },
              optsAuthorizedFredEmailVerifiedClaims
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailUser',
              { id: generateEmailId() },
              optsAuthorizedFredEmailVerifiedClaims
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER_EMAIL_VERIFIED)', async () => {
          const resp = await  getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailUserEmailVerified',
              { id: generateEmailId() },
              optsAuthorizedFredEmailVerifiedClaims
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should fail to execute a mutation with @auth(level: NO_ACCESS)', async () => {
          return getDataConnect(connectorConfig).executeMutation<InsertEmailResponse, InsertEmailVariables>(
            'InsertEmailNoAccess',
            { id: generateEmailId() },
            optsAuthorizedFredEmailVerifiedClaims
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/permission-denied');
        });

        it("should use the impersonated user's auth.uid", async () => {
          const insertResp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailImpersonation',
              { id: generateEmailId() },
              optsAuthorizedFredEmailVerifiedClaims
            );
          expect(insertResp.data.email_insert.id).to.not.be.undefined;
          const queryResp = await getDataConnect(connectorConfig).executeQuery<GetEmailResponse, GetEmailVariables>(
            'GetEmail',
            { id: insertResp.data.email_insert.id },
            optsAuthorizedFredEmailVerifiedClaims
          );
          expect(queryResp.data.email.from.id).to.equal(fredUser.id);
        });
      });

      describe('with no impersonation, bypassing auth policies', () => {
        it('should successfully execute a mutation with @auth(level: PUBLIC)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailPublic',
              { id: generateEmailId() }
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER_ANON)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailUserAnon',
              { id: generateEmailId() }
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER)', async () => {
          const resp = await getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailUser',
              { id: generateEmailId() }
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should successfully execute a mutation with @auth(level: USER_EMAIL_VERIFIED)', async () => {
          const resp = await  getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailUserEmailVerified',
              { id: generateEmailId() }
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it('should successfully execute a mutation with @auth(level: NO_ACCESS)', async () => {
          const resp = await  getDataConnect(connectorConfig)
            .executeMutation<InsertEmailResponse, InsertEmailVariables>(
              'InsertEmailNoAccess',
              { id: generateEmailId() }
            );
          expect(resp.data.email_insert.id).to.not.be.undefined;
        });

        it("should fail to execute a mutation using the impersonated user's auth.uid", async () => {
          return getDataConnect(connectorConfig).executeMutation<InsertEmailResponse, InsertEmailVariables>(
            'InsertEmailImpersonation',
            { id: generateEmailId() },
          ).should.eventually.be.rejected.and.have.property('code', 'data-connect/query-error');
        });
      });
    });
  });
});
