function doPost(e) {
  // CORS Headers are somewhat handled by GAS when deployed properly, 
  // but it's good practice to set MimeType properly.
  
  try {
    // text/plain body parsing
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    if (action === 'register') {
      return handleRegister(payload);
    }
    if (action === 'login') {
      return handleLogin(payload);
    }
    if (action === 'updateProfile') {
      return handleUpdateProfile(payload);
    }
    if (action === 'deleteAccount') {
      return handleDeleteAccount(payload);
    }
    if (action === 'createFlashcard') {
      return handleCreateFlashcard(payload);
    }
    if (action === 'getFlashcardList') {
      return handleGetFlashcardList(payload);
    }
    if (action === 'getFlashcard') {
      return handleGetFlashcard(payload);
    }
    if (action === 'updateFlashcard') {
      return handleUpdateFlashcard(payload);
    }
    if (action === 'renameFlashcard') {
      return handleRenameFlashcard(payload);
    }
    if (action === 'deleteFlashcard') {
      return handleDeleteFlashcard(payload);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleRegister(payload) {
  // SpreadsheetApp.getActiveSpreadsheet() works if script is bound to a Spreadsheet.
  // If it's a standalone script, use SpreadsheetApp.openById('YOUR_SHEET_ID')
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss) {
     throw new Error("スプレッドシートが見つかりません。スクリプトがスプレッドシートにバインドされているか確認してください。");
  }

  var sheet = ss.getSheetByName('Users');
  
  if (!sheet) {
    // Initialize sheet if it doesn't exist
    sheet = ss.insertSheet('Users');
    sheet.appendRow(['Timestamp', 'Username', 'Email', 'Password']);
    // Password列 (D列) を書式「プレーンテキスト」に設定
    sheet.getRange('D:D').setNumberFormat('@');
    // Optional: freeze the top row for a better view
    sheet.setFrozenRows(1);
  }

  // 重複メールアドレスのチェック
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var emails = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
    for (var i = 0; i < emails.length; i++) {
      if (emails[i][0] === payload.email) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: 'このメールアドレスは既に登録されています。' 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }
  
  var timestamp = new Date();
  var newRow = [
    timestamp, 
    payload.username, 
    payload.email, 
    "'" + payload.password // ※実運用ではパスワードをハッシュ化することを推奨します
  ];
  
  sheet.appendRow(newRow);
  
  var result = { success: true, message: 'User registered successfully' };
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleLogin(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss) {
     return ContentService.createTextOutput(JSON.stringify({ success: false, error: "スプレッドシートが見つかりません。スクリプトがバインドされているか確認してください。" }))
        .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = ss.getSheetByName('Users');
  
  if (!sheet) {
     return ContentService.createTextOutput(JSON.stringify({ success: false, error: "ユーザーデータが存在しません。" }))
        .setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getDataRange().getValues();
  // 1行目はヘッダーなのでi=1から開始
  for (var i = 1; i < data.length; i++) {
    var storedEmail = data[i][2];
    var storedPassword = data[i][3] != null ? data[i][3].toString() : '';
    
    // スプレッドシートに保存した際の先頭のシングルクォートを取り除いて比較
    if (storedPassword.indexOf("'") === 0) {
      storedPassword = storedPassword.substring(1);
    }
    
    if (storedEmail === payload.email && storedPassword === payload.password.toString()) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Login successful',
        username: data[i][1]
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ 
    success: false, 
    error: 'メールアドレスまたはパスワードが間違っています。' 
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateProfile(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, error: "データが存在しません。" })).setMimeType(ContentService.MimeType.JSON);

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var storedEmail = data[i][2];
    if (storedEmail === payload.email) {
      // payload.newUsername or payload.newPassword
      if (payload.newUsername) {
        sheet.getRange(i + 1, 2).setValue(payload.newUsername);
      }
      if (payload.newPassword) {
        sheet.getRange(i + 1, 4).setValue("'" + payload.newPassword);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Profile updated' })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'User not found' })).setMimeType(ContentService.MimeType.JSON);
}

function handleDeleteAccount(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, error: "データが存在しません。" })).setMimeType(ContentService.MimeType.JSON);

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var storedEmail = data[i][2];
    if (storedEmail === payload.email) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Account deleted' })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'User not found' })).setMimeType(ContentService.MimeType.JSON);
}

function handleCreateFlashcard(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usersSheet = ss.getSheetByName('Users');
  
  if (!usersSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーデータが存在しません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // ユーザーの行を見つける
  var userData = usersSheet.getDataRange().getValues();
  var userRowIndex = -1;
  
  for (var i = 1; i < userData.length; i++) {
    if (userData[i][2] === payload.email) {
      userRowIndex = i + 1; // シートの行番号（1-indexed）
      break;
    }
  }
  
  if (userRowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 単語帳タイトル + メールアドレスをシート名として使用
  var sheetName = payload.title + '_' + payload.email;
  
  // シート名が既に存在するかチェック（念のため）
  var existingSheet = ss.getSheetByName(sheetName);
  if (existingSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'この単語帳名は既に存在しています。別の名前を使用してください。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 新しいシートを作成
  var newSheet = ss.insertSheet(sheetName);
  
  // ヘッダー行を追加
  newSheet.appendRow(['単語', '語源', '意味']);
  newSheet.setFrozenRows(1);
  
  // 単語カードを追加
  for (var j = 0; j < payload.flashcards.length; j++) {
    var card = payload.flashcards[j];
    newSheet.appendRow([card.word, card.etymology, card.meaning]);
  }
  
  // Usersシートの作成者の行のE列以降にタイトルのみを追加
  // E列から始まる既存の単語帳リストを取得
  var lastColumn = usersSheet.getLastColumn();
  var nextColumn = lastColumn + 1;
  
  // E列（5列目）が最初の単語帳の列
  if (lastColumn < 5) {
    nextColumn = 5; // E列
  }
  
  // タイトルのみを書き込む（メールアドレスは含めない）
  usersSheet.getRange(userRowIndex, nextColumn).setValue(payload.title);
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: '単語帳が作成されました。',
    sheetName: sheetName
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetFlashcardList(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usersSheet = ss.getSheetByName('Users');
  
  if (!usersSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーデータが存在しません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // ユーザーの行を見つける
  var userData = usersSheet.getDataRange().getValues();
  var userRowIndex = -1;
  
  for (var i = 1; i < userData.length; i++) {
    if (userData[i][2] === payload.email) {
      userRowIndex = i;
      break;
    }
  }
  
  if (userRowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // E列（インデックス4）以降の単語帳名を取得
  var flashcardNames = [];
  var userRow = userData[userRowIndex];
  
  for (var j = 4; j < userRow.length; j++) {
    if (userRow[j] && userRow[j].toString().trim() !== '') {
      flashcardNames.push(userRow[j].toString());
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    flashcards: flashcardNames
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetFlashcard(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // タイトル + メールアドレスでシート名を構築
  var sheetName = payload.title + '_' + payload.email;
  var flashcardSheet = ss.getSheetByName(sheetName);
  
  if (!flashcardSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '単語帳が見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // シートのデータを取得（ヘッダー行を除く）
  var data = flashcardSheet.getDataRange().getValues();
  var flashcards = [];
  
  // 1行目はヘッダーなのでスキップ
  for (var i = 1; i < data.length; i++) {
    flashcards.push({
      word: data[i][0] || '',
      etymology: data[i][1] || '',
      meaning: data[i][2] || ''
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    title: payload.title,
    flashcards: flashcards
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateFlashcard(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // タイトル + メールアドレスでシート名を構築
  var sheetName = payload.title + '_' + payload.email;
  var flashcardSheet = ss.getSheetByName(sheetName);
  
  if (!flashcardSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '単語帳が見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 既存のデータを全て削除（ヘッダー行を除く）
  var lastRow = flashcardSheet.getLastRow();
  if (lastRow > 1) {
    // 2行目から最終行までを削除
    flashcardSheet.deleteRows(2, lastRow - 1);
  }
  
  // 新しいデータを追加
  for (var i = 0; i < payload.flashcards.length; i++) {
    var card = payload.flashcards[i];
    // 空の単語カードはスキップ
    if (card.word || card.etymology || card.meaning) {
      flashcardSheet.appendRow([card.word, card.etymology, card.meaning]);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: '単語帳が更新されました。'
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleRenameFlashcard(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usersSheet = ss.getSheetByName('Users');
  
  if (!usersSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーデータが存在しません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // ユーザーの行を見つける
  var userData = usersSheet.getDataRange().getValues();
  var userRowIndex = -1;
  var oldTitleColumnIndex = -1;
  
  for (var i = 1; i < userData.length; i++) {
    if (userData[i][2] === payload.email) {
      userRowIndex = i;
      // E列以降で旧タイトルを探す
      for (var j = 4; j < userData[i].length; j++) {
        if (userData[i][j] === payload.oldTitle) {
          oldTitleColumnIndex = j;
          break;
        }
      }
      break;
    }
  }
  
  if (userRowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (oldTitleColumnIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '指定された単語帳が見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 新しい名前のシートが既に存在するかチェック
  var newSheetName = payload.newTitle + '_' + payload.email;
  var existingSheet = ss.getSheetByName(newSheetName);
  if (existingSheet && payload.oldTitle !== payload.newTitle) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'この単語帳名は既に存在しています。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // シートの名前を変更
  var oldSheetName = payload.oldTitle + '_' + payload.email;
  var flashcardSheet = ss.getSheetByName(oldSheetName);
  if (flashcardSheet) {
    flashcardSheet.setName(newSheetName);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '単語帳シートが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Usersシートの該当セルを更新
  usersSheet.getRange(userRowIndex + 1, oldTitleColumnIndex + 1).setValue(payload.newTitle);
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: '単語帳名が変更されました。'
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleDeleteFlashcard(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usersSheet = ss.getSheetByName('Users');
  
  if (!usersSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーデータが存在しません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // ユーザーの行を見つける
  var userData = usersSheet.getDataRange().getValues();
  var userRowIndex = -1;
  var titleColumnIndex = -1;
  
  for (var i = 1; i < userData.length; i++) {
    if (userData[i][2] === payload.email) {
      userRowIndex = i;
      // E列以降でタイトルを探す
      for (var j = 4; j < userData[i].length; j++) {
        if (userData[i][j] === payload.title) {
          titleColumnIndex = j;
          break;
        }
      }
      break;
    }
  }
  
  if (userRowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (titleColumnIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '指定された単語帳が見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Usersシートの該当セルをクリア
  usersSheet.getRange(userRowIndex + 1, titleColumnIndex + 1).clearContent();
  
  // シート名を構築してシートを削除
  var sheetName = payload.title + '_' + payload.email;
  var flashcardSheet = ss.getSheetByName(sheetName);
  if (flashcardSheet) {
    ss.deleteSheet(flashcardSheet);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: '単語帳が削除されました。'
  })).setMimeType(ContentService.MimeType.JSON);
}

// OPTIONS method handler for CORS preflight, if needed.
// Though typically text/plain requests from fetch bypass preflight check.
function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
