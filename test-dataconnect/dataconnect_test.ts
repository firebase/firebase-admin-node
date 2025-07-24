import { getDataConnect } from '../lib/data-connect';
import { initializeApp } from '../lib/app';

initializeApp();

const config = {
    serviceId: "your-service-id",
    location: "us-central1",
    connector:"movie-connector" //If the connector is included when you run executeGraphqlRead and executeGraphql(Mutations and Queries) you get a 404 error possibly because of the generated link/url. Writing a condtition to check to stop it from getting server error, what would happen if we got server error normally on the client's end?
};

const dataConnect = getDataConnect(config);

async function queryref_test (){
    // const listOfMovies_res = await dataConnect.queryRef('ListMovies', {orderByRating: "DESC",orderByReleaseYear: "DESC", limit: 3}).execute();
    // const getActorsDetails = await dataConnect.queryRef('GetActorById', {id: "11111111222233334444555555555555"}).execute()
    // // const graphqlRead_listOfMovies_res = await dataConnect.executeGraphqlRead(" query { movies {id, title}}");
    // const graphql_listOfMovies_res= await dataConnect.executeGraphql(`mutation {user_insert(data: {id: "666666666677777777711", username: "coder_bot"})}`);
    // const graphql_listOfMovies_res_with_operation= await dataConnect.executeGraphql(`mutation {user_insert(data: {id: "66666666667777777773", username: "night_agent"})}`);
    const graphql_query_listOfMovies_res = await dataConnect.executeGraphql(" query { movies {id, title}}");
    // const Upsert_user_res = await dataConnect.mutationRef('UpsertUser', {id: "66666666667777777771",username: "Hola"}).execute();
    // const GetUserBy_Id_res = await dataConnect.queryRef("GetUserById",{id:"666666666677777777711"}).execute()

    console.log(graphql_query_listOfMovies_res.data)
}

queryref_test()