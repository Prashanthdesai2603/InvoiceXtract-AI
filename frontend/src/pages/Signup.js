import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signup } from '../services/authService';
import { toast } from 'react-toastify';
import { UserPlus, User, Mail, Lock, Eye, EyeOff, FileText, CheckCircle, XCircle, Zap, Shield, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const Signup = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validation, setValidation] = useState({
        length: false, uppercase: false, lowercase: false, number: false, special: false, match: false
    });

    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) navigate('/dashboard');
    }, [user, navigate]);

    useEffect(() => {
        const { password, confirmPassword } = formData;
        setValidation({
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[@#$%^&+=!]/.test(password),
            match: password === confirmPassword && password.length > 0,
        });
    }, [formData.password, formData.confirmPassword, formData]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const isFormValid = () =>
        Object.values(validation).every((v) => v === true) && formData.username && formData.email;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid()) { toast.error('Please meet all password requirements'); return; }
        setLoading(true);
        try {
            await signup({ username: formData.username, email: formData.email, password: formData.password });
            toast.success('Account created! Please sign in.');
            navigate('/');
        } catch (error) {
            toast.error(error.detail || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const rules = [
        { key: 'length',    label: 'At least 8 characters' },
        { key: 'uppercase', label: 'One uppercase letter' },
        { key: 'lowercase', label: 'One lowercase letter' },
        { key: 'number',    label: 'One number' },
        { key: 'special',   label: 'One special character (@, #, etc.)' },
    ];

    const features = [
        { icon: Zap,       text: 'Extract invoice data in seconds' },
        { icon: Shield,    text: 'Enterprise-grade security' },
        { icon: BarChart3, text: 'Built-in analytics & reporting' },
    ];

    return (
        <div className="auth-layout">
            {/* Hero Panel */}
            <div className="auth-hero">
                <div className="auth-hero-glow" />
                <div className="auth-hero-glow-2" />

                <div style={{ position: 'relative', zIndex: 1, marginBottom: 48 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

                <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
                    <h1 style={{
                        fontSize: 34, fontWeight: 800, color: 'white',
                        lineHeight: 1.15, letterSpacing: -0.8, margin: '0 0 14px'
                    }}>
                        Join thousands of{' '}
                        <span style={{
                            background: 'linear-gradient(135deg, #a78bfa, #f9a8d4)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            finance teams
                        </span>
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                        Automate your invoice processing workflow with state-of-the-art AI extraction.
                    </p>
                </div>

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

                <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', paddingTop: 40, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={14} color="rgba(255,255,255,0.5)" />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Free to get started · No credit card required</span>
                </div>
            </div>

            {/* Form Panel */}
            <div className="auth-panel" style={{ alignItems: 'flex-start', overflowY: 'auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="auth-form-container"
                    style={{ maxWidth: 420, paddingTop: 8 }}
                >
                    <div style={{ marginBottom: 28 }}>
                        <h2 style={{
                            fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
                            margin: '0 0 6px', letterSpacing: -0.4
                        }}>
                            Create your account
                        </h2>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                            Get started free — no credit card required.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} autoComplete="off">
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <div className="input-with-icon">
                                <User size={15} className="input-icon-left" />
                                <input
                                    id="signup-username"
                                    name="username"
                                    type="text"
                                    className="form-input"
                                    placeholder="Choose a username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <div className="input-with-icon">
                                <Mail size={15} className="input-icon-left" />
                                <input
                                    id="signup-email"
                                    name="email"
                                    type="email"
                                    className="form-input"
                                    placeholder="name@company.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="input-with-icon">
                                <Lock size={15} className="input-icon-left" />
                                <input
                                    id="signup-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    style={{ paddingRight: 42 }}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>

                            {formData.password && (
                                <div className="password-rules">
                                    {rules.map(({ key, label }) => (
                                        <div key={key} className={`rule-item ${validation[key] ? 'met' : ''}`}>
                                            {validation[key]
                                                ? <CheckCircle size={12} />
                                                : <XCircle size={12} style={{ color: 'var(--danger-text)', opacity: 0.6 }} />
                                            }
                                            {label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <div className="input-with-icon">
                                <Lock size={15} className="input-icon-left" />
                                <input
                                    id="signup-confirm-password"
                                    name="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            {formData.confirmPassword && (
                                <div style={{
                                    fontSize: 12, marginTop: 6,
                                    color: validation.match ? 'var(--success-text)' : 'var(--danger-text)',
                                    display: 'flex', alignItems: 'center', gap: 6
                                }}>
                                    {validation.match
                                        ? <><CheckCircle size={12} /> Passwords match</>
                                        : <><XCircle size={12} /> Passwords do not match</>
                                    }
                                </div>
                            )}
                        </div>

                        <button
                            id="signup-submit"
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%', marginTop: 4, marginBottom: 20, justifyContent: 'center' }}
                            disabled={loading || !isFormValid()}
                        >
                            {loading ? (
                                <><span className="spinner" /> Creating account...</>
                            ) : (
                                <><UserPlus size={16} /> Create Account</>
                            )}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                                Already have an account?{' '}
                                <Link to="/" style={{ color: 'var(--brand-500)', fontWeight: 600, textDecoration: 'none' }}>
                                    Sign in →
                                </Link>
                            </p>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default Signup;
