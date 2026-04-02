import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authAPI, authStorage } from '../services/api';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.login(formData);
      authStorage.setSession(response.data);
      onLogin(response.data.user);
      navigate(location.state?.from?.pathname || '/');
    } catch (err) {
      const message = err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.detail
        || 'Login failed. Please check your username and password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-showcase">
        <span className="eyebrow">Secure payroll access</span>
        <h2>Professional access for HR, payroll, and finance operations.</h2>
        <p>
          Keep employee records, payroll generation, and administration inside a controlled
          workspace with one sign-in point and one operational system.
        </p>
        <div className="auth-feature-list">
          <div className="auth-feature">
            <strong>Unified workflow</strong>
            <span>Directory, onboarding, and payslip workflows stay connected.</span>
          </div>
          <div className="auth-feature">
            <strong>Administrative control</strong>
            <span>Open Django admin anytime for system-level governance and record management.</span>
          </div>
        </div>
      </section>
      <div className="card auth-card">
        <span className="eyebrow">Login</span>
        <h2>Welcome back</h2>
        <p className="auth-copy">Sign in to manage employee data, payroll preparation, and payslips.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
        <div className="demo-credentials">
          <strong>Demo Access</strong>
          <span>`demo.admin` / `Admin@123`</span>
          <span>`demo.employee` / `Employee@123`</span>
        </div>
        <p className="auth-hint">Admin panel: <a href="/admin/">/admin/</a></p>
      </div>
    </div>
  );
};

export default Login;
