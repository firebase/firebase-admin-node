/*!
 * Copyright 2021 Google LLC
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

import { App } from '../app';

// Import all public types with aliases, and re-export from the auth namespace.

import { Fpnv as TFpnv } from './fpnv';

import {
  BaseFpnv as TBaseFpnv,
} from './base-fpnv';

import {
  FpnvToken as TFpnvToken,
} from './token-verifier';


export declare function fpnv(app?: App): fpnv.Fpnv;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace fpnv {
    export type BaseFpnv = TBaseFpnv;
    export type Fpnv = TFpnv;
    export type FpnvToken = TFpnvToken;
}
