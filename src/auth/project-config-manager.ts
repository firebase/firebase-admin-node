/*!
 * Copyright 2022 Google Inc.
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
import { ProjectConfig, ProjectConfigServerResponse, UpdateProjectConfigRequest } from './project-config';
import {
  AuthRequestHandler,
} from './auth-api-request';

/**
 * Manages (gets and updates) the current project config.
 */
export class ProjectConfigManager {
  private readonly authRequestHandler: AuthRequestHandler;
  /**
   * Initializes a ProjectConfigManager instance for a specified FirebaseApp.
   *
   * @param app - The app for this ProjectConfigManager instance.
   *
   * @constructor
   * @internal
   */
  constructor(app: App) {
    this.authRequestHandler = new AuthRequestHandler(app);
  }

  /**
   * Get the project configuration.
   *
   * @returns A promise fulfilled with the project configuration.
   */
  public getProjectConfig(): Promise<ProjectConfig> {
    return this.authRequestHandler.getProjectConfig()
      .then((response: ProjectConfigServerResponse) => {
        return new ProjectConfig(response);
      })
  }
  /**
   * Updates an existing project configuration.
   *
   * @param projectConfigOptions - The properties to update on the project.
   *
   * @returns A promise fulfilled with the updated project config.
   */
  public updateProjectConfig(projectConfigOptions: UpdateProjectConfigRequest): Promise<ProjectConfig> {
    return this.authRequestHandler.updateProjectConfig(projectConfigOptions)
      .then((response: ProjectConfigServerResponse) => {
        return new ProjectConfig(response);
      })
  }
}
