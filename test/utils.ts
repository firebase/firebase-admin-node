import * as _ from 'lodash';
import * as nock from 'nock';


/**
 * Returns a mocked out success response from the URL generating Google access tokens given a JWT
 * signed with a service account private key.
 *
 * @return {Object} A nock response object.
 */
function mockFetchAccessTokenViaJwt(): nock.Scope {
  return nock('https://accounts.google.com:443')
    .post('/o/oauth2/token')
    .reply(200, {
      access_token: 'access_token_' + _.random(999999999),
      token_type: 'Bearer',
      expires_in: 3600,
    }, {
      'cache-control': 'no-cache, no-store, max-age=0, must-revalidate',
    });
}


export {
  mockFetchAccessTokenViaJwt
};
