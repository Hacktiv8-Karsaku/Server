const { Client } = require("@googlemaps/google-maps-services-js");

const client = new Client({});

async function geocodeAddress(placeName) {
  try {
    const response = await client.geocode({
      params: {
        address: placeName,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });
    console.log(response.data);
    

    if (response.data.results && response.data.results.length > 0) {
      const location = response.data.results[0];
      const coordinates = {
        lat: location.geometry.location.lat,
        lng: location.geometry.location.lng,
      };

      const id = location.place_id

      return {
        coordinates,
        formattedAddress: location.formatted_address,
        placeId: id,
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

module.exports = { geocodeAddress };
