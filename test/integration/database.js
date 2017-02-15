var admin = require('../../lib/index');


function test(utils) {
  console.log('\nDatabase:');

  var ref = admin.database().ref('adminNodeSdkManualTest');

  function testSet() {
    return ref.set({
      success: true,
      timestamp: admin.database.ServerValue.TIMESTAMP,
    })
      .then(function() {
        utils.logSuccess('database().set()');
      })
      .catch(function(error) {
        utils.logFailure('database().set()', error);
      });
  }

  function testOnce() {
    return ref.once('value')
      .then(function(snapshot) {
        var value = snapshot.val();
        utils.assert(
          value.success === true && typeof value.timestamp === 'number',
          'database.once()',
          'Snapshot has unexpected value'
        );
      }).catch(function(error) {
        utils.logFailure('database().once()', error)
      });
  }


  return Promise.resolve()
    .then(testSet)
    .then(testOnce);
};


module.exports = {
  test: test
}
