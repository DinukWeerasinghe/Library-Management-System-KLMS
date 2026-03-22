/**
 * Member Import Service
 * Handles bulk import of members from CSV files.
 */
const fs = require('fs');
const memberService = require('./member-service');
const logger = require('../logger');
const { getDatabase, setBatchMode, persist } = require('../database/connection');

/**
 * Generates the CSV template content for members.
 */
function getTemplateContent() {
    return 'name,member_type,email,phone,address,member_code\n"John Doe","Student","john@example.com","0712345678","123 Street, City","M000001"';
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
 * Parses and Previews the member import file.
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

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        if (!headers.includes('name')) throw new Error('Missing "name" column.');
        if (!headers.includes('member_type')) throw new Error('Missing "member_type" column.');

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const resultRow = {
                id: i,
                rawLine: line,
                status: 'NEW',
                message: '',
                data: {},
                existingMember: null
            };

            try {
                const cols = parseCsvLine(line);
                const rowData = {};
                headers.forEach((h, idx) => { if (cols[idx]) rowData[h] = cols[idx]; });

                // Sanitize
                const name = (rowData.name || '').trim();
                const type = (rowData.member_type || '').trim();

                // Validation
                if (!name) throw new Error('Name is required');
                if (!['Student', 'Teacher'].includes(type)) {
                    throw new Error('Member Type must be "Student" or "Teacher"');
                }

                resultRow.data = {
                    name,
                    member_type: type,
                    email: rowData.email ? rowData.email.trim() : null,
                    phone: rowData.phone ? rowData.phone.trim() : null,
                    address: rowData.address ? rowData.address.trim() : null,
                    member_code: rowData.member_code ? rowData.member_code.trim() : null
                };

                // Duplicate Detection using memberService custom logic
                // Pass raw rowData to findDuplicate
                const duplicate = memberService.findDuplicate(resultRow.data);

                if (duplicate) {
                    resultRow.status = 'MERGE'; // Using MERGE label for consistency, though we just skip/report
                    resultRow.existingMember = duplicate.member;
                    resultRow.message = `Exists (Match: ${duplicate.type})`;
                    summary.merge++;
                } else {
                    summary.new++;
                }

            } catch (err) {
                resultRow.status = 'INVALID';
                resultRow.message = err.message;
                summary.invalid++;
            }

            rows.push(resultRow);
        }

    } catch (err) {
        logger.error(`Member Preview failed: ${err.message}`);
        throw err;
    }

    return { rows, summary };
}

async function executeImport(rows, sender) {
    const stats = { success: 0, failed: 0, errors: [] };

    const db = getDatabase();
    const batchResult = db.prepare('INSERT INTO ImportBatch (type, row_count) VALUES (?, ?)').run('MEMBER', 0);
    const batchId = Number(batchResult.lastInsertRowid);
    logger.info(`Processing ${rows.length} rows for MEMBER import batch #${batchId}`);

    const actionableRows = rows.filter(r => r.status === 'NEW');
    const total = actionableRows.length;
    const CHUNK_SIZE = 100;

    const sendProgress = (done) => {
        if (sender && !sender.isDestroyed()) {
            sender.send('import:progress', { done, total, type: 'member' });
        }
    };

    try {
        setBatchMode(true);
        let processed = 0;

        for (let i = 0; i < actionableRows.length; i += CHUNK_SIZE) {
            const chunk = actionableRows.slice(i, i + CHUNK_SIZE);
            for (const row of chunk) {
                try {
                    await memberService.create({ ...row.data, batch_id: batchId });
                    stats.success++;
                } catch (err) {
                    stats.failed++;
                    stats.errors.push({ row: row.id, message: err.message });
                    logger.error(`Member Import failed for row ${row.id}: ${err.message}`);
                }
            }
            processed += chunk.length;
            sendProgress(Math.min(processed, total));
            await new Promise(resolve => setImmediate(resolve));
        }

        persist();
    } catch (err) {
        logger.error(`Member import fatal error: ${err.message}`);
        persist(); // save whatever succeeded
        throw err;
    } finally {
        setBatchMode(false);
    }

    db.prepare('UPDATE ImportBatch SET row_count = ? WHERE id = ?').run(stats.success, batchId);
    sendProgress(total);
    return stats;
}

module.exports = {
    getTemplateContent,
    previewImport,
    executeImport
};
