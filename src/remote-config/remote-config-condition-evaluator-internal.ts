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

import {
  RemoteConfigServerAndCondition,
  RemoteConfigServerCondition,
  RemoteConfigServerOrCondition,
  RemoteConfigServerPercentCondition,
} from './remote-config-api';

export class RemoteConfigConditionEvaluator {
  private static MAX_CONDITION_RECURSION_DEPTH = 10;

  public evaluateConditions(conditions: RemoteConfigServerCondition[]): Map<string, boolean> {
    // The order of the conditions is significant.
    // A JS Map preserves the order of insertion ("Iteration happens in insertion order"
    // - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#description).
    const evaluatedConditions = new Map();

    for (const condition of conditions) {
      evaluatedConditions.set(condition.name, this.evaluateCondition(condition));
    }

    return evaluatedConditions;
  }

  public evaluateCondition(condition: RemoteConfigServerCondition, nestingLevel: number = 0): boolean {
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

  private evaluatePercentCondition(percentCondition: RemoteConfigServerPercentCondition): boolean {
    // TODO: implement
    return false;
  }
}
