var geocoder = require('geocoder');
var Promise = require('bluebird');

/**
  Represents a business loaded from open data
*/
var Business = function() {}

/** 
  Return a promise for a business parsed for an open data response
*/
Business.parseBusinessFromData = function(data) {
  return new Promise(function(resolve, reject) {
    var business = new Business();
    business.name = data['tname'];
    if (data['tphysicaladdress1']) {
      business.address = data['tphysicaladdress1'];
    } else {
      business.address = data['tphysicaladdress2'];
    }
    business.address = business.address + ' ' + data['tphysicalcity'] + ', LA ' + data['tphysicalzipcode5'];
    business.latitude = data['geolocation']['latitude']
    business.longitude = data['geolocation']['longitude']
    resolve(business);
  }).then(function(business) {
    if (business.address) {
      return business.geocodeAddress();
    } else {
      throw new Error("Open Data responded with an empty address");
    }
  });
}

/**
  Returns a promise for the response from the geocoder for the given address
*/
Business.prototype.geocodeAddress = function() {
  function coordinatesFromGeocoderResponse(response) {
    return new Promise(function(resolve, reject) {
      var location = response['results'][0]['geometry']['location'];
      resolve({
        latitude: location['lat'],
        longitude: location['lng'],
      });
    });
  }

  var business = this
  return new Promise(function(resolve, reject) {
    geocoder.geocode(business.address, function(err, data) {
      if (err) {
        reject(err);
      } else {
        coordinatesFromGeocoderResponse(data).then(function(location) {
          business.latitude = location.latitude;
          business.longitude = location.longitude;
          resolve(business)
        }).catch(function(err) {
          console.log(err)
          resolve(business)
        });
      }
    })
  });
}


module.exports = Business
