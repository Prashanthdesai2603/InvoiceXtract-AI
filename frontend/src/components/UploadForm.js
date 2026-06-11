import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadInvoices } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Upload, X, CloudUpload, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProcessingOverlay from './AI/ProcessingOverlay';
import { validateFile } from '../utils/validation';
import { formatFileSize } from '../utils/format';

const FILE_ICONS = {
    'application/pdf': '📄',
    'application/msword': '📝',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
    'application/vnd.ms-excel': '📊',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
    'image/jpeg': '🖼️',
    'image/png': '🖼️',
};

const UploadForm = () => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [currentStep, setCurrentStep] = useState('uploading');
    const [status, setStatus] = useState('pending');
    const [processingResults, setProcessingResults] = useState([]);
    const navigate = useNavigate();

    const onDrop = useCallback((acceptedFiles) => {
        const newFiles = [...files];
        acceptedFiles.forEach(f => {
            const error = validateFile(f);
            if (error) {
                toast.error(`${f.name}: ${error}`);
            } else if (newFiles.find(e => e.name === f.name && e.size === f.size)) {
                toast.info(`${f.name} is already selected`);
            } else if (newFiles.length >= 100) {
                toast.warning('Maximum 100 files allowed');
            } else {
                newFiles.push(f);
            }
        });
        setFiles(newFiles);
        setStatus('pending');
    }, [files]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/msword': ['.doc'],
            'application/vnd.ms-excel': ['.xls'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png']
        },
        maxFiles: 100
    });

    const handleUpload = async () => {
        if (files.length === 0) return;
        setUploading(true);
        setCurrentStep('uploading');
        setStatus('active');

        try {
            const response = await uploadInvoices(files);
            const results = response.data;
            setProcessingResults(results);

            const failures = results.filter(r => r.status === 'failed');
            const successes = results.filter(r => r.status === 'processing' || r.status === 'success');
            const duplicates = results.filter(r => r.status === 'duplicate');

            if (duplicates.length > 0) duplicates.forEach(d => toast.info(`${d.file}: ${d.error}`));

            if (failures.length > 0) {
                toast.warning(`${successes.length} uploaded, ${failures.length} failed, ${duplicates.length} skipped.`);
            } else if (duplicates.length > 0 && successes.length === 0) {
                toast.info(`No new invoices. ${duplicates.length} duplicates detected.`);
                setTimeout(() => navigate('/history'), 2000);
            } else {
                if (files.length === 1) {
                    setTimeout(() => {
                        setCurrentStep('completed');
                        setStatus('completed');
                        toast.success('Invoice uploaded and processing!');
                        setTimeout(() => navigate('/history'), 1500);
                    }, 5000);
                }
            }
        } catch (error) {
            setStatus('failed');
            setUploading(false);
            toast.error('Extraction failed — ' + (error.response?.data?.detail || 'Server error'));
        }
    };

    const removeFile = (index, e) => {
        e.stopPropagation();
        const newFiles = [...files];
        newFiles.splice(index, 1);
        setFiles(newFiles);
    };

    const supportedTypes = ['PDF', 'Word', 'Excel', 'JPG', 'PNG'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Upload Invoices</h1>
                    <p className="page-subtitle">Drag & drop or browse files for AI extraction</p>
                </div>
            </div>

            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                {!uploading ? (
                    <>
                        {/* Dropzone */}
                        <div
                            {...getRootProps()}
                            className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
                        >
                            <input {...getInputProps()} />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 72, height: 72,
                                    borderRadius: '50%',
                                    background: isDragActive
                                        ? 'var(--brand-gradient)'
                                        : 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 4,
                                    transition: 'all 0.3s ease',
                                    boxShadow: isDragActive ? 'var(--shadow-brand)' : 'none',
                                }}>
                                    {isDragActive
                                        ? <CloudUpload size={30} color="white" />
                                        : <Upload size={28} style={{ color: '#4338ca' }} />
                                    }
                                </div>
                                {isDragActive ? (
                                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-500)', margin: 0 }}>
                                        Drop files here!
                                    </p>
                                ) : (
                                    <>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                                                Drag & drop your invoices
                                            </p>
                                            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
                                                or click to browse from your computer
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ pointerEvents: 'none' }}
                                        >
                                            Browse Files
                                        </button>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                                            {supportedTypes.map(t => (
                                                <span key={t} className="badge badge-neutral" style={{ fontSize: 11 }}>{t}</span>
                                            ))}
                                            <span className="badge badge-neutral" style={{ fontSize: 11 }}>Max 100 files · 20MB each</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Selected Files List */}
                        <AnimatePresence>
                            {files.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    style={{ marginTop: 16 }}
                                >
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        marginBottom: 10
                                    }}>
                                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
                                            Selected Files ({files.length}/100)
                                        </p>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => setFiles([])}
                                            style={{ fontSize: 12, color: 'var(--danger-text)' }}
                                        >
                                            Clear all
                                        </button>
                                    </div>

                                    <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                                        {files.map((f, idx) => (
                                            <motion.div
                                                key={`${f.name}-${idx}`}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 8 }}
                                                className="file-item"
                                            >
                                                <div className="file-icon-wrap">
                                                    <span style={{ fontSize: 18 }}>{FILE_ICONS[f.type] || '📄'}</span>
                                                </div>
                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <p style={{
                                                        margin: 0, fontWeight: 600, fontSize: 13,
                                                        color: 'var(--text-primary)',
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                    }}>
                                                        {f.name}
                                                    </p>
                                                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                                                        {formatFileSize(f.size)}
                                                    </p>
                                                </div>
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={(e) => removeFile(idx, e)}
                                                    style={{ color: 'var(--danger-text)', padding: 4 }}
                                                >
                                                    <X size={15} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <motion.div
                            initial={false}
                            animate={{ opacity: files.length > 0 ? 1 : 0.4 }}
                            style={{ marginTop: 20 }}
                        >
                            <button
                                className="btn btn-primary btn-lg"
                                style={{ width: '100%', justifyContent: 'center' }}
                                disabled={files.length === 0}
                                onClick={handleUpload}
                            >
                                <Sparkles size={16} />
                                Start AI Extraction
                                {files.length > 0 && (
                                    <span className="badge" style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        borderColor: 'rgba(255,255,255,0.3)',
                                        marginLeft: 4,
                                        fontSize: 11,
                                    }}>
                                        {files.length} {files.length === 1 ? 'file' : 'files'}
                                    </span>
                                )}
                            </button>
                        </motion.div>
                    </>
                ) : (
                    <ProcessingOverlay
                        currentStep={currentStep}
                        status={status}
                        files={files}
                        processingResults={processingResults}
                        onRetry={() => { setUploading(false); setStatus('pending'); setProcessingResults([]); }}
                    />
                )}
            </div>

            {/* Background preview (blurred) */}
            {uploading && files.length > 0 && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    zIndex: -2, opacity: 0.2, filter: 'blur(12px)', pointerEvents: 'none'
                }}>
                    {files[0].type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(files[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: 'var(--brand-gradient-soft)' }} />
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default UploadForm;
