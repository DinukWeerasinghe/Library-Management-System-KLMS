/**
 * Import Service
 * Handles bulk import of books from CSV files.
 */
const fs = require('fs');
const bookService = require('./book-service');
const categoryService = require('./category-service');
const logger = require('../logger');
const { getDatabase } = require('../database/connection');

/**
 * Generates the CSV template content for books.
 */
function getTemplateContent() {
    return 'title,author,isbn,category,total_copies,external_code\n"Sample Book","John Doe","9781234567890","Fiction",5,"EXT001"';
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
 * @param {string} filePath 
 */
async function previewImport(filePath) {
    const rows = [];
    const summary = { new: 0, merge: 0, invalid: 0 };

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

        if (lines.length < 2) {
            throw new Error('File is empty or missing headers.');
        }

        const db = getDatabase();
        const stmtCheckIsbn = db.prepare('SELECT id, title FROM Book WHERE isbn = ?');
        const stmtCheckTitleAuthor = db.prepare('SELECT id, title FROM Book WHERE title = ? AND author = ?');

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        if (!headers.includes('title')) throw new Error('Missing "title" column.');

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const resultRow = {
                id: i,
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
                    if (!rowData.isbn && rowData.title) {
                        const auth = rowData.author || '';
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
        logger.error(`Import Preview failed: ${err.message}`);
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

    // 1. Create ImportBatch
    const db = getDatabase();
    const batchResult = db.prepare('INSERT INTO ImportBatch (type, row_count) VALUES (?, ?)').run('BOOK', 0);
    const batchId = Number(batchResult.lastInsertRowid);

    logger.info(`Processing ${rows.length} rows for BOOK import batch #${batchId}`);

    for (const row of rows) {
        if (row.status === 'INVALID') {
            logger.debug(`Skipping row ${row.id}: status is INVALID`);
            continue;
        }

        try {
            const data = row.data;

            if (row.status === 'MERGE') {
                logger.debug(`Merging book: ${data.title}, bookId: ${row.existingBook.id}`);
                // MERGE: Update existing book
                const bookId = row.existingBook.id;
                const newCopies = data.total_copies;

                // Update total and available copies
                db.prepare('UPDATE Book SET total_copies = total_copies + ?, available_copies = available_copies + ? WHERE id = ?')
                    .run(newCopies, newCopies, bookId);

                stats.success++;
            } else if (row.status === 'NEW') {
                logger.info(`Creating book: ${data.title}, batch_id: ${batchId}`);
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
                    ...data,
                    category_id: categoryId,
                    batch_id: batchId
                });
                stats.success++;
            } else {
                logger.debug(`Unknown row status ${row.status} for row ${row.id}`);
            }
        } catch (err) {
            stats.failed++;
            stats.errors.push({ row: row.id, message: err.message });
            logger.error(`Import execution failed for row ${row.id}: ${err.message}`);
        }
    }

    // Update batch with final successful count
    db.prepare('UPDATE ImportBatch SET row_count = ? WHERE id = ?').run(stats.success, batchId);

    return stats;
}

module.exports = {
    getTemplateContent,
    previewImport,
    executeImport
};
