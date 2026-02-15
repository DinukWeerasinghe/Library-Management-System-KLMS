/**
 * Migration to add branding configuration keys.
 */
const { getDatabase } = require('./connection');

function runBrandingMigration() {
    const db = getDatabase();

    const brandingConfigs = [
        ['primary_color', '#3b82f6', 'Primary theme color'],
        ['secondary_color', '#64748b', 'Secondary theme color'],
        ['sidebar_color', '#0f172a', 'Sidebar background color'],
        ['button_color', '#3b82f6', 'Primary button color'],
        ['button_hover_color', '#2563eb', 'Primary button hover color'],
        ['header_text_color', '#f8fafc', 'Header text color'],
        ['background_color', '#020617', 'Application background color'],
        ['school_name', 'Kumaradasa Library Management System', 'Name of the library/school'],
        ['school_logo', '', 'Base64 or path to school logo']
    ];

    brandingConfigs.forEach(([k, v, d]) => {
        db.prepare('INSERT OR IGNORE INTO Configuration (key, value, description) VALUES (?, ?, ?)').run(k, v, d);
    });

    console.log('Branding migration completed.');
}

module.exports = { runBrandingMigration };
