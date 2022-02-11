/*!
 * Copyright 2020 Google Inc.
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

/**
* Enforcement state of reCAPTCHA protection.
*   - 'OFF': Unenforced.
*   - 'AUDIT': Assessment is created but result is not used to enforce.
*   - 'ENFORCE': Assessment is created and result is used to enforce.
*/
export type RecaptchaProviderEnforcementState =  'OFF' | 'AUDIT' | 'ENFORCE';

/**
* The actions for reCAPTCHA-protected requests.
*   - 'BLOCK': The reCAPTCHA-protected request will be blocked.
*/
export type RecaptchaAction = 'BLOCK';

/**
* The config for a reCAPTCHA action rule.
*/
export interface RecaptchaManagedRule {
 /**
  * The action will be enforced if the reCAPTCHA score of a request is larger than endScore.
  */
 endScore: number;
  /**
  * The action for reCAPTCHA-protected requests.
  */
 action?: RecaptchaAction;
}

/**
 * The key's platform type: only web supported now..
 */
export type RecaptchaKeyClientType = 'WEB';

/**
 * The reCAPTCHA key config.
 */
export interface RecaptchaKey {
  /**
   * The key's client platform type.
   */
  type?: RecaptchaKeyClientType;

  /**
   * The reCAPTCHA site key.
   */
   key: string;
}

export interface RecaptchaConfig {
 /**
  * The enforcement state of email password provider.
  */
 emailPasswordEnforcementState?: RecaptchaProviderEnforcementState;

 /**
  *  The reCAPTCHA managed rules.
  */
 managedRules: RecaptchaManagedRule[];

 /**
  * The reCAPTCHA keys.
  */
 recaptchaKeys?: RecaptchaKey[];
}