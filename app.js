var express = require('express');
var morgan = require('morgan');
var BusinessCollection = require('./business-collection.js');

var globalBusinessesCollection = [];
var REFRESH_INTERVAL = Number(process.env.REFRESH_INTERVAL);

/**
  Returns a promise to refresh the global businesses array and set a timeout to do it again on the refresh interval
*/
function refreshBusinesses() {
  return BusinessCollection.loadLocalBusinesses().then(function(collection) {
    if (collection == null || collection.createdAt.getTime() + REFRESH_INTERVAL < (new Date()).getTime()) {
      console.log("=====> Loading remote business data");
      return BusinessCollection.loadRemoteBusinesses().then(function(collection) {
        collection.saveLocally();
        return collection;
      });
    } else {
      return collection;
    }
  }).then(function(collection) {
    globalBusinessesCollection = collection;
    console.log("=====> Refreshed with " + collection.businesses.length + " records");
  }).catch(function(err){
    console.log(err)
  }).finally(function() {
    setTimeout(refreshBusinesses, (globalBusinessesCollection.createdAt.getTime() + REFRESH_INTERVAL) - (new Date()).getTime());
  })
}

function startServer(app) {
  app.use(morgan('combined'));

  app.get('/status', function(req, res) {
    res.json({status: "running", date: (new Date()).toISOString()});
  })

  app.get('/v1/businesses', function(req, res) {
    res.json(globalBusinessesCollection.businesses);
  })

  var server = app.listen(process.env.PORT, '0.0.0.0',  function() {
    console.log("=====> listening on " + server.address().port);
  })
}

var app = express();
refreshBusinesses().then(function(){
  startServer(app);
})

module.exports = app;
