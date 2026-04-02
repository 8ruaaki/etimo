import React, { useEffect, useState } from 'react';
import { Home, Plus, BookOpen, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFlashcardList, deleteFlashcard } from '../api/flashcard';

export const FlashcardList: React.FC = () => {
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchFlashcards = async () => {
    const email = localStorage.getItem('email');
    if (!email) {
      setError('ログインしてください。');
      setLoading(false);
      return;
    }

    try {
      const result = await getFlashcardList(email);
      if (result.success) {
        setFlashcards(result.flashcards || []);
      } else {
        setError(result.error || '単語帳の取得に失敗しました。');
      }
    } catch (err) {
      setError('エラーが発生しました。');
      console.error('Error fetching flashcards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashcards();
  }, []);

  const handleDelete = async (title: string, e: React.MouseEvent) => {
    e.stopPropagation(); // カードクリックイベントの伝播を防ぐ
    
    if (!confirm(`「${title}」を削除してもよろしいですか？`)) {
      return;
    }

    const email = localStorage.getItem('email');
    if (!email) {
      setError('ログインしてください。');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const result = await deleteFlashcard(email, title);
      if (result.success) {
        // 削除後、リストを再取得
        await fetchFlashcards();
      } else {
        setError(result.error || '単語帳の削除に失敗しました。');
      }
    } catch (err) {
      setError('エラーが発生しました。');
      console.error('Error deleting flashcard:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '40px', position: 'relative', overflow: 'hidden', minHeight: '500px' }}>
      {/* Background decorative elements */}
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--accent-color)', filter: 'blur(100px)', zIndex: 0, opacity: 0.3, borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', background: '#0ea5e9', filter: 'blur(80px)', zIndex: 0, opacity: 0.2, borderRadius: '50%' }}></div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="flex-between mb-8" style={{ alignItems: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>単語帳一覧</h1>
          <button 
            onClick={() => navigate('/home')} 
            className="text-link" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'rgba(255,255,255,0.05)', 
              padding: '8px 12px', 
              borderRadius: '10px', 
              border: '1px solid var(--panel-border)' 
            }}
          >
            <Home size={18} /> ホームに戻る
          </button>
        </div>

        {/* Flashcard list content area */}
        <div style={{ marginTop: '30px' }}>
          {loading || deleting ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '60px 20px' }}>
              {deleting ? '削除中...' : '読み込み中...'}
            </p>
          ) : error ? (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              color: '#ef4444',
              textAlign: 'center',
            }}>
              {error}
            </div>
          ) : flashcards.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '60px 20px' }}>
              単語帳がまだありません。「＋」ボタンから作成してください。
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {flashcards.map((title, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--panel-border)';
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.4)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <button
                    onClick={() => navigate(`/flashcards/edit/${encodeURIComponent(title)}`)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-color)',
                      flexShrink: 0,
                    }}>
                      <BookOpen size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 600, 
                        color: 'var(--text-primary)',
                        margin: 0,
                      }}>
                        {title}
                      </h3>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDelete(title, e)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      padding: '8px',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        style={{
          position: 'fixed',
          bottom: '40px',
          right: '40px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-color), #0ea5e9)',
          border: 'none',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1000,
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)';
        }}
        onClick={() => {
          navigate('/flashcards/create');
        }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
};
