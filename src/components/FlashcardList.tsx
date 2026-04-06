import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFlashcardList, createFlashcard, deleteFlashcard } from '../api/flashcard';
import { PlusCircle, Trash2, BookOpen, ArrowLeft } from 'lucide-react';

export const FlashcardList: React.FC = () => {
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFlashcardTitle, setNewFlashcardTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadFlashcards();
  }, []);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      const email = localStorage.getItem('email');
      if (!email) {
        setError('ログイン情報が見つかりません。');
        return;
      }

      const result = await getFlashcardList(email);
      if (result.success) {
        setFlashcards(result.flashcards || []);
      } else {
        setError(result.error || '単語帳の取得に失敗しました。');
      }
    } catch (err) {
      setError('単語帳の読み込み中にエラーが発生しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlashcard = async () => {
    if (!newFlashcardTitle.trim()) {
      alert('単語帳名を入力してください。');
      return;
    }

    try {
      setCreating(true);
      const email = localStorage.getItem('email');
      if (!email) {
        setError('ログイン情報が見つかりません。');
        return;
      }

      const result = await createFlashcard(email, newFlashcardTitle.trim());
      if (result.success) {
        setShowCreateDialog(false);
        setNewFlashcardTitle('');
        loadFlashcards();
      } else {
        alert(result.error || '単語帳の作成に失敗しました。');
      }
    } catch (err) {
      alert('単語帳の作成中にエラーが発生しました。');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFlashcard = async (title: string) => {
    if (!confirm(`「${title}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      const email = localStorage.getItem('email');
      if (!email) {
        setError('ログイン情報が見つかりません。');
        return;
      }

      const result = await deleteFlashcard(email, title);
      if (result.success) {
        loadFlashcards();
      } else {
        alert(result.error || '単語帳の削除に失敗しました。');
      }
    } catch (err) {
      alert('単語帳の削除中にエラーが発生しました。');
      console.error(err);
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
    <div className="glass-panel" style={{ padding: '40px', maxWidth: '800px', width: '100%', position: 'relative' }}>
      <div className="flex-between" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/home')}
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
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>単語帳一覧</h2>
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

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {flashcards.map((title, index) => (
          <div
            key={index}
            onClick={() => navigate(`/flashcards/${encodeURIComponent(title)}`)}
            style={{
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--panel-border)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = 'var(--accent-color)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--panel-border)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6'
              }}>
                <BookOpen size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, flex: 1 }}>{title}</h3>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFlashcard(title);
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#ef4444',
                  transition: 'all 0.3s ease',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                }}
              >
                <Trash2 size={18} />
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {flashcards.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <BookOpen size={64} style={{ margin: '0 auto 20px', opacity: 0.3 }} />
          <p style={{ fontSize: '1.1rem' }}>まだ単語帳がありません</p>
          <p>下のボタンから新しい単語帳を作成してください</p>
        </div>
      )}

      <button
        onClick={() => setShowCreateDialog(true)}
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
      >
        <PlusCircle size={32} color="white" />
      </button>

      {showCreateDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
          onClick={() => setShowCreateDialog(false)}
        >
          <div
            className="glass-panel"
            style={{ padding: '40px', maxWidth: '500px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>新しい単語帳を作成</h3>
            <input
              type="text"
              value={newFlashcardTitle}
              onChange={(e) => setNewFlashcardTitle(e.target.value)}
              placeholder="単語帳名を入力"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--panel-border)',
                borderRadius: '10px',
                fontSize: '1rem',
                color: 'var(--text-primary)',
                marginBottom: '20px'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFlashcard();
                }
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCreateFlashcard}
                disabled={creating}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                {creating ? '作成中...' : '作成'}
              </button>
              <button
                onClick={() => setShowCreateDialog(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
