var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
const imdb = require('./src/imdb');
const DENZEL_IMDB_ID = 'nm0000243';

const CONNECTION_URL = "mongodb+srv://root:root@denzelmovies-696nb.mongodb.net/test?retryWrites=true";
const DATABASE_NAME = "denzelmovies";

var database;
var collection;
var movies;

MongoClient.connect(CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
    if (error) {
        console.log(error);
        throw error;
    }
    console.log('Connected');
    database = client.db(DATABASE_NAME);
    collection = database.collection("movies");
    console.log("Connected to `" + DATABASE_NAME + "`!");
});


var schema = buildSchema(`
  	type Query {
	  total: Int
	  movies: [Movie]
	  movie: Movie
	}

	type Movie {
	  link: String
	  metascore: Int
	  synopsis: String
	  title: String
	  year: Int
	}
`);

var root = { hello: () => {
	return 'Hello world!';
}};

var populate = { total: () => {
    imdb(DENZEL_IMDB_ID).then((val) => {
        movies = val;
        collection.deleteMany({});
        collection.insertMany(movies, (error, result) => {
            console.log('populating sucessful of ' + result.result.n + " movies");
            return result.result.n;
        });
    });
}};

var movies = { movie: () => {
	collection.find({ metascore: { $gt: 70 } }).toArray((error, result) => {
        if (error) {
            return res.status(500).send(error);
        }
        var index = Math.floor(Math.random() * result.length);
        console.log(result[index].title);
        return result[index];
    });
}}

var app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

app.use('/movies/populate', graphqlHTTP({
  schema: schema,
  rootValue: populate,
  graphiql: true,
 }));

app.use('/movies', graphqlHTTP({
  schema: schema,
  rootValue: movies,
  graphiql: true,
 }));

app.listen(9292, () => console.log('Now browse to localhost:9292'));