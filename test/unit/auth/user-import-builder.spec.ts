/*!
 * Copyright 2018 Google Inc.
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
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import { deepCopy } from '../../../src/utils/deep-copy';
import {
  UserImportBuilder, ValidatorFunction, UploadAccountRequest,
} from '../../../src/auth/user-import-builder';
import { AuthClientErrorCode, FirebaseAuthError } from '../../../src/utils/error';
import { toWebSafeBase64 } from '../../../src/utils';
import { auth } from '../../../src/auth/index';

import UpdatePhoneMultiFactorInfoRequest = auth.UpdatePhoneMultiFactorInfoRequest;
import UserImportResult = auth.UserImportResult;
import UserImportRecord = auth.UserImportRecord;

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

export function expectUserImportResult(result: UserImportResult, expected: UserImportResult): void {
  expect(result.successCount).to.equal(expected.successCount);
  expect(result.failureCount).to.equal(expected.failureCount);
  expect(result.errors.length).to.equal(expected.errors.length);
  result.errors.forEach((err, idx) => {
    const want = expected.errors[idx];
    expect(err.index).to.equal(want.index);
    expect(err.error).to.deep.include(want.error);
  });
}

describe('UserImportBuilder', () => {
  const now = new Date('2019-10-25T04:30:52.000Z');
  const nowString = now.toUTCString();
  const userRequestValidator: ValidatorFunction = () => {
    // Do not throw an error.
  };
  const userRequestValidatorWithError: ValidatorFunction = (request) => {
    // Simulate a validation error is thrown for a specific user.
    if (request.localId === '5678') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_PHONE_NUMBER,
      );
    }
  };
  const users = [
    {
      uid: '1234',
      email: 'user@example.com',
      passwordHash: Buffer.from('password'),
      passwordSalt: Buffer.from('salt'),
      displayName: 'Test User',
      photoURL: 'https://www.example.com/1234/photo.png',
      disabled: true,
      metadata: {
        lastSignInTime: nowString,
        creationTime: nowString,
      },
      providerData: [
        {
          uid: 'google1234',
          email: 'user@example.com',
          photoURL: 'https://www.google.com/1234/photo.png',
          displayName: 'Google User',
          providerId: 'google.com',
        },
      ],
      customClaims: { admin: true },
      tenantId: 'TENANT-ID',
    },
    {
      uid: '9012',
      email: 'johndoe@example.com',
      passwordHash: Buffer.from('userpass'),
      passwordSalt: Buffer.from('NaCl'),
    },
    { uid: '5678', phoneNumber: '+16505550101' },
    {
      uid: '3456',
      email: 'janedoe@example.com',
      passwordHash: Buffer.from('password'),
      passwordSalt: Buffer.from('NaCl'),
      multiFactor: {
        enrolledFactors: [
          {
            uid: 'enrolledSecondFactor1',
            phoneNumber: '+16505557348',
            displayName: 'Spouse\'s phone number',
            factorId: 'phone',
            enrollmentTime: now.toUTCString(),
          },
          {
            uid: 'enrolledSecondFactor2',
            phoneNumber: '+16505551000',
            factorId: 'phone',
          },
        ],
      },
    },
  ];
  const expectedUsersRequest = [
    {
      localId: '1234',
      email: 'user@example.com',
      passwordHash: toWebSafeBase64(Buffer.from('password')),
      salt: toWebSafeBase64(Buffer.from('salt')),
      displayName: 'Test User',
      photoUrl: 'https://www.example.com/1234/photo.png',
      disabled: true,
      lastLoginAt: new Date(nowString).getTime(),
      createdAt: new Date(nowString).getTime(),
      providerUserInfo: [
        {
          rawId: 'google1234',
          email: 'user@example.com',
          photoUrl: 'https://www.google.com/1234/photo.png',
          displayName: 'Google User',
          providerId: 'google.com',
        },
      ],
      customAttributes: JSON.stringify({ admin: true }),
      tenantId: 'TENANT-ID',
    },
    {
      localId: '9012',
      email: 'johndoe@example.com',
      passwordHash: toWebSafeBase64(Buffer.from('userpass')),
      salt: toWebSafeBase64(Buffer.from('NaCl')),
    },
    {
      localId: '5678',
      phoneNumber: '+16505550101',
    },
    {
      localId: '3456',
      email: 'janedoe@example.com',
      passwordHash: toWebSafeBase64(Buffer.from('password')),
      salt: toWebSafeBase64(Buffer.from('NaCl')),
      mfaInfo: [
        {
          mfaEnrollmentId: 'enrolledSecondFactor1',
          phoneInfo: '+16505557348',
          displayName: 'Spouse\'s phone number',
          enrolledAt: now.toISOString(),
        },
        {
          mfaEnrollmentId: 'enrolledSecondFactor2',
          phoneInfo: '+16505551000',
        },
      ],
    },
  ];

  const hmacAlgorithms = ['HMAC_SHA512', 'HMAC_SHA256', 'HMAC_SHA1', 'HMAC_MD5'];
  const md5ShaPbkdfAlgorithms = [
    'MD5', 'SHA1', 'SHA256', 'SHA512', 'PBKDF_SHA1', 'PBKDF2_SHA256',
  ];
  describe('constructor', () =>  {
    const invalidUserImportOptions = [10, 'invalid', undefined, null, true, ['a']];
    invalidUserImportOptions.forEach((invalidOption) => {
      it(`should throw when non-object ${JSON.stringify(invalidOption)} UserImportOptions is provided`, () => {
        const expectedError = new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          '"UserImportOptions" are required when importing users with passwords.',
        );
        expect(() =>  {
          return new UserImportBuilder(users, invalidOption as any, userRequestValidator);
        }).to.throw(expectedError.message);
      });
    });

    it('should throw when an empty hash algorithm is provided', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.MISSING_HASH_ALGORITHM,
        '"hash.algorithm" is missing from the provided "UserImportOptions".',
      );
      expect(() =>  {
        return new UserImportBuilder(users, {} as any, userRequestValidator);
      }).to.throw(expectedError.message);
    });

    it('should throw when an invalid hash algorithm is provided', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_HASH_ALGORITHM,
        'Unsupported hash algorithm provider "invalid".',
      );
      const invalidOptions = {
        hash: {
          algorithm: 'invalid',
        },
      };
      expect(() =>  {
        return new UserImportBuilder(users, invalidOptions as any, userRequestValidator);
      }).to.throw(expectedError.message);
    });

    it('should not throw when no hash options are provided and no hashing is needed', () => {
      const noHashUsers = [
        { uid: '1234', email: 'user@example.com' },
        { uid: '5678', phoneNumber: '+16505550101' },
      ];
      expect(() =>  {
        return new UserImportBuilder(noHashUsers, undefined, userRequestValidator);
      }).not.to.throw();
    });

    hmacAlgorithms.forEach((algorithm) => {
      describe(`${algorithm}`, () => {
        const invalidKeys = [10, 'invalid', undefined, null];
        invalidKeys.forEach((key) => {
          it(`should throw when non-Buffer ${JSON.stringify(key)} hash key is provided`, () => {
            const expectedError = new FirebaseAuthError(
              AuthClientErrorCode.INVALID_HASH_KEY,
              'A non-empty "hash.key" byte buffer must be provided for ' +
              `hash algorithm ${algorithm}.`,
            );
            const invalidOptions = {
              hash: {
                algorithm,
                key,
              },
            };
            expect(() =>  {
              return new UserImportBuilder(users, invalidOptions as any, userRequestValidator);
            }).to.throw(expectedError.message);
          });
        });

        it('should not throw with valid options and should generate expected request', () => {
          const validOptions = {
            hash: {
              algorithm,
              key: Buffer.from('secret'),
            },
          };
          const expectedRequest = {
            hashAlgorithm: algorithm,
            signerKey: toWebSafeBase64(Buffer.from('secret')),
            users: expectedUsersRequest,
          };
          const userImportBuilder =
              new UserImportBuilder(users, validOptions as any, userRequestValidator);
          expect(userImportBuilder.buildRequest()).to.deep.equal(expectedRequest);
        });
      });
    });

    md5ShaPbkdfAlgorithms.forEach((algorithm) => {
      describe(`${algorithm}`, () => {
        let minRounds: number;
        let maxRounds: number;
        switch (algorithm) {
        case 'MD5':
          minRounds = 0;
          maxRounds = 8192;
          break;
        case 'SHA1':
        case 'SHA256':
        case 'SHA512':
          minRounds = 1;
          maxRounds = 8192;
          break;
        case 'PBKDF_SHA1':
        case 'PBKDF2_SHA256':
          minRounds = 0;
          maxRounds = 120000;
          break;
        default:
          throw new Error('Unexpected algorithm: ' + algorithm);
        }
        const invalidRounds = [minRounds - 1, maxRounds + 1, 'invalid', undefined, null];

        invalidRounds.forEach((rounds) => {
          it(`should throw when ${JSON.stringify(rounds)} rounds provided`, () => {
            const expectedError = new FirebaseAuthError(
              AuthClientErrorCode.INVALID_HASH_ROUNDS,
              `A valid "hash.rounds" number between ${minRounds} and ${maxRounds} must be provided for ` +
              `hash algorithm ${algorithm}.`,
            );
            const invalidOptions = {
              hash: {
                algorithm,
                rounds,
              },
            };
            expect(() =>  {
              return new UserImportBuilder(users, invalidOptions as any, userRequestValidator);
            }).to.throw(expectedError.message);
          });
        });

        it('should not throw with valid options and should generate expected request', () => {
          const validOptions = {
            hash: {
              algorithm,
              rounds: maxRounds,
            },
          };
          const expectedRequest = {
            hashAlgorithm: algorithm,
            rounds: maxRounds,
            users: expectedUsersRequest,
          };
          const userImportBuilder =
              new UserImportBuilder(users, validOptions as any, userRequestValidator);
          expect(userImportBuilder.buildRequest()).to.deep.equal(expectedRequest);
        });

      });
    });

    describe('SCRYPT', () => {
      const algorithm = 'SCRYPT';
      const invalidKeys = [10, 'invalid', undefined, null];
      const invalidRounds = [0, 9, 'invalid', undefined, null];
      const invalidMemoryCost = [0, 15, 'invalid', undefined, null];
      const invalidSaltSeparator = [10, 'invalid'];
      invalidKeys.forEach((key) => {
        it(`should throw when ${JSON.stringify(key)} key provided`, () => {
          const expectedError = new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_KEY,
            'A "hash.key" byte buffer must be provided for ' +
            `hash algorithm ${algorithm}.`,
          );
          const invalidOptions = {
            hash: {
              algorithm,
              key,
              rounds: 5,
              memoryCost: 12,
            },
          };
          expect(() =>  {
            return new UserImportBuilder(users, invalidOptions as any, userRequestValidator);
          }).to.throw(expectedError.message);
        });
      });

      invalidRounds.forEach((rounds) => {
        it(`should throw when ${JSON.stringify(rounds)} rounds provided`, () => {
          const expectedError = new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_ROUNDS,
            'A valid "hash.rounds" number between 1 and 8 must be provided for ' +
            `hash algorithm ${algorithm}.`,
          );
          const invalidOptions = {
            hash: {
              algorithm,
              key: Buffer.from('secret'),
              rounds,
              memoryCost: 12,
            },
          };
          expect(() =>  {
            return new UserImportBuilder(users, invalidOptions as any, userRequestValidator);
          }).to.throw(expectedError.message);
        });
      });

      invalidMemoryCost.forEach((memoryCost) => {
        it(`should throw when ${JSON.stringify(memoryCost)} memoryCost provided`, () => {
          const expectedError = new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_MEMORY_COST,
            'A valid "hash.memoryCost" number between 1 and 14 must be provided for ' +
            `hash algorithm ${algorithm}.`,
          );
          const invalidOptions = {
            hash: {
              algorithm,
              key: Buffer.from('secret'),
              rounds: 4,
              memoryCost,
            },
          };
          expect(() =>  {
            return new UserImportBuilder(users, invalidOptions as any, userRequestValidator);
          }).to.throw(expectedError.message);
        });
      });

      invalidSaltSeparator.forEach((saltSeparator) => {
        it(`should throw when ${JSON.stringify(saltSeparator)} saltSeparator provided`, () => {
          const expectedError = new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_SALT_SEPARATOR,
            '"hash.saltSeparator" must be a byte buffer.',
          );
          const invalidOptions = {
            hash: {
              algorithm,
              key: Buffer.from('secret'),
              rounds: 4,
              memoryCost: 12,
              saltSeparator,
            },
          };
          expect(() =>  {
            return new UserImportBuilder(users, invalidOptions as any, userRequestValidator);
          }).to.throw(expectedError.message);
        });
      });

      it('should not throw with valid options and should generate expected request', () => {
        const validOptions = {
          hash: {
            algorithm,
            key: Buffer.from('secret'),
            rounds: 4,
            memoryCost: 12,
          },
        };
        const expectedRequest = {
          hashAlgorithm: algorithm,
          signerKey: toWebSafeBase64(Buffer.from('secret')),
          rounds: 4,
          memoryCost: 12,
          users: expectedUsersRequest,
          saltSeparator: '',
        };
        const userImportBuilder =
            new UserImportBuilder(users, validOptions as any, userRequestValidator);
        expect(userImportBuilder.buildRequest()).to.deep.equal(expectedRequest);
      });
    });

    describe('BCRYPT', () => {
      const algorithm = 'BCRYPT';
      it('should not throw with valid options and should generate expected request', () => {
        const validOptions = {
          hash: {
            algorithm,
          },
        };
        const expectedRequest = {
          hashAlgorithm: algorithm,
          users: expectedUsersRequest,
        };
        const userImportBuilder =
            new UserImportBuilder(users, validOptions as any, userRequestValidator);
        expect(userImportBuilder.buildRequest()).to.deep.equal(expectedRequest);
      });
    });

    describe('STANDARD_SCRYPT', () => {
      const algorithm = 'STANDARD_SCRYPT';
      const invalidMemoryCost = [false, {}, 'invalid', undefined, null];
      const invalidParallelization = [false, {}, 'invalid', undefined, null];
      const invalidBlockSize = [false, {}, 'invalid', undefined, null];
      const invalidDerivedKeyLength = [false, {}, 'invalid', undefined, null];
      invalidMemoryCost.forEach((memoryCost) => {
        it(`should throw when ${JSON.stringify(memoryCost)} memoryCost provided`, () => {
          const expectedError = new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_MEMORY_COST,
            'A valid "hash.memoryCost" number must be provided for ' +
            `hash algorithm ${algorithm}.`,
          );
          const invalidOptions = {
            hash: {
              algorithm,
              memoryCost,
              parallelization: 16,
              blockSize: 8,
              derivedKeyLength: 64,
            },
          };
          expect(() =>  {
            return new UserImportBuilder(users, invalidOptions as any, userRequestValidator);
          }).to.throw(expectedError.message);
        });
      });

      invalidParallelization.forEach((parallelization) => {
        it(`should throw when ${JSON.stringify(parallelization)} parallelization provided`, () => {
          const expectedError = new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_MEMORY_COST,
            'A valid "hash.parallelization" number must be provided for ' +
            `hash algorithm ${algorithm}.`,
          );
          const invalidOptions = {
            hash: {
              algorithm,
              memoryCost : 1024,
              parallelization,
              blockSize: 8,
              derivedKeyLength: 64,
            },
          };
          expect(() =>  {
            return new UserImportBuilder(users, invalidOptions as any, userRequestValidator);
          }).to.throw(expectedError.message);
        });
      });

      invalidBlockSize.forEach((blockSize) => {
        it(`should throw when ${JSON.stringify(blockSize)} blockSize provided`, () => {
          const expectedError = new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_BLOCK_SIZE,
            'A valid "hash.blockSize" number must be provided for ' +
            `hash algorithm ${algorithm}.`,
          );
          const invalidOptions = {
            hash: {
              algorithm,
              memoryCost : 1024,
              parallelization: 16,
              blockSize,
              derivedKeyLength: 64,
            },
          };
          expect(() =>  {
            return new UserImportBuilder(users, invalidOptions as any, userRequestValidator);
          }).to.throw(expectedError.message);
        });
      });

      invalidDerivedKeyLength.forEach((derivedKeyLength) => {
        it(`should throw when ${JSON.stringify(derivedKeyLength)} dkLen provided`, () => {
          const expectedError = new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_DERIVED_KEY_LENGTH,
            'A valid "hash.derivedKeyLength" number must be provided for ' +
            `hash algorithm ${algorithm}.`,
          );
          const invalidOptions = {
            hash: {
              algorithm,
              memoryCost : 1024,
              parallelization: 16,
              blockSize: 8,
              derivedKeyLength,
            },
          };
          expect(() =>  {
            return new UserImportBuilder(users, invalidOptions as any, userRequestValidator);
          }).to.throw(expectedError.message);
        });
      });

      it('should not throw with valid options and should generate expected request', () => {
        const validOptions = {
          hash: {
            algorithm,
            memoryCost : 1024,
            parallelization: 16,
            blockSize: 8,
            derivedKeyLength: 64,
          },
        };
        const expectedRequest = {
          hashAlgorithm: algorithm,
          cpuMemCost: 1024,
          parallelization: 16,
          blockSize: 8,
          dkLen: 64,
          users: expectedUsersRequest,
        };
        const userImportBuilder =
            new UserImportBuilder(users, validOptions as any, userRequestValidator);
        expect(userImportBuilder.buildRequest()).to.deep.equal(expectedRequest);
      });

    });
  });

  describe('buildRequest()', () => {
    const algorithm = 'BCRYPT';
    const validOptions = {
      hash: {
        algorithm,
      },
    };

    it('should return the expected request when no client side error is detected', () => {
      const expectedRequest = {
        hashAlgorithm: algorithm,
        users: expectedUsersRequest,
      };
      const userImportBuilder =
          new UserImportBuilder(users, validOptions as any, userRequestValidator);
      expect(userImportBuilder.buildRequest()).to.deep.equal(expectedRequest);
    });

    it('should return the expected request when client side errors are detected', () => {
      const testUsers = deepCopy(users);
      // Pass 2 more users with invalid passwordHash and invalid passwordSalt.
      testUsers.push(
        {
          uid: 'INVALID1',
          email: 'johndoe@example.com',
          passwordHash: Buffer.from('password'),
          passwordSalt: 'not a buffer',
        } as any,
      );
      testUsers.push(
        { uid: 'INVALID2', email: 'other@domain.com', passwordHash: 'not a buffer' } as any,
      );
      const expectedRequest = {
        hashAlgorithm: algorithm,
        // The third user will be removed due to client side error.
        users: [
          expectedUsersRequest[0], expectedUsersRequest[1], expectedUsersRequest[3],
        ],
      };
      const userImportBuilder =
          new UserImportBuilder(users, validOptions as any, userRequestValidatorWithError);
      expect(userImportBuilder.buildRequest()).to.deep.equal(expectedRequest);
    });

    it('should return expected request with no hash options when not required', () => {
      const noHashUsers = [
        { uid: '1234', email: 'user@example.com' },
        { uid: '5678', phoneNumber: '+16505550101' },
      ];
      const expectedRequest = {
        users: [
          { localId: '1234', email: 'user@example.com' },
          { localId: '5678', phoneNumber: '+16505550101' },
        ],
      };
      const userImportBuilder =
          new UserImportBuilder(noHashUsers, validOptions as any, userRequestValidator);
      expect(userImportBuilder.buildRequest()).to.deep.equal(expectedRequest);
    });

    it('should return expected request with no multi-factor fields when not available', () => {
      const noMultiFactorUsers: any[] = [
        { uid: '1234', email: 'user@example.com', multiFactor: null },
        { uid: '5678', phoneNumber: '+16505550101', multiFactor: { enrolledFactors: [] } },
      ];
      const expectedRequest = {
        users: [
          { localId: '1234', email: 'user@example.com' },
          { localId: '5678', phoneNumber: '+16505550101' },
        ],
      };
      const userImportBuilder =
          new UserImportBuilder(noMultiFactorUsers, validOptions as any, userRequestValidator);
      expect(userImportBuilder.buildRequest()).to.deep.equal(expectedRequest);
    });

    it('should ignore users with invalid second factor enrollment time', () => {
      const phoneFactor: UpdatePhoneMultiFactorInfoRequest = {
        uid: 'enrolledSecondFactor1',
        phoneNumber: '+16505557348',
        displayName: 'Spouse\'s phone number',
        factorId: 'phone',
        enrollmentTime: 'invalid',
      };
      const invalidMultiFactorUsers: UserImportRecord[] = [
        {
          uid: '1234',
          multiFactor: {
            enrolledFactors: [ phoneFactor ],
          },
        },
        { uid: '5678', phoneNumber: '+16505550102' },
      ];
      const expectedRequest: UploadAccountRequest = {
        users: [
          { localId: '5678', phoneNumber: '+16505550102' },
        ],
      };
      const userImportBuilder =
          new UserImportBuilder(invalidMultiFactorUsers, validOptions as any, userRequestValidator);
      expect(userImportBuilder.buildRequest()).to.deep.equal(expectedRequest);
    });

    it('should ignore users with unsupported second factors', () => {
      const invalidMultiFactorUsers: any = [
        {
          uid: '1234',
          multiFactor: {
            enrolledFactors: [
              {
                uid: 'enrolledSecondFactor1',
                secret: 'SECRET',
                displayName: 'Google Authenticator on personal phone',
                factorId: 'totp',
              },
            ],
          },
        },
        { uid: '5678', phoneNumber: '+16505550102' },
      ];
      const expectedRequest: UploadAccountRequest = {
        users: [
          { localId: '5678', phoneNumber: '+16505550102' },
        ],
      };
      const userImportBuilder =
          new UserImportBuilder(invalidMultiFactorUsers, validOptions as any, userRequestValidator);
      expect(userImportBuilder.buildRequest()).to.deep.equal(expectedRequest);
    });
  });

  describe('buildResponse()', () => {
    const algorithm = 'BCRYPT';
    const validOptions = {
      hash: {
        algorithm,
      },
    };

    it('should return the expected response for successful import', () => {
      const successfulServerResponse: any = [];
      const successfulUserImportResponse: UserImportResult = {
        successCount: 4,
        failureCount: 0,
        errors: [],
      };
      const userImportBuilder =
          new UserImportBuilder(users, validOptions as any, userRequestValidator);
      expectUserImportResult(
        userImportBuilder.buildResponse(successfulServerResponse),
        successfulUserImportResponse);
    });

    it('should return the expected response for import with server side errors', () => {
      const failingServerResponse = [
        { index: 1, message: 'Some error occurred!' },
      ];
      const serverErrorUserImportResponse = {
        successCount: 3,
        failureCount: 1,
        errors: [
          {
            // Index should match server error index.
            index: 1,
            error: new FirebaseAuthError(
              AuthClientErrorCode.INVALID_USER_IMPORT,
              'Some error occurred!',
            ),
          },
        ],
      };
      const userImportBuilder =
          new UserImportBuilder(users, validOptions as any, userRequestValidator);
      expectUserImportResult(
        userImportBuilder.buildResponse(failingServerResponse),
        serverErrorUserImportResponse);
    });

    it('should return the expected response for import with client side errors', () => {
      const successfulServerResponse: any = [];
      const clientErrorUserImportResponse = {
        successCount: 3,
        failureCount: 1,
        errors: [
          { index: 2, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER) },
        ],
      };
      // userRequestValidatorWithError will throw on the 3rd user (index = 2).
      const userImportBuilder =
          new UserImportBuilder(users, validOptions as any, userRequestValidatorWithError);
      expectUserImportResult(
        userImportBuilder.buildResponse(successfulServerResponse),
        clientErrorUserImportResponse);
    });

    it('should return the expected response for import with mixed client/server errors', () => {
      // Server errors will occur on USER3 and USER6 passed to backend.
      const failingServerResponse = [
        { index: 1, message: 'Some error occurred in USER3!' },
        { index: 3, message: 'Another error occurred in USER6!' },
      ];
      const userRequestValidatorWithMultipleErrors: ValidatorFunction = (request) => {
        // Simulate a validation error is thrown for specific users.
        if (request.localId === 'USER2') {
          throw new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL);
        } else if (request.localId === 'USER4') {
          throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER);
        }
      };

      // The second and fourth users will throw a client side error.
      // The third and sixth user will throw a server side error.
      // Seventh, eighth and nineth user will throw a client side error due to invalid type provided.
      // Tenth user will throw a client side error due to an unsupported second factor.
      const testUsers = [
        { uid: 'USER1' },
        { uid: 'USER2', email: 'invalid', passwordHash: Buffer.from('userpass') },
        { uid: 'USER3' },
        { uid: 'USER4', email: 'user@example.com', phoneNumber: 'invalid' },
        { uid: 'USER5', email: 'johndoe@example.com', passwordHash: Buffer.from('password') },
        { uid: 'USER6', phoneNumber: '+16505550101' },
        { uid: 'USER7', email: 'other@domain.com', passwordHash: 'not a buffer' as any },
        {
          uid: 'USER8',
          email: 'other@domain.com',
          passwordHash: Buffer.from('password'),
          passwordSalt: 'not a buffer' as any,
        },
        {
          uid: 'USER9',
          multiFactor: {
            enrolledFactors: [
              {
                uid: 'enrollmentId1',
                phoneNumber: '+16505551111',
                factorId: 'phone',
                enrollmentTime: 'invalid',
              },
            ],
          },
        },
        {
          uid: 'USER10',
          multiFactor: {
            enrolledFactors: [
              {
                uid: 'enrollmentId2',
                secret: 'SECRET',
                displayName: 'Google Authenticator on personal phone',
                factorId: 'totp',
              } as any,
            ],
          },
        },
      ];
      const mixedErrorUserImportResponse = {
        successCount: 2,
        failureCount: 8,
        errors: [
          // Client side detected error.
          { index: 1, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL) },
          // Server side detected error.
          {
            index: 2,
            error: new FirebaseAuthError(
              AuthClientErrorCode.INVALID_USER_IMPORT,
              'Some error occurred in USER3!',
            ),
          },
          // Client side detected error.
          { index: 3, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER) },
          // Server side detected error.
          {
            index: 5,
            error: new FirebaseAuthError(
              AuthClientErrorCode.INVALID_USER_IMPORT,
              'Another error occurred in USER6!',
            ),
          },
          // Client side errors.
          { index: 6, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_PASSWORD_HASH) },
          { index: 7, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_PASSWORD_SALT) },
          {
            index: 8,
            error: new FirebaseAuthError(
              AuthClientErrorCode.INVALID_ENROLLMENT_TIME,
              'The second factor "enrollmentTime" for "enrollmentId1" must be a valid ' +
              'UTC date string.'),
          },
          {
            index: 9,
            error: new FirebaseAuthError(
              AuthClientErrorCode.UNSUPPORTED_SECOND_FACTOR,
              `Unsupported second factor "${JSON.stringify(testUsers[9].multiFactor!.enrolledFactors[0])}" provided.`),
          },
        ],
      };
      const userImportBuilder = new UserImportBuilder(
        testUsers, validOptions as any, userRequestValidatorWithMultipleErrors);
      expectUserImportResult(
        userImportBuilder.buildResponse(failingServerResponse),
        mixedErrorUserImportResponse);
    });
  });
});
