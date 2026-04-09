import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const LearnScreen: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate();

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
          <ArrowLeft size={18} /> 学習メニューに戻る
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          {decodeURIComponent(title || '')}
        </h2>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>学習モード（白紙状態）</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>ここから新しい学習画面のロジックを構築します。</p>
      </div>
    </div>
  );
};
