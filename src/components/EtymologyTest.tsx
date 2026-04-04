import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEtymologyTest, createUserSheet, saveEtymologyTestResult, saveTestProgress, getTestProgress } from '../api/flashcard';
import { CheckCircle, XCircle, ArrowRight, Home } from 'lucide-react';

interface Question {
  word: string;
  etymology: string;
  meaning: string;
  correctAnswer: string;
  options: string[];
}

export const EtymologyTest: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [knownEtymologies, setKnownEtymologies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTest();
  }, []);

  const loadTest = async () => {
    try {
      setLoading(true);
      const email = localStorage.getItem('email');
      
      if (!email) {
        setError('ログイン情報が見つかりません。');
        setLoading(false);
        return;
      }

      // 前回の進捗を確認
      const progressResult = await getTestProgress(email);
      
      const result = await getEtymologyTest();
      
      if (result.success && result.questions) {
        // 選択肢を生成（単語の意味を4択で）
        const processedQuestions = result.questions.map((q: any) => {
          // 他の単語の意味を取得して誤答選択肢とする
          const allMeanings = result.questions.map((q2: any) => q2.meaning);
          const wrongAnswers = allMeanings
            .filter((m: string) => m !== q.meaning)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
          
          // 正解の意味と誤答をシャッフルして4択にする
          const options = [q.meaning, ...wrongAnswers].sort(() => Math.random() - 0.5);
          
          return {
            word: q.word,
            etymology: q.etymology,
            meaning: q.meaning,
            correctAnswer: q.meaning,
            options: options
          };
        });
        
        setQuestions(processedQuestions);
        
        // 前回の進捗がある場合は復元
        if (progressResult.success && progressResult.progress) {
          const progress = progressResult.progress;
          setCurrentQuestionIndex(progress.currentQuestionIndex || 0);
          setKnownEtymologies(progress.knownEtymologies || []);
          console.log('前回の進捗を復元しました:', progress);
        }
        
        // テスト開始時にユーザーシートを作成
        try {
          await createUserSheet(email);
          console.log('User sheet created successfully');
        } catch (err) {
          console.error('Failed to create user sheet:', err);
          // シート作成失敗してもテストは続行
        }
      } else {
        setError('テストデータの取得に失敗しました。');
      }
    } catch (err) {
      setError('テストの読み込み中にエラーが発生しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    // ここでは正解判定のみ行い、knownEtymologiesへの追加はhandleNextで行う
  };

  const handleNext = () => {
    const currentQuestion = questions[currentQuestionIndex];
    
    // 現在の問題が正解かどうかを判定して、knownEtymologiesを更新
    let updatedKnownEtymologies = knownEtymologies;
    if (selectedAnswer === currentQuestion.correctAnswer) {
      updatedKnownEtymologies = [...knownEtymologies, currentQuestion.etymology];
      setKnownEtymologies(updatedKnownEtymologies);
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      // 次の問題に進む前に、最新の状態で進捗を保存
      const email = localStorage.getItem('email');
      if (email) {
        saveTestProgress(email, currentQuestionIndex + 1, updatedKnownEtymologies).catch(err => {
          console.error('Failed to save progress:', err);
        });
      }
      
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      // 最後の問題の場合、完了処理を実行
      completeTest(updatedKnownEtymologies);
    }
  };

  const handleExit = async () => {
    setIsSaving(true);
    
    // 現在の問題が正解かどうかを判定して、最新のknownEtymologiesを作成
    const currentQuestion = questions[currentQuestionIndex];
    const updatedKnownEtymologies = selectedAnswer === currentQuestion.correctAnswer
      ? [...knownEtymologies, currentQuestion.etymology]
      : knownEtymologies;
    
    // 現在の進捗を保存してホームに戻る
    const email = localStorage.getItem('email');
    if (email) {
      try {
        await saveTestProgress(email, currentQuestionIndex, updatedKnownEtymologies);
        console.log('進捗を保存しました:', {
          currentQuestionIndex,
          knownCount: updatedKnownEtymologies.length
        });
      } catch (err) {
        console.error('Failed to save progress:', err);
      }
    }
    
    setIsSaving(false);
    navigate('/home');
  };

  const completeTest = async (etymologiesToSave: string[]) => {
    try {
      const email = localStorage.getItem('email');
      if (!email) {
        setError('ログイン情報が見つかりません。');
        return;
      }

      console.log('Saving etymologies:', etymologiesToSave); // デバッグログ

      const result = await saveEtymologyTestResult(email, etymologiesToSave);
      
      if (result.success) {
        setCorrectCount(etymologiesToSave.length);
        setIsCompleted(true);
      } else {
        setError('結果の保存に失敗しました。');
      }
    } catch (err) {
      setError('結果の保存中にエラーが発生しました。');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p>テストを読み込み中...</p>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p>保存中...</p>
        <p style={{ color: 'var(--text-secondary)', marginTop: '12px', fontSize: '0.9rem' }}>
          進捗を保存しています
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '40px' }}>
        <p style={{ color: '#ef4444', marginBottom: '20px' }}>{error}</p>
        <button onClick={() => navigate('/home')} className="btn-primary">
          ホームに戻る
        </button>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '600px' }}>
        <div style={{ textAlign: 'center' }}>
          <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>診断完了</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
            {questions.length}問中{correctCount}問正解しました。
          </p>
          <button onClick={() => navigate('/flashcards')} className="btn-primary">
            単語帳を作成する
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '40px' }}>
        <p>テスト問題が見つかりません。</p>
        <button onClick={() => navigate('/home')} className="btn-primary" style={{ marginTop: '20px' }}>
          ホームに戻る
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="glass-panel" style={{ padding: '40px', maxWidth: '700px', width: '100%' }}>
      <div style={{ marginBottom: '30px' }}>
        <div className="flex-between" style={{ marginBottom: '10px' }}>
          <h2 style={{ fontSize: '1.5rem' }}>語源力診断テスト</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleExit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
              }}
            >
              <Home size={16} /> 途中終了
            </button>
            <span style={{ color: 'var(--text-secondary)' }}>
              {currentQuestionIndex + 1} / {questions.length}
            </span>
          </div>
        </div>
        <div style={{ 
          height: '6px', 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            height: '100%', 
            background: 'var(--accent-color)',
            width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <div style={{ 
          padding: '30px', 
          background: 'rgba(255,255,255,0.03)', 
          borderRadius: '16px',
          border: '1px solid var(--panel-border)',
          marginBottom: '20px'
        }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            この単語の意味は？
          </p>
          <h3 style={{ fontSize: '2rem', fontWeight: 700 }}>
            {currentQuestion.word}
          </h3>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {currentQuestion.options.map((option, index) => {
            const isCorrect = option === currentQuestion.correctAnswer;
            const isSelected = option === selectedAnswer;
            
            let backgroundColor = 'rgba(15, 23, 42, 0.4)';
            let borderColor = 'var(--panel-border)';
            
            if (isAnswered) {
              if (isCorrect) {
                backgroundColor = 'rgba(16, 185, 129, 0.2)';
                borderColor = '#10b981';
              } else if (isSelected) {
                backgroundColor = 'rgba(239, 68, 68, 0.2)';
                borderColor = '#ef4444';
              }
            } else if (isSelected) {
              borderColor = 'var(--accent-color)';
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                disabled={isAnswered}
                style={{
                  padding: '20px',
                  background: backgroundColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  textAlign: 'left',
                  cursor: isAnswered ? 'default' : 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#ffffff'
                }}
              >
                <span>{option}</span>
                {isAnswered && isCorrect && <CheckCircle size={24} color="#10b981" />}
                {isAnswered && isSelected && !isCorrect && <XCircle size={24} color="#ef4444" />}
              </button>
            );
          })}
        </div>
      </div>

      {isAnswered && (
        <button
          onClick={handleNext}
          className="btn-primary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {currentQuestionIndex < questions.length - 1 ? '次へ' : '完了'}
          <ArrowRight size={20} />
        </button>
      )}
    </div>
  );
};
