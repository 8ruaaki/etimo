import React, { useState } from 'react';
import { UserPlus, Mail, KeyRound, User, ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api/auth';

export const Signup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length !== 4) {
      setError('Password must be exactly 4 digits');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerUser(username, email, password);
      if (result.success) {
        // Registration successful, navigate back to login
        navigate('/');
      } else {
        // Show specific error from GAS (e.g., duplicate email)
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--accent-color)', filter: 'blur(80px)', zIndex: 0, opacity: 0.5, borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '120px', height: '120px', background: 'var(--accent-color)', filter: 'blur(60px)', zIndex: 0, opacity: 0.3, borderRadius: '50%' }}></div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Link to="/" className="text-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>
          <ArrowLeft size={16} /> Back to Login
        </Link>
        
        <div className="text-center mb-8">
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Create Account</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Start your learning journey today</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error-color)', color: 'var(--error-color)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label-text">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                className="custom-input" 
                placeholder="Your name" 
                style={{ paddingLeft: '42px' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

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
          
          <div className="input-group">
            <label className="label-text">Confirm Password</label>
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
                value={confirmPassword}
                onChange={(e) => {
                  const normalized = e.target.value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
                  setConfirmPassword(normalized.replace(/[^0-9]/g, ''));
                }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary mt-6" disabled={isLoading} style={{ opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? <Loader2 size={20} className="spinner" /> : <UserPlus size={20} />}
            <span>{isLoading ? 'Creating...' : 'Create Account'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
