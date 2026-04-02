import React, { useState, useEffect } from 'react';
import { User, KeyRound, Mail, ArrowLeft, Loader2, Save, Trash2, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { updateProfileUser, deleteUser } from '../api/auth';

export const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  // Get email from localStorage or context if we were saving it properly. 
  // For this example, we will assume it's saved in localStorage upon login/signup.
  // We need to fetch email from localStorage since it is the primary key for updates.
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const storedEmail = localStorage.getItem('email');
    const storedUsername = localStorage.getItem('username');
    if (!storedEmail) {
      // If email isn't there, we can't update. Kick out to login.
      navigate('/');
    } else {
      setEmail(storedEmail);
    }
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, [navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password && password.length !== 4) {
      setError('Password must be exactly 4 digits');
      return;
    }

    setIsLoading(true);
    try {
      const response = await updateProfileUser(email, username, password || undefined);
      if (response.success) {
        setSuccess('Profile updated successfully!');
        if (username) localStorage.setItem('username', username);
      } else {
        setError(response.error || 'Update failed');
      }
    } catch (err) {
      setError('Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');
    try {
      const response = await deleteUser(email);
      if (response.success) {
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        navigate('/');
      } else {
        setError(response.error || 'Failed to delete account');
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      setError('Failed to delete account.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--accent-color)', filter: 'blur(80px)', zIndex: 0, opacity: 0.5, borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '120px', height: '120px', background: '#0ea5e9', filter: 'blur(60px)', zIndex: 0, opacity: 0.3, borderRadius: '50%' }}></div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Link to="/home" className="text-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>
          <ArrowLeft size={16} /> Back to Home
        </Link>
        
        <div className="text-center mb-8">
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Edit Profile</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Update your account details</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error-color)', color: 'var(--error-color)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleUpdate}>
          <div className="input-group" style={{ opacity: 0.6 }}>
            <label className="label-text">Email Address (Read-only)</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="email" 
                className="custom-input" 
                style={{ paddingLeft: '42px', cursor: 'not-allowed' }}
                value={email}
                readOnly
                disabled
              />
            </div>
          </div>

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
              />
            </div>
          </div>

          <div className="input-group">
            <label className="label-text">New Password (leave blank to keep current)</label>
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
              />
            </div>
          </div>
          
          {password && (
            <div className="input-group">
              <label className="label-text">Confirm New Password</label>
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
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary mt-6" disabled={isLoading} style={{ opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? <Loader2 size={20} className="spinner" /> : <Save size={20} />}
            <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </form>

        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h3 style={{ color: 'var(--error-color)', fontSize: '1rem', marginBottom: '16px' }}>Danger Zone</h3>
          
          {showDeleteConfirm ? (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text-primary)' }}>
                Are you sure you want to permanently delete your account? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  style={{ flex: 1, padding: '10px', background: 'var(--error-color)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16} />}
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--error-color)', color: 'var(--error-color)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <AlertTriangle size={18} />
              Delete Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
