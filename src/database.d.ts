import * as _admin from './index.d';

/* eslint-disable @typescript-eslint/ban-types */

export namespace admin.database {

  /**
   * The Firebase Realtime Database service interface.
   *
   * Do not call this constructor directly. Instead, use
   * [`admin.database()`](admin.database#database).
   *
   * See
   * {@link
   *   https://firebase.google.com/docs/database/admin/start/
   *   Introduction to the Admin Database API}
   * for a full guide on how to use the Firebase Realtime Database service.
   */
  interface Database {
    app: _admin.app.App;

    /**
     * Disconnects from the server (all Database operations will be completed
     * offline).
     *
     * The client automatically maintains a persistent connection to the Database
     * server, which will remain active indefinitely and reconnect when
     * disconnected. However, the `goOffline()` and `goOnline()` methods may be used
     * to control the client connection in cases where a persistent connection is
     * undesirable.
     *
     * While offline, the client will no longer receive data updates from the
     * Database. However, all Database operations performed locally will continue to
     * immediately fire events, allowing your application to continue behaving
     * normally. Additionally, each operation performed locally will automatically
     * be queued and retried upon reconnection to the Database server.
     *
     * To reconnect to the Database and begin receiving remote events, see
     * `goOnline()`.
     *
     * @example
     * ```javascript
     * admin.database().goOffline();
     * ```
     */
    goOffline(): void;

    /**
     * Reconnects to the server and synchronizes the offline Database state
     * with the server state.
     *
     * This method should be used after disabling the active connection with
     * `goOffline()`. Once reconnected, the client will transmit the proper data
     * and fire the appropriate events so that your client "catches up"
     * automatically.
     *
     * @example
     * ```javascript
     * admin.database().goOnline();
     * ```
     */
    goOnline(): void;

    /**
     * Returns a `Reference` representing the location in the Database
     * corresponding to the provided path. Also can be invoked with an existing
     * `Reference` as the argument. In that case returns a new `Reference`
     * pointing to the same location. If no path argument is
     * provided, returns a `Reference` that represents the root of the Database.
     *
     * @example
     * ```javascript
     * // Get a reference to the root of the Database
     * var rootRef = admin.database.ref();
     * ```
     *
     * @example
     * ```javascript
     * // Get a reference to the /users/ada node
     * var adaRef = admin.database().ref("users/ada");
     * // The above is shorthand for the following operations:
     * //var rootRef = admin.database().ref();
     * //var adaRef = rootRef.child("users/ada");
     * ```
     *
     * @example
     * ```javascript
     * var adaRef = admin.database().ref("users/ada");
     * // Get a new reference pointing to the same location.
     * var anotherAdaRef = admin.database().ref(adaRef);
     * ```
     *
     *
     * @param path Optional path representing
     *   the location the returned `Reference` will point. Alternatively, a
     *   `Reference` object to copy. If not provided, the returned `Reference` will
     *   point to the root of the Database.
     * @return If a path is provided, a `Reference`
     *   pointing to the provided path. Otherwise, a `Reference` pointing to the
     *   root of the Database.
     */
    ref(path?: string | admin.database.Reference): admin.database.Reference;

    /**
     * Returns a `Reference` representing the location in the Database
     * corresponding to the provided Firebase URL.
     *
     * An exception is thrown if the URL is not a valid Firebase Database URL or it
     * has a different domain than the current `Database` instance.
     *
     * Note that all query parameters (`orderBy`, `limitToLast`, etc.) are ignored
     * and are not applied to the returned `Reference`.
     *
     * @example
     * ```javascript
     * // Get a reference to the root of the Database
     * var rootRef = admin.database().ref("https://<DATABASE_NAME>.firebaseio.com");
     * ```
     *
     * @example
     * ```javascript
     * // Get a reference to the /users/ada node
     * var adaRef = admin.database().ref("https://<DATABASE_NAME>.firebaseio.com/users/ada");
     * ```
     *
     * @param url The Firebase URL at which the returned `Reference` will
     *   point.
     * @return  A `Reference` pointing to the provided Firebase URL.
     */
    refFromURL(url: string): admin.database.Reference;

    /**
     * Gets the currently applied security rules as a string. The return value consists of
     * the rules source including comments.
     *
     * @return A promise fulfilled with the rules as a raw string.
     */
    getRules(): Promise<string>;

    /**
     * Gets the currently applied security rules as a parsed JSON object. Any comments in
     * the original source are stripped away.
     *
     * @return A promise fulfilled with the parsed rules object.
     */
    getRulesJSON(): Promise<object>;

    /**
     * Sets the specified rules on the Firebase Realtime Database instance. If the rules source is
     * specified as a string or a Buffer, it may include comments.
     *
     * @param source Source of the rules to apply. Must not be `null` or empty.
     * @return Resolves when the rules are set on the Realtime Database.
     */
    setRules(source: string | Buffer | object): Promise<void>;
  }

  /**
   * A `DataSnapshot` contains data from a Database location.
   *
   * Any time you read data from the Database, you receive the data as a
   * `DataSnapshot`. A `DataSnapshot` is passed to the event callbacks you attach
   * with `on()` or `once()`. You can extract the contents of the snapshot as a
   * JavaScript object by calling the `val()` method. Alternatively, you can
   * traverse into the snapshot by calling `child()` to return child snapshots
   * (which you could then call `val()` on).
   *
   * A `DataSnapshot` is an efficiently generated, immutable copy of the data at
   * a Database location. It cannot be modified and will never change (to modify
   * data, you always call the `set()` method on a `Reference` directly).
   */
  interface DataSnapshot {
    key: string | null;
    ref: admin.database.Reference;

    /**
     * Gets another `DataSnapshot` for the location at the specified relative path.
     *
     * Passing a relative path to the `child()` method of a DataSnapshot returns
     * another `DataSnapshot` for the location at the specified relative path. The
     * relative path can either be a simple child name (for example, "ada") or a
     * deeper, slash-separated path (for example, "ada/name/first"). If the child
     * location has no data, an empty `DataSnapshot` (that is, a `DataSnapshot`
     * whose value is `null`) is returned.
     *
     * @example
     * ```javascript
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * // Test for the existence of certain keys within a DataSnapshot
     * var ref = admin.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var name = snapshot.child("name").val(); // {first:"Ada",last:"Lovelace"}
     *     var firstName = snapshot.child("name/first").val(); // "Ada"
     *     var lastName = snapshot.child("name").child("last").val(); // "Lovelace"
     *     var age = snapshot.child("age").val(); // null
     *   });
     * ```
     *
     * @param path A relative path to the location of child data.
     * @return `DataSnapshot` for the location at the specified relative path.
     */
    child(path: string): admin.database.DataSnapshot;

