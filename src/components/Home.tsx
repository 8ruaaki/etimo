import React from 'react';
import { PlusSquare, BookOpen, ClipboardCheck, Database, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    { id: 'create', title: '単語帳作成', icon: <PlusSquare size={32} />, color: '#3b82f6' }, // Blue 500
    { id: 'learn', title: '学習', icon: <BookOpen size={32} />, color: '#60a5fa' }, // Blue 400
    { id: 'test', title: 'テストモード', icon: <ClipboardCheck size={32} />, color: '#0ea5e9' }, // Sky 500
    { id: 'database', title: 'データベース', icon: <Database size={32} />, color: '#0284c7' }, // Sky 600
  ];

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '40px', position: 'relative', overflow: 'hidden' }}>
      {/* Background decorative elements */}
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--accent-color)', filter: 'blur(100px)', zIndex: 0, opacity: 0.3, borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', background: '#0ea5e9', filter: 'blur(80px)', zIndex: 0, opacity: 0.2, borderRadius: '50%' }}></div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex-between mb-8" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Home</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Welcome to your workspace</p>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="text-link" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}
          >
            <LogOut size={18} /> Logout
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={async () => {
                if (item.id === 'create') {
                  navigate('/flashcards');
                } else if (item.id === 'learn') {
                  navigate('/learn');
                } else if (item.id === 'test') {
                  navigate('/test');
                } else if (item.id === 'database') {
                  navigate('/database');
                }
              }}
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid var(--panel-border)',
                borderRadius: '20px',
                padding: '30px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.borderColor = item.color;
                e.currentTarget.style.boxShadow = `0 10px 25px -5px ${item.color}33`;
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--panel-border)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.4)';
              }}
            >
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '16px', 
                background: `${item.color}22`, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                color: item.color,
                transition: 'transform 0.3s ease'
              }}>
                {item.icon}
              </div>
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{item.title}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{localStorage.getItem('username') || 'Guest User'}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => navigate('/profile')}
              className="text-link" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
            >
              <Settings size={16} /> Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
