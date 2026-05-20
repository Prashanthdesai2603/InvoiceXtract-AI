import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginApi } from '../services/authService';
import { toast } from 'react-toastify';
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login, user } = useAuth();
    const navigate = useNavigate();

    // Prevent access if already logged in
    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await loginApi(username, password);
            login(data.access_token, data.user);
            toast.success('Login successful!');
            navigate('/dashboard');
        } catch (err) {
            console.error('Login error:', err.detail || err.message || err);
            const errorMessage = err.detail || (err.message === 'Network error' ? 'Server is unreachable. Please check your connection.' : 'Invalid username or password');
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card shadow-lg p-4 border-0"
                style={{ maxWidth: '420px', width: '100%', borderRadius: '24px' }}
            >
                <div className="text-center mb-4">
                    <div className="bg-primary d-inline-block p-3 rounded-circle mb-3 bg-opacity-10">
                        <LogIn size={32} className="text-primary" />
                    </div>
                    <h2 className="fw-bold">Welcome Back</h2>
                    <p className="text-muted small">Sign in to manage your invoices</p>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="alert alert-danger d-flex align-items-center small py-2 mb-4" 
                            role="alert"
                        >
                            <span className="me-2">⚠️</span> {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="mb-3">
                        <label className="form-label fw-semibold small text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>Username</label>
                        <div className="input-group overflow-hidden" style={{ borderRadius: '12px' }}>
                            <span className="input-group-text bg-light border-0"><User size={18} className="text-muted" /></span>
                            <input
                                type="text"
                                className="form-control bg-light border-0 ps-0 py-2"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-semibold small text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>Password</label>
                        <div className="input-group overflow-hidden" style={{ borderRadius: '12px' }}>
                            <span className="input-group-text bg-light border-0"><Lock size={18} className="text-muted" /></span>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-control bg-light border-0 ps-0 py-2"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                            <button 
                                type="button" 
                                className="btn bg-light border-0 text-muted px-3"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-100 fw-bold mb-4 shadow-sm d-flex align-items-center justify-content-center py-3"
                        style={{ borderRadius: '12px' }}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Logging in...
                            </>
                        ) : 'Login'}
                    </button>

                    <div className="text-center">
                        <p className="text-muted small mb-0">
                            New user? <Link to="/signup" className="text-primary fw-bold text-decoration-none">Register here</Link>
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;