    /**
     * Returns true if this `DataSnapshot` contains any data. It is slightly more
     * efficient than using `snapshot.val() !== null`.
     *
     * @example
     * ```javascript
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * // Test for the existence of certain keys within a DataSnapshot
     * var ref = admin.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var a = snapshot.exists();  // true
     *     var b = snapshot.child("name").exists(); // true
     *     var c = snapshot.child("name/first").exists(); // true
     *     var d = snapshot.child("name/middle").exists(); // false
     *   });
     * ```
     *
     * @return Whether this `DataSnapshot` contains any data.
     */
    exists(): boolean;

    /**
     * Exports the entire contents of the DataSnapshot as a JavaScript object.
     *
     * The `exportVal()` method is similar to `val()`, except priority information
     * is included (if available), making it suitable for backing up your data.
     *
     * @return The DataSnapshot's contents as a JavaScript value (Object,
     *   Array, string, number, boolean, or `null`).
     */
    exportVal(): any;

    /**
     * Enumerates the top-level children in the `DataSnapshot`.
     *
     * Because of the way JavaScript objects work, the ordering of data in the
     * JavaScript object returned by `val()` is not guaranteed to match the ordering
     * on the server nor the ordering of `child_added` events. That is where
     * `forEach()` comes in handy. It guarantees the children of a `DataSnapshot`
     * will be iterated in their query order.
     *
     * If no explicit `orderBy*()` method is used, results are returned
     * ordered by key (unless priorities are used, in which case, results are
     * returned by priority).
     *
     * @example
     * ```javascript
     *
     * // Assume we have the following data in the Database:
     * {
     *   "users": {
     *     "ada": {
     *       "first": "Ada",
     *       "last": "Lovelace"
     *     },
     *     "alan": {
     *       "first": "Alan",
     *       "last": "Turing"
     *     }
     *   }
     * }
     *
     * // Loop through users in order with the forEach() method. The callback
     * // provided to forEach() will be called synchronously with a DataSnapshot
     * // for each child:
     * var query = admin.database().ref("users").orderByKey();
     * query.once("value")
     *   .then(function(snapshot) {
     *     snapshot.forEach(function(childSnapshot) {
     *       // key will be "ada" the first time and "alan" the second time
     *       var key = childSnapshot.key;
     *       // childData will be the actual contents of the child
     *       var childData = childSnapshot.val();
     *   });
     * });
     * ```
     *
     * @example
     * ```javascript
     * // You can cancel the enumeration at any point by having your callback
     * // function return true. For example, the following code sample will only
     * // fire the callback function one time:
     * var query = admin.database().ref("users").orderByKey();
     * query.once("value")
     *   .then(function(snapshot) {
     *     snapshot.forEach(function(childSnapshot) {
     *       var key = childSnapshot.key; // "ada"
     *
     *       // Cancel enumeration
     *       return true;
     *   });
     * });
     * ```
     *
     * @param action A function
     *   that will be called for each child `DataSnapshot`. The callback can return
     *   true to cancel further enumeration.
     * @return True if enumeration was canceled due to your callback
     *   returning true.
     */
    forEach(action: (a: admin.database.DataSnapshot) => boolean | void): boolean;

    /**
     * Gets the priority value of the data in this `DataSnapshot`.
     *
     * Applications need not use priority but can order collections by
     * ordinary properties (see
     * {@link
      *  https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
      *  Sorting and filtering data}).
      *
      * @return The the priority value of the data in this `DataSnapshot`.
      */
    getPriority(): string | number | null;

    /**
     * Returns true if the specified child path has (non-null) data.
     *
     * @example
     * ```javascript
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * // Determine which child keys in DataSnapshot have data.
     * var ref = admin.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var hasName = snapshot.hasChild("name"); // true
     *     var hasAge = snapshot.hasChild("age"); // false
     *   });
     * ```
     *
     * @param path A relative path to the location of a potential child.
     * @return `true` if data exists at the specified child path; else
     *  `false`.
     */
    hasChild(path: string): boolean;

    /**
     * Returns whether or not the `DataSnapshot` has any non-`null` child
     * properties.
     *
     * You can use `hasChildren()` to determine if a `DataSnapshot` has any
     * children. If it does, you can enumerate them using `forEach()`. If it
     * doesn't, then either this snapshot contains a primitive value (which can be
     * retrieved with `val()`) or it is empty (in which case, `val()` will return
     * `null`).
     *
     * @example
     * ```javascript
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * var ref = admin.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var a = snapshot.hasChildren(); // true
     *     var b = snapshot.child("name").hasChildren(); // true
     *     var c = snapshot.child("name/first").hasChildren(); // false
     *   });
     * ```
     *
     * @return True if this snapshot has any children; else false.
     */
    hasChildren(): boolean;

    /**
     * Returns the number of child properties of this `DataSnapshot`.
     *
     * @example
     * ```javascript
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * var ref = admin.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var a = snapshot.numChildren(); // 1 ("name")
     *     var b = snapshot.child("name").numChildren(); // 2 ("first", "last")
     *     var c = snapshot.child("name/first").numChildren(); // 0
     *   });
     * ```
     *
     * @return The number of child properties of this `DataSnapshot`.
     */
    numChildren(): number;

    /**
     * @return A JSON-serializable representation of this object.
     */
    toJSON(): Object | null;

    /**
     * Extracts a JavaScript value from a `DataSnapshot`.
     *
     * Depending on the data in a `DataSnapshot`, the `val()` method may return a
     * scalar type (string, number, or boolean), an array, or an object. It may also
     * return null, indicating that the `DataSnapshot` is empty (contains no data).
     *
     * @example
     * ```javascript
     * // Write and then read back a string from the Database.
     * ref.set("hello")
     *   .then(function() {
     *     return ref.once("value");
     *   })
     *   .then(function(snapshot) {
     *     var data = snapshot.val(); // data === "hello"
     *   });
     * ```
     *
     * @example
     * ```javascript
     * // Write and then read back a JavaScript object from the Database.
     * ref.set({ name: "Ada", age: 36 })
     *   .then(function() {
     *    return ref.once("value");
     *   })
     *   .then(function(snapshot) {
     *     var data = snapshot.val();
     *     // data is { "name": "Ada", "age": 36 }
     *     // data.name === "Ada"
     *     // data.age === 36
     *   });
     * ```
     *
     * @return The DataSnapshot's contents as a JavaScript value (Object,
     *   Array, string, number, boolean, or `null`).
     */
    val(): any;
  }

