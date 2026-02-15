/**
 * Member CRUD Service
 * Add, update, delete, search members. Member types: Student, Teacher.
 */
const { getDatabase } = require('../database/connection');
const barcodeService = require('./barcode-service');
const logger = require('../logger');

const MEMBER_TYPES = ['Student', 'Teacher'];

function getAll(filters = {}) {
  const db = getDatabase();
  let sql = 'SELECT m.* FROM Member m WHERE 1=1';
  const params = [];
  if (filters.memberType) {
    sql += ' AND m.member_type = ?';
    params.push(filters.memberType);
  }
  sql += ' ORDER BY m.name';
  return db.prepare(sql).all(...params);
}

function generateMemberCode() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `KMV${year}${month}${day}${hours}${minutes}${seconds}`;
}

function getById(id) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM Member WHERE id = ?').get(id);
}

function getByCode(code) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM Member WHERE member_code = ?').get(code);
}

function create(data) {
  const db = getDatabase();
  const { member_type, name, email, phone, address, member_code } = data;
  if (!MEMBER_TYPES.includes(member_type)) {
    throw new Error('Invalid member_type. Must be Student or Teacher.');
  }

  // Use provided code or auto-generate
  const finalMemberCode = member_code || generateMemberCode();

  const stmt = db.prepare(`
    INSERT INTO Member (member_type, name, email, phone, address, member_code, barcode_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    member_type,
    name || '',
    email || null,
    phone || null,
    address || null,
    finalMemberCode,
    null // barcode_path set later
  );

  const newId = result.lastInsertRowid;

  // Generate Barcode
  barcodeService.generateBarcode(finalMemberCode).then(barcodePath => {
    db.prepare('UPDATE Member SET barcode_path = ? WHERE id = ?').run(barcodePath, newId);
  }).catch(err => {
    logger.error(`Deferred barcode generation failed for member ${newId}:`, err);
  });

  return getById(newId);
}

function update(id, data) {
  const db = getDatabase();
  const existing = getById(id);
  if (!existing) throw new Error('Member not found');
  const { member_type, name, email, phone, address, member_code } = data;
  if (member_type && !MEMBER_TYPES.includes(member_type)) {
    throw new Error('Invalid member_type. Must be Student or Teacher.');
  }
  db.prepare(`
    UPDATE Member SET
      member_type = COALESCE(?, member_type),
      name = COALESCE(?, name),
      email = ?,
      phone = ?,
      address = ?,
      barcode_path = COALESCE(?, barcode_path),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    member_type ?? existing.member_type,
    name ?? existing.name,
    email !== undefined ? email : existing.email,
    phone !== undefined ? phone : existing.phone,
    address !== undefined ? address : existing.address,
    data.barcode_path !== undefined ? data.barcode_path : existing.barcode_path,
    id
  );

  // If barcode is missing, generate it
  if (!existing.barcode_path && !data.barcode_path) {
    barcodeService.generateBarcode(existing.member_code).then(barcodePath => {
      db.prepare('UPDATE Member SET barcode_path = ? WHERE id = ?').run(barcodePath, id);
    }).catch(err => {
      logger.error(`Deferred barcode generation failed for existing member ${id}: `, err);
    });
  }

  return getById(id);
}

function deleteMember(id) {
  const db = getDatabase();
  const existing = getById(id);
  if (!existing) throw new Error('Member not found');
  const issues = db.prepare('SELECT id FROM Issue WHERE member_id = ? AND return_date IS NULL').all(id);
  if (issues.length > 0) {
    throw new Error('Cannot delete member with active book issues. Return books first.');
  }
  if (existing.barcode_path && fs.existsSync(existing.barcode_path)) {
    try {
      fs.unlinkSync(existing.barcode_path);
    } catch (e) {
      logger.error(`Failed to delete barcode file for member ${id}: `, e);
    }
  }
  db.prepare('DELETE FROM Member WHERE id = ?').run(id);
  return { deleted: true, id };
}

function search(query) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return getAll({});
  }
  const db = getDatabase();
  const term = `% ${query.trim()}% `;
  return db.prepare(`
  SELECT * FROM Member
    WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR member_code LIKE ?
    ORDER BY name
      `).all(term, term, term, term);
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteMember,
  search,
  getByCode,
  generateMemberCode,
  MEMBER_TYPES,
};
