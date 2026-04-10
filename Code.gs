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
    if (action === 'addWordToFlashcard') {
      return handleAddWordToFlashcard(payload);
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
    if (action === 'deleteWordFromFlashcard') {
      return handleDeleteWordFromFlashcard(payload);
    }
    if (action === 'updateReviewProgress') {
      return handleUpdateReviewProgress(payload);
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
    if (action === 'getTestSheetEtymologies') {
      return handleGetTestSheetEtymologies(payload);
    }
    if (action === 'getAllDatabaseWords') {
      return handleGetAllDatabaseWords(payload);
    }
    if (action === 'toggleLike') {
      return handleToggleLike(payload);
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

function handleAddWordToFlashcard(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 単語帳タイトル + メールアドレスでシート名を構築
  var sheetName = payload.title + '_' + payload.email;
  var flashcardSheet = ss.getSheetByName(sheetName);
  
  if (!flashcardSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '指定された単語帳（シート）が見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var targetWord = payload.rowData[1];
  var data = flashcardSheet.getDataRange().getValues();
  var updateRowIndex = -1;
  
  if (targetWord) {
    for (var i = 0; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString().toLowerCase() === targetWord.toString().toLowerCase()) {
        updateRowIndex = i + 1; // 1-indexed
        break;
      }
    }
  }

  if (updateRowIndex !== -1) {
    // 既存のデータを上書き
    var targetRange = flashcardSheet.getRange(updateRowIndex, 1, 1, payload.rowData.length);
    targetRange.setValues([payload.rowData]);
  } else {
    // シートに新規データを追加
    flashcardSheet.appendRow(payload.rowData);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: '単語が追加・上書きされました。'
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
  var registeredFlashcards = [];
  var userRow = userData[userRowIndex];
  
  for (var j = 4; j < userRow.length; j++) {
    if (userRow[j] && userRow[j].toString().trim() !== '') {
      var fcName = userRow[j].toString();
      flashcardNames.push(fcName);
      
      // 指定されたwordが送られている場合、その単語帳に登録済みかチェックする
      if (payload.word) {
        var fcSheet = ss.getSheetByName(fcName + '_' + payload.email);
        if (fcSheet) {
          var fcData = fcSheet.getDataRange().getValues();
          var isRegistered = false;
          for (var k = 0; k < fcData.length; k++) {
            if (fcData[k][1] && fcData[k][1].toString().toLowerCase() === payload.word.toLowerCase()) {
              isRegistered = true;
              break;
            }
          }
          if (isRegistered) {
            registeredFlashcards.push(fcName);
          }
        }
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    flashcards: flashcardNames,
    registeredFlashcards: registeredFlashcards
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
  
  // シートのデータを取得
  var data = flashcardSheet.getDataRange().getValues();
  var flashcards = [];
  
  // 1行目からフェッチする
  var startIndex = 0;
  
  for (var i = startIndex; i < data.length; i++) {
    // 空行はスキップ（B列の単語が存在しない場合）
    if (!data[i][1]) continue;

      // B列[1]: 単語
      // C列[2]: 対象単語の意味
      // どの学習モードでも、意味は常にC列（インデックス2）に保存される
      var targetMeaning = data[i][2] || '';
      targetMeaning = targetMeaning.toString().trim();
      
      var flashcard = {
        word: data[i][1] || '', // B列: 単語
        meaning: targetMeaning,
        rawData: data[i] // UI側で語源パーツや意味の変化を表示できるように全データを渡す
      };
    
    flashcards.push(flashcard);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    title: payload.title,
    flashcards: flashcards // payload is returned as flashcards per older implementation
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
  
  // 既存のデータを全てクリア
  flashcardSheet.clear();
  
  // 新しいデータを追加
  for (var i = 0; i < payload.flashcards.length; i++) {
    var card = payload.flashcards[i];
    // 空の単語カードはスキップ
    if (card.word || card.meaning) {
      // 形式に合わせて['0'または'1', 単語, 意味]として保存する（旧形式の場合は便宜上'1'とする）
      flashcardSheet.appendRow(['1', card.word, card.meaning]);
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

function handleDeleteWordFromFlashcard(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = payload.title + '_' + payload.email;
  var flashcardSheet = ss.getSheetByName(sheetName);
  
  if (!flashcardSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '単語帳が見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = flashcardSheet.getDataRange().getValues();
  var wordToDelete = payload.word;
  var deleted = false;
  
  // ヘッダー行をスキップしない（常に1行目から）
  var startIndex = 0;
  
  // 下から上に向かってループし、一致する単語の行を削除（複数ある場合はすべて削除）
  for (var i = data.length - 1; i >= startIndex; i--) {
    if (data[i][1] === wordToDelete) {
      flashcardSheet.deleteRow(i + 1); // 1-indexed
      deleted = true;
    }
  }
  
  if (deleted) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      message: '単語が削除されました。'
    })).setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '指定された単語が見つかりませんでした。'
    })).setMimeType(ContentService.MimeType.JSON);
  }
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
  
  // 1行目から検索
  for (var i = 0; i < data.length; i++) {
    if (data[i][1] === payload.word) {
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
  
  // クイズデータをJSON文字列として保存（重複を避けるためT列(20列目)に保存）
  // payload.quizがnullの場合は空文字をセットしてクイズを削除する
  var quizValue = payload.quiz ? JSON.stringify(payload.quiz) : "";
  flashcardSheet.getRange(wordRowIndex, 20).setValue(quizValue);
  
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

function handleGetTestSheetEtymologies(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var testSheet = ss.getSheetByName('test');
  
  if (!testSheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'testシートが見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // testシートからB列（語源）のデータを取得
  var data = testSheet.getDataRange().getValues();
  var etymologies = [];
  
  // 1行目からデータを取得（ヘッダー行なし）
  for (var i = 0; i < data.length; i++) {
    if (data[i][1]) {  // B列に語源が存在する場合
      // カンマ区切りで複数の語源が含まれている可能性を考慮
      var etymologyStr = data[i][1].toString().trim();
      if (etymologyStr) {
        // カンマ、スペース、全角カンマで分割して個別の語源として追加
        var parts = etymologyStr.split(/[,、\s]+/);
        for (var j = 0; j < parts.length; j++) {
          var part = parts[j].trim();
          if (part && etymologies.indexOf(part) === -1) {
            etymologies.push(part);
          }
        }
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    etymologies: etymologies
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

function handleUpdateReviewProgress(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = payload.title + '_' + payload.email;
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '単語帳が見つかりません。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  var word = payload.word;
  var isCorrect = payload.isCorrect;
  var now = new Date();
  
  for (var i = 0; i < data.length; i++) {
    if (data[i][1] === word) {
      var rowIndex = i + 1;
      
      var uVal = data[i][20]; // U列はindex 20
      var vVal = data[i][21]; // V列はindex 21
      var wVal = data[i][22]; // W列はindex 22
      var xVal = data[i][23]; // X列はindex 23

      // 復習時間が来ているか判定する
      var nextTimeStr = xVal || wVal || vVal;
      var isDue = true;
      
      if (nextTimeStr && nextTimeStr.toString().trim() !== '') {
        var nextStr = nextTimeStr.toString().trim();
        if (nextStr.indexOf('+') === -1 && nextStr.indexOf('Z') === -1) {
          nextStr += '+09:00';
        }
        nextStr = nextStr.replace(/\//g, '-');
        var targetDate = new Date(nextStr);
        // 現在時刻が予定時刻より前なら「まだ復習時間に来ていない」
        if (!isNaN(targetDate.getTime()) && now.getTime() < targetDate.getTime()) {
          isDue = false;
        }
      }

      if (!isDue) {
        if (isCorrect) {
          // 復習時間に来ていないのに正解が押された場合は、何も変更しない
          return ContentService.createTextOutput(JSON.stringify({ 
            success: true, 
            message: 'Not due yet. No changes made.' 
          })).setMimeType(ContentService.MimeType.JSON);
        } else {
          // 復習時間に来ていないのにもう一度が押された場合は、一番最後のタイムスタンプを消去する
          if (xVal && xVal.toString().trim() !== '') {
            sheet.getRange(rowIndex, 24).clearContent(); // X列消去
          } else if (wVal && wVal.toString().trim() !== '') {
            sheet.getRange(rowIndex, 23).clearContent(); // W列消去
          } else if (vVal && vVal.toString().trim() !== '') {
            sheet.getRange(rowIndex, 22).clearContent(); // V列消去
          } else if (uVal && uVal.toString().trim() !== '') {
            sheet.getRange(rowIndex, 21).clearContent(); // U列消去
          }
          return ContentService.createTextOutput(JSON.stringify({ 
            success: true, 
            message: 'Not due yet. Reverted the last timestamp.' 
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      // --- 以下は復習時間が来ている（または新規学習）場合の通常の処理 ---
      
      // U列(21列目)に今の時刻 (日本時間で保存)
      var jstNow = Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM-dd'T'HH:mm:ssXXX");
      sheet.getRange(rowIndex, 21).setValue(jstNow);
      
      if (isCorrect) {
        if (!vVal || vVal.toString().trim() === '') {
          // Vが空ならVに+1日
          var nextTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          var jstNext = Utilities.formatDate(nextTime, "Asia/Tokyo", "yyyy-MM-dd'T'HH:mm:ssXXX");
          sheet.getRange(rowIndex, 22).setValue(jstNext);
        } else if (!wVal || wVal.toString().trim() === '') {
          // Vが埋まっていてWが空ならW(index 22)にVの+3日
          var vStr = vVal.toString();
          if (vStr.indexOf('+') === -1 && vStr.indexOf('Z') === -1) vStr += '+09:00';
          var vDate = new Date(vStr);
          if (isNaN(vDate.getTime())) vDate = now;
          var nextTime = new Date(vDate.getTime() + 3 * 24 * 60 * 60 * 1000);
          var jstNext = Utilities.formatDate(nextTime, "Asia/Tokyo", "yyyy-MM-dd'T'HH:mm:ssXXX");
          sheet.getRange(rowIndex, 23).setValue(jstNext);
        } else {
          // Wが埋まっているならX(index 23)にWの+7日
          var wStr = wVal.toString();
          if (wStr.indexOf('+') === -1 && wStr.indexOf('Z') === -1) wStr += '+09:00';
          var wDate = new Date(wStr);
          if (isNaN(wDate.getTime())) wDate = now;
          var nextTime = new Date(wDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          var jstNext = Utilities.formatDate(nextTime, "Asia/Tokyo", "yyyy-MM-dd'T'HH:mm:ssXXX");
          sheet.getRange(rowIndex, 24).setValue(jstNext);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: '単語が見つかりません' })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetAllDatabaseWords(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  
  // Usersシートから email -> username のマッピングを作成
  var usersSheet = ss.getSheetByName('Users');
  var emailToUsername = {};
  if (usersSheet) {
    var usersData = usersSheet.getDataRange().getValues();
    for (var i = 1; i < usersData.length; i++) {
      var username = usersData[i][1];
      var email = usersData[i][2];
      if (email && username) {
        emailToUsername[email] = username;
      }
    }
  }
  
  var allWordsMap = {}; // 単語をキーにして重複を排除する
  
  // Usersとtestとnice以外のすべてのシートを検索
  for (var s = 0; s < sheets.length; s++) {
    var sheetName = sheets[s].getName();
    if (sheetName === 'Users' || sheetName === 'test' || sheetName === 'nice') {
      continue;
    }
    
    // シート名からユーザー名を取得 (形式: Title_Email)
    var parts = sheetName.split('_');
    var sheetEmail = parts.length > 1 ? parts[parts.length - 1] : '';
    var sheetUsername = emailToUsername[sheetEmail] || 'Unknown User';
    
    // ユーザー独自の語源シート（Usernameのシート）の場合は名前をそのまま使う
    if (parts.length === 1 && !sheetEmail) {
       // もしシート名が直接usernameとして存在しているかチェック
       for (var e in emailToUsername) {
         if (emailToUsername[e] === sheetName) {
           sheetUsername = sheetName;
           break;
         }
       }
    }
    
    // 単語帳シート(通常は "Title_Email" の形式)か、ユーザの既知語源シートなど。
    // 今回は全単語を抽出する目的として、B列に単語が書いてあるシートを対象とする。
    var data = sheets[s].getDataRange().getValues();
    if (data.length === 0) continue;
    
    for (var i = 0; i < data.length; i++) {
      if (!data[i][1]) continue; // B列が空ならスキップ
      var word = data[i][1].toString().trim();
      
      // システムシートやヘッダーっぽい行を弾く
      if (word === '' || word === 'Username' || word === '既知の語源') continue;
      
      // どの学習モードでも、意味は常にC列（インデックス2）に保存される
      var targetMeaning = data[i][2] || '';
      targetMeaning = targetMeaning.toString().trim();
      
      if (word && targetMeaning) {
        // 単語 + ユーザー名をキーにして、異なるユーザーが同じ単語を登録した場合に別々に表示する
        var uniqueKey = word + '_' + sheetUsername;
        if (!allWordsMap[uniqueKey]) {
          // rawDataはU列(index 20)までに限定（復習タイムスタンプは不要）
          var rawData = [];
          for (var col = 0; col < Math.min(data[i].length, 20); col++) {
            rawData.push(data[i][col] != null ? data[i][col].toString() : '');
          }
          var cardType = data[i][0] != null ? data[i][0].toString().trim() : '';
          allWordsMap[uniqueKey] = { word: word, meaning: targetMeaning, username: sheetUsername, type: cardType, rawData: rawData };
        }
      }
    }
  }
  
  // ---- いいね情報の取得と結合 ----
  var niceSheet = ss.getSheetByName('nice');
  var likesMap = {}; // { uniqueKey: { count: number, isLikedByCurrentUser: boolean } }
  var currentUserEmail = payload && payload.email ? payload.email : '';
  
  if (niceSheet) {
    var niceData = niceSheet.getDataRange().getValues();
    for (var k = 0; k < niceData.length; k++) {
      var likerEmail = niceData[k][0];
      var likedWord = niceData[k][1];
      var likedCreator = niceData[k][2];
      
      if (!likedWord || !likedCreator) continue;
      
      var uKey = likedWord + '_' + likedCreator;
      if (!likesMap[uKey]) {
        likesMap[uKey] = { count: 0, isLikedByCurrentUser: false };
      }
      
      likesMap[uKey].count++;
      if (likerEmail.toString().trim() === currentUserEmail.toString().trim()) {
        likesMap[uKey].isLikedByCurrentUser = true;
      }
    }
  }
  
  // マップから配列に変換
  var allWordsArray = [];
  for (var key in allWordsMap) {
    var wordObj = allWordsMap[key];
    var likeInfo = likesMap[key] || { count: 0, isLikedByCurrentUser: false };
    wordObj.likes = likeInfo.count;
    wordObj.isLiked = likeInfo.isLikedByCurrentUser;
    allWordsArray.push(wordObj);
  }
  
  // アルファベット順にソート (A-Z)、同じ単語の場合はいいね数の多い順
  allWordsArray.sort(function(a, b) {
    var wordA = a.word.toLowerCase();
    var wordB = b.word.toLowerCase();
    if (wordA < wordB) return -1;
    if (wordA > wordB) return 1;
    // 単語が同じ場合はいいね数の多い方を上に表示（降順）
    var likesA = a.likes || 0;
    var likesB = b.likes || 0;
    if (likesB !== likesA) return likesB - likesA;
    // いいね数も同じ場合はユーザー名でソート
    var userA = (a.username || '').toLowerCase();
    var userB = (b.username || '').toLowerCase();
    if (userA < userB) return -1;
    if (userA > userB) return 1;
    return 0;
  });
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    words: allWordsArray
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleToggleLike(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var niceSheet = ss.getSheetByName('nice');
  
  if (!niceSheet) {
    niceSheet = ss.insertSheet('nice');
  }
  
  var email = payload.email || '';
  var word = payload.word || '';
  var creator = payload.creator || '';
  
  if (!email || !word || !creator) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: '必要なパラメーターが不足しています。' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = niceSheet.getDataRange().getValues();
  var foundIndex = -1;
  
  // A: email, B: word, C: creator
  for (var i = 0; i < data.length; i++) {
    var checkEmail = (data[i][0] != null) ? String(data[i][0]).trim() : '';
    var checkWord = (data[i][1] != null) ? String(data[i][1]).trim() : '';
    var checkCreator = (data[i][2] != null) ? String(data[i][2]).trim() : '';
    
    if (checkEmail === String(email).trim() && checkWord === String(word).trim() && checkCreator === String(creator).trim()) {
      foundIndex = i;
      break;
    }
  }
  
  if (foundIndex !== -1) {
    // いいね解除
    niceSheet.deleteRow(foundIndex + 1); // 1-indexed
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      liked: false 
    })).setMimeType(ContentService.MimeType.JSON);
  } else {
    // いいね追加
    niceSheet.appendRow([email, word, creator]);
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      liked: true 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
