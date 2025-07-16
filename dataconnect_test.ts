const { getDataConnect } = require('./lib/data-connect');
const { initializeApp } = require('./lib/app');

const app = initializeApp();

const config = {
    serviceId: "your-service-id",
    location: "us-central1",
    connector:"movie-connector"
};

const dataConnect = getDataConnect({
    connectorConfig: config
});

const listOfMovies = dataConnect.queryRef('ListMovies').execute();

console.log(listOfMovies)