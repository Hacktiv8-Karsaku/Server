const OpenAI = require("openai");
const { youtube } = require("scrape-youtube");
const { geocodeAddress } = require("./googleMaps");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateRecommendations(userPreferences) {
  try {
    // Generate food-related keywords using OpenAI
    const keywordPrompt = `Based on these food preferences:
    - Preferred Foods: ${userPreferences.preferredFoods.join(", ")}
    - Avoided Foods: ${userPreferences.avoidedFoods.join(", ")}

    Generate 3 specific YouTube search queries for food videos that would interest this user. Format as JSON array.`;

    const keywordCompletion = await openai.chat.completions.create({
      messages: [{ role: "system", content: keywordPrompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
    });

    const searchQueries = JSON.parse(
      keywordCompletion.choices[0].message.content
    );

    // Fetch YouTube videos for each query
    const videos = [];
    for (const query of searchQueries) {
      try {
        const result = await youtube.search(query);
        if (result && result.videos && result.videos.length > 0) {
          const videoData = result.videos.slice(0, 2).map((video) => ({
            title: video.title,
            url: video.link || `https://www.youtube.com/watch?v=${video.id}`,
            thumbnail: video.thumbnail || video.thumbnails?.[0]?.url,
            description: video.description || video.snippet || video.title,
          }));
          videos.push(...videoData);
        }
      } catch (error) {
        console.error(`Error fetching videos for query "${query}":`, error);
      }
    }

    // Generate other recommendations
    const prompt = `Based on this user profile:
    - Job: ${userPreferences.job}
    - Daily Activities: ${userPreferences.dailyActivities.join(", ")}
    - Stress Level: ${userPreferences.stressLevel}
    - Location: ${userPreferences.domicile}

    STRICT LOCATION REQUIREMENTS:
    1. Only recommend REAL, EXISTING places within ${userPreferences.domicile}
    2. Each place must have a COMPLETE, ACCURATE name as it appears on Google Maps
    3. All places must be actual establishments or locations that exist in ${userPreferences.domicile}

    Create recommendations in JSON format:
    {
      "todoList": [array of 10 string items],
      "places": [
        {
          "name": "EXACT place name as it appears on Google Maps",
          "description": "Brief description focusing on stress relief and relaxation benefits",
          "address": "Full address in ${userPreferences.domicile}",
          "type": "One of: [park, spa, cafe, temple, beach, garden, museum]",
          "rating": "4.5",
          "imageCategory": "relaxation"
        }
      ]
    }

    Include exactly 5 places that are:
    1. Well-known and easily findable on Google Maps
    2. Actually located in ${userPreferences.domicile}
    3. Perfect for stress relief and relaxation
    4. Mix of indoor and outdoor locations`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
    });

    const baseRecommendations = JSON.parse(
      completion.choices[0].message.content
    );

    // Add debug logging
    console.log("Videos found:", videos.length);
    console.log("Sample video:", videos[0]);

    // Inside generateRecommendations function, after getting baseRecommendations:
    const enhancedPlaces = await Promise.all(
      baseRecommendations.places.map(async (place) => {
        try {
          const geocodeResult = await geocodeAddress(place.name + ", " + userPreferences.domicile);
          if (geocodeResult && geocodeResult.coordinates) {
            return {
              ...place,
              address: geocodeResult.formattedAddress || place.address,
              coordinates: geocodeResult.coordinates,
              placeId: geocodeResult.placeId || null,
              uri: `https://source.unsplash.com/random/?${place.type},${place.imageCategory}`
            };
          }
        } catch (error) {
          console.error(`Geocoding failed for ${place.name}:`, error);
        }
        // Return original place data if geocoding fails
        return {
          ...place,
          coordinates: { lat: 0, lng: 0 },
          placeId: null,
          uri: `https://source.unsplash.com/random/?${place.type || 'place'},relaxation`
        };
      })
    ).then(places => places.filter(place => place !== null));

    return {
      ...baseRecommendations,
      places: enhancedPlaces.filter(place => place.coordinates && 
        (place.coordinates.lat !== 0 || place.coordinates.lng !== 0)),
      foodVideos: videos,
    };
  } catch (error) {
    console.error("Error in generateRecommendations:", error);
    throw new Error("Failed to generate recommendations");
  }
}

module.exports = { generateRecommendations };
