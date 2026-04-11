const { query } = require('../config/database');
const Groq = require('groq-sdk');

// Lazily initialized — only created when an LLM method is first called.
// This lets the server start without GROQ_API_KEY and only fail on LLM endpoints.
let _groq = null;
function getGroq() {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set. Add it to backend/.env to enable LLM features.');
    }
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

class LlmService {
  async getPersonalisedDescription(landmark, userProfile) {
    const { visitor_type, interests = [], level = 1, detail_level = 'overview', language_pref = 'en' } = userProfile;
    const isExpert = level > 5;
    
    // Construct the prompt for the AI
    const systemPrompt = "You are an expert tour guide adapting a landmark description for a specific visitor. Keep the response to 1-2 short sentences maximum. Be engaging but concise.";
    
    const userPrompt = `
      Visitor Profile:
      - Type: ${visitor_type} (local vs tourist)
      - Experience Level: ${isExpert ? 'Advanced' : 'Newcomer'}
      - Preferred Detail Level: ${detail_level}
      - Language: ${language_pref}
      - Top Interests: ${interests.join(', ')}

      Rewrite this landmark description to perfectly resonate with this specific visitor:
      "${landmark.description || 'A fascinating place'}"
    `;

    try {
      const chatCompletion = await getGroq().chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: "llama-3.1-8b-instant", // We use LLaMA 3 8B because it is blazing fast on Groq!
        max_tokens: 150,
        temperature: 0.7,
      });

      return { description: chatCompletion.choices[0]?.message?.content || landmark.description };
    } catch (error) {
      console.error("Groq LLM Error:", error);
      // Fallback if the API fails
      return { description: landmark.description || 'A fascinating place to visit.' };
    }
  }

  async getRouteReasons(landmark, context) {
    const systemPrompt = "You are an expert urban guide. Explain why this landmark matches the user's current situation in 3 very short bullet points (max 3 words each). Use emojis. Return strictly JSON with a 'reasons' array.";
    const userPrompt = `
      Landmark: ${landmark.name} (${landmark.category})
      Context: Weather is ${context.weather?.description || 'clear'}, Time is ${context.currentHour}:00, Visitor is ${context.visitorType || 'tourist'}.
      User Interests: ${context.preferences?.interests?.join(', ') || 'general'}.
    `;

    try {
      const chatCompletion = await getGroq().chat.completions.create({
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        model: "llama-3.1-8b-instant", max_tokens: 80, temperature: 0.7, response_format: { type: "json_object" }
      });
      const res = JSON.parse(chatCompletion.choices[0]?.message?.content);
      return res.reasons || ["🎯 Profile Match", "📍 Nearby", "✨ Recommended"];
    } catch (e) {
      return ["🎯 Profile Match", "📍 Nearby", "✨ Recommended"];
    }
  }

  async getConversationalRefinement(userId, recentVisits) {
    const systemPrompt = "You are an adaptive AI companion for an explorer app. Keep your message under 15 words. Suggest a pivot in exploration based on their recent visits. Ask a quick yes/no question.";
    const userPrompt = `Recent visits: ${recentVisits?.map(v => v.category).join(', ') || 'none'}`;
    
    try {
      const chatCompletion = await getGroq().chat.completions.create({
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        model: "llama-3.1-8b-instant", max_tokens: 50, temperature: 0.7,
      });
      return { message: chatCompletion.choices[0]?.message?.content || "Should we try something different today?" };
    } catch(e) { 
      return { message: "Should we try something different today?" }; 
    }
  }

  async getDailyChallenge(userProfile, weather, timeOfDay) {
    const cat = userProfile.interests?.[0] || 'Nature';
    const systemPrompt = "You are generating a daily quest challenge for an urban exploration app. Output a creative title and a 1-sentence engaging description. Return strictly JSON with keys 'title' and 'description'.";
    const userPrompt = `Context: User likes ${cat}, weather is ${weather?.description || 'clear'}, time is ${timeOfDay || 'day'}. Goal: Visit 3 ${cat} spots.`;

    try {
      const chatCompletion = await getGroq().chat.completions.create({
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        model: "llama-3.1-8b-instant", max_tokens: 100, temperature: 0.7, response_format: { type: "json_object" }
      });
      const res = JSON.parse(chatCompletion.choices[0]?.message?.content);
      return {
        title: res.title || `${cat} Explorer Challenge`,
        description: res.description || `Since you love ${cat} and it's a ${weather?.description || 'nice'} ${timeOfDay || 'day'}, visit 3 ${cat} spots today!`,
        category: cat, target: 3, xpBonus: 150
      };
    } catch (error) {
      console.error("Groq LLM Error Data:", error);
      return {
        title: `${cat} Explorer Challenge`,
        description: `Since you love ${cat} and it's a ${weather?.description || 'nice'}, visit 3 ${cat} spots today!`,
        category: cat, target: 3, xpBonus: 150
      };
    }
  }
}

module.exports = new LlmService();
