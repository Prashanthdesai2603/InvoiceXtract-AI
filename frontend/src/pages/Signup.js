import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signup } from '../services/authService';
import { toast } from 'react-toastify';
import { UserPlus, User, Mail, Lock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const Signup = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validation, setValidation] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
        match: false
    });

    const { user } = useAuth();
    const navigate = useNavigate();

    // Prevent access if already logged in
    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    useEffect(() => {
        const { password, confirmPassword } = formData;
        setValidation({
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[@#$%^&+=!]/.test(password),
            match: password === confirmPassword && password.length > 0
        });
    }, [formData.password, formData.confirmPassword]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const isFormValid = () => {
        return Object.values(validation).every(v => v === true) && formData.username && formData.email;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid()) {
            toast.error("Please meet all password requirements");
            return;
        }

        setLoading(true);
        try {
            await signup({
                username: formData.username,
                email: formData.email,
                password: formData.password
            });
            toast.success('Account created successfully!');
            navigate('/');
        } catch (error) {
            toast.error(error.detail || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const ValidationItem = ({ label, met }) => (
        <div className={`d-flex align-items-center mb-1 small ${met ? 'text-success' : 'text-muted'}`} style={{ fontSize: '12px' }}>
            {met ? <CheckCircle size={14} className="me-2" /> : <XCircle size={14} className="me-2 text-danger opacity-50" />}
            {label}
        </div>
    );

    return (
        <div className="container d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh' }}>
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card shadow-lg p-4 border-0" 
                style={{ maxWidth: '480px', width: '100%', borderRadius: '24px' }}
            >
                <div className="text-center mb-4">
                    <div className="bg-primary d-inline-block p-3 rounded-circle mb-3 bg-opacity-10">
                        <UserPlus size={32} className="text-primary" />
                    </div>
                    <h2 className="fw-bold">Create Account</h2>
                    <p className="text-muted small">Join InvoiceXtract AI today</p>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="mb-3">
                        <label className="form-label fw-semibold small text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>Username</label>
                        <div className="input-group overflow-hidden" style={{ borderRadius: '12px' }}>
                            <span className="input-group-text bg-light border-0"><User size={18} className="text-muted" /></span>
                            <input
                                name="username"
                                type="text"
                                className="form-control bg-light border-0 ps-0 py-2"
                                placeholder="Choose a unique username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-semibold small text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>Email Address</label>
                        <div className="input-group overflow-hidden" style={{ borderRadius: '12px' }}>
                            <span className="input-group-text bg-light border-0"><Mail size={18} className="text-muted" /></span>
                            <input
                                name="email"
                                type="email"
                                className="form-control bg-light border-0 ps-0 py-2"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-semibold small text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>Password</label>
                        <div className="input-group overflow-hidden" style={{ borderRadius: '12px' }}>
                            <span className="input-group-text bg-light border-0"><Lock size={18} className="text-muted" /></span>
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                className="form-control bg-light border-0 ps-0 py-2"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <button 
                                type="button" 
                                className="btn bg-light border-0 text-muted px-3"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <div className="mt-3 p-3 bg-light rounded shadow-sm border-0" style={{ borderRadius: '12px' }}>
                            <ValidationItem label="At least 8 characters" met={validation.length} />
                            <ValidationItem label="Must include uppercase letter" met={validation.uppercase} />
                            <ValidationItem label="Must include lowercase letter" met={validation.lowercase} />
                            <ValidationItem label="Must include number" met={validation.number} />
                            <ValidationItem label="Must include special character (@, #, etc.)" met={validation.special} />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-semibold small text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>Confirm Password</label>
                        <div className="input-group overflow-hidden" style={{ borderRadius: '12px' }}>
                            <span className="input-group-text bg-light border-0"><Lock size={18} className="text-muted" /></span>
                            <input
                                name="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                className="form-control bg-light border-0 ps-0 py-2"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        {formData.confirmPassword && (
                            <div className={`small mt-2 px-1 ${validation.match ? 'text-success' : 'text-danger'}`}>
                                {validation.match ? '✅ Passwords match' : '❌ Passwords do not match'}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-100 fw-bold mb-4 shadow-sm py-3"
                        style={{ borderRadius: '12px' }}
                        disabled={loading || !isFormValid()}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Creating account...
                            </>
                        ) : 'Sign Up'}
                    </button>
                    
                    <div className="text-center">
                        <p className="small text-muted mb-0">
                            Already have an account? <Link to="/" className="text-primary fw-bold text-decoration-none">Login here</Link>
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Signup;
