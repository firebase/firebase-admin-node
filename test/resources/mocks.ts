'use strict';

// Use untyped import syntax for Node built-ins.
import path = require('path');
import events = require('events');
import stream = require('stream');

import * as _ from 'lodash';
import * as jwt from 'jsonwebtoken';

import {CertCredential} from '../../src/auth/credential';
import {FirebaseAppOptions} from '../../src/firebase-app';

const ALGORITHM = 'RS256';
const ONE_HOUR_IN_SECONDS = 60 * 60;

export let uid = 'someUid';
export let projectId = 'project_id';
export let developerClaims = {
  one: 'uno',
  two: 'dos',
};

export let appName = 'mock-app-name';

export let serviceName = 'mock-service-name';

export let credential = new CertCredential(path.resolve(__dirname, './mock.key.json'));

export let appOptions: FirebaseAppOptions = {
  credential,
  databaseURL: 'https://databaseName.firebaseio.com',
};

export let appOptionsNoAuth: FirebaseAppOptions = {
  databaseURL: 'https://databaseName.firebaseio.com',
};

export let appOptionsNoDatabaseUrl: FirebaseAppOptions = {
  credential,
};

export let refreshToken = {
  clientId: 'mock-client-id',
  clientSecret: 'mock-client-secret',
  refreshToken: 'mock-refresh-token',
  type: 'refreshToken',
};

/* tslint:disable:no-var-requires */
export let certificateObject = require('./mock.key.json');
/* tslint:enable:no-var-requires */

