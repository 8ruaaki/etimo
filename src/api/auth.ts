const GAS_WEB_APP_URL = import.meta.env.VITE_GAS_WEB_APP_URL || '';

export const registerUser = async (username: string, email: string, password: string) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating a successful registration.');
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
  }

  try {
    // GASのCORSプレフライトを回避するため、text/plainでペイロードを送信するのが一般的です
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'register',
        username,
        email,
        password // 実際の運用ではパスワードはハッシュ化する必要があります
      }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  if (!GAS_WEB_APP_URL) {
    console.warn('VITE_GAS_WEB_APP_URL is not set. Simulating a successful login.');
    return new Promise(resolve => setTimeout(() => resolve({ success: true, username: 'Test User' }), 1000));
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'login',
        email,
        password
      }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const updateProfileUser = async (email: string, newUsername?: string, newPassword?: string) => {
  if (!GAS_WEB_APP_URL) {
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
  }
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'updateProfile', email, newUsername, newPassword }),
    });
    return await response.json();
  } catch (error) {
    console.error('Update failed:', error);
    throw error;
  }
};

export const deleteUser = async (email: string) => {
  if (!GAS_WEB_APP_URL) {
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
  }
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deleteAccount', email }),
    });
    return await response.json();
  } catch (error) {
    console.error('Deletion failed:', error);
    throw error;
  }
};
