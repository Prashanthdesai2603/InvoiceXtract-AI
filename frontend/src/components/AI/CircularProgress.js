import React from 'react';
import { motion } from 'framer-motion';

const CircularProgress = ({ progress, size = 120, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                {/* Background Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(99, 102, 241, 0.1)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress Circle */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#progress-gradient)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    strokeLinecap="round"
                />
                <defs>
                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="position-absolute text-center">
                <motion.span 
                    key={progress}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h4 fw-bold mb-0 d-block text-primary"
                >
                    {Math.round(progress)}%
                </motion.span>
                <span className="extra-small text-muted text-uppercase fw-bold ls-1" style={{ fontSize: '10px' }}>
                    Progress
                </span>
            </div>
            
            {/* Pulsing Outer Ring */}
            <motion.div
                className="position-absolute rounded-circle border border-primary border-opacity-25"
                initial={{ width: size, height: size, opacity: 0.5 }}
                animate={{ 
                    width: size + 20, 
                    height: size + 20, 
                    opacity: 0 
                }}
                transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeOut" 
                }}
            />
        </div>
    );
};

export default CircularProgress;
