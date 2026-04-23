import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadInvoices } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressIndicator from './ProgressIndicator';
import { validateFile } from '../utils/validation';
import { formatFileSize } from '../utils/format';

const UploadForm = () => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [currentStep, setCurrentStep] = useState('uploading');
    const [status, setStatus] = useState('pending');
    const navigate = useNavigate();

    const onDrop = useCallback((acceptedFiles) => {
        const newFiles = [...files];
        
        acceptedFiles.forEach(f => {
            const error = validateFile(f);
            if (error) {
                toast.error(`${f.name}: ${error}`);
            } else if (newFiles.find(existing => existing.name === f.name && existing.size === f.size)) {
                toast.info(`${f.name} is already selected`);
            } else if (newFiles.length >= 10) {
                toast.warning("Maximum 10 files allowed");
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
        maxFiles: 10
    });

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setCurrentStep('uploading');
        setStatus('active');

        try {
            // Simulated progress for better UX
            setTimeout(() => setCurrentStep('extracting'), 1500);
            setTimeout(() => setCurrentStep('processing'), 3500);

            const response = await uploadInvoices(files);
            const results = response.data;

            const failures = results.filter(r => r.status === 'failed');
            const successes = results.filter(r => r.status === 'success');

            setTimeout(() => {
                setCurrentStep('completed');
                setStatus('completed');
                
                if (failures.length > 0) {
                    toast.warning(`${successes.length} processed, ${failures.length} failed.`);
                } else {
                    toast.success(`Successfully processed ${successes.length} invoices! ✅`);
                }

                setTimeout(() => {
                    // Redirect to history to see all uploaded items
                    navigate('/history');
                }, 1500);
            }, 5500);

        } catch (error) {
            console.error('Upload error:', error);
            setStatus('failed');
            setUploading(false);
            toast.error('Extraction Failed ❌ - ' + (error.response?.data?.detail || 'Server error'));
        }
    };

    const removeFile = (index, e) => {
        e.stopPropagation();
        const newFiles = [...files];
        newFiles.splice(index, 1);
        setFiles(newFiles);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container py-5"
        >
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="card glass-card p-4 p-md-5">
                        <div className="text-center mb-5">
                            <h2 className="fw-bold mb-2">Upload Your Invoices</h2>
                            <p className="text-muted">Process up to 10 documents at once with our powerful AI</p>
                        </div>

                        {!uploading ? (
                            <div className="upload-container">
                                <div 
                                    {...getRootProps()} 
                                    className={`dropzone ${isDragActive ? 'dropzone-active' : ''} mb-4`}
                                >
                                    <input {...getInputProps()} />
                                    <div className="d-flex flex-column align-items-center">
                                        <div className="bg-primary bg-opacity-10 p-4 rounded-circle mb-3">
                                            <Upload className="text-primary" size={40} />
                                        </div>
                                        {isDragActive ? (
                                            <p className="fs-5 fw-semibold text-primary">Drop them here!</p>
                                        ) : (
                                            <>
                                                <p className="fs-5 fw-semibold mb-1">Drag & drop your invoices here</p>
                                                <p className="text-muted small">Supports PDF, Word, Excel, Images (Max 10 files, 20MB each)</p>
                                                <button className="btn btn-outline-primary mt-2">Browse Files</button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {files.length > 0 && (
                                        <div className="selected-files-list mb-4">
                                            <p className="small fw-bold text-muted text-uppercase mb-2">Selected Files ({files.length}/10)</p>
                                            {files.map((f, idx) => (
                                                <motion.div 
                                                    key={`${f.name}-${idx}`}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 10 }}
                                                    className="selected-file bg-light p-2 rounded-3 d-flex align-items-center justify-content-between mb-2 border"
                                                >
                                                    <div className="d-flex align-items-center">
                                                        <div className="bg-white p-2 rounded border transition-all duration-300">
                                                            <FileText className="text-primary" size={18} />
                                                        </div>
                                                        <div className="ms-3">
                                                            <p className="mb-0 fw-semibold text-truncate small" style={{ maxWidth: '250px' }}>{f.name}</p>
                                                            <p className="mb-0 text-muted extra-small">{formatFileSize(f.size)}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        className="btn btn-link text-danger p-0 d-flex align-items-center border-0" 
                                                        onClick={(e) => removeFile(idx, e)}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </AnimatePresence>

                                <button 
                                    className="btn btn-primary btn-lg w-100 py-3 fw-bold shadow-sm"
                                    disabled={files.length === 0}
                                    onClick={handleUpload}
                                >
                                    Start Bulk AI Extraction
                                </button>
                            </div>
                        ) : (
                            <div className="progress-container py-4 text-center">
                                <ProgressIndicator currentStep={currentStep} status={status} />
                                
                                <div className="mt-5">
                                    {status === 'active' && (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="d-flex flex-column align-items-center"
                                        >
                                            <h4 className="fw-semibold mb-2">
                                                {currentStep === 'uploading' && 'Uploading document...'}
                                                {currentStep === 'extracting' && 'Reading text layers...'}
                                                {currentStep === 'processing' && 'AI is analyzing invoice fields...'}
                                            </h4>
                                            <p className="text-muted">This usually takes about 10-15 seconds</p>
                                        </motion.div>
                                    )}
                                    
                                    {status === 'failed' && (
                                        <div className="text-danger">
                                            <AlertCircle size={48} className="mb-3" />
                                            <h4 className="fw-semibold">Something went wrong</h4>
                                            <p className="mb-4">We couldn't process this document correctly.</p>
                                            <button className="btn btn-primary" onClick={() => { setUploading(false); setStatus('pending'); }}>
                                                Try Again
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .selected-file {
                    border: 1px solid #e2e8f0;
                }
                .selected-files-list {
                    max-height: 300px;
                    overflow-y: auto;
                    padding-right: 5px;
                }
                .selected-files-list::-webkit-scrollbar {
                    width: 5px;
                }
                .selected-files-list::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
            `}} />
        </motion.div>
    );
};

export default UploadForm;
