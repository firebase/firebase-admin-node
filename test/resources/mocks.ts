/*!
 * @license
 * Copyright 2017 Google Inc.
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

'use strict';

// Use untyped import syntax for Node built-ins.
import path = require('path');
import events = require('events');
import stream = require('stream');

import * as _ from 'lodash';
import * as jwt from 'jsonwebtoken';

import { AppOptions } from '../../src/firebase-namespace-api';
import { FirebaseNamespace } from '../../src/firebase-namespace';
import { FirebaseServiceInterface } from '../../src/firebase-service';
import { FirebaseApp } from '../../src/firebase-app';
import { app as _app } from '../../src/firebase-namespace-api';
import { credential as _credential, GoogleOAuthAccessToken } from '../../src/credential/index';
import { ServiceAccountCredential } from '../../src/credential/credential-internal';

const ALGORITHM = 'RS256' as const;
const ONE_HOUR_IN_SECONDS = 60 * 60;

export const uid = 'someUid';
export const projectId = 'project_id';
export const developerClaims = {
  one: 'uno',
  two: 'dos',
};

export const appName = 'mock-app-name';

export const serviceName = 'mock-service-name';

export const databaseURL = 'https://databaseName.firebaseio.com';

export const databaseAuthVariableOverride = { 'some#string': 'some#val' };

export const storageBucket = 'bucketName.appspot.com';

export const credential = new ServiceAccountCredential(path.resolve(__dirname, './mock.key.json'));

export const appOptions: AppOptions = {
  credential,
  databaseURL,
  storageBucket,
};

export const appOptionsWithOverride: AppOptions = {
  credential,
  databaseAuthVariableOverride,
  databaseURL,
  storageBucket,
  projectId,
};

export const appOptionsNoAuth: AppOptions = {
  databaseURL,
};

export const appOptionsNoDatabaseUrl: AppOptions = {
  credential,
};

export const appOptionsAuthDB: AppOptions = {
  credential,
  databaseURL,
};

export class MockCredential implements _credential.Credential {
  public getAccessToken(): Promise<GoogleOAuthAccessToken> {
    return Promise.resolve({
      access_token: 'mock-token', // eslint-disable-line @typescript-eslint/camelcase
      expires_in: 3600, // eslint-disable-line @typescript-eslint/camelcase
    });
  }
}

export function app(): FirebaseApp {
  const namespaceInternals = new FirebaseNamespace().INTERNAL;
  namespaceInternals.removeApp = _.noop;
  return new FirebaseApp(appOptions, appName, namespaceInternals);
}

export function mockCredentialApp(): FirebaseApp {
  return new FirebaseApp({
    credential: new MockCredential(),
    databaseURL,
  }, appName, new FirebaseNamespace().INTERNAL);
}

export function appWithOptions(options: AppOptions): FirebaseApp {
  const namespaceInternals = new FirebaseNamespace().INTERNAL;
  namespaceInternals.removeApp = _.noop;
  return new FirebaseApp(options, appName, namespaceInternals);
}

export function appReturningNullAccessToken(): FirebaseApp {
  const nullFn: () => Promise<GoogleOAuthAccessToken> | null = () => null;
  return new FirebaseApp({
    credential: {
      getAccessToken: nullFn,
    } as any,
    databaseURL,
    projectId,
  }, appName, new FirebaseNamespace().INTERNAL);
}

export function appReturningMalformedAccessToken(): FirebaseApp {
  return new FirebaseApp({
    credential: {
      getAccessToken: () => 5,
    } as any,
    databaseURL,
    projectId,
  }, appName, new FirebaseNamespace().INTERNAL);
}

export function appRejectedWhileFetchingAccessToken(): FirebaseApp {
  return new FirebaseApp({
    credential: {
      getAccessToken: () => Promise.reject(new Error('Promise intentionally rejected.')),
    } as any,
    databaseURL,
    projectId,
  }, appName, new FirebaseNamespace().INTERNAL);
}

export const refreshToken = {
  clientId: 'mock-client-id',
  clientSecret: 'mock-client-secret',
  refreshToken: 'mock-refresh-token',
  type: 'refreshToken',
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const certificateObject = require('./mock.key.json');

// Randomly generated key pairs that don't correspond to anything related to Firebase or GCP
export const keyPairs = [
  /* eslint-disable max-len */
  // The private key for this key pair is identical to the one used in ./mock.key.json
  {
    public: '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAwJENcRev+eXZKvhhWLiV3Lz2MvO+naQRHo59g3vaNQnbgyduN/L4krlrJ5c6\nFiikXdtJNb/QrsAHSyJWCu8j3T9CruiwbidGAk2W0RuViTVspjHUTsIHExx9euWM0UomGvYk\noqXahdhPL/zViVSJt+Rt8bHLsMvpb8RquTIb9iKY3SMV2tCofNmyCSgVbghq/y7lKORtV/IR\nguWs6R22fbkb0r2MCYoNAbZ9dqnbRIFNZBC7itYtUoTEresRWcyFMh0zfAIJycWOJlVLDLqk\nY2SmIx8u7fuysCg1wcoSZoStuDq02nZEMw1dx8HGzE0hynpHlloRLByuIuOAfMCCYwIDAQAB\n-----END RSA PUBLIC KEY-----\n',
    private: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAwJENcRev+eXZKvhhWLiV3Lz2MvO+naQRHo59g3vaNQnbgyduN/L4krlr\nJ5c6FiikXdtJNb/QrsAHSyJWCu8j3T9CruiwbidGAk2W0RuViTVspjHUTsIHExx9euWM0Uom\nGvYkoqXahdhPL/zViVSJt+Rt8bHLsMvpb8RquTIb9iKY3SMV2tCofNmyCSgVbghq/y7lKORt\nV/IRguWs6R22fbkb0r2MCYoNAbZ9dqnbRIFNZBC7itYtUoTEresRWcyFMh0zfAIJycWOJlVL\nDLqkY2SmIx8u7fuysCg1wcoSZoStuDq02nZEMw1dx8HGzE0hynpHlloRLByuIuOAfMCCYwID\nAQABAoIBADFtihu7TspAO0wSUTpqttzgC/nsIsNn95T2UjVLtyjiDNxPZLUrwq42tdCFur0x\nVW9Z+CK5x6DzXWvltlw8IeKKeF1ZEOBVaFzy+YFXKTz835SROcO1fgdjyrme7lRSShGlmKW/\nGKY+baUNquoDLw5qreXaE0SgMp0jt5ktyYuVxvhLDeV4omw2u6waoGkifsGm8lYivg5l3VR7\nw2IVOvYZTt4BuSYVwOM+qjwaS1vtL7gv0SUjrj85Ja6zERRdFiITDhZw6nsvacr9/+/aut9E\naL/koSSb62g5fntQMEwoT4hRnjPnAedmorM9Rhddh2TB3ZKTBbMN1tUk3fJxOuECgYEA+z6l\neSaAcZ3qvwpntcXSpwwJ0SSmzLTH2RJNf+Ld3eBHiSvLTG53dWB7lJtF4R1KcIwf+KGcOFJv\nsnepzcZBylRvT8RrAAkV0s9OiVm1lXZyaepbLg4GGFJBPi8A6VIAj7zYknToRApdW0s1x/XX\nChewfJDckqsevTMovdbg8YkCgYEAxDYX+3mfvv/opo6HNNY3SfVunM+4vVJL+n8gWZ2w9kz3\nQ9Ub9YbRmI7iQaiVkO5xNuoG1n9bM+3Mnm84aQ1YeNT01YqeyQsipP5Wi+um0PzYTaBw9RO+\n8Gh6992OwlJiRtFk5WjalNWOxY4MU0ImnJwIfKQlUODvLmcixm68NYsCgYEAuAqI3jkk55Vd\nKvotREsX5wP7gPePM+7NYiZ1HNQL4Ab1f/bTojZdTV8Sx6YCR0fUiqMqnE+OBvfkGGBtw22S\nLesx6sWf99Ov58+x4Q0U5dpxL0Lb7d2Z+2Dtp+Z4jXFjNeeI4ae/qG/LOR/b0pE0J5F415ap\n7Mpq5v89vepUtrkCgYAjMXytu4v+q1Ikhc4UmRPDrUUQ1WVSd+9u19yKlnFGTFnRjej86hiw\nH3jPxBhHra0a53EgiilmsBGSnWpl1WH4EmJz5vBCKUAmjgQiBrueIqv9iHiaTNdjsanUyaWw\njyxXfXl2eI80QPXh02+8g1H/pzESgjK7Rg1AqnkfVH9nrwKBgQDJVxKBPTw9pigYMVt9iHrR\niCl9zQVjRMbWiPOc0J56+/5FZYm/AOGl9rfhQ9vGxXZYZiOP5FsNkwt05Y1UoAAH4B4VQwbL\nqod71qOcI0ywgZiIR87CYw40gzRfjWnN+YEEW1qfyoNLilEwJB8iB/T+ZePHGmJ4MmQ/cTn9\nxpdLXA==\n-----END RSA PRIVATE KEY-----\n',
  },
  {
    public: '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAzhI/CMRtNO45R0DD4NBXFRDYAjlB/UVGGdMJKbCIrD3Uq7r/ivedqRYUIccO\nqpeYeu9IH9iotkKq8TM0eCJAUr9WT0o5YzpGvaB8ut87xLh8SqK42VmYAvemUjI257LtDbms\nhoqzqt9Yq0sgC05b7L3r2xDTxnefeMUHYBwaerCr8PTBCu7NjK3eIWHGPouEwT46WoUpnoNm\nxdI16CoSMqtuxteG8c14qJbGR9AZujkRDntWOuL1m5KaUIc7XcAaXBt4FiPwoDoQmmCmydVC\njln3YwSrvL60iAQM6pzCxNRrJRWPYd2u7fgjir/W88w5KHOvdbUyemZWnd6SBExHuQIDAQAB\n-----END RSA PUBLIC KEY-----\n',
    private: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAzhI/CMRtNO45R0DD4NBXFRDYAjlB/UVGGdMJKbCIrD3Uq7r/ivedqRYU\nIccOqpeYeu9IH9iotkKq8TM0eCJAUr9WT0o5YzpGvaB8ut87xLh8SqK42VmYAvemUjI257Lt\nDbmshoqzqt9Yq0sgC05b7L3r2xDTxnefeMUHYBwaerCr8PTBCu7NjK3eIWHGPouEwT46WoUp\nnoNmxdI16CoSMqtuxteG8c14qJbGR9AZujkRDntWOuL1m5KaUIc7XcAaXBt4FiPwoDoQmmCm\nydVCjln3YwSrvL60iAQM6pzCxNRrJRWPYd2u7fgjir/W88w5KHOvdbUyemZWnd6SBExHuQID\nAQABAoIBAQDJ9iv9BbYaGBfe82SGIuoV5Uou87ru5EPN73yddTydwoN6Q21L316PZuoYKKUB\nIE36viSrwYWoCzLJ7etQihEMiCWo1A/mZikKlA1qgHptVHnMFCqiKiLHVbuV90zETCH0P7MM\nsUdhAkA+sQQY0JVbMs/DBXzomDic/k06LpDtCBNdjL7UIT5KyFbBqit+cV6H91Ujqg8MmzrU\ntOSw+63oSqZJkT6WPuA/NJNXqtFF+0aOKNX1ttrrTzSDhyp6AxOO7Wm++dpYBtcfnOc3EG65\nul9PfKsJwVZFVO+AAZwdLCeKjtCtWeJc/yXvSj2NTsjs3FKJkRAmmiMp5tH+vbE5AoGBAOhn\nKTXGI+ofA3iggByt2InCU+YIXsw1EbbhH4LGB8yyUA2SIjZybwUMKCkoMxmEumFP/FWgOL2w\nLlClqf9vZg9dBy8bDINJHm+9roYRO0/EhHA6IDSC+0X5BPZOexrBI07HJI7w7Y0WHFU8jK53\n55ps2YGT20n7haRMbbPMrq/3AoGBAOL+pY8bgCnKmeG2inun4FuD+0/aXAySXi70/BAABeHH\npogEfc0jv5SgygTiuC/2T84Jmsg0Y6M2l86srMrMA07xtyMbfRq7zih+K+EDoQ9HAwhDqxX5\nM7E8fPXscDzH2Y361QiGAQpjUcMix3hDV8oK537rYOmCYku18ZsVkjnPAoGAbE1u4fVlVTyA\ntJ0vNq45Q/GAgamS690rVStSMPIyPk02iyx3ryHi5NpGeO+X6KN269SHhiu1ZYiN/N1G/Jeg\nWzaCG4yiZygS/AXMKAQtvL2a7mXYDkCf8nrauiHWsqAg4RxiyA401dPg/kPKV5/fGZLyRbVu\nsup43BkV4n1XRv8CgYAmUIE1dJjfdPkgZiVd1epCyDZFNkBPRu1q06MwODDF+WMcllV9qMkP\nl0xCItqgDd1Ok8RygpVG2VIqam8IFAOC8b3NyTgGqSiVISba5jfrUjsqy/E21kdpZSJaiDwx\npjIMiwgmVigazsTgQSCWJhfNXKXSgHxtLbrVuLI9URjLdQKBgQDProyaG7pspt6uUdqMTa4+\nGVkUg+gIt5aVTf/Lb25K3SHA1baPamtbTDDf6vUjeJtTG+O+RMGqK5mB2MywjVHJdMGcJ44e\nogIh9eWY450oUoVBjEsdUd7Ef5KcpMFDUVFJwzCY371+Loqh2KYAk8WUSRzwGuw2QtLPO/L/\nQkKj4Q==\n-----END RSA PRIVATE KEY-----\n',
  },
  /* eslint-enable max-len */
];

