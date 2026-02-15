/**
 * Theme Service
 * Loads theme configuration from the database.
 */
const configService = require('./config-service');

async function getTheme() {
    const configs = await configService.getAll();
    const theme = {};

    const themeKeys = [
        'primary_color',
        'secondary_color',
        'sidebar_color',
        'button_color',
        'button_hover_color',
        'header_text_color',
        'background_color',
        'school_name',
        'school_logo'
    ];

    Object.entries(configs).forEach(([key, value]) => {
        if (themeKeys.includes(key)) {
            // Convert snake_case to camelCase
            const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            theme[camelKey] = value;
        }
    });

    return theme;
}

module.exports = { getTheme };
