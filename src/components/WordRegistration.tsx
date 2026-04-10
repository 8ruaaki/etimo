import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, BookOpen, Lightbulb, Sparkles, ArrowRight, ArrowDown, Plus, RefreshCcw, Save } from 'lucide-react';
import { getTestSheetEtymologies, addWordToFlashcard } from '../api/flashcard';
import { checkEtymologyMatch, generateFakeEtymology, generateMnemonicStory, type EtymologyPart } from '../api/wordRegistration';

type Step = 'input' | 'judging' | 'selection' | 'screenA' | 'screenB' | 'screenC' | 'screenD' | 'screenE';

export const WordRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { title } = useParams<{ title: string }>();

  const [step, setStep] = useState<Step>('input');
  const [word, setWord] = useState('');
  const [freeText, setFreeText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [targetWordMeaning, setTargetWordMeaning] = useState<string>('');
  const [integratedMeaning, setIntegratedMeaning] = useState<string>('');
  const [etymologyParts, setEtymologyParts] = useState<EtymologyPart[]>([]);
  const [cameFromScreenA, setCameFromScreenA] = useState(false);

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

      // 1. testシートから語源リストを取得
      const etymResult = await getTestSheetEtymologies();
      const etymologyList: string[] = etymResult.etymologies ?? [];

      // 2. Gemini で語源マッチを判定
      const matchResult = await checkEtymologyMatch(trimmed, etymologyList);

      if (matchResult.isRealWord === false) {
        const suggestion = matchResult.suggestedWord ? `もしかして：「${matchResult.suggestedWord}」ですか？` : '';
        setError(`スペルが間違っている可能性があります。${suggestion}`);
        setStep('input');
        return;
      }

      // 語源マッチの有無に関わらず、意味と語源情報はセットする
      setTargetWordMeaning(matchResult.targetWordMeaning ?? '');
      setEtymologyParts(matchResult.parts ?? []);
      setIntegratedMeaning(matchResult.integratedMeaning ?? '');
      setCameFromScreenA(false);

      if (matchResult.matched) {
        setStep('screenA');
      } else {
        setStep('selection');
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
    setCameFromScreenA(false);
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
          <ArrowLeft size={18} color="currentColor" />
        </button>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>単語帳</p>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{title ?? '単語帳'}</h2>
        </div>
      </div>

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
        {step === 'selection' && (
          <SelectionStep
            word={word}
            targetWordMeaning={targetWordMeaning}
            cameFromScreenA={cameFromScreenA}
            onSelectFakeEtymology={() => setStep('screenB')}
            onSelectStory={() => setStep('screenD')}
            onBack={backToInput}
            onBackToScreenA={() => {
              setCameFromScreenA(false);
              setStep('screenA');
            }}
          />
        )}
        {step === 'screenA' && (
          <ScreenA
            word={word}
            targetWordMeaning={targetWordMeaning}
            integratedMeaning={integratedMeaning}
            etymologyParts={etymologyParts}
            onBack={backToInput}
            onSave={handleSaveToSheet}
            isSaving={isSaving}
            flashcardTitle={title ?? ''}
            onGoToSelection={() => {
              setCameFromScreenA(true);
              setStep('selection');
            }}
          />
        )}
        {step === 'screenB' && (
          <ScreenB
            word={word}
            targetWordMeaning={targetWordMeaning}
            freeText={freeText}
            setFreeText={setFreeText}
            onSave={handleSaveToSheet}
            isSaving={isSaving}
            onBack={() => setStep('selection')}
          />
        )}
        {step === 'screenC' && (
          <ScreenC word={word} meaning={targetWordMeaning} freeText={freeText} onBack={() => setStep('screenB')} onSave={handleSaveToSheet} isSaving={isSaving} flashcardTitle={title ?? ''} />
        )}
        {step === 'screenD' && (
          <ScreenD word={word} meaning={targetWordMeaning} freeText={freeText} onBack={() => setStep('selection')} onSave={handleSaveToSheet} isSaving={isSaving} flashcardTitle={title ?? ''} />
        )}
        {step === 'screenE' && (
          <ScreenE word={word} meaning={targetWordMeaning} freeText={freeText} onBack={() => setStep('screenB')} onSave={handleSaveToSheet} isSaving={isSaving} flashcardTitle={title ?? ''} />
        )}
      </div>
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
}> = ({ word, setWord, onJudge, onKeyDown, error }) => {
  const [isComposing, setIsComposing] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>暗記したい英単語を入力</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          AIが最適な暗記方法を提案します。
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          id="word-input"
          type="text"
          inputMode="url"
          className="custom-input"
          value={word}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(e) => {
            setIsComposing(false);
            const normalized = e.currentTarget.value.replace(/[Ａ-Ｚａ-ｚ]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
            setWord(normalized.replace(/[^a-zA-Z]/g, ''));
          }}
          onChange={e => {
            if (isComposing) {
              setWord(e.target.value);
            } else {
              const normalized = e.target.value.replace(/[Ａ-Ｚａ-ｚ]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
              setWord(normalized.replace(/[^a-zA-Z]/g, ''));
            }
          }}
          onKeyDown={onKeyDown}
          pattern="[a-zA-Z]*"
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
};

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
// 選択画面 (語源リストに合致しなかった場合)
// ══════════════════════════════════════════════════════════════
const SelectionStep: React.FC<{
  word: string;
  targetWordMeaning: string;
  cameFromScreenA: boolean;
  onSelectFakeEtymology: () => void;
  onSelectStory: () => void;
  onBack: () => void;
  onBackToScreenA?: () => void;
}> = ({ word, targetWordMeaning, cameFromScreenA, onSelectFakeEtymology, onSelectStory, onBack, onBackToScreenA }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    {!cameFromScreenA && (
      <div
        style={{
          padding: '6px 14px',
          background: 'rgba(234,179,8,0.15)',
          border: '1px solid rgba(234,179,8,0.4)',
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          width: 'fit-content',
          color: '#eab308',
          fontSize: '0.85rem',
          fontWeight: 600,
          margin: '0 auto',
        }}
      >
        💡 語源リストに一致しませんでした
      </div>
    )}

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

    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '24px' }}>
      <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', margin: '0 0 8px 0' }}>
        暗記方法を選択してください
      </h4>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={onSelectFakeEtymology}
          style={{
            flex: 1,
            padding: '24px',
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
        >
          <div style={{ fontSize: '2rem' }}>🧩</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#818cf8' }}>偽語源で覚える</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>単語を分解して独自の語源を作成</div>
        </button>

        <button
          onClick={onSelectStory}
          style={{
            flex: 1,
            padding: '24px',
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
        >
          <div style={{ fontSize: '2rem' }}>📖</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3b82f6' }}>イメージで覚える</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>関連するイメージと繋げる</div>
        </button>
      </div>
    </div>

    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px', gap: '12px' }}>
      {cameFromScreenA && onBackToScreenA && (
        <button
          onClick={onBackToScreenA}
          style={{
            padding: '12px 24px',
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '10px',
            cursor: 'pointer',
            color: '#3b82f6',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
        >
          <ArrowLeft size={16} /> 画面A（語源）に戻る
        </button>
      )}
      <button
        onClick={onBack}
        style={{
          padding: '12px 24px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--panel-border)',
          borderRadius: '10px',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}
      >
        <Search size={16} /> 別の単語を入力する
      </button>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════
// 画面 A: 語源で暗記
// ══════════════════════════════════════════════════════════════
const ScreenA: React.FC<{
  word: string;
  targetWordMeaning: string;
  integratedMeaning: string;
  etymologyParts: EtymologyPart[];
  onBack: () => void;
  onSave: (rowData: string[]) => void;
  isSaving: boolean;
  flashcardTitle: string;
  onGoToSelection: () => void;
}> = ({ word, targetWordMeaning, integratedMeaning, etymologyParts, onBack, onSave, isSaving, flashcardTitle: _flashcardTitle, onGoToSelection }) => {
  const [selectedPartIndex, setSelectedPartIndex] = useState<number | null>(null);
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    if (integratedMeaning) {
      const parsedSteps = integratedMeaning.split(/→|->|＝/).map(s => s.trim()).filter(Boolean);
      // AIは最後に意味を付与してくることが多いため、最後のステップが対象単語の意味に近い場合は編集用ステップから除外
      if (parsedSteps.length > 0) {
        parsedSteps.pop(); // 最後の要素は削除し、固定で表示する
      }
      setSteps(parsedSteps);
    } else {
      setSteps([]);
    }
  }, [integratedMeaning]);

  const openModal = (partIndex: number) => {
    setSelectedPartIndex(partIndex);
  };

  const closeModal = () => {
    setSelectedPartIndex(null);
  };

  const handleSaveClick = () => {
    const rowData: string[] = ['0', word, targetWordMeaning];

    // D〜K列 (インデックス3〜10) に語源パーツと意味を入れる（最大4パーツ）
    const partsToSave = etymologyParts.slice(0, 4);
    partsToSave.forEach((part) => {
      rowData.push(part.part);
      rowData.push(part.meaning);
    });

    // K列まで空文字で埋める (1 + 1 + 1 + 8 = 11)
    while (rowData.length < 11) {
      rowData.push('');
    }

    // L列以降に意味の変化（複数ステップ）を分割して入れる
    const validSteps = steps.filter(s => s.trim());
    validSteps.forEach(step => {
      rowData.push(step.trim());
    });
    rowData.push(targetWordMeaning);

    onSave(rowData);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
              語源で分解
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0, opacity: 0.7 }}>
              💡 語源部分をタップすると関連単語が表示されます
            </p>
          </div>

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
                  {/* パーツ - タップでモーダルを開く */}
                  <div
                    onClick={() => openModal(idx)}
                    style={{
                      background: 'rgba(59,130,246,0.15)',
                      color: '#3b82f6',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '1.4rem',
                      textAlign: 'center',
                      width: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: '2px solid transparent',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(59,130,246,0.25)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(59,130,246,0.15)';
                    }}
                  >
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
                </div>
                {idx < etymologyParts.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', height: '48px' }}>
                    <Plus size={24} color="var(--text-secondary)" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div style={{
            marginTop: '24px',
            padding: '24px',
            background: 'rgba(59,130,246,0.05)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '16px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '20px', fontWeight: 600 }}>パーツの統合イメージ（意味の変化）</p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              {steps.map((step, idx) => (
                <React.Fragment key={idx}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '500px' }}>
                    <input
                      type="text"
                      className="custom-input"
                      value={step}
                      onChange={(e) => {
                        const newSteps = [...steps];
                        newSteps[idx] = e.target.value;
                        setSteps(newSteps);
                      }}
                      placeholder={`意味の変化 ${idx + 1}`}
                      style={{ flex: 1, padding: '12px 24px', textAlign: 'center', fontSize: '1.2rem', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.05em' }}
                    />
                    <button
                      onClick={() => {
                        const newSteps = steps.filter((_, i) => i !== idx);
                        setSteps(newSteps);
                      }}
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', width: '44px', height: '44px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', transition: 'all 0.2s', flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                      title="削除"
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ color: 'rgba(59,130,246,0.5)', padding: '4px 0' }}>
                    <ArrowDown size={28} />
                  </div>
                </React.Fragment>
              ))}

              <button
                onClick={() => setSteps([...steps, ''])}
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px dashed var(--panel-border)', borderRadius: '8px', padding: '12px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', transition: 'all 0.2s', marginTop: '8px' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <Plus size={18} /> 追加する
              </button>

              <div style={{ color: 'rgba(59,130,246,0.5)', padding: '12px 0' }}>
                <ArrowDown size={28} />
              </div>

              {/* 固定の最終意味 */}
              <div style={{ padding: '16px 24px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', borderRadius: '12px', fontSize: '1.4rem', fontWeight: 800, textAlign: 'center', width: '100%', maxWidth: '500px' }}>
                {targetWordMeaning}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 別の方法で暗記するボタン */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
        <button
          onClick={onGoToSelection}
          style={{
            background: 'transparent',
            border: '1px solid var(--accent-color)',
            color: 'var(--accent-color)',
            borderRadius: '999px',
            padding: '8px 24px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59, 130, 246, 0.1)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <Lightbulb size={16} />
          別の方法（偽語源・イメージ）で暗記
        </button>
      </div>

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
          <ArrowLeft size={16} color="currentColor" /> 別の単語を入力
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

      {/* モーダル：関連単語を表示 */}
      {selectedPartIndex !== null && etymologyParts[selectedPartIndex] && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            {/* 閉じるボタン */}
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1.5rem',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>

            {/* 語源パーツ名 */}
            <h3 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#3b82f6',
              textAlign: 'center',
              marginBottom: '8px',
            }}>
              {etymologyParts[selectedPartIndex].part}
            </h3>

            {/* 意味 */}
            <p style={{
              fontSize: '1.1rem',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              意味：{etymologyParts[selectedPartIndex].meaning}
            </p>

            {/* 関連単語リスト */}
            <h4 style={{
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              同じ語源を持つ英単語
            </h4>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {etymologyParts[selectedPartIndex].relatedWords?.map((relatedWord, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {/* 単語名 */}
                  <span style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#60a5fa',
                  }}>
                    {relatedWord.word}
                  </span>

                  {/* 意味 */}
                  <span style={{
                    fontSize: '1rem',
                    color: 'var(--text-primary)',
                  }}>
                    {relatedWord.meaning}
                  </span>

                  {/* 語源分解 */}
                  {relatedWord.breakdown && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      color: '#3b82f6',
                      fontWeight: 600,
                    }}>
                      {relatedWord.breakdown}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 画面 B: 自由連想入力（複数入力欄対応）
// ══════════════════════════════════════════════════════════════
const ScreenB: React.FC<{
  word: string;
  targetWordMeaning: string;
  freeText: string;
  setFreeText: (v: string) => void;
  onSave: (rowData: string[]) => void;
  isSaving: boolean;
  onBack: () => void;
}> = ({ word, targetWordMeaning, freeText: _freeText, setFreeText: _setFreeText, onSave, isSaving, onBack }) => {
  const [aiModalStep, setAiModalStep] = useState<1 | 2>(1);
  const [splitPoints, setSplitPoints] = useState<boolean[]>(new Array(word.length - 1).fill(false));
  const [aiModalPartInputs, setAiModalPartInputs] = useState<string[]>([]);
  const [aiIntermediateSteps, setAiIntermediateSteps] = useState<string[]>(['']);

  // Update text when freeText changes
  useEffect(() => {
    // Removed sync logic so it does not clear out aiModalResult
  }, [_freeText]);

  const getWordParts = () => {
    const parts: string[] = [];
    let currentPart = '';
    for (let i = 0; i < word.length; i++) {
      currentPart += word[i];
      if (i < word.length - 1 && splitPoints[i]) {
        parts.push(currentPart);
        currentPart = '';
      }
    }
    parts.push(currentPart);
    return parts;
  };

  const handleNextStep = () => {
    const parts = getWordParts();
    setAiModalPartInputs(new Array(parts.length).fill(''));
    setAiIntermediateSteps(['']);
    setAiModalStep(2);
  };

  const toggleSplit = (index: number) => {
    setSplitPoints(prev => {
      const newPoints = [...prev];
      newPoints[index] = !newPoints[index];
      return newPoints;
    });
  };

  const handleSaveClick = () => {
    const isAnyFilled = aiModalPartInputs.some(input => input.trim());
    if (!isAnyFilled) {
      alert('少なくとも1つのパーツに意味を入力してください。');
      return;
    }

    const parts = getWordParts();

    // ユーザーが作成した統合イメージを組み立てる
    const partsStr = parts.map((p, i) => `${p}（${aiModalPartInputs[i].trim() || '意味なし'}）`).join(' ＋ ');
    const validIntermediateSteps = aiIntermediateSteps.filter(s => s.trim());
    const chainSteps = [partsStr, ...validIntermediateSteps, targetWordMeaning];

    const rowData: string[] = ['0', word, targetWordMeaning];

    // D〜K列 (インデックス3〜10) に語源パーツと意味を入れる（最大4パーツ）
    const partsToSave = parts.map((p, i) => ({ part: p, meaning: aiModalPartInputs[i].trim() || '（意味なし）' })).slice(0, 4);
    partsToSave.forEach(p => {
      rowData.push(p.part);
      rowData.push(p.meaning);
    });

    // K列まで空文字で埋める (1 + 1 + 1 + 8 = 11)
    while (rowData.length < 11) {
      rowData.push('');
    }

    // L列以降に意味の変化を分割して入れる
    chainSteps.forEach(step => {
      rowData.push(step);
    });

    onSave(rowData);
  };

  return (
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
        <Sparkles size={14} /> 偽語源モード
      </div>

      {/* 単語表示 */}
      <div
        style={{
          padding: '24px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--panel-border)',
          borderRadius: '16px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <h3 style={{ fontSize: '2.4rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>{word}</h3>
        {targetWordMeaning && (
          <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {targetWordMeaning}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {aiModalStep === 1 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: '8px 0 16px 0' }}>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>単語を語源パーツに分解してください</p>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '3.5rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                {word.split('').map((char, index) => (
                  <React.Fragment key={index}>
                    <span>{char}</span>
                    {index < word.length - 1 && (
                      <div
                        onClick={() => toggleSplit(index)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          cursor: 'pointer',
                          padding: '0 2px',
                          height: '100%',
                          position: 'relative'
                        }}
                        title="ここで区切る"
                      >
                        <div style={{
                          position: 'absolute',
                          top: '-16px',
                          color: 'var(--accent-color)',
                          fontSize: '1.2rem',
                          opacity: splitPoints[index] ? 1 : 0.3,
                          transition: 'opacity 0.2s',
                        }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = splitPoints[index] ? '1' : '0.3'}
                        >
                          ▼
                        </div>
                        <span style={{
                          color: splitPoints[index] ? 'var(--accent-color)' : 'transparent',
                          transition: 'color 0.2s',
                          fontSize: '2.5rem',
                          fontWeight: 300,
                          margin: '0 4px'
                        }}>
                          /
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                💡 ▼を押して単語を区切ってください
              </p>
            </div>

            <button
              onClick={handleNextStep}
              style={{
                padding: '16px',
                background: 'var(--accent-color)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 600,
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                marginTop: '8px'
              }}
            >
              次へ <ArrowRight size={18} />
            </button>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
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
                <ArrowLeft size={16} color="currentColor" /> 戻る
              </button>
            </div>
          </>
        )}

        {aiModalStep === 2 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', margin: '16px 0' }}>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>各語源パーツの意味と、意味の変化を入力してください</p>

              {/* Parts Section */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--panel-border)', width: '100%' }}>
                {getWordParts().map((part, idx) => (
                  <React.Fragment key={idx}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6' }}>{part}</span>
                      <input
                        type="text"
                        className="custom-input"
                        value={aiModalPartInputs[idx] || ''}
                        onChange={(e) => {
                          const newInputs = [...aiModalPartInputs];
                          newInputs[idx] = e.target.value;
                          setAiModalPartInputs(newInputs);
                        }}
                        placeholder="パーツの意味"
                        style={{ width: '140px', textAlign: 'center', padding: '8px', fontSize: '1rem' }}
                      />
                    </div>
                    {idx < getWordParts().length - 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', height: '60px', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>＋</div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <ArrowDown size={32} color="rgba(99,102,241,0.5)" />

              {/* Intermediate Steps Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', alignItems: 'center' }}>
                {aiIntermediateSteps.map((step, idx) => (
                  <React.Fragment key={idx}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '500px' }}>
                      <input
                        type="text"
                        className="custom-input"
                        value={step}
                        onChange={(e) => {
                          const newSteps = [...aiIntermediateSteps];
                          newSteps[idx] = e.target.value;
                          setAiIntermediateSteps(newSteps);
                        }}
                        placeholder={`意味の変化 ${idx + 1}`}
                        style={{ flex: 1, padding: '16px', textAlign: 'center', fontSize: '1.0rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontWeight: 600 }}
                      />
                      <button
                        onClick={() => {
                          const newSteps = aiIntermediateSteps.filter((_, i) => i !== idx);
                          setAiIntermediateSteps(newSteps);
                        }}
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', width: '44px', height: '44px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                        title="削除"
                      >
                        ✕
                      </button>
                    </div>
                    <ArrowDown size={32} color="rgba(99,102,241,0.5)" />
                  </React.Fragment>
                ))}

                <button
                  onClick={() => setAiIntermediateSteps([...aiIntermediateSteps, ''])}
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px dashed var(--panel-border)', borderRadius: '8px', padding: '12px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  <Plus size={18} />
                </button>

                <ArrowDown size={32} color="rgba(99,102,241,0.5)" />
              </div>

              {/* Final Meaning Section */}
              <div style={{ padding: '16px 24px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', borderRadius: '12px', fontSize: '1.4rem', fontWeight: 800, textAlign: 'center', width: '100%', maxWidth: '500px' }}>
                {targetWordMeaning}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setAiModalStep(1)}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ArrowLeft size={18} /> 戻る
              </button>
              <button
                onClick={handleSaveClick}
                disabled={isSaving || !aiModalPartInputs.some(input => input.trim())}
                style={{
                  flex: 2,
                  padding: '16px',
                  background: isSaving || !aiModalPartInputs.some(input => input.trim()) ? 'rgba(99,102,241,0.3)' : 'var(--accent-color)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: isSaving || !aiModalPartInputs.some(input => input.trim()) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isSaving ? (
                  <>
                    <RefreshCcw size={18} className="spin-animation" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    保存する
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 画面 C（仮）: 似た英単語から暗記
// ══════════════════════════════════════════════════════════════
const ScreenC: React.FC<{ word: string; meaning: string; freeText: string; onBack: () => void; onSave: (rowData: string[]) => void; isSaving: boolean; flashcardTitle: string }> = ({
  word,
  meaning,
  freeText,
  onBack,
  onSave,
  isSaving,
  flashcardTitle: _flashcardTitleC,
}) => {
  const [fakeEtymology, setFakeEtymology] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchFakeEtymology = async () => {
    setIsLoading(true);
    try {
      const result = await generateFakeEtymology(word, meaning, freeText);
      setFakeEtymology(result);
    } catch (err) {
      console.error(err);
      setFakeEtymology('偽語源の生成に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          padding: '6px 14px',
          background: `rgba(${hexToRgb('#6366f1')}, 0.15)`,
          border: `1px solid rgba(${hexToRgb('#6366f1')}, 0.4)`,
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          width: 'fit-content',
          color: '#6366f1',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        🔤 画面C：類語から暗記
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
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{meaning}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>選んだ似た英単語</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>{freeText}</p>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>語源</p>
            <button
              onClick={fetchFakeEtymology}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                color: isLoading ? 'var(--text-secondary)' : '#6366f1',
                background: isLoading ? 'rgba(255,255,255,0.05)' : `rgba(${hexToRgb('#6366f1')}, 0.1)`,
                border: `1px solid ${isLoading ? 'var(--panel-border)' : `rgba(${hexToRgb('#6366f1')}, 0.3)`}`,
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <RefreshCcw size={12} className={isLoading ? 'spin-animation' : ''} />
              {isLoading ? '生成中...' : '再生成'}
            </button>
          </div>
          {isLoading ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>偽語源を生成中...</p>
          ) : (
            <textarea
              value={fakeEtymology}
              onChange={(e) => setFakeEtymology(e.target.value)}
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                resize: 'vertical',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-color)';
                e.target.style.background = 'rgba(255,255,255,0.05)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--panel-border)';
                e.target.style.background = 'rgba(255,255,255,0.02)';
              }}
            />
          )}
        </div>
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
          <ArrowLeft size={16} color="currentColor" /> 連想入力に戻る
        </button>
        <button id="screen-c-save-btn" className="btn-primary" style={{ flex: 1 }} onClick={() => onSave(['1', word, meaning, freeText, fakeEtymology])} disabled={isSaving}>
          <BookOpen size={16} /> {isSaving ? '保存中...' : 'カードを保存'}
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 画面 D: ストーリーで覚える
// ══════════════════════════════════════════════════════════════
const ScreenD: React.FC<{ word: string; meaning: string; freeText: string; onBack: () => void; onSave: (rowData: string[]) => void; isSaving: boolean; flashcardTitle: string }> = ({
  word,
  meaning,
  onBack,
  onSave,
  isSaving,
}) => {
  const [imageText, setImageText] = useState<string>('');
  const [explanations, setExplanations] = useState<string[]>(['']);

  const updateExplanation = (index: number, value: string) => {
    const newExps = [...explanations];
    newExps[index] = value;
    setExplanations(newExps);
  };

  const addExplanation = () => {
    setExplanations([...explanations, '']);
  };

  const removeExplanation = (index: number) => {
    if (explanations.length <= 1) return;
    const newExps = explanations.filter((_, i) => i !== index);
    setExplanations(newExps);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          padding: '6px 14px',
          background: `rgba(59,130,246,0.15)`,
          border: `1px solid rgba(59,130,246,0.4)`,
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          width: 'fit-content',
          color: '#3b82f6',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        📖 イメージで覚える
      </div>

      <div
        style={{
          padding: '24px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--panel-border)',
          borderRadius: '16px',
          textAlign: 'center',
        }}
      >
        <h3 style={{ fontSize: '2.4rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>{word}</h3>
        {meaning && (
          <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {meaning}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
            対象単語のイメージ
          </label>
          <input
            className="custom-input"
            value={imageText}
            onChange={(e) => setImageText(e.target.value)}
            placeholder=""
            style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
            イメージに関する説明<br />（重要な箇所に「　」をつけてください。そこが問題になります。）
          </label>
          {explanations.map((exp, idx) => (
            <React.Fragment key={idx}>
              <div style={{ position: 'relative' }}>
                <textarea
                  className="custom-input"
                  value={exp}
                  onChange={(e) => updateExplanation(idx, e.target.value)}
                  placeholder=""
                  rows={4}
                  style={{ width: '100%', padding: '14px', fontSize: '1.1rem', resize: 'vertical', lineHeight: '1.6' }}
                />
                {explanations.length > 1 && (
                  <button
                    onClick={() => removeExplanation(idx)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(239,68,68,0.1)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    title="この説明を削除"
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                  >
                    ✕
                  </button>
                )}
              </div>
              {idx < explanations.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0', color: 'var(--text-secondary)' }}>
                  <ArrowDown size={24} />
                </div>
              )}
            </React.Fragment>
          ))}

          <div style={{ display: 'none', justifyContent: 'center', marginTop: '16px' }}>
            <button
              onClick={addExplanation}
              style={{
                background: 'transparent',
                border: '1px dashed var(--panel-border)',
                borderRadius: '8px',
                padding: '8px 24px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.95rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--text-primary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--panel-border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Plus size={18} /> 説明を追加する
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
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
          <ArrowLeft size={16} color="currentColor" /> 戻る
        </button>
        <button
          id="screen-d-save-btn"
          className="btn-primary"
          style={{ flex: 1 }}
          onClick={() => {
            const rowData = ['1', word, meaning, imageText, ...explanations.filter(e => e.trim())];
            onSave(rowData);
          }}
          disabled={isSaving || !imageText.trim()}
        >
          <BookOpen size={16} /> {isSaving ? '保存中...' : 'カードを保存'}
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 画面 E（仮）: 語呂合わせで暗記
// ══════════════════════════════════════════════════════════════
const ScreenE: React.FC<{ word: string; meaning: string; freeText: string; onBack: () => void; onSave: (rowData: string[]) => void; isSaving: boolean; flashcardTitle: string }> = ({
  word,
  meaning,
  freeText,
  onBack,
  onSave,
  isSaving,
  flashcardTitle: _flashcardTitleE,
}) => {
  const [fakeStory, setFakeStory] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchFakeStory = async () => {
    setIsLoading(true);
    try {
      const result = await generateMnemonicStory(word, meaning, freeText);
      setFakeStory(result);
    } catch (err) {
      console.error(err);
      setFakeStory('情景の生成に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initFetch = async () => {
      setIsLoading(true);
      try {
        const result = await generateMnemonicStory(word, meaning, freeText);
        if (isMounted) setFakeStory(result);
      } catch (err) {
        console.error(err);
        if (isMounted) setFakeStory('情景の生成に失敗しました。');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    initFetch();
    return () => { isMounted = false; };
  }, [word, meaning, freeText]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          padding: '6px 14px',
          background: `rgba(${hexToRgb('#f59e0b')}, 0.15)`,
          border: `1px solid rgba(${hexToRgb('#f59e0b')}, 0.4)`,
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          width: 'fit-content',
          color: '#f59e0b',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        🤣 画面E：語呂合わせで暗記
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
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{meaning}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>選んだ語呂合わせ</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>{freeText}</p>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>語呂合わせから広がる情景</p>
            <button
              onClick={fetchFakeStory}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                color: isLoading ? 'var(--text-secondary)' : '#f59e0b',
                background: isLoading ? 'rgba(255,255,255,0.05)' : `rgba(${hexToRgb('#f59e0b')}, 0.1)`,
                border: `1px solid ${isLoading ? 'var(--panel-border)' : `rgba(${hexToRgb('#f59e0b')}, 0.3)`}`,
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <RefreshCcw size={12} className={isLoading ? 'spin-animation' : ''} />
              {isLoading ? '生成中...' : '再生成'}
            </button>
          </div>
          {isLoading ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>情景を生成中...</p>
          ) : (
            <textarea
              value={fakeStory}
              onChange={(e) => setFakeStory(e.target.value)}
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                resize: 'vertical',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-color)';
                e.target.style.background = 'rgba(255,255,255,0.05)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--panel-border)';
                e.target.style.background = 'rgba(255,255,255,0.02)';
              }}
            />
          )}
        </div>
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
          <ArrowLeft size={16} color="currentColor" /> 連想入力に戻る
        </button>
        <button id="screen-e-save-btn" className="btn-primary" style={{ flex: 1 }} onClick={() => onSave(['1', word, meaning, freeText, fakeStory])} disabled={isSaving}>
          <BookOpen size={16} /> {isSaving ? '保存中...' : 'カードを保存'}
        </button>
      </div>
    </div>
  );
};



// ── ユーティリティ: hex → "r,g,b" ─────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
