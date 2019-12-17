// connecting to redis and calculating fib value.

const keys = require('./keys'); // used for connecting to redis
const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000 // if connection is lost to redis server, retry once every 1 second or 1000 milis
});

const sub = redisClient.duplicate(); // duplicate of client.

function fib(index) {
    if (index < 2) return 1;
    return fib(index-1) + fib(index-2);
}

sub.on('message', (channel, message) => { // message is the index value of the fibonacci sequence, not the value itself, we have to calc that.
    redisClient.hset('values', message, fib(parseInt(message))) // this puts it back into redis
}); // sub on watches redis for new messages

sub.subscribe('insert'); // we subscribe to insert events.
