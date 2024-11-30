const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateRecommendations(userPreferences) {
  try {
    const prompt = `Based on this user profile:
    - Job: ${userPreferences.job}
    - Daily Activities: ${userPreferences.dailyActivities.join(', ')}
    - Stress Level: ${userPreferences.stressLevel}
    - Preferred Foods: ${userPreferences.preferredFoods.join(', ')}
    - Avoided Foods: ${userPreferences.avoidedFoods.join(', ')}

    Please provide recommendations in the following JSON format:
    {
      "todoList": [array of 5 stress relief activities],
      "places": [array of 3 recommended places or activities with descriptions],
      "foods": [array of 5 healthy food recommendations considering preferences]
    }`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 500,
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('OpenAI Error:', error);
    throw new Error('Failed to generate recommendations');
  }
}

module.exports = { generateRecommendations }; 