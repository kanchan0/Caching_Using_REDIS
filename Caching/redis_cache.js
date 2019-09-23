const redis             =   require('redis');

const client = redis.createClient();      //creating and connecting to the redis client

client.on('error',(err)=>{
    console.log("Error"+err)              //checking for any error and consoling it out
})

module.exports = client;