import React, { useState, useEffect } from 'react';

export function Books({ features = {} }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', category_id: '', total_copies: 1 });
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
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
    setForm({ title: '', author: '', isbn: '', category_id: '', total_copies: 1 });
    setError('');
  };

  const openEdit = (b) => {
    setEditing(b.id);
    setForm({
      title: b.title,
      author: b.author || '',
      isbn: b.isbn || '',
      category_id: b.category_id || '',
      total_copies: b.total_copies ?? 1,
    });
    setError('');
  };

  const closeForm = () => {
    setEditing(null);
    setError('');
  };

  const save = async () => {
    setError('');
    if (!form.title?.trim()) {
      setError('Title is required');
      return;
    }
    const payload = {
      title: form.title.trim(),
      author: form.author.trim() || null,
      isbn: form.isbn.trim() || null,
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
      setError(err.message || 'Failed to save');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this book? This will remove the record and copy count.')) return;
    try {
      await window.klms.books.delete(id);
      loadBooks();
      if (editing === id) closeForm();
    } catch (err) {
      setError(err.message || 'Failed to delete');
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
      {error && <p className="error-msg">{error}</p>}
      {(editing === 'new' || editing) && (
        <div className="form-card">
          <h3>{editing === 'new' ? 'New Book' : 'Edit Book'}</h3>
          <div className="form-grid">
            <label>Title * <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label>Author <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></label>
            <label>ISBN <input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></label>
            {showCategories && (
              <label>Category <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
            )}
            <label>Total copies <input type="number" min={1} value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: e.target.value })} /></label>
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
                <th>ISBN</th>
                {showCategories && <th>Category</th>}
                <th>Available / Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <td>{b.title}</td>
                  <td>{b.author || '–'}</td>
                  <td>{b.isbn || '–'}</td>
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
      <style>{`
        .books-view .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .books-view .view-header h2 { font-size: 1.25rem; }
        .btn-primary { background: var(--button-color); color: var(--header-text-color); border: none; padding: 0.5rem 1rem; border-radius: var(--radius); font-weight: 600; }
        .btn-primary:hover { background: var(--color-primary-hover); }
        .toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .toolbar input { flex: 1; padding: 0.5rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text); }
        .toolbar button { padding: 0.5rem 1rem; background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); border-radius: var(--radius); }
        .toolbar button:hover { background: var(--color-surface-hover); }
        .error-msg { color: var(--color-danger); margin-bottom: 0.5rem; }
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
