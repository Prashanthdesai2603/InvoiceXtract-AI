import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ExtractionPreview = ({ extraction }) => {
    const fields = [
        { label: 'Vendor Name', key: 'vendor_name', icon: '🏢' },
        { label: 'Invoice #', key: 'invoice_number', icon: '📄' },
        { label: 'Date', key: 'date', icon: '📅' },
        { label: 'Total Amount', key: 'total_amount', icon: '💰', format: (v) => v ? `₹${v.toLocaleString()}` : '' },
        { label: 'Category', key: 'category', icon: '🏷️' },
    ];

    return (
        <div className="row g-3">
            {fields.map((field, i) => {
                const value = extraction ? extraction[field.key] : null;
                const displayValue = field.format && value ? field.format(value) : value;

                return (
                    <div key={field.key} className={i < 2 ? "col-md-6" : "col-12"}>
                        <div className="d-flex align-items-center mb-1">
                            <span className="me-2" style={{ fontSize: '10px' }}>{field.icon}</span>
                            <div className="extra-small text-muted text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                                {field.label}
                            </div>
                        </div>
                        
                        <AnimatePresence mode="wait">
                            {value ? (
                                <motion.div
                                    key={`val-${field.key}`}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-2 bg-white bg-opacity-80 rounded-3 border border-primary border-opacity-10 shadow-sm"
                                    style={{ height: '45px', display: 'flex', alignItems: 'center' }}
                                >
                                    <span className="fw-bold text-primary text-truncate" style={{ fontSize: '14px' }}>
                                        {displayValue || 'Detecting...'}
                                    </span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={`skel-${field.key}`}
                                    animate={{ 
                                        backgroundColor: ["#f1f5f9", "#e2e8f0", "#f1f5f9"],
                                    }}
                                    transition={{ 
                                        duration: 1.5, 
                                        repeat: Infinity, 
                                        ease: "easeInOut" 
                                    }}
                                    style={{ height: '45px', width: '100%', borderRadius: '12px' }}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
};

export default ExtractionPreview;
