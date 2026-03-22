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
    return 'title,author,isbn,published_year,price,acquisition_type,category,total_copies,external_code\n"Sample Book","John Doe","9781234567890",2024,1500.50,"BOUGHT","Fiction",5,"EXT001"';
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
                if (rowData.acquisition_type) rowData.acquisition_type = rowData.acquisition_type.trim().toUpperCase();

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
 * @param {Electron.WebContents} [sender] - Optional webContents to stream progress events
 */
async function executeImport(rows, sender) {
    const stats = { success: 0, failed: 0, errors: [] };

    // Cache categories
    const allCategories = categoryService.getAll();
    const categoryMap = new Map(allCategories.map(c => [c.name.toLowerCase(), c.id]));

    const { getDatabase, setBatchMode, persist } = require('../database/connection');
    const db = getDatabase();
    const batchResult = db.prepare('INSERT INTO ImportBatch (type, row_count) VALUES (?, ?)').run('BOOK', 0);
    const batchId = Number(batchResult.lastInsertRowid);

    logger.info(`Processing ${rows.length} rows for BOOK import batch #${batchId}`);

    const actionableRows = rows.filter(r => r.status !== 'INVALID');
    const total = actionableRows.length;
    const CHUNK_SIZE = 100;

    const sendProgress = (done) => {
        if (sender && !sender.isDestroyed()) {
            sender.send('import:progress', { done, total, type: 'book' });
        }
    };

    setBatchMode(true);
    try {
        let processed = 0;

        for (let i = 0; i < actionableRows.length; i += CHUNK_SIZE) {
            const chunk = actionableRows.slice(i, i + CHUNK_SIZE);

            for (const row of chunk) {
                try {
                    const data = row.data;
                    if (row.status === 'MERGE') {
                        db.prepare('UPDATE Book SET total_copies = total_copies + ?, available_copies = available_copies + ? WHERE id = ?')
                            .run(data.total_copies, data.total_copies, row.existingBook.id);
                        stats.success++;
                    } else if (row.status === 'NEW') {
                        let categoryId = null;
                        if (data.category) {
                            const lowerCat = data.category.trim().toLowerCase();
                            if (categoryMap.has(lowerCat)) {
                                categoryId = categoryMap.get(lowerCat);
                            } else {
                                const newCat = categoryService.create({ name: data.category.trim() });
                                if (newCat && newCat.id) {
                                    categoryId = newCat.id;
                                    categoryMap.set(lowerCat, categoryId);
                                }
                            }
                        }
                        bookService.create({ ...data, category_id: categoryId, batch_id: batchId });
                        stats.success++;
                    }
                } catch (err) {
                    stats.failed++;
                    stats.errors.push({ row: row.id, message: err.message });
                    logger.error(`Import execution failed for row ${row.id}: ${err.message}`);
                }
            }

            processed += chunk.length;
            sendProgress(processed);
            // Yield event loop between chunks so IPC/UI stays responsive
            await new Promise(resolve => setImmediate(resolve));
        }

        persist();
    } catch (err) {
        logger.error(`Book import fatal error: ${err.message}`);
        persist(); // save whatever succeeded
        throw err;
    } finally {
        setBatchMode(false);
    }

    db.prepare('UPDATE ImportBatch SET row_count = ? WHERE id = ?').run(stats.success, batchId);
    sendProgress(total); // ensure 100%
    return stats;
}

module.exports = {
    getTemplateContent,
    previewImport,
    executeImport
};
