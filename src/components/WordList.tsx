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
            // 単語はインデックス1 (B列)、意味はインデックス2 (C列) で固定
            const word = item[1] || '';
            const meaning = item[2] || '';
            return { word, meaning, rawData: item };
          }
          // GASの古いロジックで末尾の要素がmeaningに設定されている可能性があるため、
          // 常にC列(インデックス2)を意味として強制的に上書きする
          if (item && item.rawData && Array.isArray(item.rawData) && item.rawData.length >= 3) {
            return { ...item, meaning: item.rawData[2] || item.meaning };
          }
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
    <div className="glass-panel" style={{ padding: '40px', paddingBottom: '40px', maxWidth: '800px', width: '100%', position: 'relative' }}>
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
        <button
          onClick={() => navigate(`/flashcards/${title}/add`)}
          style={{
            background: 'var(--accent-color)',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'white',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
          }}
          title="単語を追加"
        >
          <PlusCircle size={18} />
          <span>追加</span>
        </button>
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
              <div 
                onClick={() => navigate(`/flashcards/${encodeURIComponent(title || '')}/add`, { state: { editWordData: wordObj.rawData } })}
                style={{ cursor: 'pointer', flex: 1 }}
                title="タップして編集"
              >
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '4px', transition: 'color 0.2s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}>
                  {wordObj.word}
                </h3>
                {wordObj.meaning && (
                  <p style={{ color: 'var(--text-secondary)' }}>{wordObj.meaning}</p>
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

    </div>
  );
};
