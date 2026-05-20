import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Circle } from 'lucide-react';

const AIPipeline = ({ currentStep, status }) => {
    const steps = [
        { id: 'uploading', label: 'Upload Complete' },
        { id: 'reading', label: 'Reading Document' },
        { id: 'extracting', label: 'Extracting Invoice Data' },
        { id: 'validating', label: 'Validating Fields' },
        { id: 'syncing', label: 'Syncing with Zoho' },
        { id: 'finalizing', label: 'Finalizing' }
    ];

    const getStepStatus = (id) => {
        const stepIndex = steps.findIndex(s => s.id === id);
        const currentStepIndex = steps.findIndex(s => s.id === currentStep);
        
        if (status === 'completed') return 'completed';
        if (status === 'failed' && id === currentStep) return 'failed';
        if (status === 'failed' && stepIndex < currentStepIndex) return 'completed';
        
        if (stepIndex < currentStepIndex) return 'completed';
        if (stepIndex === currentStepIndex) return 'active';
        return 'pending';
    };

    return (
        <div className="w-100 py-3">
            {steps.map((step, index) => {
                const stepStatus = getStepStatus(step.id);
                
                return (
                    <div key={step.id} className="d-flex align-items-center mb-3">
                        <div className="me-3 position-relative d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px' }}>
                            <AnimatePresence mode="wait">
                                {stepStatus === 'completed' && (
                                    <motion.div 
                                        key="completed"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="bg-success rounded-circle p-1"
                                    >
                                        <Check size={14} className="text-white" />
                                    </motion.div>
                                )}
                                {stepStatus === 'active' && (
                                    <motion.div 
                                        key="active"
                                        initial={{ scale: 0.8, opacity: 0.5 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-primary"
                                    >
                                        <Loader2 size={20} className="spinner-border-anim" />
                                    </motion.div>
                                )}
                                {stepStatus === 'pending' && (
                                    <motion.div 
                                        key="pending"
                                        className="text-muted opacity-25"
                                    >
                                        <Circle size={16} />
                                    </motion.div>
                                )}
                                {stepStatus === 'failed' && (
                                    <motion.div 
                                        key="failed"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="bg-danger rounded-circle p-1"
                                    >
                                        <div className="text-white fw-bold" style={{ fontSize: '10px' }}>!</div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div 
                                    className="position-absolute top-100 start-50 translate-middle-x bg-light" 
                                    style={{ width: '2px', height: '12px', zIndex: -1 }}
                                />
                            )}
                        </div>
                        
                        <div className="flex-grow-1">
                            <span className={`fw-semibold small ${
                                stepStatus === 'active' ? 'text-dark' : 
                                stepStatus === 'completed' ? 'text-muted' : 
                                'text-muted opacity-50'
                            }`}>
                                {step.label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AIPipeline;
