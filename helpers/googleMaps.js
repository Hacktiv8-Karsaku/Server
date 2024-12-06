const { Client } = require("@googlemaps/google-maps-services-js");

const client = new Client({});

async function geocodeAddress(placeName) {
  try {
    const placesResponse = await client.findPlaceFromText({
      params: {
        input: placeName,
        inputtype: "textquery",
        fields: ["photos", "formatted_address", "geometry", "name"],
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const response = await client.geocode({
      params: {
        address: placeName,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    if (
      placesResponse.data.candidates &&
      placesResponse.data.candidates.length > 0
    ) {
      const place = placesResponse.data.candidates[0];
      const photoReference = place.photos?.[0]?.photo_reference;
      const location = response.data.results[0];

      const id = location.place_id
      const photoUrl = photoReference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        : null;

      return {
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
        formattedAddress: place.formatted_address,
        photoUrl: photoUrl,
        placeId: id,
      };
    }
    return null;
  } catch (error) {
    console.error("Places API error:", error);
    return null;
  }
}

module.exports = { geocodeAddress };
