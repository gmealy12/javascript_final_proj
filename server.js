// const http = require('http');
// const fs = require('fs');
const path = require("path");
const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const portNumber = 5500;
require("dotenv").config({ path: path.resolve(__dirname, '.env') })

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${userName}:${password}@cluster0.2xsr2dv.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.set("views", path.resolve(__dirname, "pages"));
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/pages'));
app.use(bodyParser.urlencoded({extended:false}));
process.stdin.setEncoding("utf8");

app.listen(portNumber);
console.log(`Web server started and running at http://localhost:${portNumber}`);

app.get("/", async (request, response) => {
    
    let filter = {};
    await client.connect();
    const cursor = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).find(filter);
    const result = await cursor.toArray();
    await client.close();
    let postData = ""
    let postArr = []

    result.forEach(elem => {
        let tempStr = "";
        tempStr += "<div class=\"post\">";
        tempStr += "<h3 class=\"postTitle\"><u>" + elem.title + "</u></h3>";
        tempStr += "<p class=\"postBody\">" + elem.body + "</p>";
        tempStr += "<br><br><div class=\"submissionTime\">Submitted at: " + elem.submissionTime;
        tempStr += "</div></div><br>";
        postArr.push(tempStr);
    });

    postArr = postArr.reverse()
    postData = postArr.join("")

    if (postData === "") {
        postData += "<p>There are no posts currently, try submitting one!</p>"
    }
    let variables = {posts: postData}
    response.render("homepage", variables);
});

app.get("/newPost", (request, response) => {
    response.render("newPost");
});

app.post("/processSubmitPost", async (request, response) => {
    let {title, body} = request.body;

    let post = {
        title: title,
        body: body,
        submissionTime: String(Date())
    }
    await client.connect();
    await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(post);
    await client.close();

    let variables = {
        postTitle: post.title
    }
    response.render("processSubmitPost", variables);
});

app.get("/removePost", (request, response) => {
    response.render("removePost");
});

app.post("/processRemovePost", async (request, response) => {
    let {title} = request.body;
    await client.connect();
    let removed = 0;
    if (title === undefined) {
        //remove all
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).deleteMany({});
        removed = result.deletedCount;
    } else {
        let filter = {title: title};
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).deleteOne(filter);
        removed = result.deletedCount;
    }
    await client.close();

    let output = `<!doctype html>
    <html lang="en">
    
    <head>
        <meta charset="utf-8" />
        <title>Home Page</title>
        <link rel="stylesheet" href="style.css">
    </head><h1>Process Remove Post</h1>`;
    if (removed === 0) {
        output += `No posts matched the given parameters.`;
    } else {
        output += `<strong>Success</strong>, ${removed} post(s) have been removed.`;
    }

    output += `<br><br><button class="homeButton" id="newPost" onclick="window.location.href='/';">Return to homepage</button>`;
    response.send(output);
});

app.get("/nasaImage", async (request, response) => {
    let url = "https://api.nasa.gov/planetary/apod?api_key=" + process.env.NASA_API_KEY;
    let imageData;
    await fetch(url, {method: "GET"}).then( response => response.json() ). then( response => imageData = response);
    let variables = {
        url: imageData.url,
        date: imageData.date,
        description: imageData.explanation,
        title: imageData.title
    };
    response.render("nasaImage", variables);
});

const prompt = "Stop to shutdown the server: ";
process.stdout.write(prompt);
process.stdin.on("readable", function() {
    let dataInput = process.stdin.read();
    if (dataInput !== null) {
      let command = dataInput.trim();
      if (command === "stop") {
        process.stdout.write("Shutting down the server\n");
        process.exit(0);
      } else {
        process.stdout.write(`Invalid comand: ${command}\n`);
      }
      process.stdout.write(prompt);
      process.stdin.resume();
    }
});