// Randomly generated an X.509 certs using https://www.samltool.com/self_signed_certs.php
export const x509CertPairs = [
  /* eslint-disable max-len */
  {
    public: '-----BEGIN CERTIFICATE-----\nMIICZjCCAc+gAwIBAgIBADANBgkqhkiG9w0BAQ0FADBQMQswCQYDVQQGEwJ1czEL\nMAkGA1UECAwCQ0ExDTALBgNVBAoMBEFjbWUxETAPBgNVBAMMCGFjbWUuY29tMRIw\nEAYDVQQHDAlTdW5ueXZhbGUwHhcNMTgxMjA2MDc1MTUxWhcNMjgxMjAzMDc1MTUx\nWjBQMQswCQYDVQQGEwJ1czELMAkGA1UECAwCQ0ExDTALBgNVBAoMBEFjbWUxETAP\nBgNVBAMMCGFjbWUuY29tMRIwEAYDVQQHDAlTdW5ueXZhbGUwgZ8wDQYJKoZIhvcN\nAQEBBQADgY0AMIGJAoGBAKphmggjiVgqMLXyzvI7cKphscIIQ+wcv7Dld6MD4aKv\n7Jqr8ltujMxBUeY4LFEKw8Terb01snYpDotfilaG6NxpF/GfVVmMalzwWp0mT8+H\nyzyPj89mRcozu17RwuooR6n1ofXjGcBE86lqC21UhA3WVgjPOLqB42rlE9gPnZLB\nAgMBAAGjUDBOMB0GA1UdDgQWBBS0iM7WnbCNOnieOP1HIA+Oz/ML+zAfBgNVHSME\nGDAWgBS0iM7WnbCNOnieOP1HIA+Oz/ML+zAMBgNVHRMEBTADAQH/MA0GCSqGSIb3\nDQEBDQUAA4GBAF3jBgS+wP+K/jTupEQur6iaqS4UvXd//d4vo1MV06oTLQMTz+rP\nOSMDNwxzfaOn6vgYLKP/Dcy9dSTnSzgxLAxfKvDQZA0vE3udsw0Bd245MmX4+GOp\nlbrN99XP1u+lFxCSdMUzvQ/jW4ysw/Nq4JdJ0gPAyPvL6Qi/3mQdIQwx\n-----END CERTIFICATE-----\n',
    private: '-----BEGIN PRIVATE KEY-----\nMIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAKphmggjiVgqMLXy\nzvI7cKphscIIQ+wcv7Dld6MD4aKv7Jqr8ltujMxBUeY4LFEKw8Terb01snYpDotf\nilaG6NxpF/GfVVmMalzwWp0mT8+HyzyPj89mRcozu17RwuooR6n1ofXjGcBE86lq\nC21UhA3WVgjPOLqB42rlE9gPnZLBAgMBAAECgYAwZ7g2FbqAZMQf/RKUORTiIw04\nXdbGLsi6/gZGNuUUrjxfGPiqxzaTFP+qk0zr3U4PEWB0v9uqvDFYoVURDhT7isxm\nH5bc6dxwvBRIy8tLtvxo0jMTotJaBhEHP3YMKxbC7lxo3PV5HLIve5nf9ChOypKp\n4zbP4d1IJjpu8ggrbQJBANoPCrJyXjsDgh8WAEpALAsgM4ugyJwdk8AHJUTy3IeJ\niYYB/RLVpYW8LI1dmqN5NPKbyKE+dsdSiiEpclsocl8CQQDIBt5DbO+tEGr5BGsk\nBi+P3E1M3KVV2eJv+inlgYkYeS/cdd5CJczCDwxeDk8DXsKvmOp0LCHeU2sCKjSy\nF07fAkB86KLjB1ptCZxu/CZcYhgYo3CDai2gJ90r4av6q/eheCqb5eW29UUkr18B\n932OaO7ojk5F90cI9IIFbv1/tFKXAkEAnrXUZWtqQMdmGW+IE21VD7CdJP9tsFDR\nekfkNlYxkVmWwDZFw/Z6IQAPsBFqYCIwF2Qdo0/hD6bgoTcb2LLlwQJATqOMr7yr\neYKLJ+edhwMHx4U5ZIT8l/MjDv4/6L6FgGYVo7gNjjIIsDXUOo3PlBOWe6fxb5+f\ntFlwxZNz+g9ONg==\n-----END PRIVATE KEY-----\n',
  },
  {
    public: '-----BEGIN CERTIFICATE-----\nMIICZjCCAc+gAwIBAgIBADANBgkqhkiG9w0BAQ0FADBQMQswCQYDVQQGEwJ1czEL\nMAkGA1UECAwCQ0ExDTALBgNVBAoMBEFjbWUxETAPBgNVBAMMCGFjbWUuY29tMRIw\nEAYDVQQHDAlTdW5ueXZhbGUwHhcNMTgxMjA2MDc1ODE4WhcNMjgxMjAzMDc1ODE4\nWjBQMQswCQYDVQQGEwJ1czELMAkGA1UECAwCQ0ExDTALBgNVBAoMBEFjbWUxETAP\nBgNVBAMMCGFjbWUuY29tMRIwEAYDVQQHDAlTdW5ueXZhbGUwgZ8wDQYJKoZIhvcN\nAQEBBQADgY0AMIGJAoGBAKuzYKfDZGA6DJgQru3wNUqv+S0hMZfP/jbp8ou/8UKu\nrNeX7cfCgt3yxoGCJYKmF6t5mvo76JY0MWwA53BxeP/oyXmJ93uHG5mFRAsVAUKs\ncVVb0Xi6ujxZGVdDWFV696L0BNOoHTfXmac6IBoZQzNNK4n1AATqwo+z7a0pfRrJ\nAgMBAAGjUDBOMB0GA1UdDgQWBBSKmi/ZKMuLN0ES7/jPa7q7jAjPiDAfBgNVHSME\nGDAWgBSKmi/ZKMuLN0ES7/jPa7q7jAjPiDAMBgNVHRMEBTADAQH/MA0GCSqGSIb3\nDQEBDQUAA4GBAAg2a2kSn05NiUOuWOHwPUjW3wQRsGxPXtbhWMhmNdCfKKteM2+/\nLd/jz5F3qkOgGQ3UDgr3SHEoWhnLaJMF4a2tm6vL2rEIfPEK81KhTTRxSsAgMVbU\nJXBz1md6Ur0HlgQC7d1CHC8/xi2DDwHopLyxhogaZUxy9IaRxUEa2vJW\n-----END CERTIFICATE-----\n',
    private: '-----BEGIN PRIVATE KEY-----\nMIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAKuzYKfDZGA6DJgQ\nru3wNUqv+S0hMZfP/jbp8ou/8UKurNeX7cfCgt3yxoGCJYKmF6t5mvo76JY0MWwA\n53BxeP/oyXmJ93uHG5mFRAsVAUKscVVb0Xi6ujxZGVdDWFV696L0BNOoHTfXmac6\nIBoZQzNNK4n1AATqwo+z7a0pfRrJAgMBAAECgYBG15vpnBSuH0VS+I80XQef6TtG\nA4wStx6MSbppLqi8epWV3nmdEgQszx5YEPqpDR53AZWP6WftkVtS1IypOChTwRIh\n73vheFJ4XYqjoU+2OUtj7hhMMHDBFhw7W3Jvz4PkPu9drmzBS8N5Dd38ROwhwoS3\nUD/18pxXXyd61s/+gQJBANSuA7fRna1qXmRmdwpQR1Mebh0dw2ZgOn4ekIgsfmgP\nGPznhsjWQEuT1BxIS8R8x4ZmCJY4W89GfUBLtWprBTsCQQDOrIyHCOzOmNYXcgRT\nhW+ZiSi+46FAYqCKawIwlq2M0GsJaMTdXFQFKTmnxiNvWxxDOeZcIsrc5uwEwr6A\n3I/LAkEAwuFBHurAZOsW20DYy2aMNKmplJx1NBXxAyfWoDDFE2ziJLuyUc2g1J/8\nuH22j7EW0xwjuiKiXeflVUkKTx0JiQJAUQb5OV/YZ88n8J008QHZlRpfLSfVaobA\nZkQ54Y7Rj+mObWvz8s1l63gUMKDP97KCzCCBHhJN8nlegydOxPq0LQJADBjkunGt\nfIGv6A3SG5/5nRYI1gHQsq30BaAPwx6BuDBtnaf5BpzcFvu1JMNHoVFYzmiykpwX\n1zUhaAtcX2BV9g==\n-----END PRIVATE KEY-----\n',
  },
  /* eslint-enable max-len */
];

