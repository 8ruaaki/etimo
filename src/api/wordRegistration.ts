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
  isRealWord?: boolean;
  suggestedWord?: string;
  matched: boolean;
  explanation?: string;
  targetWordMeaning?: string;
  parts?: EtymologyPart[];
}

/**
 * 途中で途切れたJSON（Geminiの出力制限などで発生）から、文字列の配列を強引に抽出するヘルパー関数
 */
function extractArrayFromResponse(rawText: string, arrayKey: string): string[] {
  let cleanText = rawText.trim();
  const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) cleanText = match[1].trim();
  else cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

  try {
    const parsed = JSON.parse(cleanText);
    return parsed[arrayKey] || [];
  } catch (err) {
    console.warn(`[JSON Parse Fallback] 途切れたJSONの修復を試みます。Raw: ${cleanText.substring(0, 100)}...`);
    
    const results: string[] = [];
    
    // 1. 完全に閉じられている文字列（"..."）をすべて抽出
    const strMatches = cleanText.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
    if (strMatches) {
      for (const s of strMatches) {
        let unquoted = s.replace(/^"|"$/g, '');
        // エスケープ文字を復元（" や \ など）
        unquoted = unquoted.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        // キー名自身は除外
        if (unquoted !== arrayKey && unquoted.trim() !== '') {
          results.push(unquoted);
        }
      }
    }
    
    // 2. 最後に閉じられていない文字列（" から末尾まで）があれば抽出
    const lastQuoteIdx = cleanText.lastIndexOf('"');
    if (lastQuoteIdx !== -1) {
      const afterLastQuote = cleanText.substring(lastQuoteIdx + 1);
      // もし末尾が ] や } で終わっていない＝文字列の途中で切れている場合
      if (!afterLastQuote.includes('"') && !afterLastQuote.includes(']') && !afterLastQuote.includes('}')) {
         const partial = afterLastQuote.trim();
         if (partial.length > 0 && partial !== arrayKey) {
           // 途中で切れた文字列も結果に含める
           results.push(partial + '（※AIの出力が途切れました）');
         }
      }
    }

    if (results.length > 0) {
      return results;
    }

    throw new Error(`AIからの返答の解析に失敗しました。再度お試しください。`);
  }
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
      isRealWord: true,
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

【ステップ1: スペルチェック】
まず、入力された英単語「${word}」が、実在する正しいスペルの英単語かどうかを判定してください。
正しい場合は isRealWord=true とし、スペルミス等で実在しない英単語の場合は isRealWord=false としてください。
isRealWord=false の場合、ユーザーが意図したと思われる正しい英単語を推測し、suggestedWord に設定してください。