// Randomly generated key pairs that don't correspond to anything related to Firebase or GCP
export let keyPairs = [
  /* tslint:disable:max-line-length */
  // The private key for this key pair is identical to the one used in ./mock.key.json
  {
    public: '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAwJENcRev+eXZKvhhWLiV3Lz2MvO+naQRHo59g3vaNQnbgyduN/L4krlrJ5c6\nFiikXdtJNb/QrsAHSyJWCu8j3T9CruiwbidGAk2W0RuViTVspjHUTsIHExx9euWM0UomGvYk\noqXahdhPL/zViVSJt+Rt8bHLsMvpb8RquTIb9iKY3SMV2tCofNmyCSgVbghq/y7lKORtV/IR\nguWs6R22fbkb0r2MCYoNAbZ9dqnbRIFNZBC7itYtUoTEresRWcyFMh0zfAIJycWOJlVLDLqk\nY2SmIx8u7fuysCg1wcoSZoStuDq02nZEMw1dx8HGzE0hynpHlloRLByuIuOAfMCCYwIDAQAB\n-----END RSA PUBLIC KEY-----\n',
    private: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAwJENcRev+eXZKvhhWLiV3Lz2MvO+naQRHo59g3vaNQnbgyduN/L4krlr\nJ5c6FiikXdtJNb/QrsAHSyJWCu8j3T9CruiwbidGAk2W0RuViTVspjHUTsIHExx9euWM0Uom\nGvYkoqXahdhPL/zViVSJt+Rt8bHLsMvpb8RquTIb9iKY3SMV2tCofNmyCSgVbghq/y7lKORt\nV/IRguWs6R22fbkb0r2MCYoNAbZ9dqnbRIFNZBC7itYtUoTEresRWcyFMh0zfAIJycWOJlVL\nDLqkY2SmIx8u7fuysCg1wcoSZoStuDq02nZEMw1dx8HGzE0hynpHlloRLByuIuOAfMCCYwID\nAQABAoIBADFtihu7TspAO0wSUTpqttzgC/nsIsNn95T2UjVLtyjiDNxPZLUrwq42tdCFur0x\nVW9Z+CK5x6DzXWvltlw8IeKKeF1ZEOBVaFzy+YFXKTz835SROcO1fgdjyrme7lRSShGlmKW/\nGKY+baUNquoDLw5qreXaE0SgMp0jt5ktyYuVxvhLDeV4omw2u6waoGkifsGm8lYivg5l3VR7\nw2IVOvYZTt4BuSYVwOM+qjwaS1vtL7gv0SUjrj85Ja6zERRdFiITDhZw6nsvacr9/+/aut9E\naL/koSSb62g5fntQMEwoT4hRnjPnAedmorM9Rhddh2TB3ZKTBbMN1tUk3fJxOuECgYEA+z6l\neSaAcZ3qvwpntcXSpwwJ0SSmzLTH2RJNf+Ld3eBHiSvLTG53dWB7lJtF4R1KcIwf+KGcOFJv\nsnepzcZBylRvT8RrAAkV0s9OiVm1lXZyaepbLg4GGFJBPi8A6VIAj7zYknToRApdW0s1x/XX\nChewfJDckqsevTMovdbg8YkCgYEAxDYX+3mfvv/opo6HNNY3SfVunM+4vVJL+n8gWZ2w9kz3\nQ9Ub9YbRmI7iQaiVkO5xNuoG1n9bM+3Mnm84aQ1YeNT01YqeyQsipP5Wi+um0PzYTaBw9RO+\n8Gh6992OwlJiRtFk5WjalNWOxY4MU0ImnJwIfKQlUODvLmcixm68NYsCgYEAuAqI3jkk55Vd\nKvotREsX5wP7gPePM+7NYiZ1HNQL4Ab1f/bTojZdTV8Sx6YCR0fUiqMqnE+OBvfkGGBtw22S\nLesx6sWf99Ov58+x4Q0U5dpxL0Lb7d2Z+2Dtp+Z4jXFjNeeI4ae/qG/LOR/b0pE0J5F415ap\n7Mpq5v89vepUtrkCgYAjMXytu4v+q1Ikhc4UmRPDrUUQ1WVSd+9u19yKlnFGTFnRjej86hiw\nH3jPxBhHra0a53EgiilmsBGSnWpl1WH4EmJz5vBCKUAmjgQiBrueIqv9iHiaTNdjsanUyaWw\njyxXfXl2eI80QPXh02+8g1H/pzESgjK7Rg1AqnkfVH9nrwKBgQDJVxKBPTw9pigYMVt9iHrR\niCl9zQVjRMbWiPOc0J56+/5FZYm/AOGl9rfhQ9vGxXZYZiOP5FsNkwt05Y1UoAAH4B4VQwbL\nqod71qOcI0ywgZiIR87CYw40gzRfjWnN+YEEW1qfyoNLilEwJB8iB/T+ZePHGmJ4MmQ/cTn9\nxpdLXA==\n-----END RSA PRIVATE KEY-----\n',
  },
  {
    public: '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAzhI/CMRtNO45R0DD4NBXFRDYAjlB/UVGGdMJKbCIrD3Uq7r/ivedqRYUIccO\nqpeYeu9IH9iotkKq8TM0eCJAUr9WT0o5YzpGvaB8ut87xLh8SqK42VmYAvemUjI257LtDbms\nhoqzqt9Yq0sgC05b7L3r2xDTxnefeMUHYBwaerCr8PTBCu7NjK3eIWHGPouEwT46WoUpnoNm\nxdI16CoSMqtuxteG8c14qJbGR9AZujkRDntWOuL1m5KaUIc7XcAaXBt4FiPwoDoQmmCmydVC\njln3YwSrvL60iAQM6pzCxNRrJRWPYd2u7fgjir/W88w5KHOvdbUyemZWnd6SBExHuQIDAQAB\n-----END RSA PUBLIC KEY-----\n',
    private: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAzhI/CMRtNO45R0DD4NBXFRDYAjlB/UVGGdMJKbCIrD3Uq7r/ivedqRYU\nIccOqpeYeu9IH9iotkKq8TM0eCJAUr9WT0o5YzpGvaB8ut87xLh8SqK42VmYAvemUjI257Lt\nDbmshoqzqt9Yq0sgC05b7L3r2xDTxnefeMUHYBwaerCr8PTBCu7NjK3eIWHGPouEwT46WoUp\nnoNmxdI16CoSMqtuxteG8c14qJbGR9AZujkRDntWOuL1m5KaUIc7XcAaXBt4FiPwoDoQmmCm\nydVCjln3YwSrvL60iAQM6pzCxNRrJRWPYd2u7fgjir/W88w5KHOvdbUyemZWnd6SBExHuQID\nAQABAoIBAQDJ9iv9BbYaGBfe82SGIuoV5Uou87ru5EPN73yddTydwoN6Q21L316PZuoYKKUB\nIE36viSrwYWoCzLJ7etQihEMiCWo1A/mZikKlA1qgHptVHnMFCqiKiLHVbuV90zETCH0P7MM\nsUdhAkA+sQQY0JVbMs/DBXzomDic/k06LpDtCBNdjL7UIT5KyFbBqit+cV6H91Ujqg8MmzrU\ntOSw+63oSqZJkT6WPuA/NJNXqtFF+0aOKNX1ttrrTzSDhyp6AxOO7Wm++dpYBtcfnOc3EG65\nul9PfKsJwVZFVO+AAZwdLCeKjtCtWeJc/yXvSj2NTsjs3FKJkRAmmiMp5tH+vbE5AoGBAOhn\nKTXGI+ofA3iggByt2InCU+YIXsw1EbbhH4LGB8yyUA2SIjZybwUMKCkoMxmEumFP/FWgOL2w\nLlClqf9vZg9dBy8bDINJHm+9roYRO0/EhHA6IDSC+0X5BPZOexrBI07HJI7w7Y0WHFU8jK53\n55ps2YGT20n7haRMbbPMrq/3AoGBAOL+pY8bgCnKmeG2inun4FuD+0/aXAySXi70/BAABeHH\npogEfc0jv5SgygTiuC/2T84Jmsg0Y6M2l86srMrMA07xtyMbfRq7zih+K+EDoQ9HAwhDqxX5\nM7E8fPXscDzH2Y361QiGAQpjUcMix3hDV8oK537rYOmCYku18ZsVkjnPAoGAbE1u4fVlVTyA\ntJ0vNq45Q/GAgamS690rVStSMPIyPk02iyx3ryHi5NpGeO+X6KN269SHhiu1ZYiN/N1G/Jeg\nWzaCG4yiZygS/AXMKAQtvL2a7mXYDkCf8nrauiHWsqAg4RxiyA401dPg/kPKV5/fGZLyRbVu\nsup43BkV4n1XRv8CgYAmUIE1dJjfdPkgZiVd1epCyDZFNkBPRu1q06MwODDF+WMcllV9qMkP\nl0xCItqgDd1Ok8RygpVG2VIqam8IFAOC8b3NyTgGqSiVISba5jfrUjsqy/E21kdpZSJaiDwx\npjIMiwgmVigazsTgQSCWJhfNXKXSgHxtLbrVuLI9URjLdQKBgQDProyaG7pspt6uUdqMTa4+\nGVkUg+gIt5aVTf/Lb25K3SHA1baPamtbTDDf6vUjeJtTG+O+RMGqK5mB2MywjVHJdMGcJ44e\nogIh9eWY450oUoVBjEsdUd7Ef5KcpMFDUVFJwzCY371+Loqh2KYAk8WUSRzwGuw2QtLPO/L/\nQkKj4Q==\n-----END RSA PRIVATE KEY-----\n',
  },
  /* tslint:enable:max-line-length */
];

/**
 * Generates a mocked Firebase ID token.
 *
 * @param {Object} overrides Overrides for the generated token's attributes.
 * @return {string} A mocked Firebase ID token with any provided overrides included.
 */
export function generateIdToken(overrides?: Object): string {
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

  return jwt.sign(developerClaims, certificateObject.private_key, options);
}


/** Mock socket emitter class. */
export class MockSocketEmitter extends events.EventEmitter {
  public setTimeout = (timeout: number) => undefined;
}

/** Mock stream passthrough class with dummy abort method. */
export class MockStream extends stream.PassThrough {
  public abort = () => undefined;
}
