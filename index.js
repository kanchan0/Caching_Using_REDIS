const express           =   require('express');
const responseTime      =   require('response-time')
const axios             =   require('axios');
const fetch             =   require("node-fetch");
const client            =   require("./Caching/redis_cache")


const app = express();
app.use(responseTime());                 //responseTime is a middleware to retrun the time taken by a api response

//api for caching a wikipedia article to the cache
app.get('/api/search', (req, res) => {
    
    const query = (req.query.query).trim();    // Extract the query from url and trim trailing spaces
    // Build the Wikipedia API url
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${query}`;
  
    // Try fetching the result from Redis first in case we have it cached
    return client.get(`wikipedia:${query}`, (err, result) => {
      // If that key exist in Redis store
      if (result) {
        const resultJSON = JSON.parse(result);
        return res.status(200).json(resultJSON);
      } else { // Key does not exist in Redis store
        // Fetch directly from Wikipedia API
        return axios.get(searchUrl)
          .then(response => {
            const responseJSON = response.data;
            // Save the Wikipedia API response in Redis store
            client.setex(`wikipedia:${query}`, 3600, JSON.stringify({ source: 'Redis Cache', ...responseJSON, }));
            // Send JSON response to client
            return res.status(200).json({ source: 'Wikipedia API', ...responseJSON, });
          })
          .catch(err => {
            return res.json(err);
          });
      }
    });
  });  



// api for getting photos list
app.get('/photos', (req, res) => {
 
    // key to store results in Redis store
    const photosRedisKey = 'user:photos';
 
    // Try fetching the result from Redis first in case we have it cached
    return client.get(photosRedisKey, (err, photos) => {
 
        // If that key exists in Redis store
        if (photos) {
 
            return res.json({ source: 'cache', data: JSON.parse(photos) })
 
        } else { 
            // Fetch directly from remote api
            fetch('https://jsonplaceholder.typicode.com/photos')
                .then(response => response.json())
                .then(photos => {
 
                    // Save the  API response in Redis store,  data expire time in 3600 seconds, it means one hour
                    client.setex(photosRedisKey, 3600, JSON.stringify(photos))
 
                    // Send JSON response to client
                    return res.json({ source: 'api', data: photos })
 
                })
                .catch(error => {
                    // log error message
                    console.log(error)
                    // send error to the client 
                    return res.json(error.toString())
                })
        }
    });
});


  app.listen(4000, () => {
    console.log('Server listening on port: ', 4000);
  });

  //  To see keys that  I have cached in redis-client >>>>>>>>>>>> run----> redis-cli keys "*"
  // TO see the data in the key>>>>>>>>>>>>>>>>>>>>>>>>>>run----> redis-cli get "key_name"