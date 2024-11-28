// helpers/openaiHelper.js
const { Configuration, OpenAIApi } = require("openai");
const dotenv = require("dotenv");

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const getRecommendations = async (userData) => {
  const { tasks, stressLevel, mood } = userData;

  const prompt = `
    Based on the following information, provide personalized recommendations for a healthy lifestyle:
    - Tasks: ${tasks.join(", ")}
    - Stress Level: ${stressLevel}%
    - Mood: ${mood}.
    
    Include actionable suggestions to improve well-being.
  `;

  try {
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 200,
      temperature: 0.7,
    });

    if (response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].text.trim();
    } else {
      throw new Error("No recommendation received from OpenAI.");
    }
  } catch (error) {
    console.error("Error with OpenAI API:", error);
    throw new Error("Could not fetch recommendations. Please try again later.");
  }
};

module.exports = { getRecommendations };
