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

import {
  AndCondition,
  OneOfCondition,
  EvaluationContext,
  NamedCondition,
  OrCondition,
  PercentCondition,
  PercentConditionOperator
} from './remote-config-api';
import * as farmhash from 'farmhash-modern';

/**
 * Encapsulates condition evaluation logic to simplify organization and
 * facilitate testing.
 *
 * @internal
 */
export class ConditionEvaluator {
  private static MAX_CONDITION_RECURSION_DEPTH = 10;

  public evaluateConditions(
    namedConditions: NamedCondition[],
    context: EvaluationContext): Map<string, boolean> {
    // The order of the conditions is significant.
    // A JS Map preserves the order of insertion ("Iteration happens in insertion order"
    // - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#description).
    const evaluatedConditions = new Map();

    for (const namedCondition of namedConditions) {
      evaluatedConditions.set(
        namedCondition.name,
        this.evaluateCondition(namedCondition.condition, context));
    }

    return evaluatedConditions;
  }

  private evaluateCondition(
    condition: OneOfCondition,
    context: EvaluationContext,
    nestingLevel = 0): boolean {
    if (nestingLevel >= ConditionEvaluator.MAX_CONDITION_RECURSION_DEPTH) {
      // TODO: add logging once we have a wrapped logger.
      return false;
    }
    if (condition.orCondition) {
      return this.evaluateOrCondition(condition.orCondition, context, nestingLevel + 1)
    }
    if (condition.andCondition) {
      return this.evaluateAndCondition(condition.andCondition, context, nestingLevel + 1)
    }
    if (condition.true) {
      return true;
    }
    if (condition.false) {
      return false;
    }
    if (condition.percent) {
      return this.evaluatePercentCondition(condition.percent, context);
    }
    // TODO: add logging once we have a wrapped logger.
    return false;
  }

  private evaluateOrCondition(
    orCondition: OrCondition,
    context: EvaluationContext,
    nestingLevel: number): boolean {

    const subConditions = orCondition.conditions || [];

    for (const subCondition of subConditions) {
      // Recursive call.
      const result = this.evaluateCondition(
        subCondition, context, nestingLevel + 1);

      // Short-circuit the evaluation result for true.
      if (result) {
        return result;
      }
    }
    return false;
  }

  private evaluateAndCondition(
    andCondition: AndCondition,
    context: EvaluationContext,
    nestingLevel: number): boolean {

    const subConditions = andCondition.conditions || [];

    for (const subCondition of subConditions) {
      // Recursive call.
      const result = this.evaluateCondition(
        subCondition, context, nestingLevel + 1);

      // Short-circuit the evaluation result for false.
      if (!result) {
        return result;
      }
    }
    return true;
  }

  private evaluatePercentCondition(
    percentCondition: PercentCondition,
    context: EvaluationContext
  ): boolean {
    if (!context.randomizationId) {
      // TODO: add logging once we have a wrapped logger.
      return false;
    }

    // This is the entry point for processing percent condition data from the response.
    // We're not using a proto library, so we can't assume undefined fields have
    // default values.
    const { seed, percentOperator, microPercent, microPercentRange } = percentCondition;

    if (!percentOperator) {
      // TODO: add logging once we have a wrapped logger.
      return false;
    }

    const normalizedMicroPercent = microPercent || 0;
    const normalizedMicroPercentUpperBound = microPercentRange?.microPercentUpperBound || 0;
    const normalizedMicroPercentLowerBound = microPercentRange?.microPercentLowerBound || 0;

    const seedPrefix = seed && seed.length > 0 ? `${seed}.` : '';
    const stringToHash = `${seedPrefix}${context.randomizationId}`;

    const hash64 = ConditionEvaluator.hashSeededRandomizationId(stringToHash)

    const instanceMicroPercentile = hash64 % BigInt(100 * 1_000_000);

    switch (percentOperator) {
    case PercentConditionOperator.LESS_OR_EQUAL:
      return instanceMicroPercentile <= normalizedMicroPercent;
    case PercentConditionOperator.GREATER_THAN:
      return instanceMicroPercentile > normalizedMicroPercent;
    case PercentConditionOperator.BETWEEN:
      return instanceMicroPercentile > normalizedMicroPercentLowerBound
          && instanceMicroPercentile <= normalizedMicroPercentUpperBound;
    case PercentConditionOperator.UNKNOWN:
    default:
      break;
    }

    // TODO: add logging once we have a wrapped logger.
    return false;
  }

  // Visible for testing
  static hashSeededRandomizationId(seededRandomizationId: string): bigint {
    // For consistency with the Remote Config fetch endpoint's percent condition behavior
    // we use Farmhash's fingerprint64 algorithm and interpret the resulting unsigned value
    // as a signed value.
    let hash64 = BigInt.asIntN(64, farmhash.fingerprint64(seededRandomizationId));

    // Manually negate the hash if its value is less than 0, since Math.abs doesn't
    // support BigInt.
    if (hash64 < 0) {
      hash64 = -hash64;
    }

    return hash64;
  }
}
