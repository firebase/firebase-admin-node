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
import {RemoteConfigConditionEvaluator} from '../../../src/remote-config/remote-config-condition-evaluator-internal';

const expect = chai.expect;

describe('RemoteConfigConditionEvaluator', () => {
  describe('evaluateCondition', () => {
    it('should evaluate empty OR condition to false', () => {
      const condition = {
        name: 'is_enabled',
        or: {
        }
      };
      const evaluator = new RemoteConfigConditionEvaluator();
      expect(evaluator.evaluateCondition(condition)).to.be.false;
    });

    it('should evaluate empty OR.AND condition to true', () => {
      const condition = {
        name: 'is_enabled',
        or: {
          conditions: [
            {
              name: '', // Note we should differentiate named from unnamed conditions
              and: {
              }
            }
          ]
        }
      };
      const evaluator = new RemoteConfigConditionEvaluator();
      expect(evaluator.evaluateCondition(condition)).to.be.true;
    });

    it('should evaluate OR.AND.TRUE condition to true', () => {
      const condition = {
        name: 'is_enabled',
        or: {
          conditions: [
            {
              name: '', // Note we should differentiate named from unnamed conditions
              and: {
                conditions: [
                  {
                    name: '',
                    true: {
                    }
                  }
                ]
              }
            }
          ]
        }
      };
      const evaluator = new RemoteConfigConditionEvaluator();
      expect(evaluator.evaluateCondition(condition)).to.be.true;
    });

    it('should evaluate OR.AND.FALSE condition to false', () => {
      const condition = {
        name: 'is_enabled',
        or: {
          conditions: [
            {
              name: '', // Note we should differentiate named from unnamed conditions
              and: {
                conditions: [
                  {
                    name: '',
                    false: {
                    }
                  }
                ]
              }
            }
          ]
        }
      };
      const evaluator = new RemoteConfigConditionEvaluator();
      expect(evaluator.evaluateCondition(condition)).to.be.false;
    });
  });
});
