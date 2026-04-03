import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

interface WordMeaning {
  meanings: string[];
}

export const getWordMeaning = async (word: string): Promise<{ success: boolean; meaning?: string; error?: string }> => {
  if (!API_KEY) {
    console.error('VITE_GEMINI_API_KEY is not set');
    return {
      success: false,
      error: 'APIキーが設定されていません。',
    };
  }

  if (!word || word.trim() === '') {
    return {
      success: false,
      error: '単語を入力してください。',
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `英単語「${word}」の日本語での意味を教えてください。
複数の意味がある場合は、主要な意味を最大5つまで列挙してください。
JSON形式で以下のように回答してください：
{
  "meanings": ["意味1", "意味2", "意味3"]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // JSONをパース
    const data: WordMeaning = JSON.parse(text);

    if (!data.meanings || data.meanings.length === 0) {
      return {
        success: false,
        error: '意味が見つかりませんでした。',
      };
    }

    // 丸数字への変換関数
    const getCircleNumber = (num: number) => {
      const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
      return num > 0 && num <= 10 ? circleNumbers[num - 1] : `${num}.`;
    };

    // 複数の意味を①、②形式でフォーマット
    const formattedMeaning = data.meanings
      .map((meaning, index) => {
        if (data.meanings.length === 1) {
          return meaning;
        }
        return `${getCircleNumber(index + 1)} ${meaning}`;
      })
      .join('\n');

    return {
      success: true,
      meaning: formattedMeaning,
    };
  } catch (error) {
    console.error('Error fetching word meaning:', error);
    return {
      success: false,
      error: '意味の取得に失敗しました。もう一度お試しください。',
    };
  }
};

export const getEtymology = async (
  word: string,
  type: 'true' | 'false' | 'katakana' | 'god',
  hint?: string
): Promise<{ success: boolean; etymology?: string; error?: string }> => {
  if (!API_KEY) {
    return { success: false, error: 'APIキーが設定されていません。' };
  }

  if (!word || word.trim() === '') {
    return { success: false, error: '単語を入力してください。' };
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    let instruction = '';
    const lengthConstraint = '【重要】あなたは英単語暗記を支援する先生です。必ず200字以内、かつ100文字以上で、端的にわかりやすく提示された英単語についてその意味や関連する言葉について説明してください。';

    if (type === 'true') {
      instruction = `英単語「${word}」の正しい語源の成り立ちと、同じ語源の簡単な単語(最大3つ)を解説してください。「ラテン語に由来する」など専門用語は使用せず、中学生でもわかるような簡単な説明をこころがけてください。\n${lengthConstraint}`;
    } else if (type === 'false') {
      instruction = `英単語「${word}」の意味を覚えるための、尤もらしい「偽の語源」をでっち上げてください。「${word}」に似たCEFRのA2～B1程度の単語を1つ選び、まるでそれと語源が同じであるかのように「偽語源」を作成してください。\n${lengthConstraint}`;
    } else if (type === 'katakana') {
      instruction = `英単語「${word}」の語源に関連する身近な「カタカナ語」を挙げ、英単語の意味と結びつけて解説してください。\n${lengthConstraint}`;
    } else if (type === 'god') {
      instruction = `英単語「${word}」とキーワード「${hint}」が、まるで同じ語源を持つかのように、尤もらしく結びつけて解説してください。\n${lengthConstraint}`;
    }

    const prompt = `${instruction}
以下のJSON形式で回答してください：
{
  "result": "解説文"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const data = JSON.parse(text);

    if (!data.result) {
      return { success: false, error: '語源の生成に失敗しました。' };
    }

    return { success: true, etymology: data.result };
  } catch (error) {
    console.error('Error fetching etymology:', error);
    return { success: false, error: '語源の取得に失敗しました。もう一度お試しください。' };
  }
};