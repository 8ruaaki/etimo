import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createFlashcard } from '../api/flashcard';
import { getWordMeaning, getEtymology } from '../api/gemini';

interface FlashcardItem {
  id: number;
  word: string;
  etymology: string;
  meaning: string;
  isGenerating?: boolean;
  isGeneratingEtymology?: boolean;
}

export const FlashcardCreate: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([
    { id: 1, word: '', etymology: '', meaning: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addFlashcard = () => {
    const newId = Math.max(...flashcards.map(f => f.id), 0) + 1;
    setFlashcards([...flashcards, { id: newId, word: '', etymology: '', meaning: '' }]);
  };

  const removeFlashcard = (id: number) => {
    if (flashcards.length > 1) {
      setFlashcards(flashcards.filter(f => f.id !== id));
    }
  };

  const updateFlashcard = (id: number, field: keyof FlashcardItem, value: any) => {
    setFlashcards(flashcards.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const generateMeaning = async (id: number, word: string) => {
    if (!word.trim()) {
      return;
    }

    updateFlashcard(id, 'isGenerating', true);
    setError('');

    try {
      const result = await getWordMeaning(word);
      if (result.success && result.meaning) {
        updateFlashcard(id, 'meaning', result.meaning);
      } else if (result.error) {
        console.error(result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error('Error generating meaning:', err);
      setError('意味の取得中にエラーが発生しました。');
    } finally {
      // isGeneratingフラグを削除（型定義上オプショナルなのでundefinedに）
      setFlashcards(prev => prev.map(f => 
        f.id === id ? { ...f, isGenerating: undefined } : f
      ));
    }
  };

  const generateEtymologyContent = async (id: number, word: string, type: 'true' | 'false' | 'katakana' | 'god') => {
    if (!word.trim()) return;

    let hint = '';
    if (type === 'god') {
      const userInput = window.prompt(`「${word}」から連想できることは？（例：リンガーハット、キャタピラー等）\nあなたが語源神となって、入力したキーワードと単語の意味を無理やり結びつけます！`);
      if (userInput === null || userInput.trim() === '') return; // Cancelled or empty
      hint = userInput.trim();
    }

    updateFlashcard(id, 'isGeneratingEtymology', true);
    setError('');

    try {
      const result = await getEtymology(word, type, hint);
      if (result.success && result.etymology) {
        updateFlashcard(id, 'etymology', result.etymology);
      } else if (result.error) {
        console.error(result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error('Error generating etymology:', err);
      setError('語源の取得中にエラーが発生しました。');
    } finally {
      setFlashcards(prev => prev.map(f => 
        f.id === id ? { ...f, isGeneratingEtymology: undefined } : f
      ));
    }
  };

  const handleSave = async () => {
    setError('');
    
    // バリデーション
    if (!title.trim()) {
      setError('単語帳のタイトルを入力してください。');
      return;
    }
    
    // 少なくとも1つのカードに単語が入力されているかチェック
    const hasValidCard = flashcards.some(card => card.word.trim());
    if (!hasValidCard) {
      setError('少なくとも1つの単語を入力してください。');
      return;
    }
    
    const email = localStorage.getItem('email');
    if (!email) {
      setError('ログインしてください。');
      return;
    }
    
    setLoading(true);
    
    try {
      // idフィールドを除外して送信
      const flashcardsToSave = flashcards
        .filter(card => card.word.trim()) // 単語が入力されているカードのみ
        .map(({ word, etymology, meaning }) => ({ 
          word, 
          etymology, 
          meaning 
        }));
      
      const result = await createFlashcard(email, title, flashcardsToSave);
      
      if (result.success) {
        alert('単語帳が作成されました！');
        navigate('/flashcards');
      } else {
        setError(result.error || '単語帳の作成に失敗しました。');
      }
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
      console.error('Error creating flashcard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '40px', position: 'relative', overflow: 'visible' }}>
      {/* Background decorative elements */}
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--accent-color)', filter: 'blur(100px)', zIndex: 0, opacity: 0.3, borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', background: '#0ea5e9', filter: 'blur(80px)', zIndex: 0, opacity: 0.2, borderRadius: '50%' }}></div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="flex-between mb-8" style={{ alignItems: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>単語帳作成</h1>
          <button 
            onClick={() => navigate('/flashcards')} 
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
            <ArrowLeft size={18} /> 戻る
          </button>
        </div>

        {/* Title Input */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            color: 'var(--text-primary)', 
            fontWeight: 600,
            fontSize: '0.95rem'
          }}>
            単語帳タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：TOEFL必須単語"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--panel-border)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none',
              transition: 'all 0.3s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-color)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--panel-border)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.4)';
            }}
          />
        </div>

        {/* Flashcards List */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            fontSize: '1.2rem', 
            fontWeight: 600, 
            marginBottom: '16px',
            color: 'var(--text-primary)'
          }}>
            単語カード
          </h2>

          {flashcards.map((flashcard, index) => (
            <div 
              key={flashcard.id}
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid var(--panel-border)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
                position: 'relative',
              }}
            >
              {/* Card Number and Delete Button */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <span style={{ 
                  color: 'var(--accent-color)', 
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}>
                  カード #{index + 1}
                </span>
                {flashcards.length > 1 && (
                  <button
                    onClick={() => removeFlashcard(flashcard.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    }}
                  >
                    <Trash2 size={14} /> 削除
                  </button>
                )}
              </div>

              {/* Word Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.85rem',
                  fontWeight: 500
                }}>
                  単語
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={flashcard.word}
                    onChange={(e) => updateFlashcard(flashcard.id, 'word', e.target.value)}
                    placeholder="例：ephemeral"
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-color)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--panel-border)';
                    }}
                  />
                  <button
                    onClick={() => generateMeaning(flashcard.id, flashcard.word)}
                    disabled={!flashcard.word.trim() || flashcard.isGenerating}
                    title="AIで意味を自動入力"
                    style={{
                      background: flashcard.isGenerating ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid var(--accent-color)',
                      borderRadius: '10px',
                      padding: '0 16px',
                      color: 'var(--accent-color)',
                      cursor: !flashcard.word.trim() || flashcard.isGenerating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      opacity: !flashcard.word.trim() ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (flashcard.word.trim() && !flashcard.isGenerating) {
                        e.currentTarget.style.background = 'var(--accent-color)';
                        e.currentTarget.style.color = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (flashcard.word.trim() && !flashcard.isGenerating) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                        e.currentTarget.style.color = 'var(--accent-color)';
                      }
                    }}
                  >
                    <Sparkles size={18} className={flashcard.isGenerating ? "spin-animation" : ""} />
                  </button>
                </div>
              </div>

              {/* Etymology Input */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ 
                    color: 'var(--text-secondary)', 
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}>
                    語源・覚え方
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => generateEtymologyContent(flashcard.id, flashcard.word, 'true')}
                      disabled={!flashcard.word.trim() || flashcard.isGeneratingEtymology}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        background: flashcard.isGeneratingEtymology ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid var(--accent-color)',
                        color: 'var(--accent-color)',
                        cursor: !flashcard.word.trim() || flashcard.isGeneratingEtymology ? 'not-allowed' : 'pointer',
                        opacity: !flashcard.word.trim() ? 0.5 : 1,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      真語源
                    </button>
                    <button
                      onClick={() => generateEtymologyContent(flashcard.id, flashcard.word, 'false')}
                      disabled={!flashcard.word.trim() || flashcard.isGeneratingEtymology}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        background: flashcard.isGeneratingEtymology ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid var(--accent-color)',
                        color: 'var(--accent-color)',
                        cursor: !flashcard.word.trim() || flashcard.isGeneratingEtymology ? 'not-allowed' : 'pointer',
                        opacity: !flashcard.word.trim() ? 0.5 : 1,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      偽語源
                    </button>
                    <button
                      onClick={() => generateEtymologyContent(flashcard.id, flashcard.word, 'katakana')}
                      disabled={!flashcard.word.trim() || flashcard.isGeneratingEtymology}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        background: flashcard.isGeneratingEtymology ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid var(--accent-color)',
                        color: 'var(--accent-color)',
                        cursor: !flashcard.word.trim() || flashcard.isGeneratingEtymology ? 'not-allowed' : 'pointer',
                        opacity: !flashcard.word.trim() ? 0.5 : 1,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      カタカナ語
                    </button>
                    <button
                      onClick={() => generateEtymologyContent(flashcard.id, flashcard.word, 'god')}
                      disabled={!flashcard.word.trim() || flashcard.isGeneratingEtymology}
                      title="入力した言葉と英単語を無理やり結びつけます！"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        background: flashcard.isGeneratingEtymology ? 'rgba(234, 179, 8, 0.2)' : 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(245, 158, 11, 0.15))',
                        border: '1px solid #eab308',
                        color: '#eab308',
                        fontWeight: 'bold',
                        cursor: !flashcard.word.trim() || flashcard.isGeneratingEtymology ? 'not-allowed' : 'pointer',
                        opacity: !flashcard.word.trim() ? 0.5 : 1,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onMouseEnter={(e) => {
                        if (flashcard.word.trim() && !flashcard.isGeneratingEtymology) {
                          e.currentTarget.style.background = 'rgba(234, 179, 8, 0.25)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (flashcard.word.trim() && !flashcard.isGeneratingEtymology) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(245, 158, 11, 0.15))';
                        }
                      }}
                    >
                      あなたが語源神
                    </button>
                  </div>
                </div>
                <textarea
                  value={flashcard.isGeneratingEtymology ? '🤖 作成中...' : flashcard.etymology}
                  onChange={(e) => {
                    updateFlashcard(flashcard.id, 'etymology', e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  disabled={flashcard.isGeneratingEtymology}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  placeholder="例：ギリシャ語 ephēmeros「1日だけ続く」"
                  rows={1}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color 0.3s ease, background-color 0.3s ease',
                    resize: 'none',
                    overflow: 'hidden',
                    lineHeight: '1.5',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--panel-border)';
                  }}
                />
              </div>

              {/* Meaning Input */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.85rem',
                  fontWeight: 500
                }}>
                  意味
                </label>
                <textarea
                  value={flashcard.isGenerating ? '🤖 作成中...' : flashcard.meaning}
                  onChange={(e) => {
                    updateFlashcard(flashcard.id, 'meaning', e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  disabled={flashcard.isGenerating}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  placeholder="例：はかない、短命の"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    resize: 'none',
                    overflow: 'hidden',
                    lineHeight: '1.5',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.3s ease, background-color 0.3s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--panel-border)';
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Card Button */}
        <button
          onClick={addFlashcard}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '2px dashed var(--accent-color)',
            borderRadius: '12px',
            color: 'var(--accent-color)',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            marginBottom: '24px',
            opacity: loading ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.borderColor = '#60a5fa';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.borderColor = 'var(--accent-color)';
            }
          }}
        >
          <Plus size={20} /> カードを追加
        </button>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            color: '#ef4444',
            marginBottom: '16px',
            fontSize: '0.95rem',
          }}>
            {error}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            background: loading ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, var(--accent-color), #0ea5e9)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
            }
          }}
        >
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
};
