import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginApi } from '../services/authService';
import { toast } from 'react-toastify';
import { LogIn, User, Lock, Eye, EyeOff, FileText, CheckCircle, Zap, Shield, BarChart3, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) navigate('/dashboard');
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await loginApi(username, password);
            login(data.access_token, data.user);
            toast.success('Welcome back!');
            navigate('/dashboard');
        } catch (err) {
            const msg = err.detail || (err.message === 'Network error'
                ? 'Server unreachable. Check your connection.'
                : 'Invalid username or password.');
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: Zap, text: 'AI-powered data extraction in seconds' },
        { icon: Shield, text: 'Bank-grade security & encryption' },
        { icon: BarChart3, text: 'Real-time analytics & dashboards' },
    ];

    return (
        <div className="auth-layout">
            {/* Hero Panel */}
            <div className="auth-hero">
                <div className="auth-hero-glow" />
                <div className="auth-hero-glow-2" />

                {/* Logo */}
                <div style={{ position: 'relative', zIndex: 1, marginBottom: 48 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8
                    }}>
                        <div style={{
                            width: 40, height: 40,
                            background: 'rgba(255,255,255,0.15)',
                            borderRadius: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                            <FileText size={20} color="white" />
                        </div>
                        <span style={{ fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: -0.3 }}>
                            InvoiceXtract AI
                        </span>
                    </div>
                </div>

                {/* Headline */}
                <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
                    <h1 style={{
                        fontSize: 36, fontWeight: 800, color: 'white',
                        lineHeight: 1.15, letterSpacing: -1, margin: '0 0 16px 0'
                    }}>
                        Transform invoices into{' '}
                        <span style={{
                            background: 'linear-gradient(135deg, #a78bfa, #f9a8d4)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            structured data
                        </span>
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
                        Extract, validate, and sync invoice data automatically using enterprise-grade AI.
                    </p>
                </div>

                {/* Features */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {features.map(({ icon: Icon, text }, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 32, height: 32,
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: 8,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                border: '1px solid rgba(255,255,255,0.15)'
                            }}>
                                <Icon size={15} color="rgba(255,255,255,0.85)" />
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{text}</span>
                        </div>
                    ))}
                </div>

                {/* Bottom badge */}
                <div style={{
                    position: 'relative', zIndex: 1, marginTop: 'auto', paddingTop: 40,
                    display: 'flex', alignItems: 'center', gap: 8
                }}>
                </div>
            </div>

            {/* Form Panel */}
            <div className="auth-panel">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="auth-form-container"
                >
                    {/* Header */}
                    <div style={{ marginBottom: 28 }}>
                        <h2 style={{
                            fontSize: 22, fontWeight: 700,
                            color: 'var(--text-primary)',
                            margin: '0 0 6px', letterSpacing: -0.4
                        }}>
                            Sign in to your account
                        </h2>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                            Welcome back! Enter your credentials to continue.
                        </p>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ marginBottom: 16, overflow: 'hidden' }}
                            >
                                <div className="alert-error">
                                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                                    {error}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleSubmit} autoComplete="off">
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <div className="input-with-icon">
                                <User size={15} className="input-icon-left" />
                                <input
                                    id="login-username"
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="input-with-icon">
                                <Lock size={15} className="input-icon-left" />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    style={{ paddingRight: 42 }}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="input-icon-right"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <button
                            id="login-submit"
                            type="submit"
                            className="btn btn-primary btn-lg w-100"
                            style={{ width: '100%', marginTop: 8, marginBottom: 20, justifyContent: 'center' }}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <LogIn size={16} />
                                    Sign in
                                </>
                            )}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                                Don't have an account?{' '}
                                <Link
                                    to="/signup"
                                    style={{
                                        color: 'var(--brand-500)',
                                        fontWeight: 600,
                                        textDecoration: 'none'
                                    }}
                                >
                                    Create one free →
                                </Link>
                            </p>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
