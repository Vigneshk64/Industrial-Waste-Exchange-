import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../services/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Please enter both email and password.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured yet. Add your project URL and anon key in the .env file before login.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError) throw signInError;
      navigate('/dashboard');
    } catch (signinErr) {
      setError(signinErr.message || 'Unable to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-block justify-content-start mb-3 p-0 border-0">
            <div className="brand-mark">WE</div>
            <div className="brand-text text-dark">
              <h3>Industrial Waste Exchange</h3>
              <small className="text-muted">Smart circular economy</small>
            </div>
          </div>
          <h2>Welcome back</h2>
          <p className="auth-subtitle">Sign in to manage material listings, matches, and exchange requests.</p>
        </div>

        {error ? <div className="inline-message error">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <div className="password-field">
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#55736d' }} />
              <input className="form-control" name="email" type="email" value={form.email} onChange={handleChange} style={{ paddingLeft: 42 }} placeholder="name@company.com" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-field">
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#55736d' }} />
              <input className="form-control" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} style={{ paddingLeft: 42, paddingRight: 42 }} placeholder="Enter your password" />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="checkbox-row mb-3">
            <label>
              <input type="checkbox" />
              Remember me
            </label>
            <a href="/login" className="text-success">Forgot password?</a>
          </div>

          <button type="submit" className="btn btn-primary-custom w-100" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="auth-note">
          Need an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
