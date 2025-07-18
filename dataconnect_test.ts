const { getDataConnect } = require('./lib/data-connect');
const { initializeApp } = require('./lib/app');

const app = initializeApp();

const config = {
    serviceId: "<your-service-id>",
    location: "<us-central>",
    // connector:"<connector?"
};

// const dataConnect = getDataConnect(config);

// async function queryref_test (){
//     // const listOfMovies_res = await dataConnect.queryRef('ListMovies', {orderByRating: "DESC",orderByReleaseYear: "DESC", limit: 3}).execute();
//     // const getActorsDetails = await dataConnect.queryRef('GetActorById', {id: "11111111222233334444555555555555"}).execute()
//     const graphqlRead_listOfMovies_res = await dataConnect.executeGraphqlRead(" query { movies {id, title}}");

//     console.log(graphqlRead_listOfMovies_res.data)
// }

// queryref_test()