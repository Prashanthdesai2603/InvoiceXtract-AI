import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Cpu, AlertCircle, CheckCircle2, XCircle, Hourglass, BarChart3 } from 'lucide-react';
import CircularProgress from './CircularProgress';
import AIPipeline from './AIPipeline';
import AIActivityFeed from './AIActivityFeed';
import ExtractionPreview from './FieldSkeleton';
import { getInvoicesStatus } from '../../services/api';

const ProcessingOverlay = ({ currentStep: manualStep, status: manualStatus, files, processingResults, onRetry }) => {
    const [progress, setProgress] = useState(0);
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [stats, setStats] = useState({
        total: files.length,
        processed: 0,
        success: 0,
        failed: 0,
        eta: null,
        isInitial: true
    });
    
    // Stage to Progress Mapping
    const stageProgress = {
        'pending': 5,
        'reading': 15,
        'extracting': 40,
        'validating': 65,
        'syncing': 85,
        'finalizing': 95,
        'completed': 100,
        'failed': 0 // Handled separately
    };

    // Calculate global progress based on all files
    const calculateGlobalProgress = (data) => {
        if (!data || data.length === 0) return 0;
        const totalPoints = data.length * 100;
        const currentPoints = data.reduce((sum, inv) => {
            if (inv.status === 'completed') return sum + 100;
            if (inv.status === 'failed') return sum + 100; // Count failed as "done" for progress bar
            return sum + (stageProgress[inv.current_step] || 5);
        }, 0);
        return Math.round((currentPoints / totalPoints) * 100);
    };

    // Real-time status polling for bulk uploads
    useEffect(() => {
        if (!processingResults || processingResults.length === 0) return;

        const ids = processingResults.map(r => r.id).filter(Boolean);
        if (ids.length === 0) return;

        const startTime = Date.now();
        let isSubscribed = true;

        const pollStatus = async () => {
            try {
                const response = await getInvoicesStatus(ids);
                if (!isSubscribed) return;

                const data = response.data;
                const successCount = data.filter(inv => inv.status === 'completed').length;
                const failedCount = data.filter(inv => inv.status === 'failed').length;
                const processedCount = successCount + failedCount;

                // Find currently processing invoice for the preview/feed
                const current = data.find(inv => inv.status === 'processing') || 
                                data.find(inv => inv.status === 'pending') || 
                                data[processedCount] || 
                                data[data.length - 1];
                
                setActiveInvoice(current);

                // Update real progress
                const newProgress = calculateGlobalProgress(data);
                setProgress(newProgress);

                // Calculate ETA
                let eta = null;
                if (processedCount > 0 && processedCount < ids.length) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const timePerItem = elapsed / processedCount;
                    const remaining = ids.length - processedCount;
                    eta = Math.round(timePerItem * remaining);
                }

                setStats({
                    total: ids.length,
                    processed: processedCount,
                    success: successCount,
                    failed: failedCount,
                    eta,
                    isInitial: false
                });

                if (processedCount < ids.length) {
                    setTimeout(() => {
                        if (isSubscribed) pollStatus();
                    }, 1500);
                }
            } catch (error) {
                console.error("Polling error:", error);
                if (isSubscribed) {
                    setTimeout(pollStatus, 3000);
                }
            }
        };

        pollStatus();
        return () => { isSubscribed = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processingResults]);

    return (
        <div className="processing-overlay position-relative w-100 h-100 d-flex align-items-center justify-content-center py-5">
            {/* Background Blur Elements */}
            <div className="position-absolute top-0 start-0 w-100 h-100 overflow-hidden" style={{ zIndex: -1 }}>
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 20, repeat: Infinity }}
                    className="position-absolute rounded-circle bg-primary" 
                    style={{ width: '400px', height: '400px', filter: 'blur(100px)', top: '-100px', left: '-100px' }} 
                />
                <motion.div 
                    animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, -90, 0],
                        opacity: [0.1, 0.15, 0.1]
                    }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="position-absolute rounded-circle bg-purple" 
                    style={{ width: '300px', height: '300px', filter: 'blur(100px)', bottom: '-50px', right: '-50px', background: '#a855f7' }} 
                />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="glass-card premium-card border-0 shadow-lg p-4 p-md-5 overflow-hidden position-relative"
                style={{ maxWidth: '900px', width: '100%', minHeight: '600px', borderRadius: '32px' }}
            >
                {/* Header Section */}
                <div className="row mb-5 align-items-center">
                    <div className="col">
                        <div className="d-flex align-items-center mb-1">
                            <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-3">
                                <Cpu className="text-primary" size={24} />
                            </div>
                            <div>
                                <h3 className="fw-bold mb-0">Financial Intelligence Engine</h3>
                                <p className="text-muted small mb-0">
                                    {stats.total > 1 
                                        ? `Processing Batch: ${stats.processed + 1} of ${stats.total} files` 
                                        : 'Real-time Document Analysis Active'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col-auto d-none d-md-block">
                        <div className="badge bg-white bg-opacity-50 text-dark border px-3 py-2 rounded-pill shadow-sm d-flex align-items-center">
                            <ShieldCheck size={14} className="text-success me-2" />
                            <span className="small fw-bold">Enterprise Security Active</span>
                        </div>
                    </div>
                </div>

                {manualStatus === 'failed' ? (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-5"
                    >
                        <div className="bg-danger bg-opacity-10 p-4 rounded-circle d-inline-block mb-4">
                            <AlertCircle size={64} className="text-danger" />
                        </div>
                        <h2 className="fw-bold mb-2">Processing Interrupted</h2>
                        <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '400px' }}>
                            We encountered an issue while extracting data from your document. Please ensure the file is a valid invoice.
                        </p>
                        <button className="btn btn-primary btn-lg px-5 py-3 rounded-4 fw-bold shadow" onClick={onRetry}>
                            Return to Upload
                        </button>
                    </motion.div>
                ) : (
                    <div className="row g-5">
                        {/* Left Column: Progress & Steps */}
                        <div className="col-lg-5">
                            <div className="d-flex flex-column align-items-center mb-5">
                                <CircularProgress progress={progress} />
                                <div className="text-center mt-3">
                                    <h5 className="fw-bold mb-1">
                                        {stats.processed === stats.total ? 'Batch Processing Complete' : 'AI Analysis in Progress'}
                                    </h5>
                                    <p className="text-muted small text-truncate px-3" style={{ maxWidth: '100%' }}>
                                        {activeInvoice?.file_name || (files[0]?.name) || 'Invoice.pdf'}
                                    </p>
                                </div>
                            </div>
                            
                            <AIPipeline currentStep={activeInvoice?.current_step || manualStep} status={activeInvoice?.status || manualStatus} />
                        </div>

                        {/* Right Column: Activity & Preview */}
                        <div className="col-lg-7">
                            <div className="h-100 d-flex flex-column">
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h6 className="fw-bold mb-0 text-uppercase ls-1 small">Extraction Preview</h6>
                                        <div className="pulse-dot" />
                                    </div>
                                    
                                    <div className="p-4 bg-white bg-opacity-30 rounded-4 border border-white border-opacity-50 shadow-sm">
                                        <ExtractionPreview extraction={activeInvoice?.extraction} />
                                    </div>
                                </div>
                                
                                <AIActivityFeed currentStep={activeInvoice?.current_step || manualStep} realLogs={activeInvoice?.logs} />
                                
                                {/* Bulk Progress Tracker Section */}
                                {files.length > 1 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 p-4 rounded-4 bg-white bg-opacity-50 border border-white border-opacity-60 shadow-sm overflow-hidden position-relative"
                                    >
                                        {/* Background pulse for processing state */}
                                        {stats.processed < stats.total && !stats.isInitial && (
                                            <motion.div 
                                                animate={{ x: ['-100%', '200%'] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                                className="position-absolute top-0 start-0 h-100 w-25"
                                                style={{ 
                                                    background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.05), transparent)',
                                                    zIndex: 0
                                                }}
                                            />
                                        )}

                                        <div className="position-relative" style={{ zIndex: 1 }}>
                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                <div>
                                                    <h6 className="fw-bold mb-0 text-primary d-flex align-items-center">
                                                        <BarChart3 size={16} className="me-2" />
                                                        Bulk Progress Tracker
                                                    </h6>
                                                    <p className="extra-small text-muted mb-0">
                                                        {stats.isInitial ? 'Initializing batch...' : `${stats.processed} / ${stats.total} invoices processed`}
                                                    </p>
                                                </div>
                                                {stats.eta !== null && stats.processed < stats.total && (
                                                    <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-3 py-2 rounded-pill d-flex align-items-center">
                                                        <Hourglass size={12} className="me-2" />
                                                        <span className="extra-small fw-bold">ETA: {stats.eta}s</span>
                                                    </div>
                                                )}
                                                {stats.processed === stats.total && stats.total > 0 && (
                                                    <div className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-20 px-3 py-2 rounded-pill d-flex align-items-center">
                                                        <CheckCircle2 size={12} className="me-2" />
                                                        <span className="extra-small fw-bold">Complete</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="progress rounded-pill mb-4" style={{ height: '8px', background: '#e2e8f0', overflow: 'hidden' }}>
                                                <motion.div 
                                                    className={`progress-bar rounded-pill shadow-sm ${stats.processed === stats.total ? 'bg-success' : 'bg-primary'}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(stats.processed / stats.total) * 100}%` }}
                                                    transition={{ type: "spring", stiffness: 50, damping: 20 }}
                                                    style={{ height: '100%' }}
                                                />
                                            </div>

                                            <div className="row g-3">
                                                <div className="col-6">
                                                    <div className="p-3 rounded-3 bg-success bg-opacity-10 border border-success border-opacity-20 d-flex align-items-center transition-all shadow-sm h-100">
                                                        <div className="bg-success bg-opacity-20 p-2 rounded-circle me-3">
                                                            <CheckCircle2 size={16} className="text-success" />
                                                        </div>
                                                        <div>
                                                            <p className="extra-small text-muted mb-0 fw-bold text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>Success</p>
                                                            <motion.h5 
                                                                key={stats.success}
                                                                initial={{ scale: 1.2, color: '#10b981' }}
                                                                animate={{ scale: 1, color: '#10b981' }}
                                                                className="mb-0 fw-bold"
                                                            >
                                                                {stats.success}
                                                            </motion.h5>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="p-3 rounded-3 bg-danger bg-opacity-10 border border-danger border-opacity-20 d-flex align-items-center transition-all shadow-sm h-100">
                                                        <div className="bg-danger bg-opacity-20 p-2 rounded-circle me-3">
                                                            <XCircle size={16} className="text-danger" />
                                                        </div>
                                                        <div>
                                                            <p className="extra-small text-muted mb-0 fw-bold text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>Failed</p>
                                                            <motion.h5 
                                                                key={stats.failed}
                                                                initial={{ scale: 1.2, color: '#ef4444' }}
                                                                animate={{ scale: 1, color: '#ef4444' }}
                                                                className="mb-0 fw-bold"
                                                            >
                                                                {stats.failed}
                                                            </motion.h5>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {stats.processed === stats.total && stats.total > 0 && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="mt-4 text-center"
                                                >
                                                    <button 
                                                        className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm"
                                                        onClick={() => window.location.href = '/history'}
                                                    >
                                                        View All Results
                                                    </button>
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Bottom Branding */}
                <div className="mt-5 pt-4 border-top border-light d-flex justify-content-between align-items-center opacity-75">
                    <div className="small text-muted">
                        Processing {files.length} document{files.length !== 1 ? 's' : ''} in queue
                    </div>
                    <div className="d-flex align-items-center">
                        <span className="small text-muted me-2">Verified by</span>
                        <div className="fw-bold text-primary ls-1 small">INVOICEXTRACT AI</div>
                    </div>
                </div>
            </motion.div>

            <style dangerouslySetInnerHTML={{ __html: `
                .glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                }
                .premium-card {
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
                }
                .pulse-dot {
                    width: 8px;
                    height: 8px;
                    background-color: #6366f1;
                    border-radius: 50%;
                    box-shadow: 0 0 0 rgba(99, 102, 241, 0.4);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
                .ls-1 { letter-spacing: 0.1em; }
            `}} />
        </div>
    );
};

export default ProcessingOverlay;

