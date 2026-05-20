import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const stepMessages = {
    uploading: [
        "Initializing secure upload tunnel...",
        "Encrypting document data...",
        "Finalizing file transfer..."
    ],
    reading: [
        "AI scanning document layout...",
        "Detecting text layers...",
        "Enhancing image contrast for OCR...",
        "Analyzing spatial relationships..."
    ],
    extracting: [
        "Identifying vendor signatures...",
        "Gemini AI: Extracting line items...",
        "Parsing tax information...",
        "Reading GST/VAT details...",
        "Cross-referencing totals..."
    ],
    validating: [
        "Validating mathematical consistency...",
        "Checking vendor authenticity...",
        "Verifying date formats...",
        "Running compliance checks..."
    ],
    syncing: [
        "Establishing Zoho Books connection...",
        "Matching vendor records...",
        "Preparing ledger entries...",
        "Syncing transaction data..."
    ],
    finalizing: [
        "Cleaning up extracted metadata...",
        "Ready for review!"
    ]
};

const AIActivityFeed = ({ currentStep, realLogs = [] }) => {
    const [messages, setMessages] = useState([]);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (realLogs && realLogs.length > 0) {
            // Use real logs from backend
            setMessages(realLogs.map(l => `[${l.time}] ${l.msg}`));
        } else if (currentStep) {
            // Fallback to simulated messages for initial upload phase
            const currentMsgs = stepMessages[currentStep] || [];
            if (messages.length < currentMsgs.length) {
                const interval = setInterval(() => {
                    setMessages(prev => {
                        if (prev.length < currentMsgs.length) {
                            return [...prev, currentMsgs[prev.length]];
                        }
                        return prev;
                    });
                }, 1000);
                return () => clearInterval(interval);
            }
        }
    }, [currentStep, realLogs]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="bg-light bg-opacity-50 rounded-4 p-3 border border-light shadow-inner mt-4" style={{ height: '140px', overflow: 'hidden' }}>
            <div className="d-flex align-items-center mb-2">
                <Sparkles size={14} className="text-primary me-2" />
                <span className="extra-small text-muted text-uppercase fw-bold ls-1" style={{ fontSize: '10px' }}>
                    Real-time AI Activity Feed
                </span>
            </div>
            
            <div ref={scrollRef} style={{ height: '90px', overflowY: 'auto' }} className="activity-scroll">
                <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={`${msg}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="small text-muted mb-1 d-flex align-items-start"
                        >
                            <span className="text-primary me-2">•</span>
                            <span style={{ fontSize: '12px', lineHeight: '1.4' }}>{msg}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .activity-scroll::-webkit-scrollbar { width: 3px; }
                .activity-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                .ls-1 { letter-spacing: 0.05em; }
            `}} />
        </div>
    );
};

export default AIActivityFeed;
