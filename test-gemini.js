import fs from 'fs';

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("No API key");
  process.exit(1);
}

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function test() {
  const word = "apple";
  const prompt = `
英単語「${word}」を暗記するためのヒントとなる連想を、以下の3つの異なるアプローチで1つずつ提案してください。
出力は必ず以下の順序で配列に格納してください。

1. カタカナ語の例: 対象単語、もしくはその語源が日本のカタカナ語（固有名詞や商品名などを含む）として使われている例とその説明。
2. 語呂合わせ: 対象単語の読み方と意味を日本語で面白く結びつける語呂合わせ。
3. 音が似ている言葉: 対象単語と発音が似ている日本の言葉やカタカナ語（固有名詞などを含む）と、それに紐づけたイメージ。

必ず以下のJSON形式で出力してください：
{
  "associations": ["(1の提案)", "(2の提案)", "(3の提案)"]
}
`.trim();

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
        responseSchema: {
          type: "OBJECT",
          properties: {
            associations: {
              type: "ARRAY",
              items: { type: "STRING" }
            }
          },
          required: ["associations"]
        }
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    }),
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
