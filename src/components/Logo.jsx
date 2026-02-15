import React from 'react';
import { BookOpen } from 'lucide-react';

export function Logo({ size = 'medium', showText = true }) {
    const sizes = {
        small: { icon: 20, text: '1rem', gap: '0.5rem' },
        medium: { icon: 28, text: '1.5rem', gap: '0.75rem' },
        large: { icon: 40, text: '2rem', gap: '1rem' }
    };

    const { icon: iconSize, text: fontSize, gap } = sizes[size];

    return (
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap, userSelect: 'none' }}>
            <div className="logo-icon" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                padding: size === 'small' ? '6px' : '8px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
            }}>
                <BookOpen size={iconSize} color="white" strokeWidth={2.5} />
            </div>
            {showText && (
                <div className="logo-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                    <span style={{
                        fontSize,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        color: 'var(--color-primary)' // Make KLMS pop with primary color
                    }}>
                        KLMS
                    </span>
                    {size !== 'small' && (
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-muted)',
                            marginTop: '4px',
                            fontWeight: 500,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase'
                        }}>
                            Kumaradasa Library
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
