/**
 * Import Service
 * Handles bulk import of books from CSV files with duplicate detection.
 */
const fs = require('fs');
const bookService = require('./book-service');
const categoryService = require('./category-service');
const logger = require('../logger');
const { getDatabase } = require('../database/connection');

/**
 * Generates the CSV template content.
 */
function getTemplateContent() {
    return 'title,author,isbn,category,total_copies\n"Example Book","John Doe","978-3-16-148410-0","Fiction",5';
}

/**
 * Parses a CSV line handling quotes.
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
    return result.map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"'));
}

/**
 * Parses and Previews the import file.
 * Returns detailed row analysis without modifying DB.
 */
async function previewImport(filePath) {
    const rows = [];
    const summary = { new: 0, merge: 0, invalid: 0 };
    const db = getDatabase();

    // Prepare statements for duplicate detection
    const stmtCheckIsbn = db.prepare('SELECT id, title, author, total_copies FROM Book WHERE isbn = ?');
    const stmtCheckTitleAuthor = db.prepare('SELECT id, title, author, total_copies FROM Book WHERE lower(title) = lower(?) AND lower(author) = lower(?)');
    // Also check for existing external code if ISBN is used there? 
    // Requirement says: "If ISBN exists... Find Book where isbn = csv.isbn"
    // Requirement says: "If ISBN Empty... Check title + author"

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

        if (lines.length < 2) {
            throw new Error('File is empty or missing headers.');
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        if (!headers.includes('title')) throw new Error('Missing "title" column.');

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const resultRow = {
                id: i, // row ID for frontend key
                rawLine: line,
                status: 'NEW',
                message: '',
                data: {},
                existingBook: null
            };

            try {
                const cols = parseCsvLine(line);
                const rowData = {};
                headers.forEach((h, idx) => { if (cols[idx]) rowData[h] = cols[idx]; });

                // Sanitize
                if (rowData.isbn) rowData.isbn = rowData.isbn.toString().trim();
                if (rowData.title) rowData.title = rowData.title.trim();
                if (rowData.author) rowData.author = rowData.author.trim();

                // Validation
                if (!rowData.title) throw new Error('Title is required');
                const copies = parseInt(rowData.total_copies, 10);
                if (isNaN(copies) || copies < 1) throw new Error('Invalid copies');

                // Scientific Notation Check
                if (rowData.isbn && /e\+/i.test(rowData.isbn)) {
                    throw new Error('Scientific Notation detected in ISBN. Format cell as Text in Excel.');
                }

                resultRow.data = { ...rowData, total_copies: copies };

                // Duplicate Detection
                let match = null;

                // 1. Check ISBN
                if (rowData.isbn) {
                    match = stmtCheckIsbn.get(rowData.isbn);
                    if (match) {
                        resultRow.status = 'MERGE';
                        resultRow.matchType = 'ISBN';
                        resultRow.existingBook = match;
                        resultRow.message = `Matches ISBN: ${match.title}`;
                    }
                }

                // 2. Check Title+Author (if no ISBN match yet)
                if (!match) {
                    // Only strictly match if author is present to avoid false positives? 
                    // Requirement: "If ISBN Empty... Check title + author"
                    // Assuming if ISBN is provided but NOT found, we count it as NEW, or do we double check title?
                    // Requirement implies Step 2 is "IF ISBN EMPTY". 
                    // But usually duplicate check cascades. 
                    // Let's follow requirement strictly: "Step 2: IF ISBN EMPTY -> Check title + author"
                    // So if ISBN is present but not found, we create NEW (assuming distinct edition).

                    if (!rowData.isbn && rowData.title) {
                        const auth = rowData.author || ''; // Handle empty author match?
                        // If author is empty in DB and CSV?
                        // Let's stick to simple logic: Title + Author must match.
                        match = stmtCheckTitleAuthor.get(rowData.title, auth);
                        if (match) {
                            resultRow.status = 'MERGE';
                            resultRow.matchType = 'TITLE_AUTHOR';
                            resultRow.existingBook = match;
                            resultRow.message = `Matches Title/Author: ${match.title}`;
                        }
                    }
                }

                if (resultRow.status === 'NEW') summary.new++;
                else summary.merge++;

            } catch (err) {
                resultRow.status = 'INVALID';
                resultRow.message = err.message;
                summary.invalid++;
            }

            rows.push(resultRow);
        }

    } catch (err) {
        logger.error(`Preview failed: ${err.message}`);
        throw err;
    }

    return { rows, summary };
}

/**
 * Executes the import based on preview results.
 * @param {Array} rows - The list of rows processed by previewImport
 */
async function executeImport(rows) {
    const stats = { success: 0, failed: 0, errors: [] };

    // Cache categories
    const allCategories = categoryService.getAll();
    const categoryMap = new Map(allCategories.map(c => [c.name.toLowerCase(), c.id]));

    for (const row of rows) {
        if (row.status === 'INVALID') continue;

        try {
            const data = row.data;

            if (row.status === 'MERGE') {
                // MERGE: Update existing book
                const bookId = row.existingBook.id;
                const newCopies = data.total_copies;

                // Update total and available copies
                const db = getDatabase();
                db.prepare('UPDATE Book SET total_copies = total_copies + ?, available_copies = available_copies + ? WHERE id = ?')
                    .run(newCopies, newCopies, bookId);

                // Log?
            } else if (row.status === 'NEW') {
                // NEW: Create book
                // Category Logic
                let categoryId = null;
                if (data.category) {
                    const catName = data.category.trim();
                    const lowerCat = catName.toLowerCase();
                    if (categoryMap.has(lowerCat)) {
                        categoryId = categoryMap.get(lowerCat);
                    } else {
                        const newCat = categoryService.create({ name: catName });
                        if (newCat && newCat.id) {
                            categoryId = newCat.id;
                            categoryMap.set(lowerCat, categoryId);
                        }
                    }
                }

                bookService.create({
                    title: data.title,
                    author: data.author,
                    isbn: data.isbn || null,
                    category_id: categoryId,
                    total_copies: data.total_copies,
                    external_code: data.isbn || null
                });
            }
            stats.success++;
        } catch (err) {
            stats.failed++;
            stats.errors.push({ row: row.id, message: err.message });
            logger.error(`Import execution failed for row ${row.id}: ${err.message}`);
        }
    }

    return stats;
}

module.exports = {
    getTemplateContent,
    previewImport,
    executeImport
};
