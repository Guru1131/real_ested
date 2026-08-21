import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    const result = await login(username, password);
    setSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="w-100 animate-fade-in" style={{ maxWidth: '420px', padding: '20px' }}>
        
        {/* Logo/Icon Area */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle mb-3" style={{ width: '70px', height: '70px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <i className="bi bi-building-fill" style={{ fontSize: '2.2rem' }}></i>
          </div>
          <h3 className="fw-700 text-white mb-1">PROP-MANAGER</h3>
          <p className="text-muted small">Internal Enterprise System Log In</p>
        </div>

        {/* Central Card */}
        <div className="card glass-panel p-4 text-light">
          <h4 className="fw-600 mb-4 text-center">Account Sign In</h4>

          {error && (
            <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label text-muted small fw-600">USERNAME</label>
              <div className="input-group">
                <span className="input-group-text bg-dark bg-opacity-20 border-end-0 text-muted" style={{ borderColor: 'var(--border-color)' }}>
                  <i className="bi bi-person"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control form-premium-control border-start-0" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label text-muted small fw-600">PASSWORD</label>
              <div className="input-group">
                <span className="input-group-text bg-dark bg-opacity-20 border-end-0 text-muted" style={{ borderColor: 'var(--border-color)' }}>
                  <i className="bi bi-lock"></i>
                </span>
                <input 
                  type="password" 
                  className="form-control form-premium-control border-start-0" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-premium w-100 py-2.5 fw-600"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Verifying Session...
                </>
              ) : (
                'Secure Log In'
              )}
            </button>
          </form>
        </div>

        {/* System Notice Footer */}
        <div className="text-center mt-4">
          <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
            <i className="bi bi-shield-lock-fill text-muted me-1"></i> Authorized Personnel Only
          </span>
        </div>

      </div>
    </div>
  );
};

export default Login;
