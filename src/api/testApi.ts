const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export const generateDistractors = async (word: string, correctMeaning: string): Promise<string[]> => {
  if (!GEMINI_API_KEY) {
    return ['ダミーの間違い選択肢1', 'ダミーの間違い選択肢2', 'ダミーの間違い選択肢3'];
  }

  const prompt = `
あなたは英語学習アプリのテスト問題作成者です。
ターゲットとなる英単語「${word}」と、その正しい意味「${correctMeaning}」が与えられます。
この単語の4択問題の「間違いの選択肢（ダミー）」となる日本語の意味を【必ず3つ】作成してください。

【厳守するルール】
1. 【ダミー生成手順】まず、ターゲットとなる英単語「${word}」と「スペルや発音が似ている別の英単語」を3つ選んでください。
2. 次に、その選んだ3つの別の英単語の意味を使って、3つの間違いの選択肢を作成してください。
3. 【文字数と意味の数の統一】正解の選択肢（「${correctMeaning}」）にいくつの意味が書かれているか（「、」や「・」「,」で区切られた意味の数）を正確に数えてください。そして、間違いの選択肢も全く同じ「意味の数」になるように区切り文字で繋げて作成してください。正解と間違いの選択肢で、長さや見た目の違いから正解が推測されないようにするためです。
4. 絶対に「正解（${correctMeaning}）」の同義語や、別の正しい訳、辞書に載っている意味を含めないでください。
5. 出力は文字列の配列（JSON）のみとしてください。ベースにした似ている英単語の解説などは一切出力しないでください。

出力例:
{
  "distractors": ["間違った意味1", "間違った意味2", "間違った意味3"]
}
`.trim();

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: {
            type: "OBJECT",
            properties: {
              distractors: {
                type: "ARRAY",
                items: { type: "STRING" }
              }
            },
            required: ["distractors"]
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

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!rawText) throw new Error('Empty response');

    const cleanText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleanText);
    
    if (!parsed.distractors || !Array.isArray(parsed.distractors)) {
      throw new Error('Invalid JSON structure');
    }
    
    // Ensure exactly 3 items
    let distractors = parsed.distractors.slice(0, 3);
    while (distractors.length < 3) {
      distractors.push(`（エラー補充）間違いの選択肢${distractors.length + 1}`);
    }
    return distractors;

  } catch (err: any) {
    console.error('[GenerateDistractors] Error:', err);
    return ['（エラー）別の意味1', '（エラー）別の意味2', '（エラー）別の意味3'];
  }
};
