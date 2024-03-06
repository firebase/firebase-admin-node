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

'use strict';

import * as chai from 'chai';
import { RemoteConfigConditionEvaluator } from '../../../src/remote-config/remote-config-condition-evaluator-internal';

const expect = chai.expect;

describe('RemoteConfigConditionEvaluator', () => {
  describe('evaluateConditions', () => {
    it('should evaluate empty OR condition to false', () => {
      const condition = {
        name: 'is_enabled',
        condition: {
          or: {
          }
        }
      };
      const evaluator = new RemoteConfigConditionEvaluator();
      expect(evaluator.evaluateConditions([condition])).deep.equals(
        new Map([["is_enabled", false]]));
    });

    it('should evaluate empty OR.AND condition to true', () => {
      const condition = {
        name: 'is_enabled',
        condition: {
          or: {
            conditions: [
              {
                and: {
                }
              }
            ]
          }
        }
      };
      const evaluator = new RemoteConfigConditionEvaluator();
      expect(evaluator.evaluateConditions([condition])).deep.equals(
        new Map([["is_enabled", true]]));
    });

    it('should evaluate OR.AND.TRUE condition to true', () => {
      const condition = {
        name: 'is_enabled',
        condition: {
          or: {
            conditions: [
              {
                and: {
                  conditions: [
                    {
                      true: {
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      };
      const evaluator = new RemoteConfigConditionEvaluator();
      expect(evaluator.evaluateConditions([condition])).deep.equals(
        new Map([["is_enabled", true]]));
    });

    it('should evaluate OR.AND.FALSE condition to false', () => {
      const condition = {
        name: 'is_enabled',
        condition: {
          or: {
            conditions: [
              {
                and: {
                  conditions: [
                    {
                      false: {
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      };
      const evaluator = new RemoteConfigConditionEvaluator();
      expect(evaluator.evaluateConditions([condition])).deep.equals(
        new Map([["is_enabled", false]]));
    });
  });
});
