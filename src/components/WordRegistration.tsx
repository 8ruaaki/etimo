import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, BookOpen, Lightbulb, Sparkles, CheckCircle, ArrowRight, ArrowDown, Plus, RefreshCcw } from 'lucide-react';
import { getKnownEtymologies, addWordToFlashcard } from '../api/flashcard';
import { checkEtymologyMatch, type EtymologyPart } from '../api/wordRegistration';

type Step = 'input' | 'judging' | 'screenA' | 'screenB' | 'screenC' | 'screenD';

export const WordRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { title } = useParams<{ title: string }>();

  const [step, setStep] = useState<Step>('input');
  const [word, setWord] = useState('');
  const [freeText, setFreeText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [etymologyInfo, setEtymologyInfo] = useState<string>('');
  const [targetWordMeaning, setTargetWordMeaning] = useState<string>('');
  const [etymologyParts, setEtymologyParts] = useState<EtymologyPart[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  // ── Step: 単語入力 ──────────────────────────────────────────
  const handleJudge = async () => {
    const trimmed = word.trim();
    if (!trimmed) return;
    setError(null);
    setStep('judging');

    try {
      const email = localStorage.getItem('email');
      if (!email) throw new Error('ログイン情報が見つかりません。');

      // 1. 語源リストを取得
      const etymResult = await getKnownEtymologies(email);
      const etymologyList: string[] = etymResult.knownEtymologies ?? [];

      // 2. Gemini で語源マッチを判定
      const matchResult = await checkEtymologyMatch(trimmed, etymologyList);

      if (matchResult.matched) {
        setEtymologyInfo(matchResult.explanation ?? '');
        setTargetWordMeaning(matchResult.targetWordMeaning ?? '');
        setEtymologyParts(matchResult.parts ?? []);
        setStep('screenA');
      } else {
        setStep('screenB');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? '判定中にエラーが発生しました。');
      setStep('input');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJudge();
  };

  const backToInput = () => {
    setStep('input');
    setFreeText('');
    setError(null);
  };

  const handleSaveToSheet = async (rowData: string[]) => {
    try {
      const email = localStorage.getItem('email');
      if (!email) throw new Error('ログイン情報がありません。');
      if (!title) throw new Error('単語帳のタイトルが不明です。');

      setIsSaving(true);
      const result = await addWordToFlashcard(email, title, rowData);
      if (result && !result.success) {
        throw new Error(result.error || 'サーバーでエラーが発生しました。');
      }
      alert('カードを保存しました！');
      navigate(`/flashcards/${encodeURIComponent(title)}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message ?? '保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────── レンダリング ───────────────────────────
  return (
    <div
      className="glass-panel"
      style={{ padding: '40px', maxWidth: '680px', width: '100%', minHeight: '420px', display: 'flex', flexDirection: 'column' }}
    >
      {/* ───── ヘッダー ───── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <button
          onClick={() => navigate(`/flashcards/${encodeURIComponent(title || '')}`)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--panel-border)',
            borderRadius: '10px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-primary)',
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>単語帳</p>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{title ?? '単語帳'}</h2>
        </div>
      </div>

      {/* ───── ステップインジケーター ───── */}
      <StepIndicator step={step} />

      {/* ───── コンテンツ ───── */}
      <div style={{ flex: 1, marginTop: '28px' }}>
        {step === 'input' && (
          <InputStep
            word={word}
            setWord={setWord}
            onJudge={handleJudge}
            onKeyDown={handleKeyDown}
            error={error}
          />
        )}
        {step === 'judging' && <JudgingStep />}
        {step === 'screenA' && (
          <ScreenA
            word={word}
            targetWordMeaning={targetWordMeaning}
            etymologyInfo={etymologyInfo}
            etymologyParts={etymologyParts}
            onBack={backToInput}
            onSave={handleSaveToSheet}
            isSaving={isSaving}
            flashcardTitle={title ?? ''}
          />
        )}
        {step === 'screenB' && (
          <ScreenB
            word={word}
            freeText={freeText}
            setFreeText={setFreeText}
            onSimilarWord={() => setStep('screenC')}
            onOther={() => setStep('screenD')}
            onBack={backToInput}
          />
        )}
        {step === 'screenC' && (
          <ScreenC word={word} freeText={freeText} onBack={() => setStep('screenB')} flashcardTitle={title ?? ''} />
        )}
        {step === 'screenD' && (
          <ScreenD word={word} freeText={freeText} onBack={() => setStep('screenB')} flashcardTitle={title ?? ''} />
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Step Indicator
// ══════════════════════════════════════════════════════════════
const stepLabels: { id: Step; label: string }[] = [
  { id: 'input', label: '入力' },
  { id: 'screenA', label: '語源' },
  { id: 'screenB', label: '連想' },
  { id: 'screenC', label: '類語' },
  { id: 'screenD', label: 'メモ' },
];

const StepIndicator: React.FC<{ step: Step }> = ({ step }) => {
  const active = step === 'judging' ? 'input' : step;
  const activeIdx = stepLabels.findIndex(s => s.id === active);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
      {stepLabels.map((s, i) => {
        const isDone = i < activeIdx;
        const isCurrent = s.id === active;
        return (
          <React.Fragment key={s.id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isCurrent
                    ? 'var(--accent-color)'
                    : isDone
                    ? 'rgba(59,130,246,0.4)'
                    : 'rgba(255,255,255,0.08)',
                  border: isCurrent ? '2px solid #60a5fa' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  color: isCurrent || isDone ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {isDone ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span style={{ fontSize: '0.7rem', color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {s.label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  background: isDone ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)',
                  marginBottom: '18px',
                  transition: 'background 0.3s ease',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 単語入力画面
// ══════════════════════════════════════════════════════════════
const InputStep: React.FC<{
  word: string;
  setWord: (v: string) => void;
  onJudge: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  error: string | null;
}> = ({ word, setWord, onJudge, onKeyDown, error }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>暗記したい英単語を入力</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        AIがあなたの語源リストと照合し、最適な暗記方法を提案します。
      </p>
    </div>

    <div style={{ position: 'relative' }}>
      <input
        id="word-input"
        type="text"
        className="custom-input"
        value={word}
        onChange={e => setWord(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="例: company, precede, transport ..."
        style={{ padding: '16px 52px 16px 20px', fontSize: '1.2rem', letterSpacing: '0.05em' }}
        autoFocus
      />
      <div
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-secondary)',
        }}
      >
        <Search size={20} />
      </div>
    </div>

    {error && (
      <p style={{ color: 'var(--error-color)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
        ⚠️ {error}
      </p>
    )}

    <button
      id="judge-btn"
      className="btn-primary"
      onClick={onJudge}
      disabled={!word.trim()}
      style={{ opacity: word.trim() ? 1 : 0.45 }}
    >
      <Sparkles size={18} />
      AI判定を開始
    </button>
  </div>
);

// ══════════════════════════════════════════════════════════════
// 判定中
// ══════════════════════════════════════════════════════════════
const JudgingStep: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px 0' }}>
    <div
      style={{
        width: '64px',
        height: '64px',
        border: '3px solid rgba(59,130,246,0.3)',
        borderTop: '3px solid var(--accent-color)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
    <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>語源を分析中...</p>
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>あなたの語源リストと照合しています</p>
  </div>
);

// ══════════════════════════════════════════════════════════════
// 画面 A: 語源で暗記
// ══════════════════════════════════════════════════════════════
const ScreenA: React.FC<{
  word: string;
  targetWordMeaning: string;
  etymologyInfo: string;
  etymologyParts: EtymologyPart[];
  onBack: () => void;
  onSave: (rowData: string[]) => void;
  isSaving: boolean;
  flashcardTitle: string;
}> = ({ word, targetWordMeaning, etymologyInfo, etymologyParts, onBack, onSave, isSaving, flashcardTitle: _flashcardTitle }) => {
  const [relatedWordIndices, setRelatedWordIndices] = useState<Record<number, number>>({});

  const handleRefreshRelatedWord = (partIndex: number, maxWords: number) => {
    setRelatedWordIndices((prev) => {
      const currentIndex = prev[partIndex] || 0;
      return {
        ...prev,
        [partIndex]: (currentIndex + 1) % maxWords,
      };
    });
  };

  const handleSaveClick = () => {
    const rowData: string[] = [word, targetWordMeaning];
    etymologyParts.forEach((part, idx) => {
      const selectedRelatedWord = part.relatedWords?.[relatedWordIndices[idx] || 0];
      rowData.push(part.part);
      rowData.push(selectedRelatedWord ? `${selectedRelatedWord.word} (${selectedRelatedWord.meaning})` : '');
    });
    onSave(rowData);
  };

  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    <div
      style={{
        padding: '6px 14px',
        background: 'rgba(16,185,129,0.15)',
        border: '1px solid rgba(16,185,129,0.4)',
        borderRadius: '999px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        width: 'fit-content',
        color: '#10b981',
        fontSize: '0.85rem',
        fontWeight: 600,
        margin: '0 auto',
      }}
    >
      ✅ 語源で覚えやすい単語です
    </div>

    {/* 対象単語 */}
    <div style={{ textAlign: 'center', margin: '16px 0' }}>
      <h3 style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '8px' }}>
        {word}
      </h3>
      {targetWordMeaning && (
        <p style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {targetWordMeaning}
        </p>
      )}
    </div>

    {/* 語源の分解と意味 */}
    {etymologyParts && etymologyParts.length > 0 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '24px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '8px' }}>
          語源で分解
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {etymologyParts.map((part, idx) => (
            <React.Fragment key={idx}>
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
                  width: '100%'
                }}>
                  {part.part}
                </div>
                
                {/* 下向き矢印 */}
                <div style={{ color: 'var(--text-secondary)' }}>
                  <ArrowDown size={20} />
                </div>
                
                {/* 意味 */}
                <div style={{ fontSize: '1rem', fontWeight: 600, textAlign: 'center' }}>
                  {part.meaning}
                </div>

                {/* 関連語 */}
                <div style={{ 
                  marginTop: '8px',
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  width: '100%'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>同じ語源の単語</p>
                    {part.relatedWords && part.relatedWords.length > 1 && (
                      <button
                        onClick={() => handleRefreshRelatedWord(idx, part.relatedWords.length)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          padding: '2px 4px',
                          borderRadius: '4px',
                        }}
                      >
                        <RefreshCcw size={12} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#60a5fa' }}>
                      {part.relatedWords && part.relatedWords[relatedWordIndices[idx] || 0]?.word}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {part.relatedWords && part.relatedWords[relatedWordIndices[idx] || 0]?.meaning}
                    </span>
                  </div>
                </div>
              </div>
              {idx < etymologyParts.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', height: '48px' }}>
                  <Plus size={24} color="var(--text-secondary)" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    )}

    {(!etymologyParts || etymologyParts.length === 0) && etymologyInfo && (
      <div
        style={{
          padding: '28px',
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '16px',
        }}
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>語源の解説</p>
        <p style={{ fontSize: '1rem', lineHeight: 1.7 }}>{etymologyInfo}</p>
      </div>
    )}

    {/* 仮ページである旨 */}
    <div
      style={{
        padding: '16px 20px',
        background: 'rgba(234,179,8,0.1)',
        border: '1px dashed rgba(234,179,8,0.4)',
        borderRadius: '12px',
        color: '#eab308',
        fontSize: '0.85rem',
        display: 'none', // Hide the "under construction" dev note as we are implementing it
        alignItems: 'center',
        gap: '8px',
      }}
    >
      🚧 このページは現在開発中です（画面A：語源暗記）
    </div>

    <div style={{ display: 'flex', gap: '12px' }}>
      <button
        onClick={onBack}
        style={{
          flex: 1,
          padding: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--panel-border)',
          borderRadius: '10px',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
      >
        <ArrowLeft size={16} /> 別の単語を入力
      </button>
      <button
        id="screen-a-save-btn"
        className="btn-primary"
        style={{ flex: 1 }}
        onClick={handleSaveClick}
        disabled={isSaving}
      >
        <BookOpen size={16} /> {isSaving ? '保存中...' : 'カードを保存'}
      </button>
    </div>
  </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 画面 B: 自由連想入力
// ══════════════════════════════════════════════════════════════
const ScreenB: React.FC<{
  word: string;
  freeText: string;
  setFreeText: (v: string) => void;
  onSimilarWord: () => void;
  onOther: () => void;
  onBack: () => void;
}> = ({ word, freeText, setFreeText, onSimilarWord, onOther, onBack }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    <div
      style={{
        padding: '6px 14px',
        background: 'rgba(99,102,241,0.15)',
        border: '1px solid rgba(99,102,241,0.4)',
        borderRadius: '999px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        width: 'fit-content',
        color: '#818cf8',
        fontSize: '0.85rem',
        fontWeight: 600,
      }}
    >
      <Lightbulb size={14} /> 自由連想モード
    </div>

    {/* 単語表示 */}
    <div
      style={{
        padding: '24px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--panel-border)',
        borderRadius: '16px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>この単語を見て思ったことを書いてください</p>
      <h3 style={{ fontSize: '2.4rem', fontWeight: 700, letterSpacing: '0.08em' }}>{word}</h3>
    </div>

    {/* 自由入力 */}
    <div>
      <label className="label-text" htmlFor="free-text-input">思ったこと・連想したこと</label>
      <textarea
        id="free-text-input"
        className="custom-input"
        value={freeText}
        onChange={e => setFreeText(e.target.value)}
        placeholder="似た単語、イメージ、語呂合わせ、エピソードなど何でもOK..."
        rows={4}
        style={{ resize: 'vertical', lineHeight: 1.7 }}
      />
    </div>

    {/* 分岐ボタン */}
    <div>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '14px', textAlign: 'center' }}>
        上の入力はどちらに当てはまりますか？
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <ChoiceCard
          id="btn-similar-word"
          icon="🔤"
          title="似た英単語"
          desc="別の英単語を思い浮かべた"
          color="#6366f1"
          onClick={onSimilarWord}
          disabled={!freeText.trim()}
        />
        <ChoiceCard
          id="btn-other"
          icon="💭"
          title="それ以外"
          desc="日本語・イメージ・語呂合わせなど"
          color="#0ea5e9"
          onClick={onOther}
          disabled={!freeText.trim()}
        />
      </div>
      {!freeText.trim() && (
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
          ※ 上の欄に入力してから選択してください
        </p>
      )}
    </div>

    <button
      onClick={onBack}
      style={{
        padding: '10px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
      }}
    >
      <ArrowLeft size={14} /> 別の単語に戻る
    </button>
  </div>
);

const ChoiceCard: React.FC<{
  id: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
  onClick: () => void;
  disabled: boolean;
}> = ({ id, icon, title, desc, color, onClick, disabled }) => (
  <button
    id={id}
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '20px 16px',
      background: disabled ? 'rgba(255,255,255,0.03)' : `rgba(${hexToRgb(color)}, 0.08)`,
      border: `2px solid ${disabled ? 'rgba(255,255,255,0.08)' : `${color}55`}`,
      borderRadius: '14px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      textAlign: 'center',
      transition: 'all 0.25s ease',
      opacity: disabled ? 0.5 : 1,
      color: 'var(--text-primary)',
    }}
    onMouseEnter={e => {
      if (!disabled) {
        (e.currentTarget as HTMLButtonElement).style.background = `rgba(${hexToRgb(color)}, 0.16)`;
        (e.currentTarget as HTMLButtonElement).style.borderColor = color;
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
      }
    }}
    onMouseLeave={e => {
      if (!disabled) {
        (e.currentTarget as HTMLButtonElement).style.background = `rgba(${hexToRgb(color)}, 0.08)`;
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}55`;
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
      }
    }}
  >
    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{icon}</div>
    <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{title}</p>
    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{desc}</p>
    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color, fontSize: '0.8rem', fontWeight: 600 }}>
      選択 <ArrowRight size={13} />
    </div>
  </button>
);