  /**
   * The `onDisconnect` class allows you to write or clear data when your client
   * disconnects from the Database server. These updates occur whether your
   * client disconnects cleanly or not, so you can rely on them to clean up data
   * even if a connection is dropped or a client crashes.
   *
   * The `onDisconnect` class is most commonly used to manage presence in
   * applications where it is useful to detect how many clients are connected and
   * when other clients disconnect. See
   * {@link
    *   https://firebase.google.com/docs/database/web/offline-capabilities
    *   Enabling Offline Capabilities in JavaScript} for more information.
    *
    * To avoid problems when a connection is dropped before the requests can be
    * transferred to the Database server, these functions should be called before
    * any data is written.
    *
    * Note that `onDisconnect` operations are only triggered once. If you want an
    * operation to occur each time a disconnect occurs, you'll need to re-establish
    * the `onDisconnect` operations each time you reconnect.
    */
  interface OnDisconnect {

    /**
     * Cancels all previously queued `onDisconnect()` set or update events for this
     * location and all children.
     *
     * If a write has been queued for this location via a `set()` or `update()` at a
     * parent location, the write at this location will be canceled, though all
     * other siblings will still be written.
     *
     * @example
     * ```javascript
     * var ref = admin.database().ref("onlineState");
     * ref.onDisconnect().set(false);
     * // ... sometime later
     * ref.onDisconnect().cancel();
     * ```
     *
     * @param onComplete An optional callback function that is
     *   called when synchronization to the server has completed. The callback
     *   will be passed a single parameter: null for success, or an Error object
     *   indicating a failure.
     * @return Resolves when synchronization to the server is complete.
     */
    cancel(onComplete?: (a: Error | null) => any): Promise<void>;

    /**
     * Ensures the data at this location is deleted when the client is disconnected
     * (due to closing the browser, navigating to a new page, or network issues).
     *
     * @param onComplete An optional callback function that is
     *   called when synchronization to the server has completed. The callback
     *   will be passed a single parameter: null for success, or an Error object
     *   indicating a failure.
     * @return Resolves when synchronization to the server is complete.
     */
    remove(onComplete?: (a: Error | null) => any): Promise<void>;

    /**
     * Ensures the data at this location is set to the specified value when the
     * client is disconnected (due to closing the browser, navigating to a new page,
     * or network issues).
     *
     * `set()` is especially useful for implementing "presence" systems, where a
     * value should be changed or cleared when a user disconnects so that they
     * appear "offline" to other users. See
     * {@link
      *   https://firebase.google.com/docs/database/web/offline-capabilities
      *   Enabling Offline Capabilities in JavaScript} for more information.
      *
      * Note that `onDisconnect` operations are only triggered once. If you want an
      * operation to occur each time a disconnect occurs, you'll need to re-establish
      * the `onDisconnect` operations each time.
      *
      * @example
      * ```javascript
      * var ref = admin.database().ref("users/ada/status");
      * ref.onDisconnect().set("I disconnected!");
      * ```
      *
      * @param value The value to be written to this location on
      *   disconnect (can be an object, array, string, number, boolean, or null).
      * @param onComplete An optional callback function that
      *   will be called when synchronization to the database server has completed.
      *   The callback will be passed a single parameter: null for success, or an
      *   `Error` object indicating a failure.
      * @return A promise that resolves when synchronization to the database is complete.
      */
    set(value: any, onComplete?: (a: Error | null) => any): Promise<void>;

    /**
     * Ensures the data at this location is set to the specified value and priority
     * when the client is disconnected (due to closing the browser, navigating to a
     * new page, or network issues).
     *
     * @param value The value to be written to this location on
     *   disconnect (can be an object, array, string, number, boolean, or null).
     * @param priority
     * @param onComplete An optional callback function that is
     *   called when synchronization to the server has completed. The callback
     *   will be passed a single parameter: null for success, or an Error object
     *   indicating a failure.
     * @return A promise that resolves when synchronization to the database is complete.
     */
    setWithPriority(
      value: any,
      priority: number | string | null,
      onComplete?: (a: Error | null) => any
    ): Promise<void>;

    /**
     * Writes multiple values at this location when the client is disconnected (due
     * to closing the browser, navigating to a new page, or network issues).
     *
     * The `values` argument contains multiple property-value pairs that will be
     * written to the Database together. Each child property can either be a simple
     * property (for example, "name") or a relative path (for example, "name/first")
     * from the current location to the data to update.
     *
     * As opposed to the `set()` method, `update()` can be use to selectively update
     * only the referenced properties at the current location (instead of replacing
     * all the child properties at the current location).
     *
     * See {@link https://firebase.google.com/docs/reference/admin/node/admin.database.Reference#update}
     * for examples of using the connected version of `update`.
     *
     * @example
     * ```javascript
     * var ref = admin.database().ref("users/ada");
     * ref.update({
     *    onlineState: true,
     *    status: "I'm online."
     * });
     * ref.onDisconnect().update({
     *   onlineState: false,
     *   status: "I'm offline."
     * });
     * ```
     *
     * @param values object containing multiple values.
     * @param onComplete An optional callback function that will
     *   be called when synchronization to the server has completed. The
     *   callback will be passed a single parameter: null for success, or an Error
     *   object indicating a failure.
     * @return Resolves when synchronization to the
     *   Database is complete.
     */
    update(values: object, onComplete?: (a: Error | null) => any): Promise<void>;
  }

  type EventType = 'value' | 'child_added' | 'child_changed' | 'child_moved' | 'child_removed';

  /**
   * A `Query` sorts and filters the data at a Database location so only a subset
   * of the child data is included. This can be used to order a collection of
   * data by some attribute (for example, height of dinosaurs) as well as to
   * restrict a large list of items (for example, chat messages) down to a number
   * suitable for synchronizing to the client. Queries are created by chaining
   * together one or more of the filter methods defined here.
   *
   * Just as with a `Reference`, you can receive data from a `Query` by using the
   * `on()` method. You will only receive events and `DataSnapshot`s for the
   * subset of the data that matches your query.
   *
   * See
   * {@link
    *  https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
    *  Sorting and filtering data} for more information.
    */
  interface Query {
    ref: admin.database.Reference;

    /**
     * Creates a `Query` with the specified ending point.
     *
     * Using `startAt()`, `endAt()`, and `equalTo()` allows you to choose arbitrary
     * starting and ending points for your queries.
     *
     * The ending point is inclusive, so children with exactly the specified value
     * will be included in the query. The optional key argument can be used to
     * further limit the range of the query. If it is specified, then children that
     * have exactly the specified value must also have a key name less than or equal
     * to the specified key.
     *
     * You can read more about `endAt()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
     *  Filtering data}.
     *
     * @example
     * ```javascript
     * // Find all dinosaurs whose names come before Pterodactyl lexicographically.
     * var ref = admin.database().ref("dinosaurs");
     * ref.orderByKey().endAt("pterodactyl").on("child_added", function(snapshot) {
     *   console.log(snapshot.key);
     * });
     * ```
     *
     * @param value The value to end at. The argument
     *   type depends on which `orderBy*()` function was used in this query.
     *   Specify a value that matches the `orderBy*()` type. When used in
     *   combination with `orderByKey()`, the value must be a string.
     * @param key The child key to end at, among the children with the
     *   previously specified priority. This argument is only allowed if ordering by
     *   priority.
     * @return A new `Query` object.
     */
    endAt(value: number | string | boolean | null, key?: string): admin.database.Query;

