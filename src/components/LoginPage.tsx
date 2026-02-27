import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Shield, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login')) {
          setError('שם משתמש או סיסמה שגויים');
        } else if (error.message.includes('Email not confirmed')) {
          setError('יש לאשר את כתובת המייל לפני ההתחברות');
        } else {
          setError('שגיאה בהתחברות. נסה שנית.');
        }
      }
    } catch {
      setError('שגיאה בהתחברות. נסה שנית.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-gradient"></div>
      </div>
      
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Shield size={48} />
          </div>
          <h1>מערכת שיבוץ מאובטחת</h1>
          <p>התחבר כדי להמשיך</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">כתובת מייל</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              autoComplete="email"
              dir="ltr"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">סיסמה</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                dir="ltr"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <LogIn size={20} />
                <span>התחבר</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="security-notice">
            <Shield size={14} />
            <span>חיבור מאובטח עם הצפנה מקצה לקצה</span>
          </div>
        </div>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          font-family: 'Segoe UI', Tahoma, sans-serif;
        }

        .login-background {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          z-index: -1;
        }

        .login-gradient {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.1) 0%, transparent 40%);
          animation: pulse 8s ease-in-out infinite alternate;
        }

        @keyframes pulse {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .login-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 48px;
          width: 100%;
          max-width: 420px;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        }

        .login-header {
          text-align: center;
          margin-bottom: 36px;
        }

        .login-logo {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: white;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
        }

        .login-header h1 {
          color: white;
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 8px;
        }

        .login-header p {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.95rem;
          margin: 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .login-error {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          color: #fca5a5;
          font-size: 0.9rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 1rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .form-group input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input-wrapper input {
          padding-left: 48px;
        }

        .password-toggle {
          position: absolute;
          left: 12px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .password-toggle:hover {
          color: rgba(255, 255, 255, 0.8);
        }

        .login-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 8px;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.4);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          margin-top: 32px;
          text-align: center;
        }

        .security-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.8rem;
        }

        @media (max-width: 480px) {
          .login-card {
            margin: 16px;
            padding: 32px 24px;
          }

          .login-header h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}



