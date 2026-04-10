import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { generateDistractors } from '../api/testApi';

interface Flashcard {
  word: string;
  meaning: string;
  rawData: string[];
}

export const TestRunScreen: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const selectedCards: Flashcard[] = location.state?.selectedCards || [];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choicesCache, setChoicesCache] = useState<Record<number, string[]>>({});
  const fetchingIndices = useRef<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // プリフェッチ処理（バックグラウンドで次の問題の選択肢をAIに生成させる）
  const prefetchDistractors = async (index: number) => {
    if (index >= selectedCards.length) return;
    if (choicesCache[index] || fetchingIndices.current.has(index)) return;

    fetchingIndices.current.add(index);
    const card = selectedCards[index];

    try {
      const distractors = await generateDistractors(card.word, card.meaning);
      const allChoices = [card.meaning, ...distractors];
      const shuffled = [...allChoices].sort(() => Math.random() - 0.5);
      
      setChoicesCache(prev => ({ ...prev, [index]: shuffled }));
    } catch (err) {
      console.error(`Failed to prefetch for index ${index}:`, err);
      const fallback = [card.meaning, 'ダミー1', 'ダミー2', 'ダミー3'].sort(() => Math.random() - 0.5);
      setChoicesCache(prev => ({ ...prev, [index]: fallback }));
    }
  };

  // 初回マウント時と、問題が進んだ時に、現在の問題＋次の問題をプリフェッチ
  useEffect(() => {
    if (selectedCards.length > 0 && !isFinished) {
      prefetchDistractors(currentIndex);
      prefetchDistractors(currentIndex + 1);
    }
  }, [currentIndex, isFinished, selectedCards]);

  // 現在の問題の選択肢がキャッシュに準備できたら表示を更新
  useEffect(() => {
    if (isFinished) return;
    
    if (choicesCache[currentIndex]) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [currentIndex, choicesCache, isFinished]);

  useEffect(() => {
    if (selectedCards.length === 0) {
      navigate(`/test/${encodeURIComponent(title || '')}`);
      return;
    }
  }, []);

  const handleChoiceSelect = (choice: string) => {
    if (selectedChoice) return;

    const correctMeaning = selectedCards[currentIndex].meaning;
    const correct = choice === correctMeaning;
    
    setSelectedChoice(choice);
    if (correct) {
      setScore(prev => prev + 1);
    }

    // ユーザーが解答したタイミングで、さらに先のもう1問（現在+2）もプリフェッチを仕掛けておく
    prefetchDistractors(currentIndex + 2);
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= selectedCards.length) {
      setIsFinished(true);
    } else {
      setSelectedChoice(null);
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (selectedCards.length === 0) {
    return null;
  }

  if (isFinished) {
    const accuracy = Math.round((score / selectedCards.length) * 100);
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '800px', width: '100%', margin: '0 auto', marginTop: '40px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '20px' }}>テスト結果</h2>
        <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent-color)', marginBottom: '10px' }}>
          {score} / {selectedCards.length}
        </div>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '40px' }}>
          正答率: {accuracy}%
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button onClick={() => navigate('/test')} className="btn-secondary" style={{ padding: '12px 24px' }}>
            他のデッキを選ぶ
          </button>
          <button onClick={() => navigate(`/test/${encodeURIComponent(title || '')}`)} className="btn-primary" style={{ padding: '12px 24px' }}>
            同じデッキで再テスト
          </button>
        </div>
      </div>
    );
  }

  const currentCard = selectedCards[currentIndex];

  return (
    <div className="glass-panel" style={{ padding: '40px', maxWidth: '800px', width: '100%', margin: '0 auto', marginTop: '40px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate(`/test/${encodeURIComponent(title || '')}`)}
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
          <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 600 }}>
            問題 {currentIndex + 1} / {selectedCards.length}
          </div>
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-color)' }}>
          Score: {score}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '40px', overflow: 'hidden' }}>
        <div 
          style={{ 
            height: '100%', 
            background: 'var(--accent-color)', 
            width: `${((currentIndex) / selectedCards.length) * 100}%`,
            transition: 'width 0.3s ease'
          }} 
        />
      </div>

      {/* Question Word */}
      <div style={{ textAlign: 'center', marginBottom: '40px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px', wordBreak: 'break-word' }}>
          {currentCard.word}
        </div>
        <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          最も適切な意味を選んでください
        </div>
      </div>

      {/* Choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px', width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            AIが選択肢を生成中...
          </div>
        ) : (
          (choicesCache[currentIndex] || []).map((choice: string, idx: number) => {
            const isSelected = selectedChoice === choice;
            const isActuallyCorrect = choice === currentCard.meaning;
            
            let bgStyle = 'rgba(255,255,255,0.05)';
            let borderStyle = '1px solid var(--panel-border)';
            let textStyle = 'var(--text-primary)';
            let icon = null;

            if (selectedChoice) {
              if (isActuallyCorrect) {
                // 正解は常に緑にする
                bgStyle = 'rgba(34, 197, 94, 0.1)';
                borderStyle = '1px solid rgba(34, 197, 94, 0.4)';
                textStyle = '#4ade80';
                icon = <CheckCircle size={20} color="#4ade80" />;
              } else if (isSelected && !isActuallyCorrect) {
                // 選んだものが間違っていたら赤
                bgStyle = 'rgba(239, 68, 68, 0.1)';
                borderStyle = '1px solid rgba(239, 68, 68, 0.4)';
                textStyle = '#f87171';
                icon = <XCircle size={20} color="#f87171" />;
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleChoiceSelect(choice)}
                disabled={!!selectedChoice}
                style={{
                  width: '100%',
                  padding: '20px',
                  background: bgStyle,
                  border: borderStyle,
                  borderRadius: '16px',
                  color: textStyle,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: selectedChoice ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: (selectedChoice && !isActuallyCorrect && !isSelected) ? 0.5 : 1
                }}
                onMouseEnter={e => {
                  if (!selectedChoice) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                  }
                }}
                onMouseLeave={e => {
                  if (!selectedChoice) {
                    e.currentTarget.style.background = bgStyle;
                    e.currentTarget.style.borderColor = 'var(--panel-border)';
                  }
                }}
              >
                <span>{choice}</span>
                {icon && <span>{icon}</span>}
              </button>
            );
          })
        )}
      </div>

      {/* Next Button */}
      {selectedChoice && (
        <button
          onClick={nextQuestion}
          className="btn-primary"
          style={{
            padding: '16px',
            fontSize: '1.2rem',
            borderRadius: '16px',
            marginTop: 'auto',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          {currentIndex + 1 >= selectedCards.length ? '結果を見る' : '次の問題へ'}
        </button>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};
