import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('admin123');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          padding: 'clamp(24px, 6vw, 36px) clamp(18px, 5vw, 30px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div className="brand-icon" style={{ width: '44px', height: '44px', fontSize: '18px' }}>
            TI
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>TIRUPATI INDUSTRIES</h2>
            <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Workshop Management Portal
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            Admin Portal Login
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Sign in to manage employee attendance, advances & payroll.
          </p>
        </div>

        {/* Demo Credentials Box */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '12px'
          }}
        >
          <div style={{ color: '#475569' }}>
            <div>Demo: <strong style={{ color: '#2563eb' }}>admin</strong> / <strong style={{ color: '#2563eb' }}>admin123</strong></div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleFillDemo}>
            Auto-fill
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13px',
              marginBottom: '16px'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="loginUser">Username</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="loginUser"
                className="form-control"
                style={{ width: '100%', paddingLeft: '34px' }}
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <User size={16} style={{ position: 'absolute', left: '10px', top: '13px', color: '#94a3b8' }} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="loginPass">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                id="loginPass"
                className="form-control"
                style={{ width: '100%', paddingLeft: '34px' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={16} style={{ position: 'absolute', left: '10px', top: '13px', color: '#94a3b8' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px', marginTop: '10px' }}
            disabled={loading}
          >
            <span>{loading ? 'Signing In...' : 'Secure Sign In'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          Tirupati Industries Workshop EMS • Rajkot, Gujarat
        </div>
      </div>
    </div>
  );
}
