import React, { useState } from 'react';
import { LogIn, UserPlus, KeyRound, Mail, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await loginUser(email, password);
      if (result.success) {
        localStorage.setItem('username', result.username);
        localStorage.setItem('email', email);
        navigate('/home');
      } else {
        setError(result.error || 'Login failed.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--accent-color)', filter: 'blur(80px)', zIndex: 0, opacity: 0.5, borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '120px', height: '120px', background: 'var(--accent-color)', filter: 'blur(60px)', zIndex: 0, opacity: 0.3, borderRadius: '50%' }}></div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="text-center mb-8">
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Log In</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back to your flashcard app</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error-color)', color: 'var(--error-color)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label-text">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="email" 
                className="custom-input" 
                placeholder="you@example.com" 
                style={{ paddingLeft: '42px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="label-text">Password (4 digits)</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="password" 
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                className="custom-input" 
                placeholder="••••" 
                style={{ paddingLeft: '42px', letterSpacing: '4px', fontSize: '1.2rem' }}
                value={password}
                onChange={(e) => {
                  const normalized = e.target.value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
                  setPassword(normalized.replace(/[^0-9]/g, ''));
                }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary mt-6" disabled={isLoading} style={{ opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? <Loader2 size={20} className="spinner" /> : <LogIn size={20} />}
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="text-center mt-6" style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '24px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="text-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <UserPlus size={16} /> Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
