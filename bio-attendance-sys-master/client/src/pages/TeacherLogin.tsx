import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useStore from '../store/store';
import { toast } from 'react-hot-toast';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import '../styles/Auth.css';

const TeacherLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const loginStaff = useStore.use.loginStaff();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // For teacher login, we'll use the same login function but with teacher role
      // This would need to be implemented in the backend to differentiate between admin and teacher
      const response = await fetch('/api/teachers/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Failed to log in');
      }

      const responseData = await response.json();

      // Use the store's loginStaff function
      loginStaff({
        accessToken: responseData.data.accessToken,
        refreshToken: responseData.data.refreshToken,
        staff: responseData.data.staff
      });

      toast.success('Login successful');
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
      toast.error(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Teacher Login</h1>
          <p>Sign in to your teacher account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/teacher-register">Register</Link>
          </p>
          <p>
            <Link to="/staff/forgot-password">Forgot Password?</Link>
          </p>
          <p>
            <Link to="/staff/login">ADMIN LOGIN</Link>
          </p>
        </div>


      </div>
    </div>
  );
};

export default TeacherLogin;
