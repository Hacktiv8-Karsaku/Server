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
    1. Only recommend places that are physically located within 50km of ${
      userPreferences.domicile
    }
    2. Do not suggest any international or distant locations
    3. All activities must be feasible to do locally in ${
      userPreferences.domicile
    }

    Create a balanced todo list that includes:
    1. Stress-reduction activities (meditation, breathing exercises, etc.)
    2. Mood-boosting activities (exercise, social interactions, hobbies)
    3. Local healing places or destinations to visit
    4. Self-care practices
    5. Mindfulness exercises

    Consider the user's stress level (${
      userPreferences.stressLevel
    }/10) when suggesting activities.
    Higher stress levels should include more calming activities, while lower stress levels can include more energetic activities.

    Please provide recommendations in JSON format:
    {
      "todoList": [
        array of string 10 items including:
        - 3 stress-reduction activities
        - 2 mood-boosting activity
        - 3 local healing place visit
        - 2 self-care practice
      ],
      "places": [
        {
          "name": "Full location name including district/area in ${
            userPreferences.domicile
          }",
          "description": "Brief description of the place and its stress-relief benefits",
          "address": "Complete street address in ${userPreferences.domicile}",
          "coordinates": {
            "lat": latitude as number,
            "lng": longitude as number
          }
        }
      ]
    }`;

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
        const geocodeResult = await geocodeAddress(place.name);
        if (geocodeResult) {
          return {
            ...place,
            address: geocodeResult.formattedAddress,
            coordinates: geocodeResult.coordinates,
          };
        }
        return place;
      })
    );

    return {
      ...baseRecommendations,
      places: enhancedPlaces,
      foodVideos: videos,
    };
  } catch (error) {
    console.error("Error in generateRecommendations:", error);
    throw new Error("Failed to generate recommendations");
  }
}

module.exports = { generateRecommendations };
