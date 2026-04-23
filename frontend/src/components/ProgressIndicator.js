import React from 'react';
import { Check, Loader2, Upload, FileSearch, Cpu, CheckCircle } from 'lucide-react';

const ProgressIndicator = ({ currentStep, status }) => {
    const steps = [
        { id: 'uploading', label: 'Uploading', icon: Upload },
        { id: 'extracting', label: 'Extracting Text', icon: FileSearch },
        { id: 'processing', label: 'AI Processing', icon: Cpu },
        { id: 'completed', label: 'Completed', icon: CheckCircle },
    ];

    const getStepStatus = (index) => {
        const stepIndex = steps.findIndex(s => s.id === currentStep);
        if (status === 'failed') return 'failed';
        if (index < stepIndex) return 'completed';
        if (index === stepIndex) return 'active';
        return 'pending';
    };

    return (
        <div className="w-100 py-4">
            <div className="d-flex justify-content-between position-relative mb-2">
                {/* Progress Line */}
                <div className="position-absolute top-50 start-0 translate-middle-y w-100" style={{ height: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }}>
                    <div 
                        className="h-100 bg-primary transition-all duration-500" 
                        style={{ 
                            width: `${(steps.findIndex(s => s.id === currentStep) / (steps.length - 1)) * 100}%`,
                            transition: 'width 0.5s ease-in-out'
                        }}
                    ></div>
                </div>

                {steps.map((step, index) => {
                    const stepStatus = getStepStatus(index);
                    const StepIcon = step.icon;

                    return (
                        <div key={step.id} className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 1, width: '80px' }}>
                            <div 
                                className={`rounded-circle d-flex align-items-center justify-content-center border-2 mb-2 transition-all duration-300 ${
                                    stepStatus === 'completed' ? 'bg-primary border-primary text-white shadow' :
                                    stepStatus === 'active' ? 'bg-white border-primary text-primary shadow' :
                                    stepStatus === 'failed' && index === steps.findIndex(s => s.id === currentStep) ? 'bg-danger border-danger text-white' :
                                    'bg-white border-light text-muted'
                                }`}
                                style={{ width: '40px', height: '40px' }}
                            >
                                {stepStatus === 'completed' ? (
                                    <Check size={20} />
                                ) : stepStatus === 'active' ? (
                                    <Loader2 size={20} className="spinner-border-anim" />
                                ) : (
                                    <StepIcon size={20} />
                                )}
                            </div>
                            <span className={`small fw-semibold text-center ${
                                stepStatus === 'active' ? 'text-primary' : 
                                stepStatus === 'completed' ? 'text-dark' : 
                                'text-muted'
                            }`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spinner-border-anim {
                    animation: spin 1.5s linear infinite;
                }
            `}} />
        </div>
    );
};

export default ProgressIndicator;
