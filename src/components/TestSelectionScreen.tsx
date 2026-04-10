import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckSquare, Square, Play } from 'lucide-react';
import { getFlashcard } from '../api/flashcard';

interface Flashcard {
  word: string;
  meaning: string;
  rawData: string[];
}

export const TestSelectionScreen: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');

  useEffect(() => {
    if (title) {
      loadCards();
    }
  }, [title]);

  const loadCards = async () => {
    try {
      setLoading(true);
      const email = localStorage.getItem('email');
      if (!email) {
        setError('ログイン情報が見つかりません。');
        return;
      }

      const result = await getFlashcard(email, decodeURIComponent(title!));
      if (result.success) {
        const rawWords = result.flashcards || result.words || [];
        const mappedCards: Flashcard[] = rawWords.map((item: any) => {
          if (Array.isArray(item) && item.length >= 3) {
            return {
              word: item[1] || '',
              meaning: item[2] || '',
              rawData: item
            };
          }
          if (item && item.rawData && Array.isArray(item.rawData) && item.rawData.length >= 3) {
            return { ...item, meaning: item.rawData[2] || item.meaning };
          }
          return item;
        });

        setCards(mappedCards);
        // 最初はすべて選択状態にする
        const allIndices = new Set(mappedCards.map((_, i) => i));
        setSelectedIndices(allIndices);
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

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedIndices(newSelection);
  };

  const applyRange = () => {
    const start = parseInt(rangeStart, 10);
    const end = parseInt(rangeEnd, 10);

    if (isNaN(start) || isNaN(end)) {
      alert('開始番号と終了番号を正しく入力してください。');
      return;
    }

    if (start < 1 || end > cards.length || start > end) {
      alert(`1から${cards.length}の範囲で正しい番号を入力してください。`);
      return;
    }

    const newSelection = new Set(selectedIndices);
    const startIndex = start - 1;
    const endIndex = end - 1;

    for (let i = startIndex; i <= endIndex; i++) {
      newSelection.add(i);
    }
    setSelectedIndices(newSelection);
  };

  const clearSelection = () => {
    setSelectedIndices(new Set());
  };

  const startTest = () => {
    if (selectedIndices.size === 0) {
      alert('テストする単語を1つ以上選択してください。');
      return;
    }
    
    // 実際のテスト画面へ遷移
    alert(`${selectedIndices.size}個の単語でテストを開始します！（UIは未実装です）`);
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '800px', width: '100%', margin: '0 auto', marginTop: '40px' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '800px', width: '100%', margin: '0 auto', marginTop: '40px' }}>
        <p style={{ color: 'var(--error-color)' }}>{error}</p>
        <button onClick={() => navigate('/test')} className="btn-primary" style={{ marginTop: '20px' }}>
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '40px', maxWidth: '800px', width: '100%', margin: '0 auto', marginTop: '40px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/test')}
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
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>テスト範囲の選択</h2>
        </div>
      </div>

      {/* Range Selector */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid var(--panel-border)', marginBottom: '20px' }}>
        <p style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>番号を指定してチェックを入れる</p>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="number"
            min="1"
            max={cards.length}
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            placeholder="1"
            className="custom-input"
            style={{ width: '80px', textAlign: 'center', padding: '8px' }}
          />
          <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>〜</span>
          <input
            type="number"
            min="1"
            max={cards.length}
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            placeholder={String(cards.length)}
            className="custom-input"
            style={{ width: '80px', textAlign: 'center', padding: '8px' }}
          />
          <button
            onClick={applyRange}
            style={{
              padding: '8px 16px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#3b82f6',
              borderRadius: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
          >
            チェック
          </button>
          
          <button
            onClick={clearSelection}
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--panel-border)',
              color: 'var(--text-secondary)',
              borderRadius: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginLeft: 'auto'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
            全て外す
          </button>
        </div>
      </div>

      {/* Word List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>
          <span>選択中: {selectedIndices.size} / {cards.length} 単語</span>
        </div>
        
        {cards.map((card, index) => {
          const isSelected = selectedIndices.has(index);
          return (
            <div
              key={index}
              onClick={() => toggleSelection(index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.4)' : 'var(--panel-border)'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ color: isSelected ? '#3b82f6' : 'var(--text-secondary)' }}>
                {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
              </div>
              <div style={{ width: '30px', color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                {index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{card.word}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{card.meaning}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Button */}
      <button
        onClick={startTest}
        className="btn-primary"
        style={{
          padding: '16px',
          fontSize: '1.1rem',
          borderRadius: '16px',
          opacity: selectedIndices.size === 0 ? 0.5 : 1,
          cursor: selectedIndices.size === 0 ? 'not-allowed' : 'pointer',
          marginTop: 'auto'
        }}
      >
        <Play size={20} /> テストを開始する ({selectedIndices.size}単語)
      </button>
    </div>
  );
};
