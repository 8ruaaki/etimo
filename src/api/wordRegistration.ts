// src/api/wordRegistration.ts
// Gemini APIを使って単語と語源リストを照合する

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
// gemini-2.5-flash を使用。responseMimeType で JSON を強制し、マークダウン混入を防ぐ
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export interface EtymologyPart {
  part: string;
  meaning: string;
  relatedWord: string;
  relatedWordMeaning: string;
}

export interface EtymologyCheckResult {
  matched: boolean;
  explanation?: string;
  parts?: EtymologyPart[];
}

/**
 * 入力単語がユーザーの語源リストに含まれる語源を使っているか判定する。
 * Gemini APIを使用（gemini-2.5-flash）。
 */
export const checkEtymologyMatch = async (
  word: string,
  etymologyList: string[]
): Promise<EtymologyCheckResult> => {
  // ── モックモード（APIキー未設定）────────────────────────────
  if (!GEMINI_API_KEY) {
    console.warn('[EtymologyCheck] VITE_GEMINI_API_KEY is not set. Returning mock result.');
    const matched = word.length % 2 === 1;
    return {
      matched,
      explanation: matched
        ? `（モック）「${word}」は語源リストの要素を含んでいます。`
        : undefined,
      parts: matched ? [
        { part: "ex", meaning: "外へ", relatedWord: "exit", relatedWordMeaning: "出口" },
        { part: "port", meaning: "運ぶ", relatedWord: "portable", relatedWordMeaning: "持ち運び可能な" }
      ] : []
    };
  }

  // ── 語源リストが空の場合 ─────────────────────────────────────
  if (etymologyList.length === 0) {
    console.info('[EtymologyCheck] 語源リストが空のため、画面Bへ遷移します。');
    return { matched: false };
  }

  console.info(`[EtymologyCheck] 判定開始: word="${word}", 語源リスト数=${etymologyList.length}`, etymologyList);

  // ── Gemini API 呼び出し ──────────────────────────────────────
  // responseMimeType: 'application/json' を指定することで
  // マークダウンコードブロックなし・有効なJSONのみを返させる
  const prompt = `
あなたは英語語源の専門家です。
以下の英単語が、指定された語源リストの中から1つ以上の語源を構成要素として含んでいるかどうかを判定してください。

英単語: ${word}

語源リスト:
${etymologyList.map((e, i) => `${i + 1}. ${e}`).join('\n')}

判断基準：
- 語根・接頭辞・接尾辞として語源リストの要素が単語に含まれていればmatched=true
- 含まれていなければmatched=false

判定結果が true の場合は、対象単語を語源で分解し、それぞれのパーツについて、同じ語源を持つ別の「簡単な」英単語（対象単語以外）を提示してください。
`.trim();

  try {
    console.info(`[EtymologyCheck] Gemini API呼び出し: ${GEMINI_MODEL}`);

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema: {
            type: "OBJECT",
            properties: {
              matched: { type: "BOOLEAN" },
              explanation: { type: "STRING" },
              parts: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    part: { type: "STRING" },
                    meaning: { type: "STRING" },
                    relatedWord: { type: "STRING" },
                    relatedWordMeaning: { type: "STRING" }
                  },
                  required: ["part", "meaning", "relatedWord", "relatedWordMeaning"]
                }
              }
            },
            required: ["matched", "explanation", "parts"]
          }
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[EtymologyCheck] Gemini APIエラー: status=${response.status}`, errText);
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    console.info('[EtymologyCheck] Gemini レスポンス raw:', JSON.stringify(data));

    const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.info('[EtymologyCheck] Gemini テキスト部:', rawText);

    if (!rawText) {
      console.error('[EtymologyCheck] レスポンスにテキストが含まれていません。');
      throw new Error('Empty response from Gemini');
    }

    // responseMimeType=application/json の場合、JSONが直接返るが
    // 念のためマークダウン除去も行う
    const cleanText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    const parsed = JSON.parse(cleanText) as EtymologyCheckResult;
    console.info('[EtymologyCheck] 判定結果:', parsed);
    return parsed;

  } catch (err) {
    console.error('[EtymologyCheck] 判定中にエラーが発生しました:', err);
    // エラー時は「語源で覚えられない」側に倒す（画面Bへ）
    return { matched: false };
  }
};