    /**
     * Creates a `Query` that includes children that match the specified value.
     *
     * Using `startAt()`, `endAt()`, and `equalTo()` allows us to choose arbitrary
     * starting and ending points for our queries.
     *
     * The optional key argument can be used to further limit the range of the
     * query. If it is specified, then children that have exactly the specified
     * value must also have exactly the specified key as their key name. This can be
     * used to filter result sets with many matches for the same value.
     *
     * You can read more about `equalTo()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
     *  Filtering data}.
     *
     * @example
     * // Find all dinosaurs whose height is exactly 25 meters.
     * var ref = admin.database().ref("dinosaurs");
     * ref.orderByChild("height").equalTo(25).on("child_added", function(snapshot) {
     *   console.log(snapshot.key);
     * });
     *
     * @param value The value to match for. The
     *   argument type depends on which `orderBy*()` function was used in this
     *   query. Specify a value that matches the `orderBy*()` type. When used in
     *   combination with `orderByKey()`, the value must be a string.
     * @param key The child key to start at, among the children with the
     *   previously specified priority. This argument is only allowed if ordering by
     *   priority.
     * @return A new `Query` object.
     */
    equalTo(value: number | string | boolean | null, key?: string): admin.database.Query;

    /**
     * Returns whether or not the current and provided queries represent the same
     * location, have the same query parameters, and are from the same instance of
     * `admin.app.App`.
     *
     * Two `Reference` objects are equivalent if they represent the same location
     * and are from the same instance of `admin.app.App`.
     *
     * Two `Query` objects are equivalent if they represent the same location, have
     * the same query parameters, and are from the same instance of `admin.app.App`.
     * Equivalent queries share the same sort order, limits, and starting and
     * ending points.
     *
     * @example
     * ```javascript
     * var rootRef = admin.database().ref();
     * var usersRef = rootRef.child("users");
     *
     * usersRef.isEqual(rootRef);  // false
     * usersRef.isEqual(rootRef.child("users"));  // true
     * usersRef.parent.isEqual(rootRef);  // true
     * ```
     *
     * @example
     *  ```javascript
     * var rootRef = admin.database().ref();
     * var usersRef = rootRef.child("users");
     * var usersQuery = usersRef.limitToLast(10);
     *
     * usersQuery.isEqual(usersRef);  // false
     * usersQuery.isEqual(usersRef.limitToLast(10));  // true
     * usersQuery.isEqual(rootRef.limitToLast(10));  // false
     * usersQuery.isEqual(usersRef.orderByKey().limitToLast(10));  // false
     * ```
     *
     * @param other The query to compare against.
     * @return Whether or not the current and provided queries are
     *   equivalent.
     */
    isEqual(other: admin.database.Query | null): boolean;

    /**
     * Generates a new `Query` limited to the first specific number of children.
     *
     * The `limitToFirst()` method is used to set a maximum number of children to be
     * synced for a given callback. If we set a limit of 100, we will initially only
     * receive up to 100 `child_added` events. If we have fewer than 100 messages
     * stored in our Database, a `child_added` event will fire for each message.
     * However, if we have over 100 messages, we will only receive a `child_added`
     * event for the first 100 ordered messages. As items change, we will receive
     * `child_removed` events for each item that drops out of the active list so
     * that the total number stays at 100.
     *
     * You can read more about `limitToFirst()` in
     * {@link
      *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
      *  Filtering data}.
      *
      * @example
      * ```javascript
      * // Find the two shortest dinosaurs.
      * var ref = admin.database().ref("dinosaurs");
      * ref.orderByChild("height").limitToFirst(2).on("child_added", function(snapshot) {
      *   // This will be called exactly two times (unless there are less than two
      *   // dinosaurs in the Database).
      *
      *   // It will also get fired again if one of the first two dinosaurs is
      *   // removed from the data set, as a new dinosaur will now be the second
      *   // shortest.
      *   console.log(snapshot.key);
      * });
      * ```
      *
      * @param limit The maximum number of nodes to include in this query.
      * @return A `Query` object.
      */
    limitToFirst(limit: number): admin.database.Query;

    /**
     * Generates a new `Query` object limited to the last specific number of
     * children.
     *
     * The `limitToLast()` method is used to set a maximum number of children to be
     * synced for a given callback. If we set a limit of 100, we will initially only
     * receive up to 100 `child_added` events. If we have fewer than 100 messages
     * stored in our Database, a `child_added` event will fire for each message.
     * However, if we have over 100 messages, we will only receive a `child_added`
     * event for the last 100 ordered messages. As items change, we will receive
     * `child_removed` events for each item that drops out of the active list so
     * that the total number stays at 100.
     *
     * You can read more about `limitToLast()` in
     * {@link
      *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
      *  Filtering data}.
      *
      * @example
      * ```javascript
      * // Find the two heaviest dinosaurs.
      * var ref = admin.database().ref("dinosaurs");
      * ref.orderByChild("weight").limitToLast(2).on("child_added", function(snapshot) {
      *   // This callback will be triggered exactly two times, unless there are
      *   // fewer than two dinosaurs stored in the Database. It will also get fired
      *   // for every new, heavier dinosaur that gets added to the data set.
      *   console.log(snapshot.key);
      * });
      * ```
      *
      * @param limit The maximum number of nodes to include in this query.
      * @return A `Query` object.
      */
    limitToLast(limit: number): admin.database.Query;

    /**
     * Detaches a callback previously attached with `on()`.
     *
     * Detach a callback previously attached with `on()`. Note that if `on()` was
     * called multiple times with the same eventType and callback, the callback
     * will be called multiple times for each event, and `off()` must be called
     * multiple times to remove the callback. Calling `off()` on a parent listener
     * will not automatically remove listeners registered on child nodes, `off()`
     * must also be called on any child listeners to remove the callback.
     *
     * If a callback is not specified, all callbacks for the specified eventType
     * will be removed. Similarly, if no eventType or callback is specified, all
     * callbacks for the `Reference` will be removed.
     *
     * @example
     * ```javascript
     * var onValueChange = function(dataSnapshot) {  ... };
     * ref.on('value', onValueChange);
     * ref.child('meta-data').on('child_added', onChildAdded);
     * // Sometime later...
     * ref.off('value', onValueChange);
     *
     * // You must also call off() for any child listeners on ref
     * // to cancel those callbacks
     * ref.child('meta-data').off('child_added', onValueAdded);
     * ```
     *
     * @example
     * ```javascript
     * // Or you can save a line of code by using an inline function
     * // and on()'s return value.
     * var onValueChange = ref.on('value', function(dataSnapshot) { ... });
     * // Sometime later...
     * ref.off('value', onValueChange);
     * ```
     *
     * @param eventType One of the following strings: "value",
     *   "child_added", "child_changed", "child_removed", or "child_moved."
     * @param callback The callback function that was passed to `on()`.
     * @param context The context that was passed to `on()`.
     */
    off(
      eventType?: admin.database.EventType,
      callback?: (a: admin.database.DataSnapshot, b?: string | null) => any,
      context?: object | null
    ): void;