// ══════════════════════════════════════════════════════════════
// 画面 C（仮）: 似た英単語から暗記
// ══════════════════════════════════════════════════════════════
const ScreenC: React.FC<{ word: string; freeText: string; onBack: () => void; flashcardTitle: string }> = ({
  word,
  freeText,
  onBack,
  flashcardTitle: _flashcardTitleC,
}) => (
  <PlaceholderScreen
    badge="🔤 画面C：類語から暗記"
    badgeColor="#6366f1"
    label="入力した類語"
    word={word}
    freeText={freeText}
    description={`「${freeText}」という類語のイメージで「${word}」を覚えます。`}
    devNote="このページは現在開発中です（画面C：類語暗記）"
    onBack={onBack}
    onSave={() => alert('（仮）カードが保存されました！')}
    saveId="screen-c-save-btn"
    backLabel="連想入力に戻る"
  />
);

// ══════════════════════════════════════════════════════════════
// 画面 D（仮）: 自由メモで暗記
// ══════════════════════════════════════════════════════════════
const ScreenD: React.FC<{ word: string; freeText: string; onBack: () => void; flashcardTitle: string }> = ({
  word,
  freeText,
  onBack,
  flashcardTitle: _flashcardTitleD,
}) => (
  <PlaceholderScreen
    badge="💭 画面D：自由メモで暗記"
    badgeColor="#0ea5e9"
    label="入力したメモ"
    word={word}
    freeText={freeText}
    description={`「${freeText}」のイメージで「${word}」を覚えます。`}
    devNote="このページは現在開発中です（画面D：自由メモ暗記）"
    onBack={onBack}
    onSave={() => alert('（仮）カードが保存されました！')}
    saveId="screen-d-save-btn"
    backLabel="連想入力に戻る"
  />
);

