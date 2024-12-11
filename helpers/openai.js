const OpenAI = require("openai");
const { youtube } = require("scrape-youtube");
const { geocodeAddress } = require("./googleMaps");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateRecommendations(userPreferences) {
  try {
    const recommendationPrompt = `Based on these preferences and stress level:
    - Preferred Foods: ${userPreferences.preferredFoods.join(", ")}
    - Avoided Foods: ${userPreferences.avoidedFoods.join(", ")}
    - Stress Level: ${userPreferences.stressLevel} (1-10 scale)

    Generate video recommendations in these categories:
    1. Food/Cooking videos aligned with preferences
    2. Stress-relief content (meditation, relaxation, etc.)
    3. Motivational content
    4. Mood-boosting content (based on stress level)

    For stress levels 1-3: Include upbeat, energizing content
    For stress levels 4-7: Include calming, balanced content
    For stress levels 8-10: Include therapeutic, soothing content

    Generate 2 specific YouTube search queries for each category. Format as JSON with categories as keys.`;

    const recommendationCompletion = await openai.chat.completions.create({
      messages: [{ role: "system", content: recommendationPrompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
    });

    const searchQueries = JSON.parse(
      recommendationCompletion.choices[0].message.content
    );

    const videos = [];
    for (const category in searchQueries) {
      for (const query of searchQueries[category]) {
        try {
          const result = await youtube.search(query);
          if (result && result.videos && result.videos.length > 0) {
            const videoData = result.videos.slice(0, 2).map((video) => ({
              title: video.title,
              url: video.link || `https://www.youtube.com/watch?v=${video.id}`,
              thumbnail: video.thumbnail || video.thumbnails?.[0]?.url,
              description: video.description || video.snippet || video.title,
              category: category,
            }));
            videos.push(...videoData);
          }
        } catch (error) {
          console.error(`Error fetching videos for query "${query}":`, error);
        }
      }
    }

    const prompt = `User Profile:
    - Job: ${userPreferences.job}
    - Daily Activities: ${userPreferences.dailyActivities.join(", ")}
    - Stress Level: ${userPreferences.stressLevel} (Low/Moderate/High)
    - Location: ${userPreferences.domicile}

    **Task:** Generate personalized recommendations for this user, focusing on stress relief, relaxation, and mood improvement. The recommendations must align with the user’s lifestyle and location. Follow these STRICT GUIDELINES:

    ### 1. To-Do List:
    - Create a JSON array "todoList" containing 10 actionable recommendations, including:
      - 3 stress-reduction activities tailored to their stress level and daily activities
      - 2 mood-boosting activities to enhance positivity and engagement
      - 3 healing places to visit locally for relaxation (outdoor or indoor)
      - 2 self-care practices (e.g., mindful exercises, routines)
    - Ensure all items are easy to implement and realistic for the user's location and lifestyle.

    ### 2. Local Places:
    - Create a JSON array "places" containing 5 local establishments or natural locations that exist in ${
      userPreferences.domicile
    }. Each place must:
      - Be a REAL, VERIFIABLE location on Google Maps
      - Be well-known for stress relief, relaxation, or healing
      - Include a mix of indoor and outdoor locations
      - Provide specific benefits for relaxation, stress relief, or mental well-being
    - Each place object should have the following format:
      {
        "name": "Exact name as it appears on Google Maps",
        "description": "Brief description focusing on its relaxation or stress-relief benefits",
        "address": "Full address as listed on Google Maps",
        "type": "One of: [park, spa, cafe, temple, beach, garden, museum]",
        "rating": "At least 4.5",
        "imageCategory": "Keyword related to relaxation for fetching images (e.g., calm, tranquility)"
      }

    ### 3. Additional Details:
    - If a place requires geolocation, return its coordinates (latitude and longitude) and Google Maps Place ID.
    - Provide URLs for image placeholders using the format: "https://source.unsplash.com/random/?[type],[imageCategory]".
    - Only include places that are accessible and suitable for relaxation.

    ### Example Output:
    {
      "todoList": [
        "Try yoga at home to ease tension",
        "Visit a serene park to meditate",
        "Enjoy a relaxing spa day at a local wellness center",
        ...
      ],
      "places": [
        {
          "name": "Peaceful Haven Spa",
          "description": "A high-rated spa offering relaxing massages and aromatherapy.",
          "address": "123 Serenity Blvd, ${userPreferences.domicile}",
          "type": "spa",
          "rating": "4.8",
          "imageCategory": "calm"
        },
        ...
      ]
    }

    **Tone:** Friendly, practical, and empathetic. The recommendations must feel tailored, approachable, and relevant to the user’s needs.

    **Objective:** Help this user thrive by offering actionable steps to reduce stress, boost their mood, and find nearby places for mental and physical relaxation.`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
    });

    const baseRecommendations = JSON.parse(
      completion.choices[0].message.content
    );

    const enhancedPlaces = await Promise.all(
      baseRecommendations.places.map(async (place) => {
        try {
          const geocodeResult = await geocodeAddress(
            place.name + ", " + userPreferences.domicile
          );
          if (geocodeResult && geocodeResult.coordinates) {
            return {
              ...place,
              address: geocodeResult.formattedAddress || place.address,
              coordinates: geocodeResult.coordinates,
              placeId: geocodeResult.placeId || null,
              uri: `https://source.unsplash.com/random/?${place.type},${place.imageCategory}`,
            };
          }
        } catch (error) {
          console.error(`Geocoding failed for ${place.name}:`, error);
        }
        return {
          ...place,
          coordinates: { lat: 0, lng: 0 },
          placeId: null,
          uri: `https://source.unsplash.com/random/?${
            place.type || "place"
          },relaxation`,
        };
      })
    ).then((places) => places.filter((place) => place !== null));

    return {
      ...baseRecommendations,
      places: enhancedPlaces.filter(
        (place) =>
          place.coordinates &&
          (place.coordinates.lat !== 0 || place.coordinates.lng !== 0)
      ),
      foodVideos: videos,
    };
  } catch (error) {
    console.error("Error in generateRecommendations:", error);
    throw new Error("Failed to generate recommendations");
  }
}

module.exports = { generateRecommendations };
