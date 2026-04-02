const API_URL = import.meta.env.VITE_GAS_WEB_APP_URL || '';

export interface FlashcardItem {
  word: string;
  etymology: string;
  meaning: string;
}

interface CreateFlashcardPayload {
  action: 'createFlashcard';
  email: string;
  title: string;
  flashcards: FlashcardItem[];
}

export const createFlashcard = async (email: string, title: string, flashcards: FlashcardItem[]) => {
  if (!API_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating a successful creation.');
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
  }

  const payload: CreateFlashcardPayload = {
    action: 'createFlashcard',
    email,
    title,
    flashcards,
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to create flashcard:', error);
    throw error;
  }
};

export const getFlashcardList = async (email: string) => {
  if (!API_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating flashcard list.');
    return new Promise(resolve => setTimeout(() => resolve({ 
      success: true, 
      flashcards: ['Sample Flashcard 1', 'Sample Flashcard 2'] 
    }), 1000));
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'getFlashcardList',
        email,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get flashcard list:', error);
    throw error;
  }
};

export const getFlashcard = async (email: string, title: string) => {
  if (!API_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating flashcard data.');
    return new Promise(resolve => setTimeout(() => resolve({ 
      success: true,
      title: title,
      flashcards: [
        { word: 'sample', etymology: 'サンプル語源', meaning: 'サンプル意味' }
      ]
    }), 1000));
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'getFlashcard',
        email,
        title,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get flashcard:', error);
    throw error;
  }
};

export const updateFlashcard = async (email: string, title: string, flashcards: FlashcardItem[]) => {
  if (!API_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating a successful update.');
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'updateFlashcard',
        email,
        title,
        flashcards,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to update flashcard:', error);
    throw error;
  }
};

export const renameFlashcard = async (email: string, oldTitle: string, newTitle: string) => {
  if (!API_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating a successful rename.');
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'renameFlashcard',
        email,
        oldTitle,
        newTitle,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to rename flashcard:', error);
    throw error;
  }
};

export const deleteFlashcard = async (email: string, title: string) => {
  if (!API_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating a successful delete.');
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'deleteFlashcard',
        email,
        title,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to delete flashcard:', error);
    throw error;
  }
};