/**
 * Generates a mocked Firebase ID token.
 *
 * @param {object} overrides Overrides for the generated token's attributes.
 * @param {object} claims Extra claims to add to the token.
 * @return {string} A mocked Firebase ID token with any provided overrides included.
 */
export function generateIdToken(overrides?: object, claims?: object): string {
  const options = _.assign({
    audience: projectId,
    expiresIn: ONE_HOUR_IN_SECONDS,
    issuer: 'https://securetoken.google.com/' + projectId,
    subject: uid,
    algorithm: ALGORITHM,
    header: {
      kid: certificateObject.private_key_id,
    },
  }, overrides);

  const payload = {
    ...developerClaims,
    ...claims,
  };

  return jwt.sign(payload, certificateObject.private_key, options);
}

/**
 * Generates a mocked Firebase session cookie.
 *
 * @param {object=} overrides Overrides for the generated token's attributes.
 * @param {number=} expiresIn Optional custom session cookie expiration in seconds.
 * @return {string} A mocked Firebase session cookie with any provided overrides included.
 */
export function generateSessionCookie(overrides?: object, expiresIn?: number): string {
  const options = _.assign({
    audience: projectId,
    expiresIn: expiresIn || ONE_HOUR_IN_SECONDS,
    issuer: 'https://session.firebase.google.com/' + projectId,
    subject: uid,
    algorithm: ALGORITHM,
    header: {
      kid: certificateObject.private_key_id,
    },
  }, overrides);

  return jwt.sign(developerClaims, certificateObject.private_key, options);
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export function firebaseServiceFactory(
  firebaseApp: _app.App,
  _extendApp?: (props: object) => void,
): FirebaseServiceInterface {
  const result = {
    app: firebaseApp,
    INTERNAL: {},
  };
  return result as FirebaseServiceInterface;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/** Mock socket emitter class. */
export class MockSocketEmitter extends events.EventEmitter {
  public setTimeout: (_: number) => void = () => undefined;
}

/** Mock stream passthrough class with dummy abort method. */
export class MockStream extends stream.PassThrough {
  public abort: () => void = () => undefined;
}

/**
 * MESSAGING
 */
const mockPayloadDataValue = {
  foo: 'one',
  bar: 'two',
};

const mockPayloadNotificationValue = {
  title: 'Mock Title',
  body: 'Mock body.',
};

export const messaging = {
  topic: 'mock-topic',
  topicWithPrefix: '/topics/mock-topic',
  topicWithPrivatePrefix: '/topics/private/mock-topic',
  condition: "'mock-topic-0' in topics || ('mock-topic-1' in topics && 'mock-topic-2' in topics)",
  messageId: 1212121212,
  multicastId: 1234567890,
  notificationKey: 'mock-notification-key',
  registrationToken: 'mock-registration-token',
  payloadDataOnly: {
    data: mockPayloadDataValue,
  },
  payloadNotificationOnly: {
    notification: mockPayloadNotificationValue,
  },
  payload: {
    data: mockPayloadDataValue,
    notification: mockPayloadNotificationValue,
  },
  options: {
    collapseKey: 'foo',
    dryRun: true,
  },
};
