/*!
 * @license
 * Copyright 2025 Google LLC
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

import { getDataConnect } from './index';
import { DataConnect } from './data-connect';
import { ConnectorConfig, OperationOptions } from './data-connect-api';
import {
  DATA_CONNECT_ERROR_CODE_MAPPING,
  FirebaseDataConnectError,
} from './data-connect-api-client-internal';

/**
 * @internal
 * 
 * The generated Admin SDK will allow the user to pass in variables, a Data Connect
 * instance, or operation options. The only required argument is the variables,
 * which are only required when the operation has at least one required variable.
 * Otherwise, all arguments are optional. 
 * 
 * This function validates the variables and returns back the DataConnect instance, 
 * variables, and options based on the arguments passed in. It always returns a
 * DataConnect instance, using the connectorConfig to grab one if not provided.
 * 
 * For this function to work properly, if the operation has variables (optional
 * are required), you must pass hasVars: true (if there are no variables, it is
 * not required, since undefined is false-y).
 * 
 * Usage examples can be found in test files.
 * 
 * @param connectorConfig - DataConnect connector config
 * @param dcOrVarsOrOptions - the first argument provided to a generated admin function
 * @param varsOrOptions - the second argument provided to a generated admin function
 * @param options - the third argument provided to a generated admin function
 * @param hasVars - boolean parameter indicating whether the operation has variables
 * @param validateVars - boolean parameter indicating whether we should expect to find a value for realVars
 * @returns parsed DataConnect, Variables, and Options for the operation
 */
export function _validateAdminArgs<Variables extends object>(
  connectorConfig: ConnectorConfig,
  dcOrVarsOrOptions?: DataConnect | Variables | OperationOptions,
  varsOrOptions?: Variables | OperationOptions,
  options?: OperationOptions,
  hasVars?: boolean,
  validateVars?: boolean
): { dc: DataConnect; vars: Variables; options: OperationOptions; } {
  let dcInstance: DataConnect;
  let realVars: Variables;
  let realOptions: OperationOptions;

  if (dcOrVarsOrOptions && 'connectorConfig' in dcOrVarsOrOptions) {
    dcInstance = dcOrVarsOrOptions as DataConnect;
    if (hasVars) {
      realVars = varsOrOptions as Variables;
      realOptions = options as OperationOptions;
    } else {
      realVars = undefined as unknown as Variables;
      realOptions = varsOrOptions as OperationOptions;
    }
  } else {
    dcInstance = getDataConnect(connectorConfig);
    if (hasVars) {
      realVars = dcOrVarsOrOptions as Variables;
      realOptions = varsOrOptions as OperationOptions;
    } else {
      realVars = undefined as unknown as Variables;
      realOptions = dcOrVarsOrOptions as OperationOptions;
    }
  }

  if (!dcInstance || (!realVars && validateVars)) {
    throw new FirebaseDataConnectError(
      DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
      'Variables required.'
    );
  }
  return { dc: dcInstance, vars: realVars, options: realOptions };
}
