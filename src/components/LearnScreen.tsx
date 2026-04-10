import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowDown, Plus, Eye, EyeOff, ChevronRight, ChevronLeft } from 'lucide-react';
import { getFlashcard, updateReviewProgress } from '../api/flashcard';

interface Flashcard {
  word: string;
  meaning: string;
  rawData: string[];
}

const ClozeSentence: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(「.*?」)/g);
  return (
    <span style={{ fontSize: '1.2rem', lineHeight: '2.0', color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
      {parts.map((part, i) => {
        if (part.startsWith('「') && part.endsWith('」')) {
          return <ClozeWord key={i} content={part.slice(1, -1)} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const ClozeWord: React.FC<{ content: string }> = ({ content }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <span
      onClick={() => setIsOpen(!isOpen)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '50px',
        padding: '2px 12px',
        margin: '0 4px',
        background: isOpen ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
        border: isOpen ? '1px solid rgba(59,130,246,0.3)' : '1px dashed var(--text-secondary)',
        borderRadius: '8px',
        color: isOpen ? '#3b82f6' : 'transparent',
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        verticalAlign: 'middle',
        transition: 'all 0.2s',
        fontWeight: isOpen ? 700 : 'normal'
      }}
    >
      {!isOpen && (
        <span style={{ position: 'absolute', color: 'var(--text-secondary)' }}>
          <Eye size={16} />
        </span>
      )}
      <span style={{ opacity: isOpen ? 1 : 0 }}>{content}</span>
    </span>
  );
};

export const LearnScreen: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toggle states
  const [showMeaning, setShowMeaning] = useState(false);
  const [showImageText, setShowImageText] = useState(false);
  const [showPartMeanings, setShowPartMeanings] = useState<boolean[]>([]);
  const [showStepMeanings, setShowStepMeanings] = useState<boolean[]>([]);

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

        // 単語のフィルタリング: U列(index 20)が空白か、もしくはU列以降の時刻(V列=21, W列=22, X列=23)が既に過ぎているもの
        let filteredCards = mappedCards.filter(card => {
          if (!card.rawData) return true;
          const uCol = card.rawData[20];
          const vCol = card.rawData[21];
          const wCol = card.rawData[22];
          const xCol = card.rawData[23];

          // U列が空白なら表示対象
          if (!uCol || String(uCol).trim() === '') return true;

          // U列はあるがV/W/X列に次回の時刻が入っていない場合は対象外
          const nextTimeStr = xCol || wCol || vCol;
          if (!nextTimeStr || String(nextTimeStr).trim() === '') {
            return true;
          }

          // 日付としてパース
          // GASで書き込まれた形式（タイムゾーンなし、もしくは+09:00付きなど）を安全に処理
          let nextStr = String(nextTimeStr).trim();
          if (nextStr.indexOf('+') === -1 && nextStr.indexOf('Z') === -1) {
            // タイムゾーンが明記されていない場合は日本時間（+09:00）として扱う
            nextStr += '+09:00';
          }
          // yyyy/MM/dd を yyyy-MM-dd に変換（一部ブラウザのパースエラー回避）
          nextStr = nextStr.replace(/\//g, '-');
          
          const targetTime = new Date(nextStr).getTime();
          // 日付が不正なら表示対象
          if (isNaN(targetTime)) return true;

          // 既に過ぎていれば表示対象
          return Date.now() >= targetTime;
        });

        // 復習対象の単語がない場合は、すべての単語を次回学習時間が近い順にソートして表示
        if (filteredCards.length === 0 && mappedCards.length > 0) {
          filteredCards = [...mappedCards].sort((a, b) => {
            const getNextTime = (card: Flashcard) => {
              if (!card.rawData) return 0;
              const uCol = card.rawData[20];
              const vCol = card.rawData[21];
              const wCol = card.rawData[22];
              const xCol = card.rawData[23];
              
              if (!uCol || String(uCol).trim() === '') return 0;
              
              const nextTimeStr = xCol || wCol || vCol;
              if (!nextTimeStr || String(nextTimeStr).trim() === '') return 0;
              
              let nextStr = String(nextTimeStr).trim();
              if (nextStr.indexOf('+') === -1 && nextStr.indexOf('Z') === -1) {
                nextStr += '+09:00';
              }
              nextStr = nextStr.replace(/\//g, '-');
              
              const targetTime = new Date(nextStr).getTime();
              return isNaN(targetTime) ? 0 : targetTime;
            };
            
            return getNextTime(a) - getNextTime(b);
          });
        }

        setCards(filteredCards);
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

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetToggles();
    }
  };

  const handleReviewSubmit = (isCorrect: boolean) => {
    if (!title) return;

    const email = localStorage.getItem('email');
    if (!email) {
      alert('ログイン情報がありません。');
      return;
    }

    const word = cards[currentIndex].word;
    
    // UIの遷移を即座に行う
    if (currentIndex < cards.length - 1) {
      handleNext();
    } else {
      navigate('/learn');
    }

    // バックグラウンドでAPI呼び出しを実行（awaitしない）
    updateReviewProgress(email, decodeURIComponent(title), word, isCorrect)
      .then(res => {
        if (!res.success) {
          console.error('進捗の保存に失敗:', res.error);
        }
      })
      .catch(err => {
        console.error('進捗の保存中にエラーが発生しました:', err);
      });
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      resetToggles();
    }
  };

  const resetToggles = () => {
    setShowMeaning(false);
    setShowImageText(false);
    setShowPartMeanings([]);
    setShowStepMeanings([]);
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
        <button onClick={() => navigate('/learn')} className="btn-primary" style={{ marginTop: '20px' }}>
          戻る
        </button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '800px', width: '100%', margin: '0 auto', marginTop: '40px' }}>
        <p>学習する単語がありません。</p>
        <button onClick={() => navigate('/learn')} className="btn-primary" style={{ marginTop: '20px' }}>
          戻る
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const isType0 = currentCard.rawData && String(currentCard.rawData[0]) === '0';
  const isType1 = currentCard.rawData && String(currentCard.rawData[0]) === '1';

  // Parse Parts (index 3 to 10) for Type 0
  const parts: { part: string; meaning: string }[] = [];
  if (currentCard.rawData && isType0) {
    for (let i = 0; i < 4; i++) {
      const p = currentCard.rawData[3 + i * 2];
      const m = currentCard.rawData[4 + i * 2];
      if (p && p.trim()) {
        parts.push({ part: p, meaning: m });
      }
    }
  }

  // Parse Steps (index 11 to 19) for Type 0
  const steps = (currentCard.rawData && isType0) 
    ? currentCard.rawData.slice(11, 20).filter(s => s && typeof s === 'string' && s.trim() !== '' && s !== currentCard.meaning) 
    : [];

  // Parse Image Data for Type 1
  const imageText = (currentCard.rawData && isType1) ? currentCard.rawData[3] : '';
  // インデックス20以降はシステムデータ(復習タイムスタンプ等)なので除外。
  // また、最終的な「意味 (meaning)」が説明文に混ざらないように除外する。
  const explanations = (currentCard.rawData && isType1) 
    ? currentCard.rawData.slice(4, 20).filter(s => s && typeof s === 'string' && s.trim() !== '' && s !== currentCard.meaning) 
    : [];

  return (
    <div className="glass-panel" style={{ padding: '40px', maxWidth: '800px', width: '100%', margin: '0 auto', marginTop: '40px', display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
      {/* Header */}
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
          <ArrowLeft size={18} /> 学習メニューに戻る
        </button>
        <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
          {currentIndex + 1} / {cards.length}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {isType0 ? (
          <>
            {/* Tag */}
            <div
              style={{
                padding: '6px 14px',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                width: 'fit-content',
                color: '#3b82f6',
                fontSize: '0.85rem',
                fontWeight: 600,
                margin: '0 auto',
              }}
            >
              語源暗記モード
            </div>

            {/* Word */}
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <h3 className="huge-word-title" style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '16px' }}>
                {currentCard.word}
              </h3>
            </div>

            {/* Etymology Parts */}
            {parts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
                    語源で分解
                  </h4>
                </div>

                <div className="etymology-parts-container" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {parts.map((part, idx) => (
                    <React.Fragment key={idx}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '180px' }}>
                        <div style={{
                          background: 'rgba(59,130,246,0.15)',
                          color: '#3b82f6',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '1.4rem',
                          textAlign: 'center',
                          width: '100%',
                          border: '2px solid transparent',
                        }}>
                          {part.part}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          <ArrowDown size={20} />
                        </div>
                        <div 
                          onClick={() => {
                            const newShow = [...showPartMeanings];
                            newShow[idx] = !newShow[idx];
                            setShowPartMeanings(newShow);
                          }}
                          style={{ 
                            fontSize: '1rem', 
                            fontWeight: 600, 
                            textAlign: 'center',
                            cursor: 'pointer',
                            padding: '6px 12px',
                            background: showPartMeanings[idx] ? 'transparent' : 'rgba(255,255,255,0.05)',
                            border: showPartMeanings[idx] ? 'none' : '1px dashed var(--text-secondary)',
                            borderRadius: '8px',
                            color: showPartMeanings[idx] ? 'var(--text-primary)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            width: '100%',
                            minHeight: '36px',
                            userSelect: 'none',
                          }}
                        >
                          {showPartMeanings[idx] ? (
                            part.meaning
                          ) : (
                            <><Eye size={14} /> 意味を表示</>
                          )}
                        </div>
                      </div>
                      {idx < parts.length - 1 && (
                        <div className="etymology-plus-icon" style={{ display: 'flex', alignItems: 'center', height: '48px' }}>
                          <Plus size={24} color="var(--text-secondary)" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Meaning Changes / Integration Steps (Toggleable individually) */}
                {steps.length > 0 && (
                  <div style={{
                    marginTop: '24px',
                    padding: '24px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>パーツの統合イメージ（意味の変化）</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      {steps.map((step, idx, arr) => (
                        <React.Fragment key={idx}>
                          <div 
                            onClick={() => {
                              const newShow = [...showStepMeanings];
                              newShow[idx] = !newShow[idx];
                              setShowStepMeanings(newShow);
                            }}
                            style={{
                              padding: '12px 24px',
                              background: showStepMeanings[idx] ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.05)',
                              border: showStepMeanings[idx] ? '1px solid rgba(59,130,246,0.3)' : '1px dashed var(--text-secondary)',
                              borderRadius: '10px',
                              fontSize: showStepMeanings[idx] ? '1.2rem' : '1rem',
                              fontWeight: showStepMeanings[idx] ? 700 : 500,
                              color: showStepMeanings[idx] ? '#3b82f6' : 'var(--text-secondary)',
                              letterSpacing: '0.05em',
                              boxShadow: showStepMeanings[idx] ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              minWidth: '200px',
                              minHeight: '52px',
                              userSelect: 'none',
                              transition: 'all 0.2s',
                            }}
                          >
                            {showStepMeanings[idx] ? (
                              step
                            ) : (
                              <><Eye size={16} /> タップして表示</>
                            )}
                          </div>
                          {idx < arr.length - 1 && (
                            <div style={{ color: 'rgba(59,130,246,0.5)', padding: '6px 0' }}>
                              <ArrowDown size={28} />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Toggleable Meaning (Moved to bottom) */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <div 
                onClick={() => setShowMeaning(!showMeaning)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: showMeaning ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                  border: showMeaning ? '1px solid rgba(59,130,246,0.3)' : '1px dashed var(--text-secondary)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  userSelect: 'none',
                }}
              >
                {showMeaning ? (
                  <p style={{ fontSize: '1.4rem', fontWeight: 600, color: '#3b82f6', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {currentCard.meaning} <EyeOff size={18} style={{ opacity: 0.5 }} />
                  </p>
                ) : (
                  <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={18} /> 単語の意味を表示
                  </p>
                )}
              </div>
            </div>

            {/* Answer Buttons */}
            {showMeaning && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
                <button
                  onClick={() => handleReviewSubmit(false)}
                  style={{
                    padding: '12px 32px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '12px',
                    color: '#ef4444',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: 1
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                >
                  ✖ もう一度
                </button>
                <button
                  onClick={() => handleReviewSubmit(true)}
                  style={{
                    padding: '12px 32px',
                    background: 'var(--accent-color)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                    opacity: 1
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  〇 正解
                </button>
              </div>
            )}
          </>
        ) : isType1 ? (
          <div key={`type1-${currentIndex}`}>
            {/* Tag */}
            <div
              style={{
                padding: '6px 14px',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                width: 'fit-content',
                color: '#3b82f6',
                fontSize: '0.85rem',
                fontWeight: 600,
                margin: '0 auto',
              }}
            >
              📖 イメージ暗記モード
            </div>

            {/* Word */}
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <h3 className="huge-word-title" style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '16px' }}>
                {currentCard.word}
              </h3>
            </div>

            {/* Image Text */}
            {imageText && (
              <div 
                onClick={() => setShowImageText(!showImageText)}
                style={{
                  textAlign: 'center',
                  padding: '24px',
                  background: showImageText ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.03)',
                  borderRadius: '16px',
                  border: showImageText ? '1px solid rgba(59,130,246,0.2)' : '1px dashed var(--text-secondary)',
                  marginBottom: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: showImageText ? '12px' : '0' }}>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>対象単語のイメージ</p>
                  {showImageText ? <EyeOff size={16} style={{ color: 'var(--text-secondary)' }} /> : <Eye size={16} style={{ color: 'var(--text-secondary)' }} />}
                </div>
                
                {showImageText ? (
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.05em', margin: 0 }}>{imageText}</p>
                ) : (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '8px 0 0 0', opacity: 0.8 }}>タップして表示</p>
                )}
              </div>
            )}

            {/* Explanations with Cloze */}
            {explanations.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '24px' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', margin: '0 0 8px 0' }}>イメージに関する説明</p>
                {explanations.map((exp, idx) => (
                  <div key={idx} style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <ClozeSentence text={String(exp)} />
                  </div>
                ))}
              </div>
            )}

            {/* Toggleable Meaning (Moved to bottom) */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <div 
                onClick={() => setShowMeaning(!showMeaning)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: showMeaning ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                  border: showMeaning ? '1px solid rgba(59,130,246,0.3)' : '1px dashed var(--text-secondary)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  userSelect: 'none',
                }}
              >
                {showMeaning ? (
                  <p style={{ fontSize: '1.4rem', fontWeight: 600, color: '#3b82f6', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {currentCard.meaning} <EyeOff size={18} style={{ opacity: 0.5 }} />
                  </p>
                ) : (
                  <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={18} /> 単語の意味を表示
                  </p>
                )}
              </div>
            </div>

            {/* Answer Buttons */}
            {showMeaning && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
                <button
                  onClick={() => handleReviewSubmit(false)}
                  style={{
                    padding: '12px 32px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '12px',
                    color: '#ef4444',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: 1
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                >
                  ✖ もう一度
                </button>
                <button
                  onClick={() => handleReviewSubmit(true)}
                  style={{
                    padding: '12px 32px',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                    opacity: 1
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  〇 正解
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <h3 className="huge-word-title" style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '16px' }}>
              {currentCard.word}
            </h3>
            <p style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {currentCard.meaning}
            </p>
            <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>
              このカードは語源暗記形式（A列=0）ではありません。<br />
              <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                (デバッグ情報: A列の値は {JSON.stringify(currentCard.rawData?.[0])} です。データ全体: {JSON.stringify(currentCard.rawData)})
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--panel-border)',
            borderRadius: '10px',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-primary)',
            opacity: currentIndex === 0 ? 0.3 : 1
          }}
        >
          <ChevronLeft size={20} /> 前の単語
        </button>

        {currentIndex === cards.length - 1 ? (
          <button
            onClick={() => navigate('/learn')}
            style={{
              padding: '12px 24px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            終了する
          </button>
        ) : (
          <button
            onClick={handleNext}
            style={{
              padding: '12px 24px',
              background: 'var(--accent-color)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            次の単語 <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};
