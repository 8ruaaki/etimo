import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Database, Heart, X, ArrowDown, Plus, Download, BookOpen, Check, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { getAllDatabaseWords, toggleLike, getFlashcardList, addWordToFlashcard } from '../api/flashcard';

interface WordEntry {
  word: string;
  meaning: string;
  username?: string;
  likes?: number;
  isLiked?: boolean;
  type?: string;
  rawData?: string[];
  wordbook?: string;
}

// ── 説明文を「」内をハイライト表示するコンポーネント ──
const HighlightedText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(「.*?」)/g);
  return (
    <span style={{ fontSize: '1.2rem', lineHeight: '2.0', color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
      {parts.map((part, i) => {
        if (part.startsWith('「') && part.endsWith('」')) {
          return (
            <span
              key={i}
              style={{
                padding: '2px 8px',
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '6px',
                color: '#3b82f6',
                fontWeight: 700,
              }}
            >
              {part.slice(1, -1)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

// ── Detail Modal: Read-only view (すべて表示、トグル機能なし) ──
const WordDetailModal: React.FC<{
  item: WordEntry;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const rawData = item.rawData || [];
  const isType0 = item.type === '0';
  const isType1 = item.type === '1';

  // ── Import flow states ──
  type ImportStep = 'idle' | 'selecting' | 'confirming' | 'saving' | 'done' | 'error';
  const [importStep, setImportStep] = useState<ImportStep>('idle');
  const [flashcardList, setFlashcardList] = useState<string[]>([]);
  const [selectedFlashcard, setSelectedFlashcard] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [registeredFlashcards, setRegisteredFlashcards] = useState<Set<string>>(new Set());

  const handleStartImport = async () => {
    const email = localStorage.getItem('email');
    if (!email) {
      setImportError('ログイン情報が見つかりません。');
      setImportStep('error');
      return;
    }
    setLoadingList(true);
    setImportStep('selecting');
    try {
      const result = await getFlashcardList(email, item.word);
      if (result.success) {
        setFlashcardList(result.flashcards || []);
        // TypeScriptのanyを回避するため型を明示
        setRegisteredFlashcards(new Set((result as any).registeredFlashcards || []));
      } else {
        setImportError(result.error || '単語帳の取得に失敗しました。');
        setImportStep('error');
      }
    } catch (err) {
      console.error(err);
      setImportError('単語帳の取得中にエラーが発生しました。');
      setImportStep('error');
    } finally {
      setLoadingList(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!selectedFlashcard) return;
    const email = localStorage.getItem('email');
    if (!email) return;

    setImportStep('saving');
    try {
      const result = await addWordToFlashcard(email, selectedFlashcard, rawData);
      if (result.success) {
        setImportStep('done');
      } else {
        setImportError(result.error || '保存に失敗しました。');
        setImportStep('error');
      }
    } catch (err) {
      console.error(err);
      setImportError('保存中にエラーが発生しました。');
      setImportStep('error');
    }
  };

  const resetImport = () => {
    setImportStep('idle');
    setSelectedFlashcard(null);
    setImportError(null);
  };

  // Parse Parts (index 3 to 10) for Type 0
  const parts: { part: string; meaning: string }[] = [];
  if (isType0) {
    for (let i = 0; i < 4; i++) {
      const p = rawData[3 + i * 2];
      const m = rawData[4 + i * 2];
      if (p && p.trim()) {
        parts.push({ part: p, meaning: m || '' });
      }
    }
  }

  // Parse Steps (index 11 to 19) for Type 0
  const steps = isType0
    ? rawData.slice(11, 20).filter(s => s && typeof s === 'string' && s.trim() !== '' && s !== item.meaning)
    : [];

  // Parse Image Data for Type 1
  const imageText = isType1 ? (rawData[3] || '') : '';
  const explanations = isType1
    ? rawData.slice(4, 20).filter(s => s && typeof s === 'string' && s.trim() !== '' && s !== item.meaning)
    : [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.92)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        zIndex: 1000,
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="modal-content"
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '700px',
          width: '100%',
          position: 'relative',
          margin: '40px 0',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--panel-border)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <X size={18} />
        </button>

        {/* Creator Badge */}
        {item.username && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
          }}>
            <div style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              background: 'rgba(255,255,255,0.05)',
              padding: '6px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ opacity: 0.7 }}>👤</span> {item.username} のカード
            </div>
            <div style={{
              fontSize: '0.85rem',
              color: (item.likes || 0) > 0 ? '#ef4444' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Heart size={14} fill={(item.likes || 0) > 0 ? '#ef4444' : 'none'} />
              {item.likes || 0}
            </div>
          </div>
        )}

        {isType0 ? (
          /* ═══ Type 0: Etymology Mode (Read-only, all visible) ═══ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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

            {/* Word + Meaning */}
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <h3 className="huge-word-title" style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {item.word}
              </h3>
              <p style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {item.meaning}
              </p>
            </div>

            {/* Etymology Parts - all meanings visible */}
            {parts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '24px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
                  語源で分解
                </h4>

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
                        }}>
                          {part.part}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          <ArrowDown size={20} />
                        </div>
                        <div style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          textAlign: 'center',
                          color: 'var(--text-primary)',
                        }}>
                          {part.meaning}
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

                {/* Meaning Change Steps - all visible */}
                {steps.length > 0 && (
                  <div style={{
                    marginTop: '24px',
                    padding: '24px',
                    background: 'rgba(59,130,246,0.05)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600, margin: '0 0 20px 0' }}>パーツの統合イメージ（意味の変化）</p>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      {steps.map((step, idx, arr) => (
                        <React.Fragment key={idx}>
                          <div style={{
                            padding: '12px 24px',
                            background: 'rgba(59,130,246,0.12)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            borderRadius: '10px',
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: '#3b82f6',
                            letterSpacing: '0.05em',
                            minWidth: '200px',
                          }}>
                            {step}
                          </div>
                          {idx < arr.length - 1 && (
                            <div style={{ color: 'rgba(59,130,246,0.5)', padding: '6px 0' }}>
                              <ArrowDown size={28} />
                            </div>
                          )}
                        </React.Fragment>
                      ))}

                      {/* Final meaning at the end of chain */}
                      <div style={{ color: 'rgba(59,130,246,0.5)', padding: '6px 0' }}>
                        <ArrowDown size={28} />
                      </div>
                      <div style={{
                        padding: '16px 24px',
                        background: 'rgba(59,130,246,0.15)',
                        border: '1px solid rgba(59,130,246,0.3)',
                        borderRadius: '12px',
                        fontSize: '1.4rem',
                        fontWeight: 800,
                        color: '#3b82f6',
                        textAlign: 'center',
                      }}>
                        {item.meaning}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : isType1 ? (
          /* ═══ Type 1: Image Memorization Mode (Read-only, all visible) ═══ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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

            {/* Word + Meaning */}
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <h3 className="huge-word-title" style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {item.word}
              </h3>
              <p style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {item.meaning}
              </p>
            </div>

            {/* Image Text - always visible */}
            {imageText && (
              <div style={{
                textAlign: 'center',
                padding: '24px',
                background: 'rgba(59,130,246,0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(59,130,246,0.2)',
              }}>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600, margin: '0 0 12px 0' }}>対象単語のイメージ</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.05em', margin: 0 }}>{imageText}</p>
              </div>
            )}

            {/* Explanations - all visible with highlighted keywords */}
            {explanations.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '24px' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', margin: '0 0 8px 0' }}>イメージに関する説明</p>
                {explanations.map((exp, idx) => (
                  <div key={idx} style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <HighlightedText text={String(exp)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ═══ Unknown Type: Fallback ═══ */
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <h3 className="huge-word-title" style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '16px' }}>
              {item.word}
            </h3>
            <p style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {item.meaning}
            </p>
          </div>
        )}

        {/* ═══ Import Flow UI ═══ */}
        {importStep === 'selecting' && (
          <div style={{
            marginTop: '24px',
            padding: '24px',
            background: 'rgba(59,130,246,0.05)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '16px',
          }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="#3b82f6" /> インポート先の単語帳を選択
            </h4>
            {loadingList ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                読み込み中...
              </div>
            ) : flashcardList.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>単語帳がありません。先に単語帳を作成してください。</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {flashcardList.map((fc, idx) => {
                  const isRegistered = registeredFlashcards.has(fc);
                  return (
                    <button
                      key={idx}
                      onClick={() => { setSelectedFlashcard(fc); setImportStep('confirming'); }}
                      style={{
                        padding: '14px 20px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'all 0.2s',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--panel-border)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BookOpen size={16} color="#3b82f6" />
                        {fc}
                      </div>
                      {isRegistered && (
                        <span style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          登録済み
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <button
                onClick={resetImport}
                style={{
                  padding: '8px 24px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {importStep === 'confirming' && selectedFlashcard && (() => {
          const isOverwriteTarget = registeredFlashcards.has(selectedFlashcard);
          return (
            <div style={{
              marginTop: '24px',
              padding: '24px',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '16px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                「<span style={{ color: '#3b82f6', fontWeight: 700 }}>{selectedFlashcard}</span>」に{isOverwriteTarget ? '上書き' : '保存'}しますか？
              </p>
              {isOverwriteTarget && (
                <p style={{ fontSize: '0.9rem', color: '#3b82f6', fontWeight: 700, marginBottom: '12px', padding: '10px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px' }}>
                  ℹ️ 既にこの単語は登録されているため、内容を上書きします。
                </p>
              )}
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                {item.word}（{item.meaning}）をインポートします
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                  onClick={() => setImportStep('selecting')}
                  style={{
                    padding: '10px 28px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  戻る
                </button>
                <button
                  onClick={handleConfirmSave}
                  style={{
                    padding: '10px 32px',
                    background: 'var(--accent-color)',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Check size={16} /> はい
                </button>
              </div>
            </div>
          );
        })()}

        {importStep === 'saving' && (
          <div style={{
            marginTop: '24px',
            padding: '24px',
            background: 'rgba(59,130,246,0.05)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '16px',
            textAlign: 'center',
          }}>
            <div style={{ width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>保存中...</p>
          </div>
        )}

        {importStep === 'done' && (
          <div style={{
            marginTop: '24px',
            padding: '24px',
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>インポート完了！</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              「{selectedFlashcard}」に保存しました
            </p>
          </div>
        )}

        {importStep === 'error' && (
          <div style={{
            marginTop: '24px',
            padding: '24px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '16px',
            textAlign: 'center',
          }}>
            <p style={{ color: '#ef4444', fontWeight: 600, marginBottom: '12px' }}>{importError}</p>
            <button
              onClick={resetImport}
              style={{
                padding: '8px 24px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--panel-border)',
                borderRadius: '10px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              閉じる
            </button>
          </div>
        )}

        {/* Footer Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '32px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 32px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--panel-border)',
              borderRadius: '12px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <ArrowLeft size={16} /> 一覧に戻る
          </button>
          {importStep === 'idle' && (
            <button
              onClick={handleStartImport}
              style={{
                padding: '12px 32px',
                background: 'var(--accent-color)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Download size={16} /> インポート
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const DatabaseScreen: React.FC = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState<WordEntry[]>([]);
  const [filteredWords, setFilteredWords] = useState<WordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWordbook, setSelectedWordbook] = useState<string>(''); // '' means all wordbooks
  const [selectedWord, setSelectedWord] = useState<WordEntry | null>(null);

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    try {
      setLoading(true);
      const currentEmail = localStorage.getItem('email') || '';
      const result = await getAllDatabaseWords(currentEmail);

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

  const handleToggleLike = async (wordObj: WordEntry) => {
    const currentEmail = localStorage.getItem('email');
    if (!currentEmail || !wordObj.username) return;

    // Optimistic update
    const isCurrentlyLiked = wordObj.isLiked;
    const increment = isCurrentlyLiked ? -1 : 1;

    const updateState = (prev: WordEntry[]) => prev.map(w =>
      (w.word === wordObj.word && w.username === wordObj.username)
        ? { ...w, isLiked: !isCurrentlyLiked, likes: (w.likes || 0) + increment }
        : w
    );

    setWords(updateState);
    setFilteredWords(updateState);

    try {
      const result = await toggleLike(currentEmail, wordObj.word, wordObj.username);
      if (!result.success) {
        // 失敗した場合は再読み込みして状態を戻す
        loadWords();
      }
    } catch (err) {
      console.error(err);
      loadWords();
    }
  };

  // Extract unique wordbooks for the dropdown
  const availableWordbooks = Array.from(new Set(words.map(w => w.wordbook).filter(Boolean))) as string[];

  useEffect(() => {
    let filtered = words;

    if (selectedWordbook) {
      filtered = filtered.filter(item => item.wordbook === selectedWordbook);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item => item.word.toLowerCase().includes(q) ||
          item.meaning.toLowerCase().includes(q) ||
          (item.username && item.username.toLowerCase().includes(q))
      );
    }
    
    setFilteredWords(filtered);
  }, [searchQuery, selectedWordbook, words]);

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
      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="単語を検索"
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

      {/* Wordbook Filter Dropdown */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
          <BookOpen size={18} />
        </div>
        <select
          value={selectedWordbook}
          onChange={e => setSelectedWordbook(e.target.value)}
          className="custom-input"
          style={{
            width: '100%',
            padding: '12px 40px 12px 42px', /* extra left padding for icon, right for arrow */
            fontSize: '1rem',
            borderRadius: '12px',
            appearance: 'none', /* hide default arrow */
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--panel-border)',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
        >
          <option value="" style={{ color: '#000' }}>すべて表示（単語帳を選択しない）</option>
          {availableWordbooks.sort().map(wb => (
            <option key={wb} value={wb} style={{ color: '#000' }}>
              {wb}
            </option>
          ))}
        </select>
        <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
          <ChevronDown size={18} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
        <span>ユニーク単語数: {(() => { const s = new Set(filteredWords.map(w => w.word.toLowerCase())); return s.size; })()} 語</span>
        <span>登録数: {filteredWords.length} 件</span>
      </div>

      {/* Words List - Grouped by word */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredWords.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
            見つかりませんでした。
          </div>
        ) : (
          <GroupedWordList
            words={filteredWords}
            onSelectWord={setSelectedWord}
            onToggleLike={handleToggleLike}
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedWord && (
        <WordDetailModal
          item={selectedWord}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Grouped Word List Component
// ═══════════════════════════════════════════════════════════════
interface WordGroup {
  word: string;
  entries: WordEntry[];
}

const GroupedWordList: React.FC<{
  words: WordEntry[];
  onSelectWord: (item: WordEntry) => void;
  onToggleLike: (item: WordEntry) => void;
}> = ({ words, onSelectWord, onToggleLike }) => {
  const [expandedWords, setExpandedWords] = useState<Set<string>>(new Set());

  // Group words by word name (case-insensitive)
  const groups: WordGroup[] = React.useMemo(() => {
    const groupMap = new Map<string, WordEntry[]>();
    words.forEach(w => {
      const key = w.word.toLowerCase();
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(w);
    });
    return Array.from(groupMap.entries()).map(([, entries]) => ({
      word: entries[0].word,
      entries,
    }));
  }, [words]);

  const toggleExpand = (word: string) => {
    setExpandedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(word.toLowerCase())) {
        newSet.delete(word.toLowerCase());
      } else {
        newSet.add(word.toLowerCase());
      }
      return newSet;
    });
  };

  let counter = 0;

  return (
    <>
      {groups.map((group) => {
        const isMultiple = group.entries.length > 1;
        const isExpanded = expandedWords.has(group.word.toLowerCase());
        const topEntry = group.entries[0];
        counter++;
        const currentNumber = counter;

        if (!isMultiple) {
          return (
            <WordRow
              key={`${topEntry.word}_${topEntry.username}`}
              item={topEntry}
              index={currentNumber}
              onClick={() => onSelectWord(topEntry)}
              onToggleLike={onToggleLike}
            />
          );
        }

        return (
          <div key={`group_${group.word}`}>
            {/* Group header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                background: isExpanded ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isExpanded ? 'rgba(59,130,246,0.2)' : 'var(--panel-border)'}`,
                borderRadius: isExpanded ? '12px 12px 0 0' : '12px',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onClick={() => toggleExpand(group.word)}
              onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = isExpanded ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.03)'; }}
            >
              <div style={{ width: '40px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                {currentNumber}
              </div>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: '150px' }}>
                    {group.word}
                  </div>
                  <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                    {topEntry.meaning}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#3b82f6',
                    background: 'rgba(59,130,246,0.1)',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                  }}>
                    <Users size={12} />
                    {group.entries.length}人
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={18} color="var(--text-secondary)" />
                  ) : (
                    <ChevronDown size={18} color="var(--text-secondary)" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded entries */}
            {isExpanded && (
              <div style={{
                border: '1px solid rgba(59,130,246,0.2)',
                borderTop: 'none',
                borderRadius: '0 0 12px 12px',
                overflow: 'hidden',
              }}>
                {group.entries.map((entry, idx) => (
                  <div
                    key={`${entry.word}_${entry.username}_${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '12px 20px 12px 56px',
                      background: 'rgba(255,255,255,0.02)',
                      borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onClick={() => onSelectWord(entry)}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  >
                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <span style={{ opacity: 0.7 }}>👤</span> {entry.username}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {entry.meaning}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleLike(entry); }}
                        style={{
                          background: entry.isLiked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${entry.isLiked ? 'rgba(239, 68, 68, 0.3)' : 'var(--panel-border)'}`,
                          borderRadius: '6px',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          color: entry.isLiked ? '#ef4444' : 'var(--text-secondary)',
                        }}
                        onMouseEnter={e => { if (!entry.isLiked) { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.style.color = '#ef4444'; } }}
                        onMouseLeave={e => { if (!entry.isLiked) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                      >
                        <Heart size={14} fill={entry.isLiked ? '#ef4444' : 'none'} color="currentColor" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{entry.likes || 0}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// Single Word Row Component
// ═══════════════════════════════════════════════════════════════
const WordRow: React.FC<{
  item: WordEntry;
  index: number;
  onClick: () => void;
  onToggleLike: (item: WordEntry) => void;
}> = ({ item, index, onClick, onToggleLike }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '16px 20px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--panel-border)',
      borderRadius: '12px',
      transition: 'all 0.2s',
      cursor: 'pointer',
    }}
    onClick={onClick}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
  >
    <div style={{ width: '40px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
      {index}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <span style={{ opacity: 0.7 }}></span> {item.username}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleLike(item); }}
            style={{
              background: item.isLiked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${item.isLiked ? 'rgba(239, 68, 68, 0.3)' : 'var(--panel-border)'}`,
              borderRadius: '6px',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: item.isLiked ? '#ef4444' : 'var(--text-secondary)'
            }}
            onMouseEnter={e => {
              if (!item.isLiked) {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                e.currentTarget.style.color = '#ef4444';
              }
            }}
            onMouseLeave={e => {
              if (!item.isLiked) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <Heart
              size={14}
              fill={item.isLiked ? '#ef4444' : 'none'}
              color="currentColor"
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.likes || 0}</span>
          </button>
        </div>
      )}
    </div>
  </div>
);
