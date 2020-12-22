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
import './firebase-app.spec';
import './firebase-namespace.spec';

// Utilities
import './utils/index.spec';
import './utils/error.spec';
import './utils/validator.spec';
import './utils/api-request.spec';

// Auth
import './auth/auth.spec';
import './auth/user-record.spec';
import './auth/token-generator.spec';
import './auth/token-verifier.spec';
import './auth/auth-api-request.spec';
import './auth/user-import-builder.spec';
import './auth/action-code-settings-builder.spec';
import './auth/auth-config.spec';
import './auth/tenant.spec';
import './auth/tenant-manager.spec';

// Credential
import './credential/credential.spec';

// Database
import './database/database.spec';

// Messaging
import './messaging/messaging.spec';
import './messaging/batch-requests.spec';

// Machine Learning
import './machine-learning/machine-learning.spec';
import './machine-learning/machine-learning-api-client.spec';

// Storage
import './storage/storage.spec';

// Firestore
import './firestore/firestore.spec';

// InstanceId
import './instance-id/instance-id.spec';
import './instance-id/instance-id-request.spec';

// ProjectManagement
import './project-management/project-management.spec';
import './project-management/project-management-api-request.spec';
import './project-management/android-app.spec';
import './project-management/ios-app.spec';

// SecurityRules
import './security-rules/security-rules.spec';
import './security-rules/security-rules-api-client.spec';

// RemoteConfig
import './remote-config/remote-config.spec';
import './remote-config/remote-config-api-client.spec';
