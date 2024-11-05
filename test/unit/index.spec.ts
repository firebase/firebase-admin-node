/*!
 * @license
 * Copyright 2017 Google Inc.
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

// General
import './firebase.spec';
import './app/credential-internal.spec';
import './app/index.spec';
import './app/firebase-app.spec';
import './app/firebase-namespace.spec';

// Utilities
import './utils/index.spec';
import './utils/error.spec';
import './utils/validator.spec';
import './utils/api-request.spec';
import './utils/jwt.spec';
import './utils/crypto-signer.spec';

// Auth
import './auth/auth.spec';
import './auth/index.spec';
import './auth/user-record.spec';
import './auth/token-generator.spec';
import './auth/token-verifier.spec';
import './auth/auth-api-request.spec';
import './auth/user-import-builder.spec';
import './auth/action-code-settings-builder.spec';
import './auth/auth-config.spec';
import './auth/tenant.spec';
import './auth/tenant-manager.spec';

// Database
import './database/database.spec';
import './database/index.spec';

// Messaging
import './messaging/index.spec';
import './messaging/messaging.spec';

// Machine Learning
import './machine-learning/index.spec';
import './machine-learning/machine-learning.spec';
import './machine-learning/machine-learning-api-client.spec';

// Storage
import './storage/storage.spec';
import './storage/index.spec';

// Firestore
import './firestore/firestore.spec';
import './firestore/index.spec';

// Installations
import './installations/installations.spec';
import './installations/installations-request-handler.spec';

// Installations
import './installations/installations.spec';
import './installations/installations-request-handler.spec';

// Installations
import './installations/installations.spec';
import './installations/installations-request-handler.spec';

// InstanceId
import './instance-id/index.spec';
import './instance-id/instance-id.spec';

// ProjectManagement
import './project-management/index.spec';
import './project-management/project-management.spec';
import './project-management/project-management-api-request.spec';
import './project-management/android-app.spec';
import './project-management/ios-app.spec';

// SecurityRules
import './security-rules/index.spec';
import './security-rules/security-rules.spec';
import './security-rules/security-rules-api-client.spec';

// RemoteConfig
import './remote-config/index.spec';
import './remote-config/remote-config.spec';
import './remote-config/remote-config-api-client.spec';
import './remote-config/condition-evaluator.spec';
import './remote-config/internal/value-impl.spec';

// AppCheck
import './app-check/app-check.spec';
import './app-check/app-check-api-client-internal.spec';
import './app-check/token-generator.spec';
import './app-check/token-verifier.spec';

// Eventarc
import './eventarc/eventarc.spec';
import './eventarc/eventarc-utils.spec';

// Functions
import './functions/index.spec';
import './functions/functions.spec';
import './functions/functions-api-client-internal.spec';

// Extensions
import './extensions/extensions.spec';
import './extensions/extensions-api-client-internal.spec';
