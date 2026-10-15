import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../services/supabase';

const initialForm = {
  company: '',
  contact: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  industry: 'Manufacturing',
  location: '',
  role: 'Waste Supplier',
  terms: false,
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!form.company || !form.contact || !form.email || !form.password || !form.location) {
      setError('Please complete all required fields.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!form.terms) {
      setError('Please accept the terms and conditions to continue.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured yet. Add your project URL and anon key under .env and try again.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            company_name: form.company,
            full_name: form.contact,
            phone: form.phone,
            industry: form.industry,
            location: form.location,
            company_role: form.role,
          },
        },
      });

      if (signUpError) throw signUpError;
      setMessage('Account created successfully. Check your email to confirm registration.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (signUpErr) {
      setError(signUpErr.message || 'Signup failed. Please try again.');
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
              <small className="text-muted">Create your account</small>
            </div>
          </div>
          <h2>Register your company</h2>
          <p className="auth-subtitle">Join the network of industrial suppliers and buyers.</p>
        </div>

        {error ? <div className="inline-message error">{error}</div> : null}
        {message ? <div className="inline-message success">{message}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company name</label>
              <input className="form-control" name="company" value={form.company} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact person</label>
              <input className="form-control" name="contact" value={form.contact} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Business email</label>
              <input className="form-control" type="email" name="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone number</label>
              <input className="form-control" name="phone" value={form.phone} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" name="password" value={form.password} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input className="form-control" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Industry type</label>
              <select className="form-select" name="industry" value={form.industry} onChange={handleChange}>
                <option>Manufacturing</option>
                <option>Packaging</option>
                <option>Chemicals</option>
                <option>Construction</option>
                <option>Agriculture</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Company role</label>
              <select className="form-select" name="role" value={form.role} onChange={handleChange}>
                <option>Waste Supplier</option>
                <option>Material Buyer</option>
                <option>Both</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Company location</label>
            <input className="form-control" name="location" value={form.location} onChange={handleChange} />
          </div>

          <div className="checkbox-row mb-3">
            <label>
              <input type="checkbox" name="terms" checked={form.terms} onChange={handleChange} />
              I agree to the terms and conditions.
            </label>
          </div>

          <button type="submit" className="btn btn-primary-custom w-100" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="auth-note">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
