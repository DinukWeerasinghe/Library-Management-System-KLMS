/**
 * Migration to add branding configuration keys.
 */
const { getDatabase } = require('./connection');

function runBrandingMigration() {
    const db = getDatabase();

    const brandingConfigs = [
        ['primary_color', '#4f46e5', 'Primary theme color'],
        ['secondary_color', '#64748b', 'Secondary theme color'],
        ['sidebar_color', '#111827', 'Sidebar background color'],
        ['button_color', '#4f46e5', 'Primary button color'],
        ['button_hover_color', '#4338ca', 'Primary button hover color'],
        ['header_text_color', '#ffffff', 'Header text color'],
        ['background_color', '#0f172a', 'Application background color'],
        ['school_name', 'Kumaradasa Library Management System', 'Name of the library/school'],
        ['school_logo', '', 'Base64 or path to school logo']
    ];

    brandingConfigs.forEach(([k, v, d]) => {
        db.prepare('INSERT OR IGNORE INTO Configuration (key, value, description) VALUES (?, ?, ?)').run(k, v, d);
    });

    console.log('Branding migration completed.');
}

module.exports = { runBrandingMigration };
