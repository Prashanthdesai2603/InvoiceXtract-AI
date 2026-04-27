import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, Info, Package, Truck, ChevronDown, ChevronUp, Clock, Eye, Trash2 } from 'lucide-react';
import { validateInvoice } from '../utils/validation';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Breakdown badge styling per type ────────────────────────────────────────
const TYPE_CONFIG = {
    SUPPLY: {
        label: 'SUPPLY',
        bg: 'rgba(99,102,241,0.12)',
        color: '#4f46e5',
        border: 'rgba(99,102,241,0.35)',
        icon: Package,
    },
    SERVICE: {
        label: 'SERVICE',
        bg: 'rgba(20,184,166,0.12)',
        color: '#0d9488',
        border: 'rgba(20,184,166,0.35)',
        icon: Truck,
    },
};

const TypeBadge = ({ type }) => {
    const cfg = TYPE_CONFIG[type?.toUpperCase()] || TYPE_CONFIG.SUPPLY;
    const Icon = cfg.icon;
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                background: cfg.bg,
                color: cfg.color,
                border: `1px solid ${cfg.border}`,
            }}
        >
            <Icon size={11} strokeWidth={2.5} />
            {cfg.label}
        </span>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ResultForm = ({ initialData, onSave, onDelete, saving }) => {
    const [formData, setFormData] = useState(initialData);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [breakdownExpanded, setBreakdownExpanded] = useState(true);

    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    // breakdown array from DB (sections_data field)
    const breakdown = formData?.sections_data || [];
    const hasBreakdown = Array.isArray(breakdown) && breakdown.length > 0;

    // Derived supply / service totals
    const supplyTotal = breakdown
        .filter(s => s.type === 'SUPPLY')
        .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

    const serviceTotal = breakdown
        .filter(s => s.type === 'SERVICE')
        .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

    const calculatedTotal = supplyTotal + serviceTotal;
    const storedTotal = parseFloat(formData?.total_amount) || 0;
    const totalMismatch = hasBreakdown && calculatedTotal > 0 && Math.abs(calculatedTotal - storedTotal) > 0.50;

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };
        setFormData(newFormData);

        if (touched[name]) {
            const validationErrors = validateInvoice(newFormData);
            setErrors(validationErrors);
        }
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched({ ...touched, [name]: true });
        const validationErrors = validateInvoice(formData);
        setErrors(validationErrors);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validationErrors = validateInvoice(formData);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length === 0) {
            onSave(formData);
        } else {
            const allTouched = {};
            Object.keys(formData).forEach(key => (allTouched[key] = true));
            setTouched(allTouched);
        }
    };

    const getInputClass = (name) => {
        const base = 'form-control form-control-lg transition-all duration-200';
        if (errors[name] && touched[name]) return `${base} border-danger`;
        if (touched[name] && !errors[name]) return `${base} border-success`;
        return base;
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card glass-card border-0"
        >
            {/* ── Header ── */}
            <div className="card-header bg-white bg-opacity-10 border-bottom py-3">
                <h5 className="mb-0 fw-bold d-flex align-items-center">
                    <Info size={20} className="text-primary me-2" />
                    Verify Extracted Information
                </h5>
            </div>

            <div className="card-body p-4">
                {/* ── Zoho Sync Status Banner ── */}
                <div className="mb-4">
                    {formData.zoho_status === "synced" && (
                        <div className="alert d-flex align-items-center mb-0 border-0" style={{ 
                            borderRadius: '12px', 
                            backgroundColor: 'rgba(20, 184, 166, 0.1)',
                            color: '#0d9488',
                            border: '1px solid rgba(20, 184, 166, 0.2)'
                        }}>
                            <CheckCircle size={18} className="me-2" />
                            <div className="flex-grow-1">
                                <span className="fw-bold">Synced to Zoho Books as {formData.document_type === 'purchase' ? 'Bill' : 'Invoice'}!</span>
                                <span className="ms-2 small opacity-75">ID: {formData.zoho_invoice_id}</span>
                            </div>
                            {formData.zoho_invoice_id && (
                                <a 
                                    href={`https://books.zoho.in/app#/${formData.document_type === 'purchase' ? 'bills' : 'invoices'}/${formData.zoho_invoice_id}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center fw-bold"
                                    style={{ color: '#0d9488' }}
                                >
                                    <Eye size={14} className="me-1" /> View
                                </a>
                            )}
                        </div>
                    )}
                    {formData.zoho_status === "failed" && (
                        <div className="alert d-flex align-items-center mb-0 border-0" style={{ 
                            borderRadius: '12px', 
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#dc2626',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            <AlertCircle size={18} className="me-2" />
                            <div className="flex-grow-1">
                                <span className="fw-bold">Zoho Sync Failed</span>
                                <p className="mb-0 small opacity-75">{formData.zoho_message}</p>
                            </div>
                        </div>
                    )}
                    {formData.zoho_status === "pending" && (
                        <div className="alert d-flex align-items-center mb-0 border-0" style={{ 
                            borderRadius: '12px', 
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            color: '#d97706',
                            border: '1px solid rgba(245, 158, 11, 0.2)'
                        }}>
                            <Clock size={18} className="me-2" />
                            <div className="flex-grow-1">
                                <span className="fw-bold">Sync Pending</span>
                                <p className="mb-0 small opacity-75">This document hasn't been synced to Zoho yet.</p>
                            </div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="row g-4">
                        {/* Document Type */}
                        <div className="col-12">
                            <label className="form-label fw-semibold small text-uppercase mb-1">Document Type</label>
                            <select
                                name="document_type"
                                className={getInputClass('document_type')}
                                value={formData.document_type || 'sales'}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            >
                                <option value="sales">Sales Invoice (Customer)</option>
                                <option value="purchase">Purchase Bill (Vendor)</option>
                            </select>
                            <div className="text-muted small mt-1">
                                {formData.document_type === 'purchase' 
                                    ? "This will be synced as a 'Bill' in Zoho Books." 
                                    : "This will be synced as an 'Invoice' in Zoho Books."}
                            </div>
                        </div>

                        {/* Vendor Name */}
                        <div className="col-12">
                            <label className="form-label fw-semibold small text-uppercase mb-1">Vendor Name</label>
                            <input
                                type="text"
                                name="vendor_name"
                                className={getInputClass('vendor_name')}
                                placeholder="e.g. Acme Corp"
                                value={formData.vendor_name || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                            <AnimatePresence>
                                {errors.vendor_name && touched.vendor_name && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-danger small mt-1 d-flex align-items-center"
                                    >
                                        <AlertCircle size={14} className="me-1" /> {errors.vendor_name}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Invoice Number */}
                        <div className="col-12">
                            <label className="form-label fw-semibold small text-uppercase mb-1">Invoice Number</label>
                            <input
                                type="text"
                                name="invoice_number"
                                className={getInputClass('invoice_number')}
                                placeholder="e.g. INV-2024-001"
                                value={formData.invoice_number || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                            <AnimatePresence>
                                {errors.invoice_number && touched.invoice_number && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-danger small mt-1 d-flex align-items-center"
                                    >
                                        <AlertCircle size={14} className="me-1" /> {errors.invoice_number}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Date */}
                        <div className="col-md-6">
                            <label className="form-label fw-semibold small text-uppercase mb-1">Invoice Date</label>
                            <input
                                type="date"
                                name="date"
                                className={getInputClass('date')}
                                value={formData.date || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                            <AnimatePresence>
                                {errors.date && touched.date && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-danger small mt-1 d-flex align-items-center"
                                    >
                                        <AlertCircle size={14} className="me-1" /> {errors.date}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Total Amount */}
                        <div className="col-md-6">
                            <label className="form-label fw-semibold small text-uppercase mb-1">Total Amount</label>
                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0 fw-bold">₹</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="total_amount"
                                    className={getInputClass('total_amount')}
                                    placeholder="0.00"
                                    value={formData.total_amount || ''}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                />
                            </div>
                            <AnimatePresence>
                                {errors.total_amount && touched.total_amount && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-danger small mt-1 d-flex align-items-center"
                                    >
                                        <AlertCircle size={14} className="me-1" /> {errors.total_amount}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* ── Multi-Section Breakdown ── */}
                    {hasBreakdown && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="mt-4"
                            style={{
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: '14px',
                                overflow: 'hidden',
                                background: 'rgba(248,250,252,0.7)',
                            }}
                        >
                            {/* Breakdown header — collapsible */}
                            <button
                                type="button"
                                onClick={() => setBreakdownExpanded(!breakdownExpanded)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(20,184,166,0.08))',
                                    border: 'none',
                                    cursor: 'pointer',
                                    borderBottom: breakdownExpanded ? '1px solid rgba(99,102,241,0.15)' : 'none',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.07em',
                                        textTransform: 'uppercase',
                                        color: '#4f46e5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <Info size={14} />
                                    Accounting Breakdown
                                    <span style={{
                                        background: '#4f46e5',
                                        color: '#fff',
                                        borderRadius: '999px',
                                        fontSize: '0.62rem',
                                        padding: '1px 8px',
                                        fontWeight: 700,
                                    }}>
                                        {breakdown.length} section{breakdown.length !== 1 ? 's' : ''}
                                    </span>
                                </span>
                                {breakdownExpanded
                                    ? <ChevronUp size={16} style={{ color: '#4f46e5' }} />
                                    : <ChevronDown size={16} style={{ color: '#4f46e5' }} />
                                }
                            </button>

                            <AnimatePresence initial={false}>
                                {breakdownExpanded && (
                                    <motion.div
                                        key="breakdown-body"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        {/* Mismatch warning */}
                                        {totalMismatch && (
                                            <div
                                                style={{
                                                    margin: '12px 14px 0',
                                                    padding: '8px 14px',
                                                    borderRadius: '8px',
                                                    background: 'rgba(245,158,11,0.1)',
                                                    border: '1px solid rgba(245,158,11,0.35)',
                                                    fontSize: '0.76rem',
                                                    color: '#92400e',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                }}
                                            >
                                                <AlertCircle size={14} />
                                                Breakdown sum (₹{calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) differs from recorded total (₹{storedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                                            </div>
                                        )}

                                        {/* Summary chips */}
                                        <div style={{ display: 'flex', gap: '10px', padding: '12px 14px 4px', flexWrap: 'wrap' }}>
                                            {supplyTotal > 0 && (
                                                <div style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '8px',
                                                    background: 'rgba(99,102,241,0.1)',
                                                    border: '1px solid rgba(99,102,241,0.25)',
                                                    fontSize: '0.75rem',
                                                    color: '#4f46e5',
                                                    fontWeight: 600,
                                                }}>
                                                    <Package size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                                                    Supply: ₹{supplyTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </div>
                                            )}
                                            {serviceTotal > 0 && (
                                                <div style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '8px',
                                                    background: 'rgba(20,184,166,0.1)',
                                                    border: '1px solid rgba(20,184,166,0.25)',
                                                    fontSize: '0.75rem',
                                                    color: '#0d9488',
                                                    fontWeight: 600,
                                                }}>
                                                    <Truck size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                                                    Service: ₹{serviceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Breakdown rows */}
                                        <div style={{ padding: '4px 14px 14px' }}>
                                            {breakdown.map((sec, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, x: -6 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '9px 12px',
                                                        borderRadius: '10px',
                                                        background: idx % 2 === 0 ? 'rgba(255,255,255,0.8)' : 'transparent',
                                                        marginTop: '4px',
                                                        border: '1px solid',
                                                        borderColor: idx % 2 === 0 ? 'rgba(226,232,240,0.8)' : 'transparent',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                        <TypeBadge type={sec.type} />
                                                        <span style={{
                                                            fontSize: '0.82rem',
                                                            color: '#475569',
                                                            fontWeight: 500,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            maxWidth: '160px',
                                                        }}
                                                            title={sec.description}
                                                        >
                                                            {sec.description || '—'}
                                                        </span>
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.87rem',
                                                        fontWeight: 700,
                                                        color: '#1e293b',
                                                        whiteSpace: 'nowrap',
                                                        marginLeft: '12px',
                                                    }}>
                                                        ₹{(parseFloat(sec.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </motion.div>
                                            ))}

                                            {/* Total row */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 12px',
                                                marginTop: '8px',
                                                borderRadius: '10px',
                                                background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(20,184,166,0.1))',
                                                border: '1px solid rgba(99,102,241,0.25)',
                                            }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Consolidated Total
                                                </span>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#4f46e5' }}>
                                                    ₹{storedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* No breakdown fallback note */}
                    {!hasBreakdown && (
                        <div
                            className="mt-4"
                            style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                background: 'rgba(100,116,139,0.07)',
                                border: '1px dashed rgba(100,116,139,0.3)',
                                fontSize: '0.78rem',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <Info size={14} />
                            No multi-section breakdown detected. This invoice has a single payment entry.
                        </div>
                    )}

                    <hr className="my-4" />

                    <div className="d-flex gap-3 mt-2">
                        <button
                            type="button"
                            className="btn btn-outline-danger btn-lg fw-bold px-4 d-flex align-items-center justify-content-center"
                            onClick={onDelete}
                            disabled={saving}
                            style={{ 
                                borderRadius: '12px',
                                transition: 'all 0.2s ease',
                                border: '2px solid #fee2e2',
                                color: '#ef4444',
                                background: '#fff'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#ef4444';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.borderColor = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fff';
                                e.currentTarget.style.color = '#ef4444';
                                e.currentTarget.style.borderColor = '#fee2e2';
                            }}
                            title="Delete Invoice"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg fw-bold py-3 flex-grow-1 d-flex align-items-center justify-content-center"
                            disabled={saving}
                            style={{ 
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                border: 'none',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)'
                            }}
                        >
                            {saving ? (
                                <span className="spinner-border spinner-border-sm me-2"></span>
                            ) : (
                                <Save size={20} className="me-2" />
                            )}
                            {saving ? 'Processing...' : 'Confirm & Save Invoice'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="card-footer bg-light border-0 py-3">
                <div className="d-flex align-items-center justify-content-center text-success small fw-semibold">
                    <CheckCircle size={16} className="me-2" />
                    AI has pre-filled these fields — verify before saving
                </div>
            </div>
        </motion.div>
    );
};

export default ResultForm;
