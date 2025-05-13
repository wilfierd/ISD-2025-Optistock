// client/src/components/Login.js
import React, { useState, useRef, useEffect } from 'react';
import { useLogin } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, setError } = useLogin();
  const { language, toggleLanguage, t } = useLanguage();
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef(null);
  const hoverRef = useRef(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Clear any previous errors
    if (error) setError(null);
    
    // Call login without any toast in this component
    // The toast will be handled in the useLogin hook only
    login({ 
      username, 
      password 
    });
  };

  const handleMouseEnter = () => {
    hoverRef.current = true;
    // Don't set a new timer if one is already running
    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        if (hoverRef.current) { // Only show tooltip if still hovering
          setShowTooltip(true);
        }
      }, 4000);
    }
  };

  const handleMouseLeave = () => {
    hoverRef.current = false;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    setShowTooltip(false);
  };

  // Clean up timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ height: '100vh', backgroundColor: '#f5f5f5' }}>
      <div className="login-container" style={{ maxWidth: '400px', padding: '30px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
        {/* Language switcher in top-right corner */}
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={toggleLanguage}
          >
            <i className="fas fa-globe me-1"></i>
            {language === 'en' ? 'Tiếng Việt' : 'English'}
          </button>
        </div>
        
        <div className="login-header text-center mb-4">
          <div style={{ position: 'relative' }}>
            <h2 
              style={{ color: '#0a4d8c', display: 'inline-block', cursor: 'default' }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {t('inventoryManagement')}
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#333',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  zIndex: 1000,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  opacity: showTooltip ? 1 : 0,
                  visibility: showTooltip ? 'visible' : 'hidden',
                  transition: 'opacity 0.3s, visibility 0.3s',
                  pointerEvents: 'none'
                }}
              >
                Welcome to máng lợn Opistock
              </div>
            </h2>
          </div>
          <p>{t('loginCredentials')}</p>
        </div>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="username" className="form-label">{t('username')}</label>
            <input 
              type="text" 
              className="form-control" 
              id="username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">{t('password')}</label>
            <input 
              type="password" 
              className="form-control" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <div className="d-grid gap-2">
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isLoading}
            >
              {isLoading ? t('loggingIn') : t('login')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;