    /**
     * Listens for data changes at a particular location.
     *
     * This is the primary way to read data from a Database. Your callback
     * will be triggered for the initial data and again whenever the data changes.
     * Use `off( )` to stop receiving updates. See
     * {@link https://firebase.google.com/docs/database/web/retrieve-data
      *   Retrieve Data on the Web}
      * for more details.
      *
      * <h4>value event</h4>
      *
      * This event will trigger once with the initial data stored at this location,
      * and then trigger again each time the data changes. The `DataSnapshot` passed
      * to the callback will be for the location at which `on()` was called. It
      * won't trigger until the entire contents has been synchronized. If the
      * location has no data, it will be triggered with an empty `DataSnapshot`
      * (`val()` will return `null`).
      *
      * <h4>child_added event</h4>
      *
      * This event will be triggered once for each initial child at this location,
      * and it will be triggered again every time a new child is added. The
      * `DataSnapshot` passed into the callback will reflect the data for the
      * relevant child. For ordering purposes, it is passed a second argument which
      * is a string containing the key of the previous sibling child by sort order
      * (or `null` if it is the first child).
      *
      * <h4>child_removed event</h4>
      *
      * This event will be triggered once every time a child is removed. The
      * `DataSnapshot` passed into the callback will be the old data for the child
      * that was removed. A child will get removed when either:
      *
      * - a client explicitly calls `remove()` on that child or one of its ancestors
      * - a client calls `set(null)` on that child or one of its ancestors
      * - that child has all of its children removed
      * - there is a query in effect which now filters out the child (because it's
      *   sort order changed or the max limit was hit)
      *
      * <h4>child_changed event</h4>
      *
      * This event will be triggered when the data stored in a child (or any of its
      * descendants) changes. Note that a single `child_changed` event may represent
      * multiple changes to the child. The `DataSnapshot` passed to the callback will
      * contain the new child contents. For ordering purposes, the callback is also
      * passed a second argument which is a string containing the key of the previous
      * sibling child by sort order (or `null` if it is the first child).
      *
      * <h4>child_moved event</h4>
      *
      * This event will be triggered when a child's sort order changes such that its
      * position relative to its siblings changes. The `DataSnapshot` passed to the
      * callback will be for the data of the child that has moved. It is also passed
      * a second argument which is a string containing the key of the previous
      * sibling child by sort order (or `null` if it is the first child).
      *
      * @example
      * ```javascript
      * // Handle a new value.
      * ref.on('value', function(dataSnapshot) {
      *   ...
      * });
      * ```
      *
      * @example
      * ```javascript
      * // Handle a new child.
      * ref.on('child_added', function(childSnapshot, prevChildKey) {
      *   ...
      * });
      * ```
      *
      * @example
      * ```javascript
      * // Handle child removal.
      * ref.on('child_removed', function(oldChildSnapshot) {
      *   ...
      * });
      * ```
      *
      * @example
      * ```javascript
      * // Handle child data changes.
      * ref.on('child_changed', function(childSnapshot, prevChildKey) {
      *   ...
      * });
      * ```
      *
      * @example
      * ```javascript
      * // Handle child ordering changes.
      * ref.on('child_moved', function(childSnapshot, prevChildKey) {
      *   ...
      * });
      * ```
      *
      * @param eventType One of the following strings: "value",
      *   "child_added", "child_changed", "child_removed", or "child_moved."
      * @param callback A callback that fires when the specified event occurs. The callback is
      *   passed a DataSnapshot. For ordering purposes, "child_added",
      *   "child_changed", and "child_moved" will also be passed a string containing
      *   the key of the previous child, by sort order (or `null` if it is the
      *   first child).
      * @param cancelCallbackOrContext An optional
      *   callback that will be notified if your event subscription is ever canceled
      *   because your client does not have permission to read this data (or it had
      *   permission but has now lost it). This callback will be passed an `Error`
      *   object indicating why the failure occurred.
      * @param context If provided, this object will be used as `this`
      *   when calling your callback(s).
      * @return The provided
      *   callback function is returned unmodified. This is just for convenience if
      *   you want to pass an inline function to `on()`,  but store the callback
      *   function for later passing to `off()`.
      */
    on(
      eventType: admin.database.EventType,
      callback: (a: admin.database.DataSnapshot, b?: string | null) => any,
      cancelCallbackOrContext?: ((a: Error) => any) | object | null,
      context?: object | null
    ): (a: admin.database.DataSnapshot | null, b?: string) => any;

    /**
     * Listens for exactly one event of the specified event type, and then stops
     * listening.
     *
     * This is equivalent to calling `on()`, and then calling `off()` inside the
     * callback function. See `on()` for details on the event types.
     *
     * @example
     * ```javascript
     * // Basic usage of .once() to read the data located at ref.
     * ref.once('value')
     *   .then(function(dataSnapshot) {
     *     // handle read data.
     *   });
     * ```
     *
     * @param eventType One of the following strings: "value",
     *   "child_added", "child_changed", "child_removed", or "child_moved."
     * @param successCallback A callback that fires when the specified event occurs. The callback is
     *   passed a `DataSnapshot`. For ordering purposes, "child_added",
     *   "child_changed", and "child_moved" will also be passed a string containing
     *   the key of the previous child by sort order (or `null` if it is the
     *   first child).
     * @param failureCallbackOrContext An optional
     *   callback that will be notified if your client does not have permission to
     *   read the data. This callback will be passed an `Error` object indicating
     *   why the failure occurred.
     * @param context If provided, this object will be used as `this`
     *   when calling your callback(s).
     * @return {!Promise<admin.database.DataSnapshot>}
     */
    once(
      eventType: admin.database.EventType,
      successCallback?: (a: admin.database.DataSnapshot, b?: string | null ) => any,
      failureCallbackOrContext?: ((a: Error) => void) | object | null,
      context?: object | null
    ): Promise<admin.database.DataSnapshot>;

