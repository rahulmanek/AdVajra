import { useMemo } from 'react';
import Tooltip from './Tooltip';

const Sparkline = ({
    data,
    width = 100,
    height = 30,
    color = '#10b981',
    strokeWidth = 2,
    fill = false
}) => {
    const state = useMemo(() => {
        if (!data) return 'loading';
        if (data.length === 0) return 'zero';
        
        const sum = data.reduce((acc, val) => acc + val, 0);
        if (sum === 0) return 'zero';
        
        return 'active';
    }, [data]);

    const path = useMemo(() => {
        if (state !== 'active') return '';
        
        const points = data;
        if (points.length < 2) return '';

        const max = Math.max(...points);
        const min = Math.min(...points);
        const range = max - min || 1;
        const stepX = width / (points.length - 1);

        // Calculate points
        const coords = points.map((val, i) => {
            const x = i * stepX;
            // Draw at the bottom if no variation
            let y = height;
            if (max !== min) {
                y = height - ((val - min) / range) * height;
            } else if (val > 0) {
                y = height / 2; // draw in the middle if constant > 0
            }
            return `${x},${y}`;
        });

        // Create line path
        let d = `M ${coords[0]}`;
        for (let i = 1; i < coords.length; i++) {
            d += ` L ${coords[i]}`;
        }

        return d;
    }, [data, state, width, height]);

    if (state === 'loading') {
        return (
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                <rect x="10" y={height / 2 - 1} width={width - 20} height="2" rx="1" fill="#e2e8f0" opacity="0.3" />
            </svg>
        );
    }

    if (state === 'zero') {
        return (
            <Tooltip content="Gathering performance data..." style={{ fontSize: '0.85em' }}>
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', cursor: 'help' }}>
                    <line x1="0" y1={height - 2} x2={width} y2={height - 2} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
                    
                    <circle cx={width/2} cy={height/2} r="4" fill="#10b981" opacity="0.8">
                        <animate attributeName="r" values="3; 6; 3" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8; 0.2; 0.8" dur="2s" repeatCount="indefinite" />
                    </circle>
                </svg>
            </Tooltip>
        );
    }

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            {/* Glow Filter */}
            <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* The Line */}
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                style={{
                    transition: 'all 0.3s ease',
                    opacity: 0.8
                }}
            />

            {/* End Dot */}
            {path && (
                <circle
                    cx={width}
                    cy={path.split(' ').pop().split(',')[1]}
                    r={3}
                    fill={color}
                    filter="url(#glow)"
                />
            )}
        </svg>
    );
};

export default Sparkline;