【ステップ2: 語源判定と意味の取得】
isRealWord=true の場合、対象単語自身の日本語の意味（一般的な辞書に載っている主要な意味）を \`targetWordMeaning\` として必ず出力してください。
さらに、以下の英単語が指定された語源リストの中から1つ以上の語源を構成要素として含んでいるかどうかを判定してください。
（isRealWord=false の場合は判定を行わず、matched=false とし、その他の文字列項目は空文字、配列は空配列を出力してください）

英単語: ${word}

語源リスト:
${etymologyList.map((e, i) => `${i + 1}. ${e}`).join('\n')}

判断基準：
- 語根・接頭辞・接尾辞として語源リストの要素が単語に含まれていればmatched=true
- 含まれていなければmatched=false

判定結果が true の場合は、対象単語を「すべての語源パーツ（接頭辞、語根、接尾辞など）」に完全に分解してください。
※ユーザーの語源リストに含まれていないパーツであっても、単語を構成するすべてのパーツを漏れなく抽出して \`parts\` 配列に含めてください。（例：expire の場合、ex だけでなく spir/pire などすべての構成要素を抽出する）
そして、抽出したすべてのパーツそれぞれについて、意味と、同じ語源を持つ別の「非常に簡単な（できればCEFR A1〜A2レベル、中学・高校初級レベルの）」英単語（対象単語以外）を【必ず3つずつ】提示してください。

重要：
出力における「解説(explanation)」や「意味(meaning)」、「関連語の意味(relatedWordMeaning)」などの説明文は、すべて必ず日本語のみで記述してください。英語の文章やフレーズを含めないでください。
また、JSONフォーマットエラーを防ぐため、以下の点に必ず従ってください。
1. JSONのキーと値は必ずダブルクォーテーション（"）で囲んでください。
2. 説明文や意味などの「値」の中にダブルクォーテーションを含めないでください。引用にはカギ括弧（「」）を使用してください。
3. 値の中に改行文字（\\n）を直接含めないでください。すべて1行の文字列として出力してください。
`.trim();

  try {
    console.info(`[EtymologyCheck] Gemini API呼び出し: ${GEMINI_MODEL}`);

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: {
            type: "OBJECT",
            properties: {
              isRealWord: { type: "BOOLEAN" },
              suggestedWord: { type: "STRING" },
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
            required: ["isRealWord", "matched", "explanation", "targetWordMeaning", "parts"]
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

/**
 * 似た単語を提案する (Gemini API)
 */
export const suggestSimilarWords = async (word: string): Promise<string[]> => {
  if (!GEMINI_API_KEY) {
    console.warn('[SuggestWords] VITE_GEMINI_API_KEY is not set. Returning mock result.');
    return ['mock-similar-1', 'mock-similar-2', 'mock-similar-3'];
  }

  const firstLetter = word.charAt(0).toUpperCase();
  const prompt = `
英単語「${word}」を暗記するためのヒントとして、以下の手順で似た英単語を3つ提案してください。

【手順】
1. 対象の英単語「${word}」をカタカナ読みにする。
2. そのカタカナ読みと「発音（カタカナでの響き）」が非常によく似ている、ユーザーが知っていそうな別の英単語を考える。
3. その見つけた英単語を英語のスペルで出力する。

【ルール】
- 【重要】提案する英単語の**最初の1文字は必ず対象単語と同じアルファベット（「${firstLetter}」または「${firstLetter.toLowerCase()}」）**から始まる単語を選んでください。最初の文字を変えることは絶対に避けてください。
- 意味の類似性や、全体の綴り（スペル）の一致率ではなく、「日本人がカタカナで発音したときの音の響き」が近い英単語を優先して選んでください。
- 出力は英単語のスペルのみとし、発音記号やカタカナ、意味などの解説は一切含めないでください。

出力例：
{
  "suggestions": ["${firstLetter.toLowerCase()}pple", "${firstLetter.toLowerCase()}mple", "${firstLetter.toLowerCase()}mple"]
}

必ず以下のJSON形式で出力してください：
{
  "suggestions": ["単語1", "単語2", "単語3"]
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
          maxOutputTokens: 2048, // 途切れ防止のために最大トークン数を増やす
          responseMimeType: 'application/json',
          responseSchema: {
            type: "OBJECT",
            properties: {
              suggestions: {
                type: "ARRAY",
                items: { type: "STRING" }
              }
            },
            required: ["suggestions"]
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

    return extractArrayFromResponse(rawText, 'suggestions');
  } catch (err: any) {
    console.error('[SuggestWords] Error:', err);
    throw err;
  }
};

/**
 * 自由連想を提案する (Gemini API)
 */
export const suggestOtherAssociations = async (word: string): Promise<string[]> => {
  if (!GEMINI_API_KEY) {
    console.warn('[SuggestOther] VITE_GEMINI_API_KEY is not set. Returning mock result.');
    return ['カタカナ語のモック', '語呂合わせのモック', '音が似ている言葉のモック'];
  }

  const prompt = `
英単語「${word}」を暗記するためのヒントとして、対象の英単語に由来する、または音が非常によく似ている「実在のカタカナ語」を3つ提案してください。

【ルール】
1. 対象単語をカタカナ読みし、それがそのまま使われている、もしくは音が非常によく似た実在のカタカナ語（外来語、業界用語、固有名詞、商品名など）を3つ挙げてください。
2. 和語や漢語のカタカナ表記（例：リンゴ、スシなど）は絶対に不可です。必ず西洋などから来た外来語を選んでください。
3. 出力は「カタカナ語（簡単な説明や意味）」の形式のみとし、長々とした由来や連想の解説は一切書かないでください。

出力例：
{
  "associations": [
    "リンガーハット（長崎ちゃんぽんのチェーン店）",
    "ランジェリー（女性用の下着）",
    "リンガー（教会の鐘を鳴らす人）"
  ]
}

必ず以下のJSON形式で出力してください：
{
  "associations": ["(提案1)", "(提案2)", "(提案3)"]
}

重要：JSONフォーマットエラーを防ぐため、以下の点に必ず従ってください。
1. JSONのキーと値は必ずダブルクォーテーション（"）で囲んでください。
2. 提案内容の「値」の中にダブルクォーテーションを絶対に含めないでください。引用にはカギ括弧（「」）を使用してください。
3. 提案内容の「値」の中に改行文字（\\n）を直接含めないでください。すべて1行の文字列として出力してください。
`.trim();

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
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

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!rawText) throw new Error('Empty response');

    return extractArrayFromResponse(rawText, 'associations');
  } catch (err: any) {
    console.error('[SuggestOther] Error:', err);
    throw err; // Re-throw to catch it in the UI and show the actual error
  }
};

/**
 * 語呂合わせを提案する (Gemini API)
 */
export const suggestMnemonic = async (word: string, meaning: string): Promise<string[]> => {
  if (!GEMINI_API_KEY) {
    console.warn('[SuggestMnemonic] VITE_GEMINI_API_KEY is not set. Returning mock result.');
    return ['語呂合わせモック1', '語呂合わせモック2', '語呂合わせモック3'];
  }

  const prompt = `
英単語「${word}」（意味：「${meaning}」）を暗記するための、質の高い「語呂合わせ」を3つ提案してください。

【ルール】
1. 対象単語の「発音（カタカナでの響き）」と「意味」を無理なく結びつけた、覚えやすくて面白い語呂合わせを作成してください。
2. 語呂合わせの文と、その簡単な解説を含めてください。
3. 出力は「語呂合わせの文（簡単な解説）」の形式のみとしてください。

出力例：
{
  "mnemonics": [
    "アッポー（Apple）が落ちてきてリンゴ（意味）に当たる（リンゴが落ちてくる様子をイメージ）",
    "犬（Dog）がドッグ（Dog）フードを食べる（そのまんまのイメージ）",
    "キャット（Cat）がキャッと（Cat）驚く猫（意味）（猫が驚く様子をイメージ）"
  ]
}

必ず以下のJSON形式で出力してください：
{
  "mnemonics": ["(提案1)", "(提案2)", "(提案3)"]
}

重要：JSONフォーマットエラーを防ぐため、以下の点に必ず従ってください。
1. JSONのキーと値は必ずダブルクォーテーション（"）で囲んでください。
2. 提案内容の「値」の中にダブルクォーテーションを絶対に含めないでください。引用にはカギ括弧（「」）を使用してください。
3. 提案内容の「値」の中に改行文字（\\n）を直接含めないでください。すべて1行の文字列として出力してください。
`.trim();

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema: {
            type: "OBJECT",
            properties: {
              mnemonics: {
                type: "ARRAY",
                items: { type: "STRING" }
              }
            },
            required: ["mnemonics"]
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

    return extractArrayFromResponse(rawText, 'mnemonics');
  } catch (err: any) {
    console.error('[SuggestMnemonic] Error:', err);
    throw err;
  }
};
