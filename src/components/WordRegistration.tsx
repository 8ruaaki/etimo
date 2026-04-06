import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, BookOpen, Lightbulb, Sparkles, CheckCircle, ArrowRight, ArrowDown, Plus, RefreshCcw } from 'lucide-react';
import { getKnownEtymologies, addWordToFlashcard } from '../api/flashcard';
import { checkEtymologyMatch, suggestSimilarWords, suggestOtherAssociations, suggestMnemonic, generateFakeEtymology, generateFakeRelationship, generateMnemonicStory, type EtymologyPart } from '../api/wordRegistration';

type Step = 'input' | 'judging' | 'screenA' | 'screenB' | 'screenC' | 'screenD' | 'screenE';

export const WordRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { title } = useParams<{ title: string }>();

  const [step, setStep] = useState<Step>('input');
  const [word, setWord] = useState('');
  const [freeText, setFreeText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [etymologyInfo, setEtymologyInfo] = useState<string>('');
  const [targetWordMeaning, setTargetWordMeaning] = useState<string>('');
  const [integratedMeaning, setIntegratedMeaning] = useState<string>('');
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

      if (matchResult.isRealWord === false) {
        const suggestion = matchResult.suggestedWord ? `もしかして：「${matchResult.suggestedWord}」ですか？` : '';
        setError(`スペルが間違っている可能性があります。${suggestion}`);
        setStep('input');
        return;
      }

      // 語源マッチの有無に関わらず、意味はセットする
      setTargetWordMeaning(matchResult.targetWordMeaning ?? '');

      if (matchResult.matched) {
        setEtymologyInfo(matchResult.explanation ?? '');
        setEtymologyParts(matchResult.parts ?? []);
        setIntegratedMeaning(matchResult.integratedMeaning ?? '');
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
            integratedMeaning={integratedMeaning}
            etymologyInfo={etymologyInfo}
            etymologyParts={etymologyParts}
            onBack={backToInput}
            onSave={handleSaveToSheet}
            isSaving={isSaving}
            flashcardTitle={title ?? ''}
            onGoToScreenB={() => setStep('screenB')}
          />
        )}
        {step === 'screenB' && (
          <ScreenB
            word={word}
            targetWordMeaning={targetWordMeaning}
            freeText={freeText}
            setFreeText={setFreeText}
            onSimilarWord={() => setStep('screenC')}
            onOther={() => setStep('screenD')}
            onMnemonic={() => setStep('screenE')}
            onBack={backToInput}
            onGoToScreenA={() => setStep('screenA')}
          />
        )}
        {step === 'screenC' && (
          <ScreenC word={word} meaning={targetWordMeaning} freeText={freeText} onBack={() => setStep('screenB')} onSave={handleSaveToSheet} isSaving={isSaving} flashcardTitle={title ?? ''} />
        )}
        {step === 'screenD' && (
          <ScreenD word={word} meaning={targetWordMeaning} freeText={freeText} onBack={() => setStep('screenB')} onSave={handleSaveToSheet} isSaving={isSaving} flashcardTitle={title ?? ''} />
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
  integratedMeaning: string;
  etymologyInfo: string;
  etymologyParts: EtymologyPart[];
  onBack: () => void;
  onSave: (rowData: string[]) => void;
  isSaving: boolean;
  flashcardTitle: string;
  onGoToScreenB: () => void;
}> = ({ word, targetWordMeaning, integratedMeaning, etymologyInfo, etymologyParts, onBack, onSave, isSaving, flashcardTitle: _flashcardTitle, onGoToScreenB }) => {
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
    const rowData: string[] = ['0', word, targetWordMeaning];
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

          {integratedMeaning && (
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
                {integratedMeaning.split(/→|->|＝/).map(s => s.trim()).filter(Boolean).map((step, idx, arr) => (
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
                      {step}
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

      {/* 別の方法で暗記するボタン */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
        <button
          onClick={onGoToScreenB}
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
          別の方法（連想・語呂合わせ等）で暗記する
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
  targetWordMeaning: string;
  freeText: string;
  setFreeText: (v: string) => void;
  onSimilarWord: () => void;
  onOther: () => void;
  onMnemonic: () => void;
  onBack: () => void;
  onGoToScreenA?: () => void;
}> = ({ word, targetWordMeaning, freeText, setFreeText, onSimilarWord, onOther, onMnemonic, onBack, onGoToScreenA }) => {
  const [selection, setSelection] = useState<'similar' | 'other' | 'mnemonic' | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const [otherSuggestions, setOtherSuggestions] = useState<string[]>([]);
  const [otherSuggestionIndex, setOtherSuggestionIndex] = useState(0);
  const [isSuggestingOther, setIsSuggestingOther] = useState(false);

  const [mnemonicSuggestions, setMnemonicSuggestions] = useState<string[]>([]);
  const [mnemonicSuggestionIndex, setMnemonicSuggestionIndex] = useState(0);
  const [isSuggestingMnemonic, setIsSuggestingMnemonic] = useState(false);

  const handleSuggest = async (forceFetch: boolean = false) => {
    // もしすでに提案があり、かつ強制再フェッチでなければ次へサイクルする
    if (!forceFetch && suggestions.length > 0) {
      const nextIndex = (suggestionIndex + 1) % suggestions.length;
      setSuggestionIndex(nextIndex);
      setFreeText(suggestions[nextIndex]);
      return;
    }

    setIsSuggesting(true);
    try {
      const res = await suggestSimilarWords(word);
      if (res && res.length > 0) {
        setSuggestions(res);
        setSuggestionIndex(0);
        setFreeText(res[0]);
      } else {
        alert('似た単語の提案を取得できませんでした。');
      }
    } catch (err: any) {
      console.error(err);
      alert(`エラーが発生しました: ${err.message || err}`);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSuggestOther = async (forceFetch: boolean = false) => {
    if (!forceFetch && otherSuggestions.length > 0) {
      const nextIndex = (otherSuggestionIndex + 1) % otherSuggestions.length;
      setOtherSuggestionIndex(nextIndex);
      setFreeText(otherSuggestions[nextIndex]);
      return;
    }

    setIsSuggestingOther(true);
    try {
      const res = await suggestOtherAssociations(word);
      if (res && res.length > 0) {
        setOtherSuggestions(res);
        setOtherSuggestionIndex(0);
        setFreeText(res[0]);
      } else {
        alert('連想の提案を取得できませんでした。');
      }
    } catch (err: any) {
      console.error(err);
      alert(`エラーが発生しました: ${err.message || err}`);
    } finally {
      setIsSuggestingOther(false);
    }
  };

  const handleSuggestMnemonic = async (forceFetch: boolean = false) => {
    if (!forceFetch && mnemonicSuggestions.length > 0) {
      const nextIndex = (mnemonicSuggestionIndex + 1) % mnemonicSuggestions.length;
      setMnemonicSuggestionIndex(nextIndex);
      setFreeText(mnemonicSuggestions[nextIndex]);
      return;
    }

    setIsSuggestingMnemonic(true);
    try {
      const res = await suggestMnemonic(word, targetWordMeaning);
      if (res && res.length > 0) {
        setMnemonicSuggestions(res);
        setMnemonicSuggestionIndex(0);
        setFreeText(res[0]);
      } else {
        alert('語呂合わせの提案を取得できませんでした。');
      }
    } catch (err: any) {
      console.error(err);
      alert(`エラーが発生しました: ${err.message || err}`);
    } finally {
      setIsSuggestingMnemonic(false);
    }
  };

  const handleNext = () => {
    if (selection === 'similar') onSimilarWord();
    else if (selection === 'other') onOther();
    else if (selection === 'mnemonic') onMnemonic();
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
          position: 'relative',
        }}
      >
        {onGoToScreenA && (
          <button
            onClick={onGoToScreenA}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'transparent',
              border: '1px solid #10b981',
              color: '#10b981',
              borderRadius: '999px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16, 185, 129, 0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            語源で覚える <ArrowRight size={14} />
          </button>
        )}
        <h3 style={{ fontSize: '2.4rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>{word}</h3>
        {targetWordMeaning && (
          <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {targetWordMeaning}
          </p>
        )}
      </div>

      {/* 分岐ボタン */}
      <div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '14px', textAlign: 'center' }}>
          まず、どちらのアプローチで暗記するか選択してください
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <ChoiceCard
            id="btn-similar-word"
            icon="🔤"
            title="似た英単語"
            desc="似た英単語を思い浮かべた"
            color="#6366f1"
            onClick={() => {
              setSelection('similar');
              if (suggestions.length > 0) setFreeText(suggestions[suggestionIndex]);
            }}
            selected={selection === 'similar'}
          />
          <ChoiceCard
            id="btn-other"
            icon="💭"
            title="似たカタカナ語"
            desc="カタカナ語を思い浮かべた"
            color="#0ea5e9"
            onClick={() => {
              setSelection('other');
              if (otherSuggestions.length > 0) setFreeText(otherSuggestions[otherSuggestionIndex]);
            }}
            selected={selection === 'other'}
          />
          <ChoiceCard
            id="btn-mnemonic"
            icon="🤣"
            title="語呂合わせ"
            desc="語呂合わせで覚える"
            color="#f59e0b"
            onClick={() => {
              setSelection('mnemonic');
              if (mnemonicSuggestions.length > 0) setFreeText(mnemonicSuggestions[mnemonicSuggestionIndex]);
            }}
            selected={selection === 'mnemonic'}
          />
        </div>
      </div>

      {/* 自由入力 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          {selection === 'similar' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleSuggest(false)}
                disabled={isSuggesting}
                style={{
                  background: 'rgba(99,102,241,0.2)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: '#818cf8',
                  fontSize: '0.8rem',
                  cursor: isSuggesting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }}
              >
                <Sparkles size={14} />
                {isSuggesting ? '提案中...' : suggestions.length > 0 ? '次の提案を見る' : '似た単語を提案'}
              </button>
              {suggestions.length > 0 && (
                <button
                  onClick={() => handleSuggest(true)}
                  disabled={isSuggesting}
                  title="新しい提案をAIに考えさせる"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(99,102,241,0.4)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#818cf8',
                    fontSize: '0.8rem',
                    cursor: isSuggesting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'background 0.2s',
                  }}
                >
                  <RefreshCcw size={14} />
                  再生成
                </button>
              )}
            </div>
          )}
          {selection === 'other' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleSuggestOther(false)}
                disabled={isSuggestingOther}
                style={{
                  background: 'rgba(14,165,233,0.2)',
                  border: '1px solid rgba(14,165,233,0.4)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: '#38bdf8',
                  fontSize: '0.8rem',
                  cursor: isSuggestingOther ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }}
              >
                <Sparkles size={14} />
                {isSuggestingOther ? '提案中...' : otherSuggestions.length > 0 ? '別の連想を見る' : '連想を提案'}
              </button>
              {otherSuggestions.length > 0 && (
                <button
                  onClick={() => handleSuggestOther(true)}
                  disabled={isSuggestingOther}
                  title="新しい連想をAIに考えさせる"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(14,165,233,0.4)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: '#38bdf8',
                    fontSize: '0.8rem',
                    cursor: isSuggestingOther ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'background 0.2s',
                  }}
                >
                  <RefreshCcw size={14} />
                  再生成
                </button>
              )}
            </div>
          )}
          {selection === 'mnemonic' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleSuggestMnemonic(false)}
                disabled={isSuggestingMnemonic}
                style={{
                  background: 'rgba(245,158,11,0.2)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: '#fbbf24',
                  fontSize: '0.8rem',
                  cursor: isSuggestingMnemonic ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }}
              >
                <Sparkles size={14} />
                {isSuggestingMnemonic ? '提案中...' : mnemonicSuggestions.length > 0 ? '別の語呂合わせを見る' : '語呂合わせを提案'}
              </button>
              {mnemonicSuggestions.length > 0 && (
                <button
                  onClick={() => handleSuggestMnemonic(true)}
                  disabled={isSuggestingMnemonic}
                  title="新しい語呂合わせをAIに考えさせる"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(245,158,11,0.4)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: '#fbbf24',
                    fontSize: '0.8rem',
                    cursor: isSuggestingMnemonic ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'background 0.2s',
                  }}
                >
                  <RefreshCcw size={14} />
                  再生成
                </button>
              )}
            </div>
          )}
        </div>
        <textarea
          id="free-text-input"
          className="custom-input"
          value={freeText}
          onChange={e => {
            setFreeText(e.target.value);
            // ユーザーが手動編集したら提案のサイクルをリセット
            if (selection === 'similar' && suggestions.length > 0 && e.target.value !== suggestions[suggestionIndex]) {
              setSuggestions([]);
            }
            if (selection === 'other' && otherSuggestions.length > 0 && e.target.value !== otherSuggestions[otherSuggestionIndex]) {
              setOtherSuggestions([]);
            }
            if (selection === 'mnemonic' && mnemonicSuggestions.length > 0 && e.target.value !== mnemonicSuggestions[mnemonicSuggestionIndex]) {
              setMnemonicSuggestions([]);
            }
          }}
          placeholder="似た単語、イメージ、語呂合わせ、エピソードなど何でもOK..."
          rows={4}
          style={{ resize: 'vertical', lineHeight: 1.7 }}
        />
      </div>

      {/* ボタン群 */}
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
          <ArrowLeft size={16} /> 戻る
        </button>
        <button
          className="btn-primary"
          style={{ flex: 1 }}
          onClick={handleNext}
          disabled={!selection || !freeText.trim()}
        >
          次へ <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

const ChoiceCard: React.FC<{
  id: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
  onClick: () => void;
  selected: boolean;
}> = ({ id, icon, title, desc, color, onClick, selected }) => (
  <button
    id={id}
    onClick={onClick}
    style={{
      padding: '20px 16px',
      background: selected ? `rgba(${hexToRgb(color)}, 0.2)` : `rgba(${hexToRgb(color)}, 0.05)`,
      border: `2px solid ${selected ? color : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '14px',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.25s ease',
      color: 'var(--text-primary)',
      position: 'relative',
    }}
    onMouseEnter={e => {
      if (!selected) {
        (e.currentTarget as HTMLButtonElement).style.background = `rgba(${hexToRgb(color)}, 0.1)`;
        (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${hexToRgb(color)}, 0.4)`;
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
      }
    }}
    onMouseLeave={e => {
      if (!selected) {
        (e.currentTarget as HTMLButtonElement).style.background = `rgba(${hexToRgb(color)}, 0.05)`;
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
      }
    }}
  >
    {selected && (
      <div style={{ position: 'absolute', top: '12px', right: '12px', color }}>
        <CheckCircle size={20} />
      </div>
    )}
    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{icon}</div>
    <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{title}</p>
    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{desc}</p>
  </button>
);

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
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  useEffect(() => {
    let isMounted = true;
    const initFetch = async () => {
      setIsLoading(true);
      try {
        const result = await generateFakeEtymology(word, meaning, freeText);
        if (isMounted) setFakeEtymology(result);
      } catch (err) {
        console.error(err);
        if (isMounted) setFakeEtymology('偽語源の生成に失敗しました。');
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
                e.target.style.borderColor = 'var(--primary-color)';
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
          <ArrowLeft size={16} /> 連想入力に戻る
        </button>
        <button id="screen-c-save-btn" className="btn-primary" style={{ flex: 1 }} onClick={() => onSave(['1', word, meaning, freeText, fakeEtymology])} disabled={isSaving}>
          <BookOpen size={16} /> {isSaving ? '保存中...' : 'カードを保存'}
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 画面 D（仮）: カタカナ語から暗記
// ══════════════════════════════════════════════════════════════
const ScreenD: React.FC<{ word: string; meaning: string; freeText: string; onBack: () => void; onSave: (rowData: string[]) => void; isSaving: boolean; flashcardTitle: string }> = ({
  word,
  meaning,
  freeText,
  onBack,
  onSave,
  isSaving,
  flashcardTitle: _flashcardTitleD,
}) => {
  const [fakeRelationship, setFakeRelationship] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchFakeRelationship = async () => {
    setIsLoading(true);
    try {
      const result = await generateFakeRelationship(word, meaning, freeText);
      setFakeRelationship(result);
    } catch (err) {
      console.error(err);
      setFakeRelationship('関連性の生成に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initFetch = async () => {
      setIsLoading(true);
      try {
        const result = await generateFakeRelationship(word, meaning, freeText);
        if (isMounted) setFakeRelationship(result);
      } catch (err) {
        console.error(err);
        if (isMounted) setFakeRelationship('関連性の生成に失敗しました。');
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
          background: `rgba(${hexToRgb('#0ea5e9')}, 0.15)`,
          border: `1px solid rgba(${hexToRgb('#0ea5e9')}, 0.4)`,
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          width: 'fit-content',
          color: '#0ea5e9',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        💭 画面D：カタカナ語から暗記
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>選んだカタカナ語</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>{freeText}</p>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>関連性</p>
            <button
              onClick={fetchFakeRelationship}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                color: isLoading ? 'var(--text-secondary)' : '#0ea5e9',
                background: isLoading ? 'rgba(255,255,255,0.05)' : `rgba(${hexToRgb('#0ea5e9')}, 0.1)`,
                border: `1px solid ${isLoading ? 'var(--panel-border)' : `rgba(${hexToRgb('#0ea5e9')}, 0.3)`}`,
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
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>関連性を生成中...</p>
          ) : (
            <textarea
              value={fakeRelationship}
              onChange={(e) => setFakeRelationship(e.target.value)}
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
                e.target.style.borderColor = 'var(--primary-color)';
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
          <ArrowLeft size={16} /> 連想入力に戻る
        </button>
        <button id="screen-d-save-btn" className="btn-primary" style={{ flex: 1 }} onClick={() => onSave(['1', word, meaning, freeText, fakeRelationship])} disabled={isSaving}>
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
                e.target.style.borderColor = 'var(--primary-color)';
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
          <ArrowLeft size={16} /> 連想入力に戻る
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
