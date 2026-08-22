import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('admin@mysociety.test');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <section className="login__intro" aria-labelledby="login-intro-title">
        <div className="login__brand">
          <span className="login__brand-mark" aria-hidden="true">MS</span>
          <span>MySociety</span>
        </div>
        <div className="login__intro-copy">
          <h1 id="login-intro-title">Your community, connected.</h1>
          <p>Manage payments, complaints, visitors and community updates in one secure place.</p>
        </div>
        <img
          className="login__illustration"
          src="/login-community.svg"
          alt="Apartment community with trees and a garden"
        />
      </section>

      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__card-heading">
          <span className="login__lock" aria-hidden="true">+</span>
          <h2>Welcome back</h2>
          <p>Sign in to manage your society.</p>
        </div>

        <div className="login__field">
          <label htmlFor="username">Email or mobile number</label>
          <input
            id="username"
            type="text"
            value={username}
            autoComplete="username"
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </div>

        <div className="login__field">
          <label htmlFor="password">Password</label>
          <div className="login__password-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              className="login__password-toggle"
              type="button"
              aria-label={showPassword ? 'Hide entered value' : 'Reveal entered value'}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="login__options">
          <label className="login__remember">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(event) => setRememberEmail(event.target.checked)}
            />
            <span>Remember my email</span>
          </label>
          <a href="/forgot-password">Forgot password?</a>
        </div>

        {error ? (
          <p className="state state--error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="primary login__submit" type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="login__help">Need help? Contact your society administrator.</p>
        <div className="login__footer">
          <a href="mailto:support@mysociety.test">Help</a>
          <a href="/privacy-policy">Privacy Policy</a>
        </div>
      </form>
    </div>
  );
}
