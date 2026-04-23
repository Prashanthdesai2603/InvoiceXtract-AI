import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupUser } from '../../services/api';
import { toast } from 'react-toastify';
import { UserPlus, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Signup = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const navigate = useNavigate();

    const validatePassword = (pass) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
        if (!regex.test(pass)) {
            return "Password must have 8+ chars, uppercase, lowercase, number, and special char.";
        }
        return "";
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        
        if (name === 'password') {
            setPasswordError(validatePassword(value));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const error = validatePassword(formData.password);
        if (error) {
            setPasswordError(error);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }

        setLoading(true);

        try {
            await signupUser({
                username: formData.username,
                email: formData.email,
                password: formData.password
            });
            toast.success('Account created successfully! Please login.');
            navigate('/login');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || "Registration failed. Try again.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: '90vh' }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card glass-card shadow-lg p-4" 
                style={{ maxWidth: '450px', width: '100%', borderRadius: '20px', border: 'none' }}
            >
                <div className="text-center mb-4">
                    <div className="bg-success d-inline-block p-3 rounded-circle mb-3 bg-opacity-10">
                        <UserPlus size={32} className="text-success" />
                    </div>
                    <h2 className="fw-bold fs-3">Create Account</h2>
                    <p className="text-muted small">Join InvoiceXtract AI to start managing your documents</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-semibold small">Username</label>
                        <input
                            type="text"
                            name="username"
                            className="form-control form-control-lg bg-light bg-opacity-50"
                            placeholder="John Doe"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label fw-semibold small">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="form-control form-control-lg bg-light bg-opacity-50"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label fw-semibold small">Password</label>
                        <input
                            type="password"
                            name="password"
                            className={`form-control form-control-lg bg-light bg-opacity-50 ${passwordError ? 'border-danger' : ''}`}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        <AnimatePresence>
                            {passwordError && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-danger extra-small mt-1"
                                >
                                    <AlertCircle size={12} className="me-1" />
                                    {passwordError}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="mb-4">
                        <label className="form-label fw-semibold small">Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            className="form-control form-control-lg bg-light bg-opacity-50"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-100 fw-bold py-3 shadow-sm d-flex align-items-center justify-content-center"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : (
                            <ShieldCheck size={20} className="me-2" />
                        )}
                        {loading ? 'Creating Account...' : 'Sign Up Now'}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-muted small">
                        Already have an account? <Link to="/login" className="text-primary fw-bold text-decoration-none">Login</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
