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
import { PercentConditionOperator, RemoteConfigServerPercentCondition } from '../../../src/remote-config/remote-config-api';
import { v4 as uuidv4 } from 'uuid';
import { clone } from 'lodash';

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
      const context = {}
      const evaluator = new RemoteConfigConditionEvaluator();
      expect(evaluator.evaluateConditions([condition], context)).deep.equals(
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
      const context = {}
      const evaluator = new RemoteConfigConditionEvaluator();
      expect(evaluator.evaluateConditions([condition], context)).deep.equals(
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
      const context = {}
      const evaluator = new RemoteConfigConditionEvaluator();
      expect(evaluator.evaluateConditions([condition], context)).deep.equals(
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
      const context = {}
      const evaluator = new RemoteConfigConditionEvaluator();
      expect(evaluator.evaluateConditions([condition], context)).deep.equals(
        new Map([["is_enabled", false]]));
    });

    describe('percentCondition', () => {
      it('should evaluate less or equal to max to true', () => {
        const condition = {
          name: 'is_enabled',
          condition: {
            or: {
              conditions: [{
                and: {
                  conditions: [{
                    percent: {
                      operator: PercentConditionOperator.LESS_OR_EQUAL,
                      seed: "abcdef",
                      microPercent: 100_000_000
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { id: '123' }
        const evaluator = new RemoteConfigConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([["is_enabled", true]]));
      });

      it('should evaluate greater than min to true', () => {
        const condition = {
          name: 'is_enabled',
          condition: {
            or: {
              conditions: [{
                and: {
                  conditions: [{
                    percent: {
                      operator: PercentConditionOperator.GREATER_THAN,
                      seed: "abcdef",
                      microPercent: 0
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { id: '123' }
        const evaluator = new RemoteConfigConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([["is_enabled", true]]));
      });

      it('should evaluate between min and max to true', () => {
        const condition = {
          name: 'is_enabled',
          condition: {
            or: {
              conditions: [{
                and: {
                  conditions: [{
                    percent: {
                      operator: PercentConditionOperator.BETWEEN,
                      seed: "abcdef",
                      microPercentRange: {
                        microPercentLowerBound: 0,
                        microPercentUpperBound: 100_000_000
                      }
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { id: '123' }
        const evaluator = new RemoteConfigConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([["is_enabled", true]]));
      });

      it('should evaluate less or equal to min to false', () => {
        const condition = {
          name: 'is_enabled',
          condition: {
            or: {
              conditions: [{
                and: {
                  conditions: [{
                    percent: {
                      operator: PercentConditionOperator.LESS_OR_EQUAL,
                      seed: "abcdef",
                      microPercent: 0
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { id: '123' }
        const evaluator = new RemoteConfigConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([["is_enabled", false]]));
      });

      it('should evaluate greater than max to false', () => {
        const condition = {
          name: 'is_enabled',
          condition: {
            or: {
              conditions: [{
                and: {
                  conditions: [{
                    percent: {
                      operator: PercentConditionOperator.GREATER_THAN,
                      seed: "abcdef",
                      microPercent: 100_000_000
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { id: '123' }
        const evaluator = new RemoteConfigConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([["is_enabled", false]]));
      });

      it('should evaluate between equal bounds to false', () => {
        const condition = {
          name: 'is_enabled',
          condition: {
            or: {
              conditions: [{
                and: {
                  conditions: [{
                    percent: {
                      operator: PercentConditionOperator.BETWEEN,
                      seed: "abcdef",
                      microPercentRange: {
                        microPercentLowerBound: 50000000,
                        microPercentUpperBound: 50000000
                      }
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { id: '123' }
        const evaluator = new RemoteConfigConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([["is_enabled", false]]));
      });

      it('should evaluate less or equal to 10% to approx 10%', () => {
        const percentCondition = {
          operator: PercentConditionOperator.LESS_OR_EQUAL,
          microPercent: 10_000_000 // 10%
        };
        const evaluator = new RemoteConfigConditionEvaluator();
        // run this evaluator 100 times, and log the number of true assignments
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        expect(truthyAssignments).to.be.greaterThanOrEqual(10000 - 250);
        expect(truthyAssignments).to.be.lessThanOrEqual(10000 + 250);
      });

      it('should evaluate between 0 to 10% to approx 10%', () => {
        const percentCondition = {
          operator: PercentConditionOperator.BETWEEN,
          microPercentRange: {
            microPercentLowerBound: 0,
            microPercentUpperBound: 10_000_000
          }
        };
        const evaluator = new RemoteConfigConditionEvaluator();
        // run this evaluator 100 times, and log the number of true assignments
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        expect(truthyAssignments).to.be.greaterThanOrEqual(10000 - 250);
        expect(truthyAssignments).to.be.lessThanOrEqual(10000 + 250);
      });

      it('should evaluate greater than 10% to approx 90%', () => {
        const percentCondition = {
          operator: PercentConditionOperator.GREATER_THAN,
          microPercent: 10_000_000
        };
        const evaluator = new RemoteConfigConditionEvaluator();
        // run this evaluator 100 times, and log the number of true assignments
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        expect(truthyAssignments).to.be.greaterThanOrEqual(90000 - 250);
        expect(truthyAssignments).to.be.lessThanOrEqual(90000 + 250);
      });

      it('should evaluate between 40% to 60% to approx 20%', () => {
        const percentCondition = {
          operator: PercentConditionOperator.BETWEEN,
          microPercentRange: {
            microPercentLowerBound: 40_000_000,
            microPercentUpperBound: 60_000_000
          }
        };
        const evaluator = new RemoteConfigConditionEvaluator();
        // run this evaluator 100 times, and log the number of true assignments
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        expect(truthyAssignments).to.be.greaterThanOrEqual(20000 - 250);
        expect(truthyAssignments).to.be.lessThanOrEqual(20000 + 250);
      });

      it('should evaluate between interquartile range to approx 50%', () => {
        const percentCondition = {
          operator: PercentConditionOperator.BETWEEN,
          microPercentRange: {
            microPercentLowerBound: 25_000_000,
            microPercentUpperBound: 75_000_000
          }
        };
        const evaluator = new RemoteConfigConditionEvaluator();
        // run this evaluator 100 times, and log the number of true assignments
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        expect(truthyAssignments).to.be.greaterThanOrEqual(50000 - 250);
        expect(truthyAssignments).to.be.lessThanOrEqual(50000 + 250);
      });

      // Returns the number of assignments which evaluate to true for the specified percent condition
      // This method randomly generates the ids for each assignment for this purpose
      function evaluateRandomAssignments(
        condition: RemoteConfigServerPercentCondition,
        numOfAssignments: number,
        conditionEvaluator: RemoteConfigConditionEvaluator): number {

        let evalTrueCount = 0;
        for (let i = 0; i < numOfAssignments; i++) {
          let clonedCondition = {
            ...clone(condition),
            seed: 'seed'
          };
          const context = { id: uuidv4() }
          if (conditionEvaluator.evaluateConditions([{
            name: 'is_enabled',
            condition: { percent: clonedCondition }
          }], context).get('is_enabled') == true) { evalTrueCount++ }
        }
        return evalTrueCount;
      }
    });
  });
});
