import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Database } from 'lucide-react';
import { getAllDatabaseWords } from '../api/flashcard';

export const DatabaseScreen: React.FC = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState<{ word: string, meaning: string, username?: string }[]>([]);
  const [filteredWords, setFilteredWords] = useState<{ word: string, meaning: string, username?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    try {
      setLoading(true);
      const result = await getAllDatabaseWords();
      
      if (result.success) {
        setWords(result.words || []);
        setFilteredWords(result.words || []);
      } else {
        setError(result.error || '単語の取得に失敗しました。');
      }
    } catch (err) {
      setError('読み込み中にエラーが発生しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredWords(words);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = words.filter(
      item => item.word.toLowerCase().includes(q) || 
              item.meaning.toLowerCase().includes(q) || 
              (item.username && item.username.toLowerCase().includes(q))
    );
    setFilteredWords(filtered);
  }, [searchQuery, words]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '800px', width: '100%', margin: '0 auto', marginTop: '40px' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p>全ユーザーのデータベースを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '40px', maxWidth: '800px', width: '100%', margin: '0 auto', marginTop: '40px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '20px' }}>
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
          <div style={{
              width: '40px',
              height: '40px',
              background: 'rgba(14, 165, 233, 0.2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0ea5e9'
            }}>
              <Database size={20} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>みんなのデータベース</h2>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '12px', marginBottom: '20px', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* Search Box */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="単語や意味で検索..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="custom-input"
          style={{
            width: '100%',
            padding: '16px 16px 16px 48px',
            fontSize: '1rem',
            borderRadius: '12px'
          }}
        />
      </div>

      {/* Stats */}
      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
        登録単語数: {filteredWords.length} 語
      </div>

      {/* Words List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredWords.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
            見つかりませんでした。
          </div>
        ) : (
          filteredWords.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--panel-border)',
                borderRadius: '12px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
            >
              <div style={{ width: '40px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                {index + 1}
              </div>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: '150px' }}>
                    {item.word}
                  </div>
                  <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                    {item.meaning}
                  </div>
                </div>
                {item.username && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ opacity: 0.7 }}>by</span> {item.username}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
