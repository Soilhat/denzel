var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
const imdb = require('./src/imdb');
const DENZEL_IMDB_ID = 'nm0000243';

const CONNECTION_URL = "mongodb+srv://client1:client1@cluster0-maf1t.mongodb.net/test?retryWrites=true";
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
    collection = database.collection("test");
    console.log("Connected to `" + DATABASE_NAME + "`!");
});


var schema = buildSchema(`
  	type Query {
	  populate: Int
	  movie: Movie
	  Getmovie(id: String): Movie
	  movies(limit: Int, metascore: Int): Search
	  addReview(id:String, date:String, review:String): Movie
	}

	type Movie {
	  link: String
	  metascore: Int
	  synopsis: String
	  title: String
	  year: Int
	  reviews: [Review]
	}

	type Review {
		date: String
		review: String
	}

	type Search {
	  limit : Int
	  results : [Movie]
	  total: Int
	}

	type Mutation {
		addReview(id:String, revi: MessageInput) : Movie
	}

	input MessageInput {
	  date: String
	  review: String
	}
`);

var root = { 
	//query: {
		populate: () => {
			async function test(){
				var promise = new Promise((resolve, reject) =>{
					imdb(DENZEL_IMDB_ID).then((val) => {
				        movies = val;
				        collection.deleteMany({});
				        collection.insertMany(movies, (error, result) => {
				            console.log('populated ' + result.result.n + " movies");
				            resolve(result.result.n);
				        });
				    });
				});

				var result = await promise;
				return result;
			}
			return test();
		},

		movie: () => {
			async function mov(){
				var promise = new Promise((resolve, reject) =>{
					collection.find({ metascore: { $gt: 70 } }).toArray((error, result) => {
				        var index = Math.floor(Math.random() * result.length);
				        console.log(result[index].title);
				        resolve(result[index]);
				    });
				});
				return await promise;
			}
			return mov();
		},

		Getmovie: (args) => {
			async function movie(id){
				var promise = new Promise((resolve, reject) =>{
					collection.find({ id: id }).toArray((error, result) => {
			        	if (error) {
				            console.log(error);
				        }
				        if (result.length > 0) {
				            resolve(result[0]);
				        }
				        else {
				            console.log({error : `no match for id : ${id}`});
				        }
			    	});
				});
				return await promise;
			}
			return movie(args.id)
		},

		movies: (args) => {
			async function search(limit, metascore) {
				var promise = new Promise((resolve, reject) =>{
					if(limit == null) limit = 5;
					if(metascore == null) metascore = 0;
					collection.find({ metascore: { $gte: metascore } }).toArray((error, result) => {
				        if (error) {
				            return res.status(500).send(error);
				        }
				        var tab = [];
				        console.log(result.length)
				        for (var i = Math.floor(Math.random() * result.length); tab.length < result.length && tab.length < limit; i = Math.floor(Math.random() * result.length)) {
				            if(tab.indexOf(result[i]) == -1){
				                console.log(result[i].title)
				                tab.push(result[i])
				            }
				        }
				        var f = function(a,b){
				            return a>b ;
				        } 
				        function tri(l,f){
				            for(var i= 0 ; i< l.length; i++){  
				                for(var j=i+1; j< l.length; j++){
				                    if(f( l[j].metascore, l[i].metascore) ){
				                        var temp = l[j];
				                        l[j]=l[i];
				                        l[i]=temp;
				                    }
				                }
				            }
				            return l ;
				        }
				        tab = tri(tab,function(a,b){ return a>b ;})
				        resolve({"limit": limit, "results": tab, "total": tab.length})
				    });
				});
				return await promise;
			}
			return search(args.limit, args.metascore)
		},
	//},
	//mutation: {
		addReview: (args) => {
			async function rev(id, rev) {
				var promise = new Promise((resolve, reject) =>{
					collection.find({ id: id }).toArray((error, result) => {
				        if (error) {
				            return res.status(500).send(error);
				        }
				        if (result.length > 0) {
				            var review = revi;
				            console.log(revi);
				            if(result[0].reviews){
				                collection.updateOne({id : id}, { $push: {'reviews' :  review }}, function(err, res) {
				                    if(err){
				                        console.log(err)
				                        throw err;
				                    }
				                    console.log(result[0]);
				                });
				                resolve(result[0]);
				            }
				            else {
				                collection.deleteOne({id : id});
				                var movie = result[0];
				                movie.reviews = [ review ];
				                collection.insertOne(movie, (error, result) => {
				                    console.log(result.ops[0]);
				                    resolve( result.ops[0]);
				                });
				            }
				        }
				    });
				});
				return await promise;
			}
			var revi = {date: args.date, review:args.review};
		    return rev(args.id, revi);
		//}
	}
};

var app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

app.listen(9297, () => console.log('Now browse to localhost:9297'));