    /**
     * Generates a new `Query` object ordered by the specified child key.
     *
     * Queries can only order by one key at a time. Calling `orderByChild()`
     * multiple times on the same query is an error.
     *
     * Firebase queries allow you to order your data by any child key on the fly.
     * However, if you know in advance what your indexes will be, you can define
     * them via the .indexOn rule in your Security Rules for better performance. See
     * the {@link https://firebase.google.com/docs/database/security/indexing-data
      * .indexOn} rule for more information.
      *
      * You can read more about `orderByChild()` in
      * {@link
      *  https://firebase.google.com/docs/database/web/lists-of-data#sort_data
      *  Sort data}.
      *
      * @example
      * ```javascript
      * var ref = admin.database().ref("dinosaurs");
      * ref.orderByChild("height").on("child_added", function(snapshot) {
      *   console.log(snapshot.key + " was " + snapshot.val().height + " m tall");
      * });
      * ```
      *
      * @param path
      * @return A new `Query` object.
      */
    orderByChild(path: string): admin.database.Query;

    /**
     * Generates a new `Query` object ordered by key.
     *
     * Sorts the results of a query by their (ascending) key values.
     *
     * You can read more about `orderByKey()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sort_data
     *  Sort data}.
     *
     * @example
     * ```javascript
     * var ref = admin.database().ref("dinosaurs");
     * ref.orderByKey().on("child_added", function(snapshot) {
     *   console.log(snapshot.key);
     * });
     * ```
     *
     * @return A new `Query` object.
     */
    orderByKey(): admin.database.Query;

    /**
     * Generates a new `Query` object ordered by priority.
     *
     * Applications need not use priority but can order collections by
     * ordinary properties (see
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sort_data
     *  Sort data} for alternatives to priority.
     *
     * @return A new `Query` object.
     */
    orderByPriority(): admin.database.Query;

    /**
     * Generates a new `Query` object ordered by value.
     *
     * If the children of a query are all scalar values (string, number, or
     * boolean), you can order the results by their (ascending) values.
     *
     * You can read more about `orderByValue()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sort_data
     *  Sort data}.
     *
     * @example
     * ```javascript
     * var scoresRef = admin.database().ref("scores");
     * scoresRef.orderByValue().limitToLast(3).on("value", function(snapshot) {
     *   snapshot.forEach(function(data) {
     *     console.log("The " + data.key + " score is " + data.val());
     *   });
     * });
     * ```
     *
     * @return A new `Query` object.
     */
    orderByValue(): admin.database.Query;

    /**
     * Creates a `Query` with the specified starting point.
     *
     * Using `startAt()`, `endAt()`, and `equalTo()` allows you to choose arbitrary
     * starting and ending points for your queries.
     *
     * The starting point is inclusive, so children with exactly the specified value
     * will be included in the query. The optional key argument can be used to
     * further limit the range of the query. If it is specified, then children that
     * have exactly the specified value must also have a key name greater than or
     * equal to the specified key.
     *
     * You can read more about `startAt()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
     *  Filtering data}.
     *
     * @example
     * ```javascript
     * // Find all dinosaurs that are at least three meters tall.
     * var ref = admin.database().ref("dinosaurs");
     * ref.orderByChild("height").startAt(3).on("child_added", function(snapshot) {
     *   console.log(snapshot.key)
     * });
     * ```
     *
     * @param value The value to start at. The argument
     *   type depends on which `orderBy*()` function was used in this query.
     *   Specify a value that matches the `orderBy*()` type. When used in
     *   combination with `orderByKey()`, the value must be a string.
     * @param  key The child key to start at. This argument is allowed if
     *   ordering by child, value, or priority.
     * @return A new `Query` object.
     */
    startAt(value: number | string | boolean | null, key?: string): admin.database.Query;

    /**
     * @return A JSON-serializable representation of this object.
     */
    toJSON(): Object;

    /**
     * Gets the absolute URL for this location.
     *
     * The `toString()` method returns a URL that is ready to be put into a browser,
     * curl command, or a `admin.database().refFromURL()` call. Since all of those
     * expect the URL to be url-encoded, `toString()` returns an encoded URL.
     *
     * Append '.json' to the returned URL when typed into a browser to download
     * JSON-formatted data. If the location is secured (that is, not publicly
     * readable), you will get a permission-denied error.
     *
     * @example
     * ```javascript
     * // Calling toString() on a root Firebase reference returns the URL where its
     * // data is stored within the Database:
     * var rootRef = admin.database().ref();
     * var rootUrl = rootRef.toString();
     * // rootUrl === "https://sample-app.firebaseio.com/".
     *
     * // Calling toString() at a deeper Firebase reference returns the URL of that
     * // deep path within the Database:
     * var adaRef = rootRef.child('users/ada');
     * var adaURL = adaRef.toString();
     * // adaURL === "https://sample-app.firebaseio.com/users/ada".
     * ```
     *
     * @return The absolute URL for this location.
     * @override
     */
    toString(): string;
  }

  /**
   * A `Reference` represents a specific location in your Database and can be used
   * for reading or writing data to that Database location.
   *
   * You can reference the root or child location in your Database by calling
   * `admin.database().ref()` or `admin.database().ref("child/path")`.
   *
   * Writing is done with the `set()` method and reading can be done with the
   * `on()` method. See
   * {@link
   *   https://firebase.google.com/docs/database/web/read-and-write
   *   Read and Write Data on the Web}
   */
  interface Reference extends admin.database.Query {

    /**
     * The last part of the `Reference`'s path.
     *
     * For example, `"ada"` is the key for
     * `https://<DATABASE_NAME>.firebaseio.com/users/ada`.
     *
     * The key of a root `Reference` is `null`.
     *
     * @example
     * ```javascript
     * // The key of a root reference is null
     * var rootRef = admin.database().ref();
     * var key = rootRef.key;  // key === null
     * ```
     *
     * @example
     * ```javascript
     * // The key of any non-root reference is the last token in the path
     * var adaRef = admin.database().ref("users/ada");
     * var key = adaRef.key;  // key === "ada"
     * key = adaRef.child("name/last").key;  // key === "last"
     * ```
     */
    key: string | null;

    /**
     * The parent location of a `Reference`.
     *
     * The parent of a root `Reference` is `null`.
     *
     * @example
     * ```javascript
     * // The parent of a root reference is null
     * var rootRef = admin.database().ref();
     * parent = rootRef.parent;  // parent === null
     * ```
     *
     * @example
     * ```javascript
     * // The parent of any non-root reference is the parent location
     * var usersRef = admin.database().ref("users");
     * var adaRef = admin.database().ref("users/ada");
     * // usersRef and adaRef.parent represent the same location
     * ```
     */
    parent: admin.database.Reference | null;

