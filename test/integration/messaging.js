var admin = require('../../lib/index');


function test(utils) {
  console.log('\nMessaging:');

  // The registration token and notification key have the proper format, but are not guaranteed to
  // work. The intention of these integration tests is that the endpoints returns the proper payload,
  // but it is hard to ensure these tokens will always be valid. The tests below should still pass
  // even if they are rotated or invalid.
  var registrationToken = 'fGw0qy4TGgk:APA91bGtWGjuhp4WRhHXgbabIYp1jxEKI08ofj_v1bKhWAGJQ4e3arRCWzeTfHaLz83mBnDh0aPWB1AykXAVUUGl2h1wT4XI6XazWpvY7RBUSYfoxtqSWGIm2nvWh2BOP1YG501SsRoE';
  var notificationKey = 'APA91bFYr4cWCkDs_H9VY2Ai6Erw1ABup1NEYqBjz70O8SzxjpALp_bN913XJMlOepaVv9eQs2QrtqX_RZ6cVVv4czgTQXg62qicITR6tQDizaFilDnlVf0';

  var registrationTokens = [registrationToken + '0', registrationToken + '1', registrationToken + '2'];
  var topic = 'mock-topic';
  var condition = '"test0" in topics || ("test1" in topics && "test2" in topics)';

  var payload = {
    data: {
      foo: 'bar',
    },
    notification: {
      title: 'Message title',
      body: 'Message body',
    },
  };

  var invalidPayload = {
    foo: 'bar',
  };

  var options = {
    timeToLive: 60
  };


  function sendToDevice() {
    return admin.messaging().sendToDevice(registrationToken, payload, options)
      .then(function(response) {
        utils.assert(
          typeof response.multicastId === 'number',
          'messaging().sendToDevice(string)',
          'Response does not contain multicast ID.'
        );
      })
      .catch(function(error) {
        utils.logFailure('messaging().sendToDevice(string)', error);
      });
  }

  function sendToDevices() {
    return admin.messaging().sendToDevice(registrationTokens, payload, options)
      .then(function(response) {
        utils.assert(
          typeof response.multicastId === 'number',
          'messaging().sendToDevice(array)',
          'Response does not contain multicast ID.'
        );
      })
      .catch(function(error) {
        utils.logFailure('messaging().sendToDevice(array)', error);
      });
  }

  function sendToDeviceGroup() {
    return admin.messaging().sendToDeviceGroup(notificationKey, payload, options)
      .then(function(response) {
        utils.assert(
          typeof response.successCount === 'number',
          'messaging().sendToDeviceGroup()',
          'Response does not contain success count.'
        );
      })
      .catch(function(error) {
        utils.logFailure('messaging().sendToDeviceGroup()', error);
      });
  }

  function sendToTopic() {
    return admin.messaging().sendToTopic(topic, payload, options)
      .then(function(response) {
        utils.assert(
          typeof response.messageId === 'number',
          'messaging().sendToTopic()',
          'Response does not contain message ID.'
        );
      })
      .catch(function(error) {
        utils.logFailure('messaging().sendToTopic()', error);
      });
  }

  function sendToCondition() {
    return admin.messaging().sendToCondition(condition, payload, options)
      .then(function(response) {
        utils.assert(
          typeof response.messageId === 'number',
          'messaging().sendToCondition()',
          'Response does not contain message ID.'
        );
      })
      .catch(function(error) {
        utils.logFailure('messaging().sendToCondition()', error);
      });
  }

  function sendToDeviceWithError() {
    return admin.messaging().sendToDevice(registrationToken, invalidPayload, options)
      .then(function() {
        utils.logFailure('messaging().sendToDevice(string, invalidPayload)', 'Message unexpectedly sent.');
      })
      .catch(function(error) {
        utils.assert(
          error.code === 'messaging/invalid-payload',
          'messaging().sendToDevice(string, invalidPayload)',
          'Incorrect error code: ' + error.code
        );
      });
  }

  function sendToDevicesWithError() {
    return admin.messaging().sendToDevice(registrationTokens, invalidPayload, options)
      .then(function(response) {
        utils.logFailure('messaging().sendToDevice(array, invalidPayload)', 'Message unexpectedly sent.');
      })
      .catch(function(error) {
        utils.assert(
          error.code === 'messaging/invalid-payload',
          'messaging().sendToDevice(array, invalidPayload)',
          'Incorrect error code: ' + error.code
        );
      });
  }

  function sendToDeviceGroupWithError() {
    return admin.messaging().sendToDeviceGroup(notificationKey, invalidPayload, options)
      .then(function(response) {
        utils.logFailure('messaging().sendToDeviceGroup(invalidPayload)', 'Message unexpectedly sent.');
      })
      .catch(function(error) {
        utils.assert(
          error.code === 'messaging/invalid-payload',
          'messaging().sendToDeviceGroup(invalidPayload)',
          'Incorrect error code: ' + error.code
        );
      });
  }

  function sendToTopicWithError() {
    return admin.messaging().sendToTopic(topic, invalidPayload, options)
      .then(function(response) {
        utils.logFailure('messaging().sendToTopic(invalidPayload)', 'Message unexpectedly sent.');
      })
      .catch(function(error) {
        utils.assert(
          error.code === 'messaging/invalid-payload',
          'messaging().sendToTopic(invalidPayload)',
          'Incorrect error code: ' + error.code
        );
      });
  }

  function sendToConditionWithError() {
    return admin.messaging().sendToCondition(condition, invalidPayload, options)
      .then(function(response) {
        utils.logFailure('messaging().sendToCondition(invalidPayload)', 'Message unexpectedly sent.');
      })
      .catch(function(error) {
        utils.assert(
          error.code === 'messaging/invalid-payload',
          'messaging().sendToCondition(invalidPayload)',
          'Incorrect error code: ' + error.code
        );
      });
  }


  return Promise.resolve()
    .then(sendToDevice)
    .then(sendToDevices)
    .then(sendToDeviceGroup)
    .then(sendToTopic)
    .then(sendToCondition)
    .then(sendToDeviceWithError)
    .then(sendToDevicesWithError)
    .then(sendToDeviceGroupWithError)
    .then(sendToTopicWithError)
    .then(sendToConditionWithError);
};


module.exports = {
  test: test
}
