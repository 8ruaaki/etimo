// src/api/wordRegistration.ts
// Gemini APIを使って単語と語源リストを照合する

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
// gemini-2.5-flash を使用。responseMimeType で JSON を強制し、マークダウン混入を防ぐ
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export interface RelatedWord {
  word: string;
  meaning: string;
  breakdown?: string;
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
  integratedMeaning?: string; // ←追加
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
      integratedMeaning: matched ? "（モック）外へ＋運ぶ → 輸出する" : undefined,
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

【ステップ3: 語源分解（matched の結果に関わらず実行）】
isRealWord=true の場合、matched が true でも false でも、対象単語を「すべての語源パーツ（接頭辞、語根、接尾辞など）」に完全に分解してください。
※ユーザーの語源リストに含まれていないパーツであっても、単語を構成するすべてのパーツを漏れなく抽出して \`parts\` 配列に含めてください。（例：expire の場合、ex だけでなく spir/pire などすべての構成要素を抽出する）
そして、抽出したすべてのパーツそれぞれについて、意味と、同じ語源を持つ別の「非常に簡単な（できればCEFR A1〜A2レベル、中学・高校初級レベルの）」英単語（対象単語以外）を【必ず3つずつ】提示してください。

さらに、分解したそれぞれのパーツの意味を統合して、どのように現在の単語の意味につながっているのかを表す短い統合フレーズを \`integratedMeaning\` として出力してください。
その際、意味の変遷の各段階を必ず「→」記号でつないでください。
例：「魂が外に出ていく→期限が切れる」「外へ＋運ぶ→輸出する」

最後に、これらの語源パーツがどのように組み合わさって現在の意味になったのかを解説する文章を \`explanation\` に出力してください。
【重要】explanation の中では、「語源リストに含まれていない」「リストに一致しない」といったメタな説明や、システム的な謝罪などは絶対に書かないでください。ただ純粋に、その英単語の本来の語源の歴史的・言語学的な解説のみを記載してください。

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
              integratedMeaning: { type: "STRING" },
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
            required: ["isRealWord", "matched", "explanation", "targetWordMeaning", "integratedMeaning", "parts"]
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

export const generateFakeEtymology = async (targetWord: string, meaning: string, similarWord: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return `「${targetWord}」と「${similarWord}」は同じ語源から派生した言葉です。`;
  }

  const prompt = `
あなたはエセ語源学者として、英単語「${targetWord}」（意味：${meaning}）と、入力された英単語「${similarWord}」が、実は共通の語源を持つという「架空の（嘘の）語源解説」を作成してください。

【ルール】
- 「${targetWord}」と「${similarWord}」の両方が、「〇〇（意味：〜）」という一つの共通の語源から生まれた、という構成にしてください。
- 2つの言葉の「見た目」や「動き」、「共通のイメージ」に焦点を当てて、納得感のある解説をでっち上げてください。
- 専門用語（印欧語根、派生など）は使わず、誰でもスッと理解できる簡単な言葉で説明してください。
- 2〜3文程度の短い文章（100文字〜150文字程度）で簡潔にまとめ、必ず「〜ます。」のように文末を完全に終わらせてください。途中で絶対に切らないでください。
- 挨拶、前置きは不要です。
- 【重要】「このように、〜という繋がりがあるのです」「〜というわけです」といった、全体を総括するような締めの一文は絶対に書かないでください。由来を語り終えたところでスッと文章を終わらせてください。
- 【重要】出力する解説文の中では、「架空の」「嘘の」「〜という設定」「でっち上げた」といったメタな発言やネタばらしを絶対にしないでください。本当の歴史的事実であるかのように、自信満々に語り切ってください。
- 【重要】～からです。というような理由を表す表現を使用しないでください。
- 【重要】下記の定型文を厳守してください。 定型文：${targetWord}と${similarWord}は「（${targetWord}と${similarWord}に共通するアルファベットをもとに考えた架空のラテン語を小文字で）」（意味：△△）という共通の語源を持ちます。どちらも---。${targetWord}は---で、${similarWord}は---です。
`.trim();

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 4096,
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
  } catch (err: any) {
    console.error('[GenerateFakeEtymology] Error:', err);
    throw err;
  }
};

export const generateFakeRelationship = async (targetWord: string, meaning: string, katakanaWord: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return `（モック）実は「${targetWord}」と「${katakanaWord}」には共通点があります。`;
  }

  const prompt = `
あなたは雑学王として、英単語「${targetWord}」（意味：${meaning}）と入力されたカタカナ語「${katakanaWord}」をあたかも関係があるかのようにトリビアをでっちあげてください。

【ルール】
- 【最重要】カタカナ語「${katakanaWord}」の語源や由来を説明してはいけません。あくまで主役は暗記対象の英単語「${targetWord}」です。
- 2つの言葉の「共通のイメージ」に焦点を当てて、納得感のあるストーリーにしてください。
- 誰でもスッと理解できる簡単な言葉で説明してください。
- 2〜3文程度の短い文章（100文字〜120文字程度）で簡潔にまとめ、必ず「〜からです。」と文末を完全に終わらせてください。途中で絶対に切らないでください。
- 挨拶、前置きは不要です。
- 【重要】「このように、〜という深い関係があるのです」「〜というわけです」といった、全体を総括するような教訓めいた締めの一文は絶対に書かないでください。具体的なエピソードや理由を語り終えたところで、スッと文章を終わらせてください。
- 【重要】出力する解説文の中では、「架空の」「嘘の」「〜という設定」「でっち上げた」といったメタな発言やネタばらしを絶対にしないでください。本当の歴史的事実であるかのように、自信満々に語り切ってください。
- 【重要】下記の定型文を厳守してください。 定型文：${katakanaWord}は${targetWord}に由来します。${targetWord}は---で、${katakanaWord}です。
`.trim();

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 4096,
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
  } catch (err: any) {
    console.error('[GenerateFakeRelationship] Error:', err);
    throw err;
  }
};

export const generateMnemonicStory = async (targetWord: string, meaning: string, mnemonic: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return `（モック）この語呂合わせから、ありありと情景が目に浮かびますね。`;
  }

  const prompt = `
あなたはプロの作家です。英単語「${targetWord}」（意味：${meaning}）を暗記するために作成された語呂合わせ「${mnemonic}」から、より強く記憶に残るような「短い情景描写（ショートストーリー）」を作成してください。

【ルール】
- 語呂合わせの内容を映像として想像しやすいよう、具体的な情景を描写してください。
- 2〜3文程度の短い文章（100文字〜150文字程度）で簡潔に描き、文末を完全に終わらせてください。
- 途中で絶対に切らないでください。
- 挨拶、前置きは不要です。
- 【重要】「〜というわけです」「〜というお話でした」といった、全体を総括するような解説や締めの一文は絶対に書かないでください。情景を描写し終えたところでスッと文章を終わらせてください。
`.trim();

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 4096,
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
  } catch (err: any) {
    console.error('[GenerateMnemonicStory] Error:', err);
    throw err;
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

【優れた語呂合わせの条件】
- 英単語の「実際の発音（またはスペルから連想されるカタカナ読み）」の一部または全部を、日本語の単語やフレーズに置き換えていること。
- その置き換えた日本語と、英単語の「意味」が、1つの自然で情景が思い浮かぶ文にまとまっていること。

【ルール】
1. 上記の条件を満たす、覚えやすくて面白い語呂合わせを作成してください。
2. 語呂合わせの文の後に、括弧書きで「どの音が、どの意味と結びついているか」の簡単な解説を含めてください。
3. 出力形式は「語呂合わせの文（解説）」のみとしてください。

出力例（英単語「abandon」意味「見捨てる」の場合）：
{
  "mnemonics": [
    "アバン（aban）ドン（don）と突き放して見捨てる（aban+don＝見捨てる）",
    "「あ、晩（aban）だ、ドン（don）マイ！」と友人をあっさり見捨てる（あ、晩＋ドン＝見捨てる）",
    "アーバン（aban）な街でドン（don）底の親友を見捨てる（アーバン＋ドン＝見捨てる）"
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

/**
 * ユーザーが入力した「語源の各パーツの意味や連想」をもとに、
 * 全体を統合して「英単語の本来の意味」へと繋げる、論理的で客観的な解説文（辞書のようなトーン）を作成する。
 * (Gemini API)
 */
export const draftUserIntent = async (
  word: string,
  targetWordMeaning: string,
  splittedWord: string[],
  association: string
): Promise<string> => {
  if (!GEMINI_API_KEY) {
    console.warn('[DraftUserIntent] VITE_GEMINI_API_KEY is not set. Returning mock result.');
    return `（モック）${splittedWord.join('と')}を組み合わせると、「${targetWordMeaning}」という本来の意味に繋がります。`;
  }

  const prompt = `
あなたは英語の語源辞典の編集者です。
英単語「${word}」（意味：「${targetWordMeaning}」）について、以下の【構成要素（パーツとその意味）】をもとに、
それらの要素が組み合わさって「${targetWordMeaning}」という本来の意味へと至る、客観的で論理的な解説文（語源解説）を作成してください。

【構成要素（パーツとその意味）】
${association}

【ルール】
- 【最重要】「学習者の連想」「ユーザーの入力」「〜という連想から」「〜と連想される」といった、メタな発言やネタばらしは絶対に含めないでください。すべてが歴史的な事実や真実の語源であるかのように、自信満々に語り切ってください。
- 上記の構成要素を必ず組み込んで解説してください。
- ファンタジーや魔法のような架空の設定（「〜という魔法」「〜という呪文」など）や物語調、比喩的な表現は一切排除してください。
- 辞書や語源辞典に載っているような、事実を淡々と述べる客観的で論理的な文体（だ・である調、または一般的な解説文）で作成してください。
- 2〜3文程度（100文字〜150文字）で簡潔にまとめ、必ず「〜」と文末を完全に終わらせてください。途中で絶対に切らないでください。
- 挨拶、前置き、総括（「このように〜」「というわけです」など）は不要です。
- 【重要】出力の途中で文章が切れることを防ぐため、必ず最後に「。」（句点）を付けて完全に文を終わらせてください。
`.trim();

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3, // より客観的な文章にするため少し低めに設定
          maxOutputTokens: 4096, // 出力途切れ防止のために十分なトークン数を確保
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
  } catch (err: any) {
    console.error('[DraftUserIntent] Error:', err);
    throw err;
  }
};

/**
 * ユーザーのパーツ分割と連想（＋背景ストーリーの意図）から、架空の語源（意味の変遷）を生成する。
 * (Gemini API)
 */
export const generateCustomFakeEtymology = async (
  word: string,
  targetWordMeaning: string,
  splittedWord: string[],
  association: string,
  userIntent: string
): Promise<{ explanation: string; integratedMeaning: string }> => {
  if (!GEMINI_API_KEY) {
    return {
      explanation: `（モック）${splittedWord.join('＋')} → ${targetWordMeaning}。背景: ${userIntent}`,
      integratedMeaning: `${splittedWord.join('＋')}→${targetWordMeaning}`
    };
  }

  const prompt = `
あなたは英語辞書・語源辞典の編集者です。
英単語「${word}」（意味：「${targetWordMeaning}」）について、以下の【構成要素（パーツとその意味）と背景ストーリー】をもとに、
「${targetWordMeaning}」という本来の意味へと至る、客観的で論理的な語源解説を作成してください。

【構成要素（パーツとその意味）と背景ストーリー】
・各パーツの構成: ${association}
・背景（由来）: ${userIntent}

【ルール】
- 【最重要】「学習者の連想」「ユーザーの入力」「背景ストーリー」「連想」といった、メタな発言やネタばらしは絶対に含めないでください。すべてが歴史的な事実や真実の語源であるかのように、断定的かつ客観的な辞書的トーンで解説してください。
- 上記の構成内容と背景を論理的に統合し、最終的に「${targetWordMeaning}」という本来の意味へどのように繋がるのかを客観的に解説してください。
- ファンタジーや魔法のような架空の設定（「〜という魔法」「〜という呪文」など）や物語調、比喩的な表現は一切排除してください。
- 事実を淡々と述べる客観的で論理的な文体（だ・である調、または一般的な解説文）で作成してください。
- 2〜3文程度（100文字〜150文字）で簡潔にまとめ、必ず「〜」と文末を完全に終わらせてください。途中で絶対に切らないでください。
- 挨拶、前置き、総括（「このように〜」「というわけです」など）は不要です。

【出力形式】
JSONフォーマットで、以下の2つのフィールドを出力してください。
1. explanation: 上記のルールに従った解説文
2. integratedMeaning: 各パーツの統合フレーズ（例：「○○＋○○→○○」の形式）
`.trim();

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: {
            type: "OBJECT",
            properties: {
              explanation: { type: "STRING" },
              integratedMeaning: { type: "STRING" }
            },
            required: ["explanation", "integratedMeaning"]
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

    const parsed = JSON.parse(rawText.trim());
    return {
      explanation: parsed.explanation || '',
      integratedMeaning: parsed.integratedMeaning || ''
    };
  } catch (err: any) {
    console.error('[GenerateCustomFakeEtymology] Error:', err);
    throw err;
  }
};
