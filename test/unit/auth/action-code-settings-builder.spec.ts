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

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import { ActionCodeSettingsBuilder } from '../../../src/auth/action-code-settings-builder';
import { AuthClientErrorCode } from '../../../src/utils/error';


chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('ActionCodeSettingsBuilder', () => {
  describe('constructor', () => {
    it('should not throw on valid parameters', () => {
      expect(new ActionCodeSettingsBuilder({
        url: 'https://www.example.com/path/file?a=1&b=2',
        handleCodeInApp: true,
        iOS: {
          bundleId: 'com.example.ios',
        },
        android: {
          packageName: 'com.example.android',
          installApp: true,
          minimumVersion: '6',
        },
        dynamicLinkDomain: 'custom.page.link',
      })).not.to.throw;
    });

    const invalidSettings = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
    invalidSettings.forEach((settings) => {
      it('should throw on non-object ActionCodeSettings:' + JSON.stringify(settings), () => {
        expect(() => {
          return new ActionCodeSettingsBuilder(settings as any);
        }).to.throw('"ActionCodeSettings" must be a non-null object.');
      });
    });

    it('should throw on missing URL', () => {
      expect(() => {
        return new ActionCodeSettingsBuilder({
          handleCodeInApp: true,
          iOS: {
            bundleId: 'com.example.ios',
          },
          android: {
            packageName: 'com.example.android',
            installApp: true,
            minimumVersion: '6',
          },
          dynamicLinkDomain: 'custom.page.link',
        } as any);
      }).to.throw(AuthClientErrorCode.MISSING_CONTINUE_URI.message);
    });

    const invalidUrls = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidUrls.forEach((url) => {
      it('should throw on invalid URL:' + JSON.stringify(url), () => {
        expect(() => {
          return new ActionCodeSettingsBuilder({
            url,
          } as any);
        }).to.throw(AuthClientErrorCode.INVALID_CONTINUE_URI.message);
      });
    });

    const invalidHandleCodeInApp = [null, NaN, 0, 1, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidHandleCodeInApp.forEach((handleCodeInApp) => {
      it('should throw on invalid handleCodeInApp:' + JSON.stringify(handleCodeInApp), () => {
        expect(() => {
          return new ActionCodeSettingsBuilder({
            url: 'https://www.example.com/path/file?a=1&b=2',
            handleCodeInApp,
          } as any);
        }).to.throw('"ActionCodeSettings.handleCodeInApp" must be a boolean.');
      });
    });

    const invalidDomains = [null, NaN, 0, 1, true, false, '', ['custom.page.link'], [], {}, { a: 1 }, _.noop];
    invalidDomains.forEach((domain) => {
      it('should throw on invalid dynamicLinkDomain:' + JSON.stringify(domain), () => {
        expect(() => {
          return new ActionCodeSettingsBuilder({
            url: 'https://www.example.com/path/file?a=1&b=2',
            handleCodeInApp: true,
            dynamicLinkDomain: domain,
          } as any);
        }).to.throw(AuthClientErrorCode.INVALID_DYNAMIC_LINK_DOMAIN.message);
      });
    });

    const invalidIOSSettings = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
    invalidIOSSettings.forEach((settings) => {
      it('should throw on invalid iOS object:' + JSON.stringify(settings), () => {
        expect(() => {
          return new ActionCodeSettingsBuilder({
            url: 'https://www.example.com/path/file?a=1&b=2',
            handleCodeInApp: true,
            iOS: settings,
          } as any);
        }).to.throw('"ActionCodeSettings.iOS" must be a valid non-null object.');
      });
    });

    it('should throw on missing iOS bundle ID', () => {
      expect(() => {
        return new ActionCodeSettingsBuilder({
          url: 'https://www.example.com/path/file?a=1&b=2',
          handleCodeInApp: true,
          iOS: {},
        } as any);
      }).to.throw(AuthClientErrorCode.MISSING_IOS_BUNDLE_ID.message);
    });

    const invalidBundleIds = [null, NaN, 0, 1, true, false, '', ['com.example.ios'], _.noop];
    invalidBundleIds.forEach((bundleId) => {
      it('should throw on invalid iOS bundle ID:' + JSON.stringify(bundleId), () => {
        expect(() => {
          return new ActionCodeSettingsBuilder({
            url: 'https://www.example.com/path/file?a=1&b=2',
            handleCodeInApp: true,
            iOS: { bundleId },
          } as any);
        }).to.throw('"ActionCodeSettings.iOS.bundleId" must be a valid non-empty string.');
      });
    });

    const invalidAndroidSettings = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
    invalidAndroidSettings.forEach((settings) => {
      it('should throw on invalid android object:' + JSON.stringify(settings), () => {
        expect(() => {
          return new ActionCodeSettingsBuilder({
            url: 'https://www.example.com/path/file?a=1&b=2',
            handleCodeInApp: true,
            android: settings,
          } as any);
        }).to.throw('"ActionCodeSettings.android" must be a valid non-null object.');
      });
    });

    it('should throw on missing android package name', () => {
      expect(() => {
        return new ActionCodeSettingsBuilder({
          url: 'https://www.example.com/path/file?a=1&b=2',
          handleCodeInApp: true,
          android: {},
        } as any);
      }).to.throw(AuthClientErrorCode.MISSING_ANDROID_PACKAGE_NAME.message);
    });

    const invalidPackageNames = [null, NaN, 0, 1, true, false, '', ['com.example.android'], _.noop];
    invalidPackageNames.forEach((packageName) => {
      it('should throw on invalid android package name:' + JSON.stringify(packageName), () => {
        expect(() => {
          return new ActionCodeSettingsBuilder({
            url: 'https://www.example.com/path/file?a=1&b=2',
            handleCodeInApp: true,
            android: { packageName },
          } as any);
        }).to.throw('"ActionCodeSettings.android.packageName" must be a valid non-empty string.');
      });
    });

    const invalidMinimumVersions = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], _.noop];
    invalidMinimumVersions.forEach((minimumVersion) => {
      it('should throw on invalid android minimum version:' + JSON.stringify(minimumVersion), () => {
        expect(() => {
          return new ActionCodeSettingsBuilder({
            url: 'https://www.example.com/path/file?a=1&b=2',
            handleCodeInApp: true,
            android: {
              packageName: 'com.example.android',
              minimumVersion,
            },
          } as any);
        }).to.throw('"ActionCodeSettings.android.minimumVersion" must be a valid non-empty string.');
      });
    });

    const invalidInstallApp = [null, NaN, 0, 1, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidInstallApp.forEach((installApp) => {
      it('should throw on invalid android installApp field:' + JSON.stringify(installApp), () => {
        expect(() => {
          return new ActionCodeSettingsBuilder({
            url: 'https://www.example.com/path/file?a=1&b=2',
            handleCodeInApp: true,
            android: {
              packageName: 'com.example.android',
              installApp,
            },
          } as any);
        }).to.throw('"ActionCodeSettings.android.installApp" must be a valid boolean.');
      });
    });
  });

  describe('buildRequest()', () => {
    it('should return EmailActionCodeRequest with expected fields', () => {
      const builder = new ActionCodeSettingsBuilder({
        url: 'https://www.example.com/path/file?a=1&b=2',
        handleCodeInApp: true,
        iOS: {
          bundleId: 'com.example.ios',
        },
        android: {
          packageName: 'com.example.android',
          installApp: true,
          minimumVersion: '6',
        },
        dynamicLinkDomain: 'custom.page.link',
      });
      const expectedRequest = {
        continueUrl: 'https://www.example.com/path/file?a=1&b=2',
        canHandleCodeInApp: true,
        dynamicLinkDomain: 'custom.page.link',
        androidPackageName: 'com.example.android',
        androidMinimumVersion: '6',
        androidInstallApp: true,
        iOSBundleId: 'com.example.ios',
      };
      expect(builder.buildRequest()).to.deep.equal(expectedRequest);
    });

    it ('should return EmailActionCodeRequest without null or undefined fields', () => {
      const builder = new ActionCodeSettingsBuilder({
        url: 'https://www.example.com/path/file?a=1&b=2',
        iOS: undefined,
        android: {
          packageName: 'com.example.android',
          installApp: undefined,
        },
      });
      const expectedRequest = {
        continueUrl: 'https://www.example.com/path/file?a=1&b=2',
        canHandleCodeInApp: false,
        androidPackageName: 'com.example.android',
        androidInstallApp: false,
      };
      expect(builder.buildRequest()).to.deep.equal(expectedRequest);
    });
  });
});