// ── 仮ページ共通テンプレート ───────────────────────────────────
const PlaceholderScreen: React.FC<{
  badge: string;
  badgeColor: string;
  label: string;
  word: string;
  freeText: string;
  description: string;
  devNote: string;
  onBack: () => void;
  onSave: () => void;
  saveId: string;
  backLabel: string;
}> = ({ badge, badgeColor, label, word, freeText, description, devNote, onBack, onSave, saveId, backLabel }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    <div
      style={{
        padding: '6px 14px',
        background: `rgba(${hexToRgb(badgeColor)}, 0.15)`,
        border: `1px solid rgba(${hexToRgb(badgeColor)}, 0.4)`,
        borderRadius: '999px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        width: 'fit-content',
        color: badgeColor,
        fontSize: '0.85rem',
        fontWeight: 600,
      }}
    >
      {badge}
    </div>

    <div
      style={{
        padding: '24px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--panel-border)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>暗記単語</p>
        <p style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.05em' }}>{word}</p>
      </div>
      <div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</p>
        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>{freeText}</p>
      </div>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{description}</p>
    </div>

    <div
      style={{
        padding: '16px 20px',
        background: 'rgba(234,179,8,0.1)',
        border: '1px dashed rgba(234,179,8,0.4)',
        borderRadius: '12px',
        color: '#eab308',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      🚧 {devNote}
    </div>

    <div style={{ display: 'flex', gap: '12px' }}>
      <button
        onClick={onBack}
        style={{
          flex: 1,
          padding: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--panel-border)',
          borderRadius: '10px',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
      >
        <ArrowLeft size={16} /> {backLabel}
      </button>
      <button id={saveId} className="btn-primary" style={{ flex: 1 }} onClick={onSave}>
        <BookOpen size={16} /> カードを保存（仮）
      </button>
    </div>
  </div>
);

// ── ユーティリティ: hex → "r,g,b" ─────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
