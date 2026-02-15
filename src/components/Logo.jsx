import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';

export function Logo({ size = 'medium', showText = true }) {
    const [branding, setBranding] = useState({ schoolName: 'KLMS', schoolLogo: '' });

    useEffect(() => {
        // Load initial branding: school name from branding service, logo from config
        (async () => {
            try {
                const theme = await (window.klms.branding && window.klms.branding.getTheme ? window.klms.branding.getTheme() : {});
                const logo = window.klms.config && window.klms.config.get ? await window.klms.config.get('school_logo') : null;
                setBranding({
                    schoolName: (theme && theme.schoolName) || 'KLMS',
                    schoolLogo: logo || (theme && theme.schoolLogo) || ''
                });
            } catch (e) {
                // ignore
            }
        })();

        // Listen for runtime branding updates (Settings will dispatch this)
        const handler = (e) => {
            const d = e && e.detail ? e.detail : {};
            setBranding((prev) => ({
                schoolName: d.schoolName ?? prev.schoolName,
                schoolLogo: d.schoolLogo ?? prev.schoolLogo,
            }));
        };
        document.addEventListener('klms:branding-updated', handler);
        return () => document.removeEventListener('klms:branding-updated', handler);
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
                background: branding.schoolLogo ? 'transparent' : 'linear-gradient(135deg, var(--primary-color) 0%, var(--button-hover-color) 100%)',
                padding: branding.schoolLogo ? '0' : (size === 'small' ? '6px' : '8px'),
                borderRadius: '8px',
                boxShadow: branding.schoolLogo ? 'none' : `0 4px 6px -1px var(--primary-color-light)`,
                overflow: 'hidden',
                color: 'var(--header-text-color)'
            }}>
                {branding.schoolLogo ? (
                    (() => {
                        const maxH = size === 'large' ? 50 : size === 'medium' ? 40 : 30;
                        return <img src={branding.schoolLogo} alt="Logo" style={{ maxHeight: maxH, width: 'auto', objectFit: 'contain' }} />;
                    })()
                ) : (
                    <BookOpen size={iconSize} color="currentColor" strokeWidth={2.5} />
                )}
            </div>
            {showText && (
                <div className="logo-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                    <span style={{
                        fontSize,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        color: 'var(--primary-color)'
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
