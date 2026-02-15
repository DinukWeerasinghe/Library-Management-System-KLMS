import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';

export function Logo({ size = 'medium', showText = true }) {
    const [branding, setBranding] = useState({ schoolName: 'KLMS', schoolLogo: '' });

    useEffect(() => {
        window.klms.branding.getTheme().then(theme => {
            if (theme) {
                setBranding({
                    schoolName: theme.schoolName || 'KLMS',
                    schoolLogo: theme.schoolLogo || ''
                });
            }
        });
    }, []);

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
                background: branding.schoolLogo ? 'transparent' : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                padding: branding.schoolLogo ? '0' : (size === 'small' ? '6px' : '8px'),
                borderRadius: '8px',
                boxShadow: branding.schoolLogo ? 'none' : '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                overflow: 'hidden'
            }}>
                {branding.schoolLogo ? (
                    <img src={branding.schoolLogo} alt="Logo" style={{ height: iconSize * 1.5, width: 'auto', objectFit: 'contain' }} />
                ) : (
                    <BookOpen size={iconSize} color="white" strokeWidth={2.5} />
                )}
            </div>
            {showText && (
                <div className="logo-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                    <span style={{
                        fontSize,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        color: 'var(--color-primary)'
                    }}>
                        {branding.schoolName.split(' ')[0] || 'KLMS'}
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
                            {branding.schoolName.split(' ').slice(1).join(' ') || 'Library System'}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
