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

import { isNumber } from 'lodash';
import {
  RemoteConfigServerAndCondition,
  RemoteConfigServerCondition,
  RemoteConfigServerNamedCondition,
  RemoteConfigServerOrCondition,
  RemoteConfigServerPercentCondition,
  PercentConditionOperator
} from './remote-config-api';
import * as farmhash from 'farmhash';
import { FirebaseRemoteConfigError } from './remote-config-api-client-internal';

/**
 * Encapsulates condition evaluation logic to simplify organization and
 * facilitate testing.
 *
 * @internal
 */
export class RemoteConfigConditionEvaluator {
  private static MAX_CONDITION_RECURSION_DEPTH = 10;

  public evaluateConditions(namedConditions: RemoteConfigServerNamedCondition[]): Map<string, boolean> {
    // The order of the conditions is significant.
    // A JS Map preserves the order of insertion ("Iteration happens in insertion order"
    // - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#description).
    const evaluatedConditions = new Map();

    for (const namedCondition of namedConditions) {
      evaluatedConditions.set(
        namedCondition.name,
        this.evaluateCondition(namedCondition.condition));
    }

    return evaluatedConditions;
  }

  private evaluateCondition(condition: RemoteConfigServerCondition, nestingLevel = 0): boolean {
    if (nestingLevel >= RemoteConfigConditionEvaluator.MAX_CONDITION_RECURSION_DEPTH) {
      console.log('Evaluating condition to false because it exceeded maximum depth ' +
        RemoteConfigConditionEvaluator.MAX_CONDITION_RECURSION_DEPTH);
      return false;
    }
    if (condition.or) {
      return this.evaluateOrCondition(condition.or, nestingLevel + 1)
    }
    if (condition.and) {
      return this.evaluateAndCondition(condition.and, nestingLevel + 1)
    }
    if (condition.true) {
      return true;
    }
    if (condition.false) {
      return false;
    }
    if (condition.percent) {
      return this.evaluatePercentCondition(condition.percent);
    }
    console.log(`Evaluating unknown condition ${JSON.stringify(condition)} to false.`);
    return false;
  }

  private evaluateOrCondition(orCondition: RemoteConfigServerOrCondition, nestingLevel: number): boolean {

    const subConditions = orCondition.conditions || [];

    for (const subCondition of subConditions) {
      // Recursive call.
      const result = this.evaluateCondition(subCondition, nestingLevel + 1);

      // Short-circuit the evaluation result for true.
      if (result) {
        return result;
      }
    }
    return false;
  }

  private evaluateAndCondition(andCondition: RemoteConfigServerAndCondition, nestingLevel: number): boolean {

    const subConditions = andCondition.conditions || [];

    for (const subCondition of subConditions) {
      // Recursive call.
      const result = this.evaluateCondition(subCondition, nestingLevel + 1);

      // Short-circuit the evaluation result for false.
      if (!result) {
        return result;
      }
    }
    return true;
  }

  private evaluatePercentCondition(
    percentCondition: RemoteConfigServerPercentCondition, 
    context = { id: '' } // TODO: update context interface once we have a RemoteConfigServerContext object
  ): boolean {
    const { seed, operator, microPercent, microPercentRange } = percentCondition;
      
    if (!operator) {
      throw new FirebaseRemoteConfigError('failed-precondition', 'invalid operator in remote config server condition');
    }

    const seedPrefix = seed && seed.length > 0 ? `${seed}.` : '';
    const stringToHash = `${seedPrefix}${context.id}`;
    const hash64 = parseFloat(farmhash.fingerprint64(stringToHash));
    const instanceMicroPercentile = hash64 % (100 * 1_000_000);

    switch (operator) {
    case PercentConditionOperator.LESS_OR_EQUAL:
      if (isNumber(microPercent)) {
        return instanceMicroPercentile <= microPercent;
      }
      break;
    case PercentConditionOperator.GREATER_THAN:
      if (isNumber(microPercent)) {
        return instanceMicroPercentile > microPercent;
      }
      break;
    case PercentConditionOperator.BETWEEN:
      if (microPercentRange && isNumber(microPercentRange.microPercentLowerBound) 
        && isNumber(microPercentRange.microPercentUpperBound)) {
        return instanceMicroPercentile > microPercentRange.microPercentLowerBound
                  && instanceMicroPercentile <= microPercentRange.microPercentUpperBound;
      }
      break;
    case PercentConditionOperator.UNKNOWN:
    default:
      break;
    }
    
    throw new FirebaseRemoteConfigError('failed-precondition', 'invalid operator in remote config server condition');
  }
}
