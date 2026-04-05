// src/api/wordRegistration.ts
// Gemini APIを使って単語と語源リストを照合する

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
// gemini-2.5-flash を使用。responseMimeType で JSON を強制し、マークダウン混入を防ぐ
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export interface RelatedWord {
  word: string;
  meaning: string;
}

export interface EtymologyPart {
  part: string;
  meaning: string;
  relatedWords: RelatedWord[];
}

export interface EtymologyCheckResult {
  matched: boolean;
  explanation?: string;
  targetWordMeaning?: string;
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
        { part: "ex", meaning: "外へ", relatedWords: [{ word: "exit", meaning: "出口" }, { word: "export", meaning: "輸出する" }] },
        { part: "port", meaning: "運ぶ", relatedWords: [{ word: "portable", meaning: "持ち運び可能な" }, { word: "import", meaning: "輸入する" }] }
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

判定結果が true の場合は、対象単語を「すべての語源パーツ（接頭辞、語根、接尾辞など）」に完全に分解してください。
※ユーザーの語源リストに含まれていないパーツであっても、単語を構成するすべてのパーツを漏れなく抽出して \`parts\` 配列に含めてください。（例：expire の場合、ex だけでなく spir/pire などすべての構成要素を抽出する）
そして、抽出したすべてのパーツそれぞれについて、意味と、同じ語源を持つ別の「非常に簡単な（できればCEFR A1〜A2レベル、中学・高校初級レベルの）」英単語（対象単語以外）を【必ず3つずつ】提示してください。
また、対象単語自身の日本語の意味（一般的な辞書に載っている主要な意味）を \`targetWordMeaning\` として出力してください。

重要：
出力における「解説(explanation)」や「意味(meaning)」、「関連語の意味(relatedWordMeaning)」などの説明文は、すべて必ず日本語のみで記述してください。英語の文章やフレーズを含めないでください。
また、JSONフォーマットエラーを防ぐため、以下の点に必ず従ってください。
1. JSONのキーと値は必ずダブルクォーテーション（"）で囲んでください。
2. 説明文や意味などの「値」の中にダブルクォーテーションを含めないでください。引用にはカギ括弧（「」）を使用してください。
3. 値の中に改行文字（\n）を直接含めないでください。すべて1行の文字列として出力してください。
`.trim();

  try {
    console.info(`[EtymologyCheck] Gemini API呼び出し: ${GEMINI_MODEL}`);

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema: {
            type: "OBJECT",
            properties: {
              matched: { type: "BOOLEAN" },
              explanation: { type: "STRING" },
              targetWordMeaning: { type: "STRING" },
              parts: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    part: { type: "STRING" },
                    meaning: { type: "STRING" },
                    relatedWords: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          word: { type: "STRING" },
                          meaning: { type: "STRING" }
                        },
                        required: ["word", "meaning"]
                      }
                    }
                  },
                  required: ["part", "meaning", "relatedWords"]
                }
              }
            },
            required: ["matched", "explanation", "targetWordMeaning", "parts"]
          }
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
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
    let cleanText = rawText.trim();
    const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match) {
      cleanText = match[1].trim();
    } else {
      cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    }

    // JSONの末尾が不完全な場合（途中で切れているなど）に対する応急処置
    if (cleanText && !cleanText.endsWith('}')) {
      console.warn('[EtymologyCheck] JSONが途中で切れている可能性があります。');
      // 自動補完は複雑な配列内で切れた場合にさらなるパースエラーを引き起こすため、
      // AIが文字数制限や何らかの理由で強制終了されたとみなし、エラーとして扱う
      throw new Error("Gemini API returned an incomplete JSON response: " + cleanText);
    }

    try {
      const parsed = JSON.parse(cleanText) as EtymologyCheckResult;
      console.info('[EtymologyCheck] 判定結果:', parsed);
      return parsed;
    } catch (parseErr) {
      console.error('[EtymologyCheck] JSONパースエラー. cleanText:', cleanText);
      throw parseErr;
    }

  } catch (err) {
    console.error('[EtymologyCheck] 判定中にエラーが発生しました:', err);
    // エラー時は「語源で覚えられない」側に倒す（画面Bへ）
    return { matched: false };
  }
};
