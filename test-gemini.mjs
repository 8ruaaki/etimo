import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
  try {
    const API_KEY = "AIzaSyDyyHWJMNGs5lt1rwUjTcyZCMla6P0TBos"; // Testing with user's key
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `英単語「ephemeral」の日本語での意味を教えてください。
JSON形式で以下のように回答してください：
{
  "meanings": ["意味1", "意味2"]
}`;

    console.log("Generating content...");
    const result = await model.generateContent(prompt);
    console.log("Response:", result.response.text());
  } catch (error) {
    console.error("Error:", error);
  }
}

test();