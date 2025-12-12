import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useStore from '../store/store';
import toast from 'react-hot-toast';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import '../styles/Auth.css';

const TeacherRegister = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    section: '',
    employeeId: '',
    grade: '',
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;

    // Auto capitalize for specific fields
    if (['firstName', 'lastName', 'section'].includes(e.target.name)) {
      value = value.toUpperCase();
    }

    // Restrict Employee ID to numbers and symbols only
    if (e.target.name === 'employeeId') {
      value = value.replace(/[^0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g, '');
    }

    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate form
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    // Strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setErrors({ password: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character' });
      return;
    }

    setLoading(true);

    try {
      // Register teacher with specific role
      const response = await fetch('/api/teachers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          section: formData.section,
          employeeId: formData.employeeId,
          grade: formData.grade,
          role: 'teacher'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from backend
        if (data.message) {
          // If it's a generic error message, show it
          setErrors({ general: data.message });
        } else if (data.details && Array.isArray(data.details)) {
          // If Joi validation errors, parse them
          const fieldErrors: {[key: string]: string} = {};
          data.details.forEach((error: any) => {
            const field = error.path?.[0] || 'general';
            fieldErrors[field] = error.message;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ general: 'Failed to create an account' });
        }
        return;
      }

      toast.success('📋 Registration submitted successfully! Your account is pending administrator approval. You will be notified once your account is approved and you can log in.', {
        duration: 6000,
        style: {
          background: '#F59E0B',
          color: '#fff',
          fontSize: '16px',
          fontWeight: '500',
          borderRadius: '8px',
          padding: '16px',
        },
      });
      navigate('/teacher-login');
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to create an account' });
      toast.error(err.message || 'Failed to create an account', {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: '#fff',
          fontSize: '16px',
          fontWeight: '500',
          borderRadius: '8px',
          padding: '16px',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Teacher Registration</h1>
          <p>Create your teacher account</p>
        </div>

        {errors.general && <div className="error-message">{errors.general}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              {errors.firstName && <div className="field-error">{errors.firstName}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
              {errors.lastName && <div className="field-error">{errors.lastName}</div>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="employeeId">Teacher ID *</label>
            <input
              type="text"
              id="employeeId"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              required
            />
            {errors.employeeId && <div className="field-error">{errors.employeeId}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="section">Section *</label>
            <input
              type="text"
              id="section"
              name="section"
              value={formData.section}
              onChange={handleChange}
              required
            />
            {errors.section && <div className="field-error">{errors.section}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="grade">Grade Level *</label>
            <select
              id="grade"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              required
            >
              <option value="">Select Grade</option>
              <option value="1">Grade 1</option>
              <option value="2">Grade 2</option>
              <option value="3">Grade 3</option>
              <option value="4">Grade 4</option>
              <option value="5">Grade 5</option>
              <option value="6">Grade 6</option>
            </select>
            {errors.grade && <div className="field-error">{errors.grade}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {/* @ts-ignore */}
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {/* @ts-ignore */}
                {showConfirmPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>
            {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/teacher-login">Login</Link>
          </p>
          <p>
            <Link to="/staff/login">ADMIN LOGIN</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherRegister;
