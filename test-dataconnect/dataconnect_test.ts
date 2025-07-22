import { getDataConnect } from '../lib/data-connect';
import { initializeApp } from '../lib/app';

initializeApp();

const config = {
    serviceId: "your-service-id",
    location: "us-central1",
    connector:"movie-connector"
};

const dataConnect = getDataConnect(config);

async function queryref_test (){
    // const listOfMovies_res = await dataConnect.queryRef('ListMovies', {orderByRating: "DESC",orderByReleaseYear: "DESC", limit: 3}).execute();
    // const getActorsDetails = await dataConnect.queryRef('GetActorById', {id: "11111111222233334444555555555555"}).execute()
    // const graphqlRead_listOfMovies_res = await dataConnect.executeGraphqlRead(" query { movies {id, title}}");
    // const graphql_listOfMovies_res= await dataConnect.executeGraphql(`mutation {user_insert(data: {id: "66666666667777777770", username: "coder_bot"})}`);
    // const graphql_listOfMovies_res_with_operation= await dataConnect.executeGraphql(`mutation {user_insert(data: {id: "66666666667777777773", username: "night_agent"})}`);
    // const graphql_query_listOfMovies_res = await dataConnect.executeGraphql(" query { movies {id, title}}");
    // const Upsert_user_res = await dataConnect.mutationRef('UpsertUser', {id: "66666666667777777771",username: "Hola"}).execute();
    const GetUserBy_Id_res = await dataConnect.queryRef("GetUserById",{id:"66666666667777777771"}).execute()

    console.log(GetUserBy_Id_res.data)
}

queryref_test()