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
import { ConditionEvaluator } from '../../../src/remote-config/condition-evaluator-internal';
import {
  PercentConditionOperator,
  PercentCondition,
  CustomSignalOperator,
  NamedCondition,
  OneOfCondition,
} from '../../../src/remote-config/remote-config-api';
import { clone } from 'lodash';
import * as crypto from 'crypto';

const expect = chai.expect;

const nodeVersion = process.versions.node;

describe('ConditionEvaluator', () => {
  let stubs: sinon.SinonStub[] = [];

  afterEach(() => {
    for (const stub of stubs) {
      stub.restore();
    }
    stubs = [];
  });

  function createNamedCondition(
    name: string,
    condition: OneOfCondition
  ): NamedCondition {
    return {
      name,
      condition: {
        orCondition: {
          conditions: [{
            andCondition: {
              conditions: [condition],
            }
          }]
        }
      }
    };
  }

  describe('evaluateConditions', () => {
    it('should evaluate empty OR condition to false', () => {
      const condition = {
        name: 'is_enabled',
        condition: {
          orCondition: {
          }
        }
      };
      const context = {}
      const evaluator = new ConditionEvaluator();
      expect(evaluator.evaluateConditions([condition], context)).deep.equals(
        new Map([['is_enabled', false]]));
    });

    it('should evaluate empty OR.AND condition to true', () => {
      const condition = {
        name: 'is_enabled',
        condition: {
          orCondition: {
            conditions: [
              {
                andCondition: {
                }
              }
            ]
          }
        }
      };
      const context = {}
      const evaluator = new ConditionEvaluator();
      expect(evaluator.evaluateConditions([condition], context)).deep.equals(
        new Map([['is_enabled', true]]));
    });

    it('should evaluate OR.AND.TRUE condition to true', () => {
      const condition = {
        name: 'is_enabled',
        condition: {
          orCondition: {
            conditions: [
              {
                andCondition: {
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
      const evaluator = new ConditionEvaluator();
      expect(evaluator.evaluateConditions([condition], context)).deep.equals(
        new Map([['is_enabled', true]]));
    });

    it('should evaluate OR.AND.FALSE condition to false', () => {
      const condition = {
        name: 'is_enabled',
        condition: {
          orCondition: {
            conditions: [
              {
                andCondition: {
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
      const evaluator = new ConditionEvaluator();
      expect(evaluator.evaluateConditions([condition], context)).deep.equals(
        new Map([['is_enabled', false]]));
    });

    it('should evaluate non-OR top-level condition', () => {
      // The server wraps conditions in OR.AND, but the evaluation logic
      // is more general.
      const condition = {
        name: 'is_enabled',
        condition: {
          true: {
          }
        }
      };
      const context = {}
      const evaluator = new ConditionEvaluator();
      expect(evaluator.evaluateConditions([condition], context)).deep.equals(
        new Map([['is_enabled', true]]));
    });

    describe('percentCondition', () => {
      it('should evaluate an unknown operator to false', function() {
        if (nodeVersion.startsWith('14')) {
          this.skip();
        }
        // Verifies future operators won't trigger errors.
        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.UNKNOWN
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([['is_enabled', false]]));
      });

      it('should evaluate less or equal to max to true', function() {
        if (nodeVersion.startsWith('14')) {
          this.skip();
        }
        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.LESS_OR_EQUAL,
                      seed: 'abcdef',
                      microPercent: 100_000_000
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([['is_enabled', true]]));
      });

      it('should evaluate less or equal to min to false', function() {
        if (nodeVersion.startsWith('14')) {
          this.skip();
        }
        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.LESS_OR_EQUAL,
                      seed: 'abcdef',
                      microPercent: 0
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([['is_enabled', false]]));
      });

      it('should use zero for undefined microPercent', () => {
        // Stubs ID hasher to return a number larger than zero.
        const stub = sinon.stub(crypto.Hash.prototype, 'digest');
        stub.withArgs('hex').returns('1');
        stubs.push(stub);

        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.LESS_OR_EQUAL,
                      // Leaves microPercent undefined
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');

        // Evaluates false because 1 is not <= 0
        expect(actual).to.be.false;
      });

      it('should use zeros for undefined microPercentRange', () => {
        // Stubs ID hasher to return a number in range.
        const stub = sinon.stub(crypto.Hash.prototype, 'digest');
        stub.withArgs('hex').returns('1');
        stubs.push(stub);

        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.BETWEEN,
                      // Leaves microPercentRange undefined
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');

        // Evaluates false because 1 is not in (0,0]
        expect(actual).to.be.false;
      });

      it('should use zero for undefined microPercentUpperBound', () => {
        // Stubs ID hasher to return a number outside range.
        const stub = sinon.stub(crypto.Hash.prototype, 'digest');
        stub.withArgs('hex').returns('1');
        stubs.push(stub);

        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.BETWEEN,
                      microPercentRange: {
                        microPercentLowerBound: 0
                        // Leaves upper bound undefined
                      }
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');

        // Evaluates false because 1 is not in (0,0]
        expect(actual).to.be.false;
      });

      it('should use zero for undefined microPercentLowerBound', () => {
        // Stubs ID hasher to return a number in range.
        const stub = sinon.stub(crypto.Hash.prototype, 'digest');
        stub.withArgs('hex').returns('1');
        stubs.push(stub);

        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.BETWEEN,
                      microPercentRange: {
                        microPercentUpperBound: 1
                        // Leaves lower bound undefined
                      }
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');

        // Evaluates true because 1 is in (0,1]
        expect(actual).to.be.true;
      });

      it('should evaluate 9 as less or equal to 10', () => {
        const stub = sinon.stub(crypto.Hash.prototype, 'digest');
        stub.withArgs('hex').returns('9');
        stubs.push(stub);

        stubs.push(stub);
        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.LESS_OR_EQUAL,
                      seed: 'abcdef',
                      microPercent: 10
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.true;
      });

      it('should evaluate 10 as less or equal to 10', () => {
        const stub = sinon.stub(crypto.Hash.prototype, 'digest');
        stub.withArgs('hex').returns((10).toString(16));
        stubs.push(stub);

        stubs.push(stub);
        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.LESS_OR_EQUAL,
                      seed: 'abcdef',
                      microPercent: 10
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.true;
      });

      it('should evaluate 11 as not less or equal to 10', () => {
        const stub = sinon.stub(crypto.Hash.prototype, 'digest');
        stub.withArgs('hex').returns((11).toString(16));
        stubs.push(stub);

        stubs.push(stub);
        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.LESS_OR_EQUAL,
                      seed: 'abcdef',
                      microPercent: 10
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.false;
      });

      it('should negate -11 to 11 and evaluate as not less or equal to 10', () => {
        const stub = sinon.stub(crypto.Hash.prototype, 'digest');
        stub.withArgs('hex').returns((11).toString(16));
        stubs.push(stub);

        stubs.push(stub);
        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.LESS_OR_EQUAL,
                      seed: 'abcdef',
                      microPercent: 10
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.false;
      });

      it('should evaluate greater than min to true', function() {
        if (nodeVersion.startsWith('14')) {
          this.skip();
        }
        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.GREATER_THAN,
                      seed: 'abcdef',
                      microPercent: 0
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([['is_enabled', true]]));
      });

      it('should evaluate 11M as greater than 10M', () => {
        const stub = sinon.stub(crypto.Hash.prototype, 'digest');
        stub.withArgs('hex').returns((11).toString(16));
        stubs.push(stub);

        stubs.push(stub);
        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.GREATER_THAN,
                      seed: 'abcdef',
                      microPercent: 10
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.true;
      });

      it('should evaluate 9 as not greater than 10', () => {
        const stub = sinon.stub(crypto.Hash.prototype, 'digest');
        stub.withArgs('hex').returns('9');
        stubs.push(stub);

        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.GREATER_THAN,
                      seed: 'abcdef',
                      microPercent: 10
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.false;
      });

      it('should evaluate greater than max to false', function() {
        if (nodeVersion.startsWith('14')) {
          this.skip();
        }
        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.GREATER_THAN,
                      seed: 'abcdef',
                      microPercent: 100_000_000
                    }
                  }],
                }
              }]
            }
          }
        };
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([['is_enabled', false]]));
      });

      it('should evaluate between min and max to true', function() {
        if (nodeVersion.startsWith('14')) {
          this.skip();
        }
        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.BETWEEN,
                      seed: 'abcdef',
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
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([['is_enabled', true]]));
      });

      it('should evaluate 10 as between 9 and 11', () => {
        const stub = sinon.stub(crypto.Hash.prototype, 'digest');
        stub.withArgs('hex').returns((10).toString(16));
        stubs.push(stub);

        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.BETWEEN,
                      seed: 'abcdef',
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
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.true;
      });

      it('should evaluate between equal bounds to false', function() {
        if (nodeVersion.startsWith('14')) {
          this.skip();
        }
        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.BETWEEN,
                      seed: 'abcdef',
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
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([['is_enabled', false]]));
      });

      it('should evaluate 12 as not between 9 and 11', () => {
        const stub = sinon.stub(crypto.Hash.prototype, 'digest');
        stub.withArgs('hex').returns((12).toString(16));
        stubs.push(stub);

        const condition = {
          name: 'is_enabled',
          condition: {
            orCondition: {
              conditions: [{
                andCondition: {
                  conditions: [{
                    percent: {
                      percentOperator: PercentConditionOperator.BETWEEN,
                      seed: 'abcdef',
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
        const context = { randomizationId: '123' }
        const evaluator = new ConditionEvaluator();
        const actual = evaluator.evaluateConditions([condition], context)
          .get('is_enabled');
        expect(actual).to.be.false;
      });

      describe('known percent condition values', () => {
        // This test is useful for ensuring consistency across all places we
        // evaluate percent conditions. It creates a set of 10 conditions targeting 50%
        // with randomizationIds 0-9 and a constant `seed` value.
        const conditionEvaluator = new ConditionEvaluator();

        const percentCondition = {
          percentOperator: PercentConditionOperator.BETWEEN,
          microPercentRange: {
            microPercentLowerBound: 0,
            microPercentUpperBound: 50_000_000 // 50%
          },
        };

        const testCases = [
          { seed: '1', randomizationId: 'one', result: false },
          { seed: '2', randomizationId: 'two', result: false },
          { seed: '3', randomizationId: 'three', result: true },
          { seed: '4', randomizationId: 'four', result: false },
          { seed: '5', randomizationId: 'five', result: true },
          { seed: '', randomizationId: '😊', result: true },
          { seed: '', randomizationId: '😀', result: false },
          { seed: 'hêl£o', randomizationId: 'wørlÐ', result: false },
          { seed: 'řemøťe', randomizationId: 'çōnfįġ', result: true },
          { seed: 'long', randomizationId: '.'.repeat(100), result: true },
          { seed: 'very-long', randomizationId: '.'.repeat(1000), result: false },
        ];

        testCases.map(({ randomizationId, seed, result }) => {

          const idSummary = randomizationId.length > 25
            ? `a ${randomizationId.length} character randomizationID`
            : `"${randomizationId}"`;

          it(`should evaluate ${idSummary} with seed "${seed}" to ${result}`, () => {
            const context = { randomizationId };
            const evalResult = conditionEvaluator.evaluateConditions([{
              name: 'is_enabled',
              condition: { percent: { ...percentCondition, seed } }
            }], context);
            expect(evalResult.get('is_enabled')).to.equal(result);
          });
        });
      });

      // The following tests are probabilistic. They use tolerances based on
      // standard deviations to balance accuracy and flakiness. Random IDs will
      // hash to the target range + 3 standard deviations 99.7% of the time,
      // which minimizes flakiness.
      // Use python to calculate standard deviation. For example, for 100k
      // trials with 50% probability:
      //   from scipy.stats import binom
      //   print(binom.std(100_000, 0.5) * 3)
      it('should evaluate less or equal to 10% to approx 10%', function() {
        if (nodeVersion.startsWith('14')) {
          this.skip();
        }
        const percentCondition = {
          percentOperator: PercentConditionOperator.LESS_OR_EQUAL,
          microPercent: 10_000_000 // 10%
        };
        const evaluator = new ConditionEvaluator();
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        // 284 is 3 standard deviations for 100k trials with 10% probability.
        const tolerance = 284;
        expect(truthyAssignments).to.be.greaterThanOrEqual(10000 - tolerance);
        expect(truthyAssignments).to.be.lessThanOrEqual(10000 + tolerance);
      });

      it('should evaluate between 0 to 10% to approx 10%', function() {
        if (nodeVersion.startsWith('14')) {
          this.skip();
        }
        const percentCondition = {
          percentOperator: PercentConditionOperator.BETWEEN,
          microPercentRange: {
            microPercentLowerBound: 0,
            microPercentUpperBound: 10_000_000
          }
        };
        const evaluator = new ConditionEvaluator();
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        // 284 is 3 standard deviations for 100k trials with 10% probability.
        const tolerance = 284;
        expect(truthyAssignments).to.be.greaterThanOrEqual(10000 - tolerance);
        expect(truthyAssignments).to.be.lessThanOrEqual(10000 + tolerance);
      });

      it('should evaluate greater than 10% to approx 90%', function() {
        if (nodeVersion.startsWith('14')) {
          this.skip();
        }
        const percentCondition = {
          percentOperator: PercentConditionOperator.GREATER_THAN,
          microPercent: 10_000_000
        };
        const evaluator = new ConditionEvaluator();
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        // 284 is 3 standard deviations for 100k trials with 90% probability.
        const tolerance = 284;
        expect(truthyAssignments).to.be.greaterThanOrEqual(90000 - tolerance);
        expect(truthyAssignments).to.be.lessThanOrEqual(90000 + tolerance);
      });

      it('should evaluate between 40% to 60% to approx 20%', function() {
        if (nodeVersion.startsWith('14')) {
          this.skip();
        }
        const percentCondition = {
          percentOperator: PercentConditionOperator.BETWEEN,
          microPercentRange: {
            microPercentLowerBound: 40_000_000,
            microPercentUpperBound: 60_000_000
          }
        };
        const evaluator = new ConditionEvaluator();
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        // 379 is 3 standard deviations for 100k trials with 20% probability.
        const tolerance = 379;
        expect(truthyAssignments).to.be.greaterThanOrEqual(20000 - tolerance);
        expect(truthyAssignments).to.be.lessThanOrEqual(20000 + tolerance);
      });

      it('should evaluate between interquartile range to approx 50%', function() {
        if (nodeVersion.startsWith('14')) {
          this.skip();
        }
        const percentCondition = {
          percentOperator: PercentConditionOperator.BETWEEN,
          microPercentRange: {
            microPercentLowerBound: 25_000_000,
            microPercentUpperBound: 75_000_000
          }
        };
        const evaluator = new ConditionEvaluator();
        const truthyAssignments = evaluateRandomAssignments(percentCondition, 100_000, evaluator);
        // 474 is 3 standard deviations for 100k trials with 50% probability.
        const tolerance = 474;
        expect(truthyAssignments).to.be.greaterThanOrEqual(50000 - tolerance);
        expect(truthyAssignments).to.be.lessThanOrEqual(50000 + tolerance);
      });

      // Returns the number of assignments which evaluate to true for the specified percent condition.
      // This method randomly generates the ids for each assignment for this purpose.
      function evaluateRandomAssignments(
        condition: PercentCondition,
        numOfAssignments: number,
        conditionEvaluator: ConditionEvaluator): number {

        let evalTrueCount = 0;
        for (let i = 0; i < numOfAssignments; i++) {
          const clonedCondition = {
            ...clone(condition),
            seed: 'seed'
          };
          const context = { randomizationId: crypto.randomUUID() }
          if (conditionEvaluator.evaluateConditions([{
            name: 'is_enabled',
            condition: { percent: clonedCondition }
          }], context).get('is_enabled') == true) { evalTrueCount++ }
        }
        return evalTrueCount;
      }
    });

    describe('customSignalCondition', () => {
      it('should evaluate an unknown operator to false', () => {
        const condition = createNamedCondition('is_enabled', {
          customSignal: {
            customSignalOperator: CustomSignalOperator.UNKNOWN
          }
        });
        const evaluator = new ConditionEvaluator();
        expect(evaluator.evaluateConditions([condition], {})).deep.equals(
          new Map([['is_enabled', false]]));
      });

      it('should handle case when EvaluationContext does not have signal', () => {
        const condition = createNamedCondition('is_enabled', {
          customSignal: {
            customSignalOperator: CustomSignalOperator.STRING_CONTAINS,
            customSignalKey: 'user_prop',
            targetCustomSignalValues: ['def']  // would be contained in 'undefined'
          }
        });
        const evaluator = new ConditionEvaluator();
        const context = { };
        expect(evaluator.evaluateConditions([condition], context)).deep.equals(
          new Map([
            ['is_enabled', false]
          ]));
      });

      interface CustomSignalTestCase {
        targets: string[];
        actual: string|number;
        outcome: boolean;
      }

      function runCustomSignalTestCase(
        operator: CustomSignalOperator
      ): (c: CustomSignalTestCase) => void {
        return ({ targets, actual, outcome }: CustomSignalTestCase) => {
          const targetsStr = JSON.stringify(targets);
          it(`Evalutes ${operator} with targets=${targetsStr} and actual="${actual}" to ${outcome}`, () => {
            const condition = createNamedCondition('is_enabled', {
              customSignal: {
                customSignalOperator: operator,
                customSignalKey: 'user_prop',
                targetCustomSignalValues: targets
              }
            });
            const evaluator = new ConditionEvaluator();
            const context = { 'user_prop': actual };
            expect(evaluator.evaluateConditions([condition], context)).deep.equals(
              new Map([
                ['is_enabled', outcome],
              ]));
          });
        }
      }

      function runCustomSignalTestCaseWithWhitespace(
        operator: CustomSignalOperator
      ): (c: CustomSignalTestCase) => void {
        return (testCase: CustomSignalTestCase) => {
          runCustomSignalTestCase(operator)(testCase);
          runCustomSignalTestCase(operator)({
            ...testCase,
            targets: testCase.targets.map(t => `   ${t} `),
            actual: ` ${testCase.actual}  `
          });
        }
      }

      const invalidNumericSignalTestCase: CustomSignalTestCase = {
        targets: ['5'],
        actual: 'not a number',
        outcome: false
      };

      describe('STRING_CONTAINS', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['foo', 'biz'], actual: 'foobar', outcome: true },
          { targets: ['foo', 'biz'], actual: 'bar', outcome: false },
        ];

        testCases.forEach(runCustomSignalTestCase(CustomSignalOperator.STRING_CONTAINS));
      });

      describe('STRING_DOES_NOT_CONTAIN', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['foo', 'biz'], actual: 'bar', outcome: true },
          { targets: ['foo', 'biz'], actual: 'foobar', outcome: false },
        ];

        testCases.forEach(runCustomSignalTestCase(CustomSignalOperator.STRING_DOES_NOT_CONTAIN));
      });

      describe('STRING_EXACTLY_MATCHES', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['foo', 'bar'], actual: 'bar', outcome: true },
          { targets: [''], actual: '', outcome: true },
          { targets: ['foo', 'biz'], actual: 'foobar', outcome: false },
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.STRING_EXACTLY_MATCHES));
      });

      describe('STRING_CONTAINS_REGEX', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['foo', '^ba.*$'], actual: 'bar', outcome: true },
          { targets: ['  bar   '], actual: 'biz', outcome: false },
        ];

        testCases.forEach(runCustomSignalTestCase(CustomSignalOperator.STRING_CONTAINS_REGEX));
      });

      describe('NUMERIC_LESS_THAN', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['5'], actual: '4', outcome: true },
          { targets: ['5'], actual: '5', outcome: false },
          { targets: ['5'], actual: '6', outcome: false },
          invalidNumericSignalTestCase,
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.NUMERIC_LESS_THAN));
      });

      describe('NUMERIC_LESS_EQUAL', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['5'], actual: '4', outcome: true },
          { targets: ['5'], actual: '5', outcome: true },
          { targets: ['5'], actual: '6', outcome: false },
          invalidNumericSignalTestCase,
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.NUMERIC_LESS_EQUAL));
      });

      describe('NUMERIC_EQUAL', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['5'], actual: '5', outcome: true },
          { targets: ['5'], actual: '6', outcome: false },
          invalidNumericSignalTestCase,
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.NUMERIC_EQUAL));
      });

      describe('NUMERIC_NOT_EQUAL', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['5'], actual: '6', outcome: true },
          { targets: ['5'], actual: '5', outcome: false },
          invalidNumericSignalTestCase,
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.NUMERIC_NOT_EQUAL));
      });

      describe('NUMERIC_GREATER_THAN', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['5'], actual: '6', outcome: true },
          { targets: ['5'], actual: '5', outcome: false },
          { targets: ['5'], actual: '4', outcome: false },
          invalidNumericSignalTestCase,
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.NUMERIC_GREATER_THAN));
      });

      describe('NUMERIC_GREATER_EQUAL', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['5'], actual: '6', outcome: true },
          { targets: ['5'], actual: '5', outcome: true },
          { targets: ['5'], actual: 5.0, outcome: true },
          { targets: ['5.0'], actual: 5.0, outcome: true },
          { targets: ['5'], actual: '4', outcome: false },
          invalidNumericSignalTestCase,
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.NUMERIC_GREATER_EQUAL));
      });

      describe('SEMANTIC_VERSION_LESS_THAN', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['5.12.3'], actual: '5.11.9', outcome: true },
          { targets: ['5.12.3'], actual: '5.12', outcome: true },
          { targets: ['5.12.3'], actual: '5', outcome: true },
          { targets: ['5.12.3'], actual: '5.12.3', outcome: false },
          { targets: ['5.12.3'], actual: '5.12.9', outcome: false },
          invalidNumericSignalTestCase,
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.SEMANTIC_VERSION_LESS_THAN));
      });

      describe('SEMANTIC_VERSION_LESS_EQUAL', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['5.12.3'], actual: '5.11.9', outcome: true },
          { targets: ['5.12.3'], actual: '5.12.3', outcome: true },
          { targets: ['5.12.3'], actual: '5.12.9', outcome: false },
          invalidNumericSignalTestCase,
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.SEMANTIC_VERSION_LESS_EQUAL));
      });

      describe('SEMANTIC_VERSION_EQUAL', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['5.12.3'], actual: '5.12.3', outcome: true },
          { targets: ['5'], actual: 5.0, outcome: true },
          { targets: ['5.0'], actual: 5.0, outcome: true },
          { targets: ['5.12.3'], actual: '5.12.9', outcome: false },
          { targets: ['5.12.3'], actual: '5.12.3.0.0.0.0', outcome: false },
          invalidNumericSignalTestCase,
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.SEMANTIC_VERSION_EQUAL));
      });

      describe('SEMANTIC_VERSION_NOT_EQUAL', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['5.12.3'], actual: '5.12.9', outcome: true },
          { targets: ['5'], actual: 5.0, outcome: false },
          { targets: ['5.0'], actual: 5.0, outcome: false },
          { targets: ['5.12.3'], actual: '5.12.3', outcome: false },
          { targets: ['5.12.3'], actual: '5.12.3.0.0.0.0', outcome: false },
          invalidNumericSignalTestCase,
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.SEMANTIC_VERSION_NOT_EQUAL));
      });

      describe('SEMANTIC_VERSION_GREATER_THAN', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['5.12.3'], actual: '5.13.9', outcome: true },
          { targets: ['5.12.3'], actual: '5.13', outcome: true },
          { targets: ['5.12.3'], actual: '6', outcome: true },
          { targets: ['5.12.3'], actual: '5.12.3', outcome: false },
          { targets: ['5.12.3'], actual: '5.11.9', outcome: false },
          invalidNumericSignalTestCase,
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.SEMANTIC_VERSION_GREATER_THAN));
      });

      describe('SEMANTIC_VERSION_GREATER_EQUAL', () => {
        const testCases: CustomSignalTestCase[] = [
          { targets: ['5.12.3'], actual: '5.13.9', outcome: true },
          { targets: ['5.12.3'], actual: '5.12.3', outcome: true },
          { targets: ['5'], actual: 5.0, outcome: true },
          { targets: ['5.0'], actual: 5.0, outcome: true },
          { targets: ['5.12.3'], actual: '5.11.9', outcome: false },
          invalidNumericSignalTestCase
        ];

        testCases.forEach(runCustomSignalTestCaseWithWhitespace(CustomSignalOperator.SEMANTIC_VERSION_GREATER_EQUAL));
      });
    });
  });
});
