import React, { useState, useEffect } from 'react';
import { useScanDetection } from '../hooks/useScanDetection';
import { DialogService } from '../services/DialogService';

export function Books({ features = {} }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', category_id: '', total_copies: 1, external_code: '' });
  const [categories, setCategories] = useState([]);
  const [viewingBarcode, setViewingBarcode] = useState(null);
  const showCategories = features.enable_categories;

  useEffect(() => {
    if (showCategories && window.klms?.categories?.getAll) {
      window.klms.categories.getAll().then(setCategories);
    }
  }, [showCategories]);

  const loadBooks = (filters = {}) => {
    setLoading(true);
    window.klms.books.getAll(filters).then((data) => {
      setList(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadBooks();
  }, []);

  useScanDetection({
    onScanDetected: (code) => {
      if (editing) {
        // If form is open, populate whichever field makes sense
        if (code.length >= 10 && !isNaN(code.charAt(0))) {
          setForm(prev => ({ ...prev, isbn: code }));
        } else {
          setForm(prev => ({ ...prev, external_code: code }));
        }
      }
    }
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      loadBooks();
      return;
    }
    setLoading(true);
    window.klms.books.search(searchQuery).then((data) => {
      setList(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const openCreate = () => {
    setEditing('new');
    setForm({ title: '', author: '', isbn: '', category_id: '', total_copies: 1, external_code: '' });
  };

  const openEdit = (b) => {
    setEditing(b.id);
    setForm({
      title: b.title,
      author: b.author || '',
      isbn: b.isbn || '',
      category_id: b.category_id || '',
      total_copies: b.total_copies ?? 1,
      external_code: b.external_code || '',
    });
  };

  const closeForm = () => {
    setEditing(null);
  };

  const save = async () => {
    if (!form.title?.trim()) {
      DialogService.showError('Title is required');
      return;
    }
    const payload = {
      title: form.title.trim(),
      author: form.author.trim() || null,
      isbn: form.isbn.trim() || null,
      external_code: form.external_code.trim() || null,
      total_copies: Math.max(1, parseInt(form.total_copies, 10) || 1),
    };
    if (showCategories && form.category_id) payload.category_id = parseInt(form.category_id, 10) || null;
    try {
      if (editing === 'new') {
        await window.klms.books.create(payload);
      } else {
        await window.klms.books.update(editing, payload);
      }
      closeForm();
      loadBooks();
    } catch (err) {
      DialogService.showError(err.message || 'Failed to save');
    }
  };

  const remove = async (id) => {
    DialogService.showConfirm('Delete this book? This will remove the record and copy count.', async () => {
      try {
        await window.klms.books.delete(id);
        loadBooks();
        if (editing === id) closeForm();
        DialogService.showSuccess('Book deleted successfully');
      } catch (err) {
        DialogService.showError(err.message || 'Failed to delete');
      }
    });
  };

  const showBarcode = async (b) => {
    try {
      const img = await window.klms.books.getBarcodeImage(b.id);
      if (img) {
        setViewingBarcode({ id: b.id, code: b.internal_code, image: img });
      } else {
        DialogService.showError('Internal barcode not found for this book.');
      }
    } catch (err) {
      DialogService.showError('Failed to load barcode: ' + err.message);
      DialogService.showError('Failed to load barcode');
    }
  };

  const regenerateBarcode = async (b) => {
    try {
      // No alert here, just do it or show a loading indicator if needed. 
      // But for now, just replace alert with nothing or success.
      await window.klms.books.update(b.id, { title: b.title }); // Saving triggers generation if missing
      loadBooks();
      DialogService.showSuccess('Barcode generated');
    } catch (err) {
      DialogService.showError('Failed to generate barcode');
    }
  };

  return (
    <div className="books-view">
      <div className="view-header">
        <h2>Book Management</h2>
        <button type="button" className="btn-primary" onClick={openCreate}>Add Book</button>
      </div>
      <div className="toolbar">
        <input
          type="text"
          placeholder="Search by title, author, ISBN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button type="button" onClick={handleSearch}>Search</button>
      </div>
      {(editing === 'new' || editing) && (
        <div className="form-card">
          <h3>{editing === 'new' ? 'New Book' : 'Edit Book'}</h3>
          <div className="form-grid">
            <label>Title * <input value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} /></label>
            <label>Author <input value={form.author} onChange={(e) => setForm(prev => ({ ...prev, author: e.target.value }))} /></label>
            <label>ISBN <input value={form.isbn} onChange={(e) => setForm(prev => ({ ...prev, isbn: e.target.value }))} /></label>
            <label>Publisher Barcode <input value={form.external_code} onChange={(e) => setForm(prev => ({ ...prev, external_code: e.target.value }))} placeholder="Scan ISBN/Pub code" /></label>
            {showCategories && (
              <label>Category <select value={form.category_id} onChange={(e) => setForm(prev => ({ ...prev, category_id: e.target.value }))}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
            )}
            <label>Total copies <input type="number" min={1} value={form.total_copies} onChange={(e) => setForm(prev => ({ ...prev, total_copies: e.target.value }))} /></label>
          </div>
          <div className="form-actions">
            <button type="button" onClick={closeForm}>Cancel</button>
            <button type="button" className="btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      )}
      <div className="table-wrap">
        {loading ? <p>Loading...</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>ID Codes</th>
                <th>Internal Barcode</th>
                {showCategories && <th>Category</th>}
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <td>{b.title}</td>
                  <td>{b.author || '–'}</td>
                  <td>
                    <div style={{ fontSize: '0.8rem' }}>
                      {b.isbn && <div>ISBN: {b.isbn}</div>}
                      {b.external_code && <div>EXT: {b.external_code}</div>}
                      {b.internal_code && <div>INT: {b.internal_code}</div>}
                    </div>
                  </td>
                  <td>
                    {b.barcode_path ? (
                      <button type="button" className="btn-sm" onClick={() => showBarcode(b)}>View</button>
                    ) : (b.internal_code ? <button type="button" className="btn-sm" onClick={() => regenerateBarcode(b)}>Generate</button> : '–')}
                  </td>
                  {showCategories && <td>{b.category_name || '–'}</td>}
                  <td>{b.available_copies} / {b.total_copies}</td>
                  <td>
                    <button type="button" className="btn-sm" onClick={() => openEdit(b)}>Edit</button>
                    <button type="button" className="btn-sm danger" onClick={() => remove(b.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && list.length === 0 && <p className="muted">No books found.</p>}
      </div>

      {viewingBarcode && (
        <div className="barcode-modal-overlay" onClick={() => setViewingBarcode(null)}>
          <div className="barcode-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>KLMS Book Barcode</h3>
              <button className="close-btn" onClick={() => setViewingBarcode(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="barcode-id">{viewingBarcode.code}</div>
              <img src={viewingBarcode.image} alt="Barcode" className="barcode-img" />
              <p className="barcode-hint">Use this for internal inventory and scanning</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => window.print()} className="btn-primary">Print Barcode</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .barcode-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .barcode-modal { background: white; padding: 2rem; border-radius: var(--radius); max-width: 400px; width: 90%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); color: #333; }
        .barcode-modal .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
        .barcode-modal .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999; }
        .barcode-id { font-weight: bold; font-size: 1.1rem; margin-bottom: 1rem; color: #333; }
        .barcode-img { max-width: 100%; height: auto; border: 1px solid #eee; padding: 1rem; background: white; margin-bottom: 1rem; }
        .barcode-hint { font-size: 0.85rem; color: #666; margin-bottom: 1.5rem; }

        .books-view .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .books-view .view-header h2 { font-size: 1.25rem; }
        .btn-primary { background: var(--button-color); color: var(--header-text-color); border: none; padding: 0.5rem 1rem; border-radius: var(--radius); font-weight: 600; }
        .btn-primary:hover { background: var(--color-primary-hover); }
        .toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .toolbar input { flex: 1; padding: 0.5rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text); }
        .toolbar button { padding: 0.5rem 1rem; background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); border-radius: var(--radius); }
        .toolbar button:hover { background: var(--color-surface-hover); }
        .form-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem; }
        .form-card h3 { margin-bottom: 0.75rem; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
        .form-grid label { display: block; font-size: 0.875rem; color: var(--color-text-muted); }
        .form-grid input, .form-grid select { width: 100%; margin-top: 0.25rem; padding: 0.4rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-bg); color: var(--color-text); }
        .form-actions { display: flex; gap: 0.5rem; }
        .form-actions button { padding: 0.5rem 1rem; border-radius: var(--radius); border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text); }
        .table-wrap { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--color-border); }
        .data-table th { color: var(--color-text-muted); font-weight: 600; font-size: 0.875rem; }
        .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.25rem; border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text); border-radius: 4px; }
        .btn-sm:hover { background: var(--color-surface-hover); }
        .btn-sm.danger { color: var(--color-danger); }
        .muted { color: var(--color-text-muted); margin-top: 0.5rem; }
      `}</style>
    </div>
  );
}
