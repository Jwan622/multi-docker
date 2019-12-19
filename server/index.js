const keys = require("./keys");
// Express App Setup
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express(); // recieve and respond to http requests going back and to react server
app.use(cors()); // allows us to make requests from one domain to another
app.use(bodyParser.json()); // will parse incoming requests from react to json that express can work with.

// Postgres server
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});
pgClient.on('error', () => console.log("Lost PG Connection"))

// store the submitted index value in a table called values with a number column.
pgClient
    .query("CREATE TABLE IF NOT EXISTS values (number INT)")
    .catch((err) => console.log(err));


// Redis setup

const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate(); // redis documentation because we need individual duplicates to listen, subscribe, and publish. if we use the main one, we cannot use it for the other.


// express route handlers
app.get('/', (req, res) => {
    res.send("hi")
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query("SELECT * from VALUES");
    // send back to whoever made request
    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values)
    })
});

app.post('/values', async (req, res) => {
    const index = req.body.index;
    if (parseInt(index) > 40) {
       return res.status(422).send("index too high")
    }

    redisClient.hset('values', index, 'nothing yet!'); // worker will eventually get here and replace it with calculated value

    redisPublisher.publish('insert', index); // publishes sends to worker process
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({ working: true})
});

app.listen(5000, err => {
    console.log("listening)")
})

