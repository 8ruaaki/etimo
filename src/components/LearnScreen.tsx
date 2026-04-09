import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFlashcard } from '../api/flashcard';
import { ArrowLeft, ArrowDown, Plus, ChevronRight, ChevronLeft } from 'lucide-react';

const HiddenText: React.FC<{ text: string; placeholder?: string }> = ({ text, placeholder = 'タップして表示' }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <div
      onClick={() => setRevealed(!revealed)}
      style={{
        cursor: 'pointer',
        padding: '8px 16px',
        background: revealed ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
        border: revealed ? '1px solid transparent' : '1px dashed var(--panel-border)',
        borderRadius: '8px',
        color: revealed ? 'var(--text-primary)' : 'var(--text-secondary)',
        minHeight: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        fontWeight: revealed ? 600 : 400,
        boxShadow: revealed ? 'inset 0 0 10px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      {revealed ? text : placeholder}
    </div>
  );
};

const HiddenBracketText: React.FC<{ text: string }> = ({ text }) => {
  // 「」で囲まれた部分を抽出して隠すコンポーネント
  const parts = text.split(/(「.*?」)/g);

  return (
    <div style={{ lineHeight: '1.6' }}>
      {parts.map((part, idx) => {
        if (part.startsWith('「') && part.endsWith('」')) {
          const innerText = part.slice(1, -1);
          return (
            <span key={idx} style={{ display: 'inline-block', margin: '0 4px' }}>
              「<HiddenInlineText text={innerText} />」
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </div>
  );
};

const HiddenInlineText: React.FC<{ text: string }> = ({ text }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      onClick={() => setRevealed(!revealed)}
      style={{
        cursor: 'pointer',
        background: revealed ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.2)',
        color: revealed ? '#38bdf8' : 'transparent',
        padding: '2px 8px',
        borderRadius: '4px',
        transition: 'all 0.2s ease',
        display: 'inline-block',
        minWidth: revealed ? 'auto' : '60px',
        textAlign: 'center',
      }}
    >
      {revealed ? text : '???'}
    </span>
  );
};

export const LearnScreen: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate();
  const [words, setWords] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // リセット用のキー（Nextボタンで隠し状態を初期化するため）
  const [cardKey, setCardKey] = useState(0);

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
        // バックエンドからのデータを取得し、配列形式に正規化する
        const rawWords = result.flashcards || result.words || [];
        const normalizedWords = rawWords.map((w: any) => {
          if (Array.isArray(w)) return w;
          if (typeof w === 'object' && w !== null) {
            // オブジェクト形式 {word, meaning} で返ってきた場合のフォールバック（デフォルトをタイプ0とする）
            return ['0', w.word || '', w.meaning || ''];
          }
          return [];
        }).filter((w: any[]) => w.length > 0);
        
        setWords(normalizedWords);
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

  const nextCard = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCardKey(prev => prev + 1);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setCardKey(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', marginBottom: '24px', fontSize: '1.1rem' }}>{error}</p>
        <button 
          onClick={() => navigate('/learn')} 
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--panel-border)',
            borderRadius: '10px',
            padding: '10px 20px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }}
        >
          <ArrowLeft size={18} /> 学習メニューに戻る
        </button>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>単語が登録されていません</p>
          <p style={{ color: 'var(--text-secondary)' }}>「単語帳一覧」からこの単語帳に新しい単語を追加してください。</p>
        </div>
        <button 
          onClick={() => navigate('/learn')} 
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--panel-border)',
            borderRadius: '10px',
            padding: '10px 20px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }}
        >
          <ArrowLeft size={18} /> 学習メニューに戻る
        </button>
      </div>
    );
  }

  const currentWordData = words[currentIndex];
  const cardType = String(currentWordData[0]); // A列
  const word = currentWordData[1] || ''; // B列
  
  // 意味はデータが入っている最後の列にあるはず
  const rowLen = currentWordData.length;
  let meaning = "";
  for (let col = rowLen - 1; col >= 2; col--) {
    if (currentWordData[col] !== "" && currentWordData[col] !== undefined) {
      meaning = currentWordData[col];
      break;
    }
  }
  if (!meaning) meaning = currentWordData[2] || '';

  return (
    <div className="glass-panel" style={{ padding: '40px', maxWidth: '800px', width: '100%', display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/learn')}
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
          <ArrowLeft size={18} /> 学習終了
        </button>
        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {currentIndex + 1} / {words.length}
        </div>
      </div>

      <div key={cardKey} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 単語表示（共通） */}
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <h2 style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '0.05em' }}>{word}</h2>
        </div>

        {cardType === '0' ? (
          /* Type 0: 語源で暗記 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 'fit-content', minWidth: '200px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px', textAlign: 'center' }}>単語の意味</div>
                <HiddenText text={meaning} placeholder="タップして意味を表示" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
                  語源で分解
                </h4>
              </div>
              
              {[2, 4, 6, 8].some(idx => currentWordData[idx]) ? (
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {[2, 4, 6, 8].map((partIdx, i) => {
                    const part = currentWordData[partIdx];
                    const partMeaning = currentWordData[partIdx + 1];
                    if (!part) return null;
                    return (
                      <React.Fragment key={i}>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          width: '200px'
                        }}>
                          {/* パーツ */}
                          <div style={{
                            background: 'rgba(16,185,129,0.15)',
                            color: '#10b981',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '1.4rem',
                            textAlign: 'center',
                            width: '100%',
                          }}>
                            {part}
                          </div>
                          
                          {/* 下向き矢印 */}
                          <div style={{ color: 'var(--text-secondary)' }}>
                            <ArrowDown size={20} />
                          </div>
                          
                          {/* 意味 */}
                          <div style={{ fontSize: '1rem', fontWeight: 600, textAlign: 'center' }}>
                            <HiddenText text={partMeaning || '意味なし'} placeholder="意味" />
                          </div>
                        </div>
                        {i < 3 && currentWordData[partIdx + 2] && (
                          <div style={{ display: 'flex', alignItems: 'center', height: '48px' }}>
                            <Plus size={24} color="var(--text-secondary)" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                  この単語には語源データが登録されていません。
                </div>
              )}

              {/* 変化 (J列以降 〜 最後から2番目まで) */}
              {currentWordData.length > 10 && currentWordData.slice(10, -1).some(step => step && typeof step === 'string' && step.trim()) && (
                <div style={{
                  marginTop: '24px',
                  padding: '24px',
                  background: 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: '16px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '20px', fontWeight: 600 }}>パーツの統合イメージ</p>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {currentWordData.slice(10, -1).filter(step => step && typeof step === 'string' && step.trim()).map((step, idx, arr) => (
                      <React.Fragment key={idx}>
                        <div style={{
                          padding: '12px 24px',
                          background: 'rgba(16,185,129,0.12)',
                          border: '1px solid rgba(16,185,129,0.3)',
                          borderRadius: '10px',
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          color: '#10b981',
                          letterSpacing: '0.05em',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}>
                          <HiddenText text={step} placeholder="タップして変化を表示" />
                        </div>
                        {idx < arr.length - 1 && (
                          <div style={{ color: 'rgba(16,185,129,0.5)', padding: '6px 0' }}>
                            <ArrowDown size={28} />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Type 1: イメージで覚える */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 'fit-content', minWidth: '200px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px', textAlign: 'center' }}>単語の意味</div>
                {/* 1の場合、単語の意味も隠す指定は明示されていませんでしたが、暗記用なので隠します。 */}
                <HiddenText text={meaning} placeholder="タップして意味を表示" />
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '24px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#38bdf8', textAlign: 'center', margin: '0 0 16px 0' }}>対象単語のイメージ</h4>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                 <HiddenText text={currentWordData[3] || ''} placeholder="タップしてイメージを表示" />
              </div>
            </div>

            {currentWordData.length > 4 && currentWordData.slice(4).some(exp => exp.trim()) && (
              <div style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: '16px', padding: '24px' }}>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: 600, textAlign: 'center' }}>イメージに関する説明</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {currentWordData.slice(4).filter(exp => exp.trim()).map((exp, idx) => (
                    <div key={idx} style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                      <HiddenBracketText text={exp} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '40px' }}>
        <button
          onClick={prevCard}
          disabled={currentIndex === 0}
          style={{
            padding: '12px 24px',
            background: currentIndex === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '12px',
            color: currentIndex === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1.1rem'
          }}
        >
          <ChevronLeft size={20} /> 前へ
        </button>
        <button
          onClick={nextCard}
          disabled={currentIndex === words.length - 1}
          style={{
            padding: '12px 24px',
            background: currentIndex === words.length - 1 ? 'rgba(59, 130, 246, 0.2)' : 'var(--accent-color)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: currentIndex === words.length - 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1.1rem',
            boxShadow: currentIndex === words.length - 1 ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.4)'
          }}
        >
          次へ <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};
