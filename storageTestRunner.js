var admin = require('./lib/index');

var serviceAccount = require('./test/resources/key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'admin-sdks-test.appspot.com',
});

admin.storage().bucket.file('firebase.png').download({
  destination: './firebase.png'
}, function(error) {
  if (error) {
    console.log('Error downloading file:', error);
  } else {
    console.log('File successfully downloaded!');
  }
});