    /**
     * The root `Reference` of the Database.
     *
     * @example
     * ```javascript
     * // The root of a root reference is itself
     * var rootRef = admin.database().ref();
     * // rootRef and rootRef.root represent the same location
     * ```
     *
     * @example
     * ```javascript
     * // The root of any non-root reference is the root location
     * var adaRef = admin.database().ref("users/ada");
     * // rootRef and adaRef.root represent the same location
     * ```
     */
    root: admin.database.Reference;
    /** @deprecated Removed in next major release to match Web SDK typings. */
    path: string;

    /**
     * Gets a `Reference` for the location at the specified relative path.
     *
     * The relative path can either be a simple child name (for example, "ada") or
     * a deeper slash-separated path (for example, "ada/name/first").
     *
     * @example
     * ```javascript
     * var usersRef = admin.database().ref('users');
     * var adaRef = usersRef.child('ada');
     * var adaFirstNameRef = adaRef.child('name/first');
     * var path = adaFirstNameRef.toString();
     * // path is now 'https://sample-app.firebaseio.com/users/ada/name/first'
     * ```
     *
     * @param path A relative path from this location to the desired child
     *   location.
     * @return The specified child location.
     */
    child(path: string): admin.database.Reference;

    /**
     * Returns an `OnDisconnect` object - see
     * {@link
     *   https://firebase.google.com/docs/database/web/offline-capabilities
     *   Enabling Offline Capabilities in JavaScript} for more information on how
     * to use it.
     *
     * @return An `OnDisconnect` object .
     */
    onDisconnect(): admin.database.OnDisconnect;

    /**
     * Generates a new child location using a unique key and returns its
     * `Reference`.
     *
     * This is the most common pattern for adding data to a collection of items.
     *
     * If you provide a value to `push()`, the value will be written to the
     * generated location. If you don't pass a value, nothing will be written to the
     * Database and the child will remain empty (but you can use the `Reference`
     * elsewhere).
     *
     * The unique key generated by `push()` are ordered by the current time, so the
     * resulting list of items will be chronologically sorted. The keys are also
     * designed to be unguessable (they contain 72 random bits of entropy).
     *
     *
     * See
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#append_to_a_list_of_data
     *  Append to a list of data}
     * </br>See
     * {@link
     *  https://firebase.googleblog.com/2015/02/the-2120-ways-to-ensure-unique_68.html
     *  The 2^120 Ways to Ensure Unique Identifiers}
     *
     * @example
     * ```javascript
     * var messageListRef = admin.database().ref('message_list');
     * var newMessageRef = messageListRef.push();
     * newMessageRef.set({
     *   user_id: 'ada',
     *   text: 'The Analytical Engine weaves algebraical patterns just as the Jacquard loom weaves flowers and leaves.'
     * });
     * // We've appended a new message to the message_list location.
     * var path = newMessageRef.toString();
     * // path will be something like
     * // 'https://sample-app.firebaseio.com/message_list/-IKo28nwJLH0Nc5XeFmj'
     * ```
     *
     * @param value Optional value to be written at the generated location.
     * @param onComplete Callback called when write to server is
     *   complete.
     * @return Combined `Promise` and
     *   `Reference`; resolves when write is complete, but can be used immediately
     *   as the `Reference` to the child location.
     */
    push(value?: any, onComplete?: (a: Error | null) => any): admin.database.ThenableReference;

    /**
     * Removes the data at this Database location.
     *
     * Any data at child locations will also be deleted.
     *
     * The effect of the remove will be visible immediately and the corresponding
     * event 'value' will be triggered. Synchronization of the remove to the
     * Firebase servers will also be started, and the returned Promise will resolve
     * when complete. If provided, the onComplete callback will be called
     * asynchronously after synchronization has finished.
     *
     * @example
     * ```javascript
     * var adaRef = admin.database().ref('users/ada');
     * adaRef.remove()
     *   .then(function() {
     *     console.log("Remove succeeded.")
     *   })
     *   .catch(function(error) {
     *     console.log("Remove failed: " + error.message)
     *   });
     * ```
     *
     * @param onComplete Callback called when write to server is
     *   complete.
     * @return Resolves when remove on server is complete.
     */
    remove(onComplete?: (a: Error | null) => any): Promise<void>;

    /**
     * Writes data to this Database location.
     *
     * This will overwrite any data at this location and all child locations.
     *
     * The effect of the write will be visible immediately, and the corresponding
     * events ("value", "child_added", etc.) will be triggered. Synchronization of
     * the data to the Firebase servers will also be started, and the returned
     * Promise will resolve when complete. If provided, the `onComplete` callback
     * will be called asynchronously after synchronization has finished.
     *
     * Passing `null` for the new value is equivalent to calling `remove()`; namely,
     * all data at this location and all child locations will be deleted.
     *
     * `set()` will remove any priority stored at this location, so if priority is
     * meant to be preserved, you need to use `setWithPriority()` instead.
     *
     * Note that modifying data with `set()` will cancel any pending transactions
     * at that location, so extreme care should be taken if mixing `set()` and
     * `transaction()` to modify the same data.
     *
     * A single `set()` will generate a single "value" event at the location where
     * the `set()` was performed.
     *
     * @example
     * ```javascript
     * var adaNameRef = admin.database().ref('users/ada/name');
     * adaNameRef.child('first').set('Ada');
     * adaNameRef.child('last').set('Lovelace');
     * // We've written 'Ada' to the Database location storing Ada's first name,
     * // and 'Lovelace' to the location storing her last name.
     * ```
     *
     * @example
     * ```javascript
     * adaNameRef.set({ first: 'Ada', last: 'Lovelace' });
     * // Exact same effect as the previous example, except we've written
     * // Ada's first and last name simultaneously.
     * ```
     *
     * @example
     * ```javascript
     * adaNameRef.set({ first: 'Ada', last: 'Lovelace' })
     *   .then(function() {
     *     console.log('Synchronization succeeded');
     *   })
     *   .catch(function(error) {
     *     console.log('Synchronization failed');
     *   });
     * // Same as the previous example, except we will also log a message
     * // when the data has finished synchronizing.
     * ```
     *
     * @param value The value to be written (string, number, boolean, object,
     *   array, or null).
     * @param onComplete Callback called when write to server is
     *   complete.
     * @return Resolves when write to server is complete.
     */
    set(value: any, onComplete?: (a: Error | null) => any): Promise<void>;

    /**
     * Sets a priority for the data at this Database location.
     *
     * Applications need not use priority but can order collections by
     * ordinary properties (see
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
     *  Sorting and filtering data}).
     *
     * @param priority
     * @param onComplete
     * @return
     */
    setPriority(
      priority: string | number | null,
      onComplete: (a: Error | null) => any
    ): Promise<void>;

    /**
     * Writes data the Database location. Like `set()` but also specifies the
     * priority for that data.
     *
     * Applications need not use priority but can order collections by
     * ordinary properties (see
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
     *  Sorting and filtering data}).
     *
     * @param newVal
     * @param newPriority
     * @param  onComplete
     * @return
     */
    setWithPriority(
      newVal: any, newPriority: string | number | null,
      onComplete?: (a: Error | null) => any
    ): Promise<void>;

