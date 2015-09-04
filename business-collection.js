var fs = require('fs');
var request = require('request');
var Promise = require('bluebird');
var sleep = require('sleep');
var Business = require('./business.js');

var OPEN_DATA_URL = "https://data.brla.gov/resource/xw6s-bcqm.json?tabc=1&tstatus=O";
var LOCAL_BUSINESS_DATA_FILENAME = "businesses.json";
var REMOTE_BUSINESS_FETCH_SLEEP_TIME = Number(process.env.REMOTE_BUSINESS_FETCH_SLEEP_TIME);

/**
  A collection of business with the date they were loaded
*/
BusinessCollection = function(businesses, createdAt) {
  this.businesses = businesses;
  this.createdAt = createdAt;
}

/**
  Returns a promise for saving a local copy of the business collection data
*/
BusinessCollection.prototype.saveLocally = function() {
  return new Promise((function(resolve, reject) {
    fs.writeFile(LOCAL_BUSINESS_DATA_FILENAME, JSON.stringify(this), 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(LOCAL_BUSINESS_DATA_FILENAME);
      }
    })
  }).bind(this));
}

/**
  Returns a promise for loading a local copy of the business collection data
*/
BusinessCollection.loadLocalBusinesses = function() {
  return new Promise(function(resolve, reject) {
    fs.readFile(LOCAL_BUSINESS_DATA_FILENAME, 'utf8', function(err, data) {
      if (err) {
        resolve(null);
      } else {
        collection = JSON.parse(data);
        collection.createdAt = new Date(collection.createdAt)
        resolve(collection);
      }
    });
  });
}

/**
  Returns a promise for a BusinessCollection for remote businesses
*/
BusinessCollection.loadRemoteBusinesses = function() {
  var unparsedBusinesses = [];
  var businesses = [];

  // Promise for all the objects on open data
  function fetchOpenDataObjects() {
    return new Promise(function(resolve, reject) {
      request(OPEN_DATA_URL, function(err, response, body) {
        if (err) {
          reject(err);
        } else {
          data = JSON.parse(body);
          resolve(data);
        }
      });
    });
  }

  // Recusive function that returns a promise to populate the businesses array with the data in unparsedBusinesses
  function parseNextBusiness() {
    if (unparsedBusinesses.length == 0) { return; }
    data = unparsedBusinesses.pop();
    return Business.parseBusinessFromData(data).then(function(business) {
      businesses.push(business);
      console.log("=====> Loaded Business: " + JSON.stringify(business));
      sleep.usleep(REMOTE_BUSINESS_FETCH_SLEEP_TIME);
      return parseNextBusiness();
    })
  }

  return fetchOpenDataObjects().then(function(data) {
    unparsedBusinesses = data;
    return parseNextBusiness();
  }).then(function() {
    return new BusinessCollection(businesses, new Date());
  })
}

module.exports = BusinessCollection
