/**
 * Import Service
 * Handles bulk import of books from CSV files.
 */
const fs = require('fs');
const bookService = require('./book-service');
const categoryService = require('./category-service');
const logger = require('../logger');

const EXPECTED_HEADERS = ['title', 'author', 'isbn', 'category', 'total_copies'];

/**
 * Generates the CSV template content.
 */
function getTemplateContent() {
    return 'title,author,isbn,category,total_copies\n"Example Book","John Doe","978-3-16-148410-0","Fiction",5';
}

/**
 * Parses a CSV line handling quotes.
 * e.g., "Title, with comma", Author -> ["Title, with comma", "Author"]
 */
function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"')); // Remove surrounding quotes and unescape double quotes
}

/**
 * Processes the bulk import.
 * @param {string} filePath 
 * @returns {Promise<Object>} { success, failed, errors }
 */
async function importBooks(filePath) {
    const stats = { success: 0, failed: 0, errors: [] };

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

        if (lines.length < 2) {
            throw new Error('File is empty or missing headers.');
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        // Simple validation of headers
        if (!headers.includes('title')) {
            throw new Error('Invalid CSV format. Missing "title" column.');
        }

        // Cache categories to minimize DB lookups
        const allCategories = categoryService.getAll();
        const categoryMap = new Map(allCategories.map(c => [c.name.toLowerCase(), c.id]));

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            try {
                const cols = parseCsvLine(line);
                const row = {};

                // Map columns based on headers index
                headers.forEach((h, idx) => {
                    if (cols[idx]) row[h] = cols[idx];
                });

                // 1. Validation
                if (!row.title) {
                    throw new Error('Title is required');
                }
                const copies = parseInt(row.total_copies, 10);
                if (isNaN(copies) || copies < 1) {
                    throw new Error('Total copies must be at least 1');
                }

                // 2. Category Logic
                let categoryId = null;
                if (row.category) {
                    const catName = row.category.trim();
                    const lowerCat = catName.toLowerCase();

                    if (categoryMap.has(lowerCat)) {
                        categoryId = categoryMap.get(lowerCat);
                    } else {
                        // Create new category
                        const newCat = categoryService.create({ name: catName });
                        if (newCat && newCat.id) {
                            categoryId = newCat.id;
                            categoryMap.set(lowerCat, categoryId);
                        }
                    }
                }

                // 3. Book Creation
                let finalIsbn = row.isbn ? row.isbn.toString().trim() : null;

                // Specific check for Excel Scientific Notation (e.g. 9.78E+12)
                if (finalIsbn && /e\+/i.test(finalIsbn)) {
                    throw new Error('ISBN is in scientific notation. Please format the cell as "Text" in Excel before saving.');
                }

                // User Requirement: If ISBN exists: Save into external_code.
                const bookData = {
                    title: row.title,
                    author: row.author,
                    isbn: finalIsbn,
                    category_id: categoryId,
                    total_copies: copies,
                    external_code: finalIsbn || null // Map ISBN to external_code as requested
                };

                bookService.create(bookData);
                stats.success++;

            } catch (rowErr) {
                stats.failed++;
                stats.errors.push({ row: i + 1, message: rowErr.message, data: line });
            }
        }

    } catch (err) {
        logger.error(`Import failed: ${err.message}`);
        throw err; // Re-throw fatal errors
    }

    return stats;
}

module.exports = {
    getTemplateContent,
    importBooks
};
