const GAS_WEB_APP_URL = import.meta.env.VITE_GAS_WEB_APP_URL || '';

// 語源力診断テストの問題を取得
export const getEtymologyTest = async () => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Returning mock data.');
    return {
      success: true,
      questions: [
        {
          word: 'company',
          correctAnswer: '共に',
          options: ['共に', '離れて', '上に', '下に']
        }
      ]
    };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'getEtymologyTest' }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to get etymology test:', error);
    throw error;
  }
};

// ユーザーシートを作成
export const createUserSheet = async (email: string) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating success.');
    return { success: true };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'createUserSheet',
        email
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to create user sheet:', error);
    throw error;
  }
};

// テスト進捗を保存
export const saveTestProgress = async (email: string, currentQuestionIndex: number, knownEtymologies: string[]) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating success.');
    return { success: true };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'saveTestProgress',
        email,
        currentQuestionIndex,
        knownEtymologies
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to save test progress:', error);
    throw error;
  }
};

// テスト進捗を取得
export const getTestProgress = async (email: string) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Returning null.');
    return { success: true, progress: null };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getTestProgress',
        email
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to get test progress:', error);
    throw error;
  }
};

// 語源力診断結果を保存
export const saveEtymologyTestResult = async (email: string, knownEtymologies: string[]) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating success.');
    return { success: true };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'saveEtymologyTestResult',
        email,
        knownEtymologies
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to save test result:', error);
    throw error;
  }
};

// ユーザーの既知語源を取得
export const getKnownEtymologies = async (email: string) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Returning empty array.');
    return { success: true, knownEtymologies: [] };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getKnownEtymologies',
        email
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to get known etymologies:', error);
    throw error;
  }
};

// testシートから語源リストを取得
export const getTestSheetEtymologies = async () => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Returning empty array.');
    return { success: true, etymologies: [] };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getTestSheetEtymologies'
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to get test sheet etymologies:', error);
    throw error;
  }
};

// 単語帳の内容（単語リスト）を取得
export const getFlashcard = async (email: string, title: string) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Returning empty list.');
    return { success: true, words: [] };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getFlashcard',
        email,
        title
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to get flashcard words:', error);
    throw error;
  }
};

// 単語帳一覧を取得
export const getFlashcardList = async (email: string, word?: string) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Returning empty list.');
    return { success: true, flashcards: [], registeredFlashcards: [] };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getFlashcardList',
        email,
        word
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to get flashcard list:', error);
    throw error;
  }
};

// 単語帳に単語を追加（保存）
export const addWordToFlashcard = async (email: string, title: string, rowData: string[]) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating success.');
    return { success: true };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'addWordToFlashcard',
        email,
        title,
        rowData
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to add word to flashcard:', error);
    throw error;
  }
};
// 単語帳を作成
export const createFlashcard = async (email: string, title: string) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating success.');
    return { success: true };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'createFlashcard',
        email,
        title
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to create flashcard:', error);
    throw error;
  }
};

// 単語帳を削除
export const deleteFlashcard = async (email: string, title: string) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating success.');
    return { success: true };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'deleteFlashcard',
        email,
        title
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to delete flashcard:', error);
    throw error;
  }
};

// 特定の単語を単語帳から削除
export const deleteWordFromFlashcard = async (email: string, title: string, word: string) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating success.');
    return { success: true };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'deleteWordFromFlashcard',
        email,
        title,
        word
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to delete word from flashcard:', error);
    throw error;
  }
};

export const getAllDatabaseWords = async (email?: string) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Returning empty list.');
    return { success: true, words: [] };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getAllDatabaseWords',
        email
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to get all database words:', error);
    throw error;
  }
};

export const toggleLike = async (email: string, word: string, creator: string) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating success.');
    return { success: true, liked: true };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'toggleLike',
        email,
        word,
        creator
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to toggle like:', error);
    throw error;
  }
};

export const updateReviewProgress = async (email: string, title: string, word: string, isCorrect: boolean) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating success.');
    return { success: true };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updateReviewProgress',
        email,
        title,
        word,
        isCorrect
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to update review progress:', error);
    throw error;
  }
};
