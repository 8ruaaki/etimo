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

  } catch (err) {
    console.error('[GenerateDistractors] Error:', err);
    return ['（エラー）別の意味1', '（エラー）別の意味2', '（エラー）別の意味3'];
  }
};

export const generateExampleSentence = async (word: string, meaning: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return `This is a sample example sentence for "${word}".`;
  }

  const prompt = `
あなたは英語学習アプリを開発しているエンジニアです。
ターゲットとなる英単語「${word}」とその意味「${meaning}」が与えられます。

【 задача 】
この単語を使った簡単な英文の例文を1つ作成してください。

【厳守するルール】
1. 例文には必ずターゲット単語「${word}」を含めてください。
2. 例文はCEFR A1〜A2レベル（初〜中級者向け）であることを確認してください。
3. 可能な限り、基本的な文法構造（主語 + 動詞 + 目的語など）を使用してください。
4. 例文は3〜8語程度の短文にしてください。
5. 英語のみを出力してください（説明や解説は不要）。
6. ターゲット単語を「「${word}」」のように二重カギ括弧で囲んでください（穴埋め問題用）。

出力例:
I 「see」 a cat.
`.trim();

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 50
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

    return rawText.trim();

  } catch (err) {
    console.error('[GenerateExampleSentence] Error:', err);
    return `I 「${word}」 something.`;
  }
};

export interface ExampleWithTranslation {
  english: string;
  japanese: string;
}

export const generateExampleWithTranslation = async (word: string, meaning: string): Promise<ExampleWithTranslation> => {
  if (!GEMINI_API_KEY) {
    return {
      english: `I 「${word}」 something.`,
      japanese: `私は「${meaning}」します。`
    };
  }

  const prompt = `
あなたは英語学習アプリを開発しているエンジニアです。
ターゲットとなる英単語「${word}」とその意味「${meaning}」が与えられます。

【 依頼内容 】
この単語を使った簡単な英語の例文1つと、その日本語訳を作成してください。

【 厳守ルール 】
1. 英文には必ずターゲット単語「${word}」を含めてください。
2. 【重要】できるだけターゲット単語と「よく一緒に使われる単語（コロケーション）」を組み合わせた自然な英文にしてください。
3. 英文はCEFR A1〜A2レベル（初〜中級者向け）の短文（3〜10語程度）にしてください。
4. 日本語訳は、その英文の意味を正確に反映した自然な文章にしてください。
5. 【重要】日本語訳の中で、ターゲット単語（${word}）の「訳語」にあたる部分を必ず『』で囲んでください。
   例: ターゲット単語が "company" で訳語が "会社" の場合、「私は『会社』で働いています。」のようにします。
6. 出力は必ず以下のJSON形式のみとしてください。

{
  "english": "英語の例文",
  "japanese": "日本語の和訳（訳語に『』を付与）"
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
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              english: { type: "STRING" },
              japanese: { type: "STRING" }
            },
            required: ["english", "japanese"]
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

    const parsed = JSON.parse(rawText);
    return {
      english: parsed.english.trim(),
      japanese: parsed.japanese.trim()
    };

  } catch (err) {
    console.error('[generateExampleWithTranslation] Error:', err);
    return {
      english: `I 「${word}」 something.`,
      japanese: `私は「${meaning}」します。`
    };
  }
};

// New function to generate Japanese translation
export const generateJapaneseTranslation = async (word: string, meaning: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return `これは「${word}」の例文です。`;
  }

  const prompt = `
あなたは英語学習アプリを開発しているエンジニアです。
ターゲットとなる英単語「${word}」とその意味「${meaning}」が与えられます。

【 задача 】
この単語を使った例文の日本語訳を作成してください。

【厳守するルール】
1. 日本語訳には必ずターゲット単語「${word}」を含めてください。
2. 例文の意味を正確に反映した自然な日本語にしてください。
3. 出力は日本語のみとしてください（説明や解説は不要）。

出力例:
これは「cat」の例文です。
`.trim();

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 50
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

    return rawText.trim();

  } catch (err) {
    console.error('[GenerateJapaneseTranslation] Error:', err);
    return `これは「${word}」の例文です。`;
  }
};