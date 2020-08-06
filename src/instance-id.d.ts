import * as _admin from './index.d';

export namespace admin.instanceId {
  /**
   * Gets the {@link InstanceId `InstanceId`} service for the
   * current app.
   *
   * @example
   * ```javascript
   * var instanceId = app.instanceId();
   * // The above is shorthand for:
   * // var instanceId = admin.instanceId(app);
   * ```
   *
   * @return The `InstanceId` service for the
   *   current app.
   */
  interface InstanceId {
    app: _admin.app.App;

    /**
     * Deletes the specified instance ID and the associated data from Firebase.
     *
     * Note that Google Analytics for Firebase uses its own form of Instance ID to
     * keep track of analytics data. Therefore deleting a Firebase Instance ID does
     * not delete Analytics data. See
     * [Delete an Instance ID](/support/privacy/manage-iids#delete_an_instance_id)
     * for more information.
     *
     * @param instanceId The instance ID to be deleted.
     *
     * @return A promise fulfilled when the instance ID is deleted.
     */
    deleteInstanceId(instanceId: string): Promise<void>;
  }
}
