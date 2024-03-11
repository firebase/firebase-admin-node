/*!
 * Copyright 2024 Google Inc.
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
import * as sinon from 'sinon';
import { RemoteConfigConditionEvaluator } from '../../../src/remote-config/remote-config-condition-evaluator-internal';
import { PercentConditionOperator, RemoteConfigServerPercentCondition } from '../../../src/remote-config/remote-config-api';
import { v4 as uuidv4 } from 'uuid';
import { clone } from 'lodash';
import * as farmhash from 'farmhash';

const expect = chai.expect;



describe('RemoteConfigConditionEvaluator', () => {
  let stubs: sinon.SinonStub[] = [];

  afterEach(() => {
    for (const stub of stubs) {
      stub.restore();
    }
    stubs = [];
  });

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

      it('should evaluate 9 as less or equal to 10', () => {
        const stub = sinon
          .stub(farmhash, 'fingerprint64')
          .returns("9");

        stubs.push(stub);
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
                      microPercent: 10
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { id: '123' }
        const evaluator = new RemoteConfigConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.true;
      });

      it('should evaluate 10 as less or equal to 10', () => {
        const stub = sinon
          .stub(farmhash, 'fingerprint64')
          .returns("10");

        stubs.push(stub);
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
                      microPercent: 10
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { id: '123' }
        const evaluator = new RemoteConfigConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.true;
      });

      it('should evaluate 11 as not less or equal to 10', () => {
        const stub = sinon
          .stub(farmhash, 'fingerprint64')
          .returns("11");

        stubs.push(stub);
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
                      microPercent: 10
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { id: '123' }
        const evaluator = new RemoteConfigConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.false;
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

      it('should evaluate 11M as greater than 10M', () => {
        const stub = sinon
          .stub(farmhash, 'fingerprint64')
          .returns("11");

        stubs.push(stub);
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
                      microPercent: 10
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { id: '123' }
        const evaluator = new RemoteConfigConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.true;
      });

      it('should evaluate 9 as not greater than 10', () => {
        const stub = sinon
          .stub(farmhash, 'fingerprint64')
          .returns("9");
        stubs.push(stub);

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
                      microPercent: 10
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { id: '123' }
        const evaluator = new RemoteConfigConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.false;
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

      it('should evaluate 10 as between 9 and 11', () => {
        const stub = sinon
          .stub(farmhash, 'fingerprint64')
          .returns("10");
        stubs.push(stub);

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
                        microPercentLowerBound: 9,
                        microPercentUpperBound: 11
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
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.true;
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

      it('should evaluate 12 as not between 9 and 11', () => {
        const stub = sinon
          .stub(farmhash, 'fingerprint64')
          .returns("12");
        stubs.push(stub);

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
                        microPercentLowerBound: 9,
                        microPercentUpperBound: 11
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
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.false;
      });

      // The following tests are probablistic. They use tolerances based on
      // standard deviations to balance accuracy and flakiness. Random IDs will
      // hash to the target range + 3 standard deviations 99.7% of the time,
      // which minimizes flakiness.
      // Use python to calculate standard deviation. For example, for 100k
      // trials with 50% probability:
      //   from scipy.stats import binom
      //   print(binom.std(100_000, 0.5) * 3)
      it('should evaluate less or equal to 10% to approx 10%', () => {
        const percentCondition = {
          operator: PercentConditionOperator.LESS_OR_EQUAL,
          microPercent: 10_000_000 // 10%
        };
        const evaluator = new RemoteConfigConditionEvaluator();
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        // 284 is 3 standard deviations for 100k trials with 10% probability.
        const tolerance = 284;
        expect(truthyAssignments).to.be.greaterThanOrEqual(10000 - tolerance);
        expect(truthyAssignments).to.be.lessThanOrEqual(10000 + tolerance);
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
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        // 284 is 3 standard deviations for 100k trials with 10% probability.
        const tolerance = 284;
        expect(truthyAssignments).to.be.greaterThanOrEqual(10000 - tolerance);
        expect(truthyAssignments).to.be.lessThanOrEqual(10000 + tolerance);
      });

      it('should evaluate greater than 10% to approx 90%', () => {
        const percentCondition = {
          operator: PercentConditionOperator.GREATER_THAN,
          microPercent: 10_000_000
        };
        const evaluator = new RemoteConfigConditionEvaluator();
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        // 284 is 3 standard deviations for 100k trials with 90% probability.
        const tolerance = 284;
        expect(truthyAssignments).to.be.greaterThanOrEqual(90000 - tolerance);
        expect(truthyAssignments).to.be.lessThanOrEqual(90000 + tolerance);
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
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        // 379 is 3 standard deviations for 100k trials with 20% probability.
        const tolerance = 379;
        expect(truthyAssignments).to.be.greaterThanOrEqual(20000 - tolerance);
        expect(truthyAssignments).to.be.lessThanOrEqual(20000 + tolerance);
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
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        // 474 is 3 standard deviations for 100k trials with 50% probability.
        const tolerance = 474;
        expect(truthyAssignments).to.be.greaterThanOrEqual(50000 - tolerance);
        expect(truthyAssignments).to.be.lessThanOrEqual(50000 + tolerance);
      });

      // Returns the number of assignments which evaluate to true for the specified percent condition.
      // This method randomly generates the ids for each assignment for this purpose.
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
