const OpenAI = require("openai");
const { youtube } = require("scrape-youtube");

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

    Please provide recommendations in JSON format:
    {
      "todoList": [array of 5 stress relief activities],
      "places": [array of 3 recommended places with descriptions]
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

    return {
      ...baseRecommendations,
      foodVideos: videos,
    };
  } catch (error) {
    console.error("Error in generateRecommendations:", error);
    throw new Error("Failed to generate recommendations");
  }
}

module.exports = { generateRecommendations };
