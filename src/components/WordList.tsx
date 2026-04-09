import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFlashcard, deleteWordFromFlashcard } from '../api/flashcard';
import { PlusCircle, ArrowLeft, BookOpen, Trash2 } from 'lucide-react';

interface FlashcardWord {
  word: string;
  meaning: string;
  rawData?: any[];
}

export const WordList: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate();
  const [words, setWords] = useState<FlashcardWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (title) {
      loadWords();
    }
  }, [title]);

  const loadWords = async () => {
    if (!title) return;
    
    try {
      setLoading(true);
      const email = localStorage.getItem('email');
      if (!email) {
        setError('ログイン情報が見つかりません。');
        return;
      }

      const result = await getFlashcard(email, decodeURIComponent(title));
      if (result.success) {
        // バックエンドが返す形式（flashcardsキーの配列）に対応
        const rawWords = result.flashcards || result.words || [];
        const mappedWords = rawWords.map((item: any) => {
          if (Array.isArray(item) && item.length >= 3) {
            // GASが配列をそのまま返してきた場合のハンドリング（旧コードのまま）
            const rowLen = item.length;
            let targetMeaning = "";
            for (let col = rowLen - 1; col >= 2; col--) {
              if (item[col] !== "" && item[col] !== undefined) {
                targetMeaning = item[col];
                break;
              }
            }
            if (!targetMeaning) targetMeaning = item[2] || '';
            return { word: item[1] || '', meaning: targetMeaning, rawData: item };
          }
          // すでに {word, meaning, rawData} オブジェクトになっている場合
          return item; 
        });
        setWords(mappedWords);
      } else {
        setError(result.error || '単語の取得に失敗しました。');
      }
    } catch (err) {
      setError('単語の読み込み中にエラーが発生しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWord = async (wordToDelete: string) => {
    if (!window.confirm(`「${wordToDelete}」を削除してもよろしいですか？`)) return;

    // オプティミスティックUI更新：APIの完了を待たずにUIから即座に消す
    setWords((prev) => prev.filter(w => w.word !== wordToDelete));

    try {
      const email = localStorage.getItem('email');
      if (!email) throw new Error('ログイン情報が見つかりません。');
      if (!title) return;

      const result = await deleteWordFromFlashcard(email, decodeURIComponent(title), wordToDelete);
      if (!result.success) {
        alert(result.error || 'サーバーでの削除に失敗しました。再読み込みします。');
        loadWords(); // 失敗した場合はリストを再取得して元に戻す
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || '削除中にエラーが発生しました。再読み込みします。');
      loadWords(); // 失敗した場合はリストを再取得して元に戻す
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '40px', paddingBottom: '120px', maxWidth: '800px', width: '100%', position: 'relative' }}>
      <div className="flex-between" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/flashcards')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--panel-border)',
              borderRadius: '10px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-primary)'
            }}
          >
            <ArrowLeft size={18} color="currentColor" />
          </button>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {decodeURIComponent(title || '')} の単語一覧
          </h2>
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: '16px', 
          background: 'rgba(239, 68, 68, 0.2)', 
          border: '1px solid #ef4444',
          borderRadius: '12px',
          marginBottom: '20px',
          color: '#ef4444'
        }}>
          {error}
        </div>
      )}

      {words.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
          {words.map((wordObj, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid var(--panel-border)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '4px' }}>
                  {wordObj.word}
                </h3>
                {wordObj.meaning && (
                  <p style={{ color: 'var(--text-secondary)' }}>{wordObj.meaning}</p>
                )}
                {wordObj.rawData && wordObj.rawData.length > 3 && wordObj.rawData[0] === '0' && (
                  <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      {/* C〜J列 (index 2-9) の語源パーツを抽出 */}
                      {Array.from({ length: 4 }).map((_, i) => {
                        const part = wordObj.rawData![2 + i * 2];
                        const meaning = wordObj.rawData![3 + i * 2];
                        if (part && part.trim() !== '') {
                          return (
                            <span key={i} style={{ background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                              {part} ({meaning})
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                    {/* K列 (index 10) 以降の変化ステップを抽出（最後の要素は対象単語の意味なので除外） */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {wordObj.rawData.slice(10, -1).map((step, i, arr) => {
                        if (step && typeof step === 'string' && step.trim() !== '') {
                          return (
                            <React.Fragment key={i}>
                              <span style={{ color: '#818cf8' }}>{step}</span>
                              {i < arr.length - 1 && <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>→</span>}
                            </React.Fragment>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDeleteWord(wordObj.word)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }}
                title="単語を削除"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <BookOpen size={64} style={{ margin: '0 auto 20px', opacity: 0.3 }} />
          <p style={{ fontSize: '1.1rem' }}>まだ単語がありません</p>
          <p>下のボタンから新しい単語を追加してください</p>
        </div>
      )}

      <button
        onClick={() => navigate(`/flashcards/${title}/add`)}
        style={{
          position: 'fixed',
          bottom: '40px',
          left: '40px',
          width: '60px',
          height: '60px',
          background: 'var(--accent-color)',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          transition: 'all 0.3s ease',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
        }}
        title="単語を追加"
      >
        <PlusCircle size={32} color="white" />
      </button>
    </div>
  );
};