    /**
     * Atomically modifies the data at this location.
     *
     * Atomically modify the data at this location. Unlike a normal `set()`, which
     * just overwrites the data regardless of its previous value, `transaction()` is
     * used to modify the existing value to a new value, ensuring there are no
     * conflicts with other clients writing to the same location at the same time.
     *
     * To accomplish this, you pass `transaction()` an update function which is used
     * to transform the current value into a new value. If another client writes to
     * the location before your new value is successfully written, your update
     * function will be called again with the new current value, and the write will
     * be retried. This will happen repeatedly until your write succeeds without
     * conflict or you abort the transaction by not returning a value from your
     * update function.
     *
     * Note: Modifying data with `set()` will cancel any pending transactions at
     * that location, so extreme care should be taken if mixing `set()` and
     * `transaction()` to update the same data.
     *
     * Note: When using transactions with Security and Firebase Rules in place, be
     * aware that a client needs `.read` access in addition to `.write` access in
     * order to perform a transaction. This is because the client-side nature of
     * transactions requires the client to read the data in order to transactionally
     * update it.
     *
     * @example
     * ```javascript
     * // Increment Ada's rank by 1.
     * var adaRankRef = admin.database().ref('users/ada/rank');
     * adaRankRef.transaction(function(currentRank) {
     *   // If users/ada/rank has never been set, currentRank will be `null`.
     *   return currentRank + 1;
     * });
     * ```
     *
     * @example
     * ```javascript
     * // Try to create a user for ada, but only if the user id 'ada' isn't
     * // already taken
     * var adaRef = admin.database().ref('users/ada');
     * adaRef.transaction(function(currentData) {
     *   if (currentData === null) {
     *     return { name: { first: 'Ada', last: 'Lovelace' } };
     *   } else {
     *     console.log('User ada already exists.');
     *     return; // Abort the transaction.
     *   }
     * }, function(error, committed, snapshot) {
     *   if (error) {
     *     console.log('Transaction failed abnormally!', error);
     *   } else if (!committed) {
     *     console.log('We aborted the transaction (because ada already exists).');
     *   } else {
     *     console.log('User ada added!');
     *   }
     *   console.log("Ada's data: ", snapshot.val());
     * });
     * ```
     *
     * @param transactionUpdate A developer-supplied function which
     *   will be passed the current data stored at this location (as a JavaScript
     *   object). The function should return the new value it would like written (as
     *   a JavaScript object). If `undefined` is returned (i.e. you return with no
     *   arguments) the transaction will be aborted and the data at this location
     *   will not be modified.
     * @param onComplete A callback
     *   function that will be called when the transaction completes. The callback
     *   is passed three arguments: a possibly-null `Error`, a `boolean` indicating
     *   whether the transaction was committed, and a `DataSnapshot` indicating the
     *   final result. If the transaction failed abnormally, the first argument will
     *   be an `Error` object indicating the failure cause. If the transaction
     *   finished normally, but no data was committed because no data was returned
     *   from `transactionUpdate`, then second argument will be false. If the
     *   transaction completed and committed data to Firebase, the second argument
     *   will be true. Regardless, the third argument will be a `DataSnapshot`
     *   containing the resulting data in this location.
     * @param applyLocally By default, events are raised each time the
     *   transaction update function runs. So if it is run multiple times, you may
     *   see intermediate states. You can set this to false to suppress these
     *   intermediate states and instead wait until the transaction has completed
     *   before events are raised.
     * @return Returns a Promise that can optionally be used instead of the `onComplete`
     *   callback to handle success and failure.
     */
    transaction(
      transactionUpdate: (a: any) => any,
      onComplete?: (a: Error | null, b: boolean, c: admin.database.DataSnapshot | null) => any,
      applyLocally?: boolean
    ): Promise<{
      committed: boolean;
      snapshot: admin.database.DataSnapshot | null;
    }>;

    /**
     * Writes multiple values to the Database at once.
     *
     * The `values` argument contains multiple property-value pairs that will be
     * written to the Database together. Each child property can either be a simple
     * property (for example, "name") or a relative path (for example,
     * "name/first") from the current location to the data to update.
     *
     * As opposed to the `set()` method, `update()` can be use to selectively update
     * only the referenced properties at the current location (instead of replacing
     * all the child properties at the current location).
     *
     * The effect of the write will be visible immediately, and the corresponding
     * events ('value', 'child_added', etc.) will be triggered. Synchronization of
     * the data to the Firebase servers will also be started, and the returned
     * Promise will resolve when complete. If provided, the `onComplete` callback
     * will be called asynchronously after synchronization has finished.
     *
     * A single `update()` will generate a single "value" event at the location
     * where the `update()` was performed, regardless of how many children were
     * modified.
     *
     * Note that modifying data with `update()` will cancel any pending
     * transactions at that location, so extreme care should be taken if mixing
     * `update()` and `transaction()` to modify the same data.
     *
     * Passing `null` to `update()` will remove the data at this location.
     *
     * See
     * {@link
     *  https://firebase.googleblog.com/2015/09/introducing-multi-location-updates-and_86.html
     *  Introducing multi-location updates and more}.
     *
     * @example
     * ```javascript
     * var adaNameRef = admin.database().ref('users/ada/name');
     * // Modify the 'first' and 'last' properties, but leave other data at
     * // adaNameRef unchanged.
     * adaNameRef.update({ first: 'Ada', last: 'Lovelace' });
     * ```
     *
     * @param values object containing multiple values.
     * @param onComplete Callback called when write to server is
     *   complete.
     * @return Resolves when update on server is complete.
     */
    update(values: object, onComplete?: (a: Error | null) => any): Promise<void>;
  }

  /**
   * @extends {Reference}
   */
  interface ThenableReference extends admin.database.Reference, Promise<admin.database.Reference> { }

  function enableLogging(logger?: boolean | ((message: string) => any), persistent?: boolean): any;
}

export namespace admin.database.ServerValue {

  /**
   * A placeholder value for auto-populating the current timestamp (time
   * since the Unix epoch, in milliseconds) as determined by the Firebase
   * servers.
   *
   * @example
   * ```javascript
   * var sessionsRef = firebase.database().ref("sessions");
   * sessionsRef.push({
   *   startedAt: firebase.database.ServerValue.TIMESTAMP
   * });
   * ```
   */
  const TIMESTAMP: Object;

  /**
   * Returns a placeholder value that can be used to atomically increment the
   * current database value by the provided delta.
   *
   * @param delta the amount to modify the current value atomically.
   * @return a placeholder value for modifying data atomically server-side.
   */
  function increment(delta: number): Object;
}
