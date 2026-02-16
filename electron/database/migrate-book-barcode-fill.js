const { getDatabase, saveDatabase } = require('./connection');
const barcodeService = require('../services/barcode-service');
const logger = require('../logger');

/**
 * Backfills internal_code and barcode_path for all books that are missing them.
 * This ensures every book is printable and has a unique KLMS identifier.
 */
async function runBookBarcodeFillMigration() {
    const db = getDatabase();

    // 1. Find books missing internal_code
    const missingCodes = db.prepare("SELECT id, title FROM Book WHERE internal_code IS NULL OR internal_code = ''").all();

    if (missingCodes.length > 0) {
        logger.info(`Found ${missingCodes.length} books missing internal codes. Backfilling...`);

        for (const book of missingCodes) {
            // Get next sequential code
            const last = db.prepare("SELECT internal_code FROM Book WHERE internal_code LIKE 'B%' ORDER BY internal_code DESC LIMIT 1").get();
            let nextNum = 1;
            if (last && last.internal_code) {
                const num = parseInt(last.internal_code.substring(1), 10);
                if (!isNaN(num)) nextNum = num + 1;
            }
            const newCode = `B${String(nextNum).padStart(6, '0')}`;

            db.prepare("UPDATE Book SET internal_code = ? WHERE id = ?").run(newCode, book.id);
            logger.info(`Assigned code ${newCode} to book: ${book.title}`);
        }
        saveDatabase();
    }

    // 2. Find books with internal_code but missing barcode image
    const missingBarcodes = db.prepare("SELECT id, internal_code, title FROM Book WHERE internal_code IS NOT NULL AND (barcode_path IS NULL OR barcode_path = '')").all();

    if (missingBarcodes.length > 0) {
        logger.info(`Found ${missingBarcodes.length} books missing barcode images. Generating...`);

        for (const book of missingBarcodes) {
            try {
                const path = await barcodeService.generateBarcode(book.internal_code, 'book-codes');
                db.prepare("UPDATE Book SET barcode_path = ? WHERE id = ?").run(path, book.id);
                logger.info(`Generated barcode for: ${book.title} (${book.internal_code})`);
            } catch (err) {
                logger.error(`Failed to generate barcode for ${book.title}:`, err);
            }
        }
        saveDatabase();
    }

    logger.info('Book barcode fill migration completed.');
}

module.exports = { runBookBarcodeFillMigration };
