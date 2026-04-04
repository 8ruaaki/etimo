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
    if (action === 'saveQuiz') {
      return handleSaveQuiz(payload);
    }
    if (action === 'getEtymologyTest') {
      return handleGetEtymologyTest(payload);
    }
    if (action === 'createUserSheet') {
      return handleCreateUserSheet(payload);
    }
    if (action === 'saveTestProgress') {
      return handleSaveTestProgress(payload);
    }
    if (action === 'getTestProgress') {
      return handleGetTestProgress(payload);
    }
    if (action === 'saveEtymologyTestResult') {
      return handleSaveEtymologyTestResult(payload);
    }
    if (action === 'getKnownEtymologies') {
      return handleGetKnownEtymologies(payload);
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
    var flashcard = {
      word: data[i][0] || '',
      etymology: data[i][1] || '',
      meaning: data[i][2] || ''
    };
    
    // D列にクイズデータがある場合はパースして追加
    if (data[i][3]) {
      try {
        flashcard.quiz = JSON.parse(data[i][3]);
      } catch (e) {
        // JSONパースエラーの場合は無視
        Logger.log('Failed to parse quiz data for word: ' + data[i][0]);
      }
    }
    
    flashcards.push(flashcard);
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

function handleSaveQuiz(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = payload.title + '_' + payload.email;
  var flashcardSheet = ss.getSheetByName(sheetName);
  
  if (!flashcardSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '単語帳が見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // シート内で対象の単語を検索
  var data = flashcardSheet.getDataRange().getValues();
  var wordRowIndex = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === payload.word) {
      wordRowIndex = i + 1; // シートの行番号（1-indexed）
      break;
    }
  }
  
  if (wordRowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '指定された単語が見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // クイズデータをJSON文字列として保存（D列に保存）
  // payload.quizがnullの場合は空文字をセットしてクイズを削除する
  var quizValue = payload.quiz ? JSON.stringify(payload.quiz) : "";
  flashcardSheet.getRange(wordRowIndex, 4).setValue(quizValue);
  
  var message = payload.quiz ? 'クイズが保存されました。' : 'クイズが削除されました。';
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: message
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetEtymologyTest(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var testSheet = ss.getSheetByName('test');
  
  if (!testSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'テストデータが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // テストシートからデータを取得（ヘッダー行を除く）
  var data = testSheet.getDataRange().getValues();
  var questions = [];
  
  // 1行目はヘッダーなのでスキップ
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][1]) {  // 単語と語源が存在する場合
      var question = {
        word: data[i][0],
        etymology: data[i][1],
        meaning: data[i][2] || '',
        correctAnswer: data[i][1],
        // 選択肢は後でクライアント側で生成
      };
      questions.push(question);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    questions: questions
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleCreateUserSheet(payload) {
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
  var username = '';
  
  for (var i = 1; i < userData.length; i++) {
    if (userData[i][2] === payload.email) {
      username = userData[i][1];
      break;
    }
  }
  
  if (!username) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // ユーザー名のシートが既に存在するかチェック
  var userSheet = ss.getSheetByName(username);
  
  if (!userSheet) {
    // 新しいシートを作成
    userSheet = ss.insertSheet(username);
    userSheet.appendRow(['既知の語源']);
    userSheet.setFrozenRows(1);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: 'ユーザーシートが作成されました。'
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleSaveTestProgress(payload) {
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
  var username = '';
  
  for (var i = 1; i < userData.length; i++) {
    if (userData[i][2] === payload.email) {
      username = userData[i][1];
      break;
    }
  }
  
  if (!username) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // ユーザーシートを取得
  var userSheet = ss.getSheetByName(username);
  
  if (!userSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーシートが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // B列に進捗データをJSON形式で保存
  var progressData = {
    currentQuestionIndex: payload.currentQuestionIndex,
    knownEtymologies: payload.knownEtymologies,
    timestamp: new Date().toISOString()
  };
  
  userSheet.getRange(1, 2).setValue('テスト進捗');
  userSheet.getRange(2, 2).setValue(JSON.stringify(progressData));
  
  // A列の既存データをクリア（ヘッダー行を除く）
  var lastRow = userSheet.getLastRow();
  if (lastRow > 1) {
    userSheet.getRange(2, 1, lastRow - 1, 1).clearContent();
  }
  
  // 既知の語源をA列に保存
  if (payload.knownEtymologies && payload.knownEtymologies.length > 0) {
    var knownValues = payload.knownEtymologies.map(function(item) { return [item]; });
    userSheet.getRange(2, 1, knownValues.length, 1).setValues(knownValues);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: 'テスト進捗が保存されました。'
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetTestProgress(payload) {
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
  var username = '';
  
  for (var i = 1; i < userData.length; i++) {
    if (userData[i][2] === payload.email) {
      username = userData[i][1];
      break;
    }
  }
  
  if (!username) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // ユーザーシートを取得
  var userSheet = ss.getSheetByName(username);
  
  if (!userSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      progress: null
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // B2セルから進捗データを取得
  var progressDataStr = userSheet.getRange(2, 2).getValue();
  
  if (!progressDataStr) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      progress: null
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    var progressData = JSON.parse(progressDataStr);
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      progress: progressData
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      progress: null
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSaveEtymologyTestResult(payload) {
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
  var username = '';
  
  for (var i = 1; i < userData.length; i++) {
    if (userData[i][2] === payload.email) {
      username = userData[i][1];
      break;
    }
  }
  
  if (!username) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // ユーザー名のシートを取得（既に存在するはず）
  var userSheet = ss.getSheetByName(username);
  
  if (!userSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーシートが見つかりません。先にテストを開始してください。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 既存のデータをクリア（ヘッダー行を除く）
  var lastRow = userSheet.getLastRow();
  if (lastRow > 1) {
    userSheet.getRange(2, 1, lastRow - 1, 1).clearContent();
  }
  
  // 既知の語源を保存
  if (payload.knownEtymologies && payload.knownEtymologies.length > 0) {
    var knownValues = payload.knownEtymologies.map(function(item) { return [item]; });
    userSheet.getRange(2, 1, knownValues.length, 1).setValues(knownValues);
  }
  
  // テスト完了したので進捗データをクリア
  userSheet.getRange(2, 2).clearContent();
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: '診断結果が保存されました。'
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetKnownEtymologies(payload) {
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
  var username = '';
  
  for (var i = 1; i < userData.length; i++) {
    if (userData[i][2] === payload.email) {
      username = userData[i][1];
      break;
    }
  }
  
  if (!username) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ユーザーが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // ユーザー名のシートを取得
  var userSheet = ss.getSheetByName(username);
  
  if (!userSheet) {
    // シートが存在しない場合は空配列を返す（未診断）
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      knownEtymologies: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 既知の語源を取得
  var data = userSheet.getDataRange().getValues();
  var knownEtymologies = [];
  
  for (var j = 1; j < data.length; j++) {
    if (data[j][0]) {
      knownEtymologies.push(data[j][0]);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    knownEtymologies: knownEtymologies
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
