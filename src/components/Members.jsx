import React, { useState, useEffect } from 'react';

export function Members() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ member_type: 'Student', name: '', email: '', phone: '', address: '', member_id: '' });
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');

  const load = (filters = {}) => {
    setLoading(true);
    window.klms.members.getAll(filters).then((data) => {
      setList(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    load(filterType ? { memberType: filterType } : {});
  }, [filterType]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      load(filterType ? { memberType: filterType } : {});
      return;
    }
    setLoading(true);
    window.klms.members.search(searchQuery).then((data) => {
      setList(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const openCreate = () => {
    setEditing('new');
    setForm({ member_type: 'Student', name: '', email: '', phone: '', address: '', member_id: '' });
    setError('');
  };

  const openEdit = (m) => {
    setEditing(m.id);
    setForm({
      member_type: m.member_type,
      name: m.name,
      email: m.email || '',
      phone: m.phone || '',
      address: m.address || '',
      member_id: m.member_id || '',
    });
    setError('');
  };

  const closeForm = () => {
    setEditing(null);
    setError('');
  };

  const save = async () => {
    setError('');
    if (!form.name?.trim()) {
      setError('Name is required');
      return;
    }
    try {
      if (editing === 'new') {
        await window.klms.members.create(form);
      } else {
        await window.klms.members.update(editing, form);
      }
      closeForm();
      load(filterType ? { memberType: filterType } : {});
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this member?')) return;
    try {
      await window.klms.members.delete(id);
      load(filterType ? { memberType: filterType } : {});
      if (editing === id) closeForm();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="members-view">
      <div className="view-header">
        <h2>Member Management</h2>
        <button type="button" className="btn-primary" onClick={openCreate}>Add Member</button>
      </div>
      <div className="toolbar">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All types</option>
          <option value="Student">Student</option>
          <option value="Teacher">Teacher</option>
        </select>
        <input
          type="text"
          placeholder="Search by name, email, phone, member ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button type="button" onClick={handleSearch}>Search</button>
      </div>
      {error && <p className="error-msg">{error}</p>}
      {(editing === 'new' || editing) && (
        <div className="form-card">
          <h3>{editing === 'new' ? 'New Member' : 'Edit Member'}</h3>
          <div className="form-grid">
            <label>Type <select value={form.member_type} onChange={(e) => setForm({ ...form, member_type: e.target.value })}>
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
            </select></label>
            <label>Name * <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Member ID <input value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} placeholder="Optional" /></label>
            <label>Email <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Phone <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Address <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
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
                <th>Name</th>
                <th>Type</th>
                <th>Member ID</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.member_type}</td>
                  <td>{m.member_id || '–'}</td>
                  <td>{m.email || '–'}</td>
                  <td>{m.phone || '–'}</td>
                  <td>
                    <button type="button" className="btn-sm" onClick={() => openEdit(m)}>Edit</button>
                    <button type="button" className="btn-sm danger" onClick={() => remove(m.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && list.length === 0 && <p className="muted">No members found.</p>}
      </div>
      <style>{`
        .members-view .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .members-view .view-header h2 { font-size: 1.25rem; }
        .btn-primary { background: var(--button-color); color: var(--header-text-color); border: none; padding: 0.5rem 1rem; border-radius: var(--radius); font-weight: 600; }
        .btn-primary:hover { background: var(--color-primary-hover); }
        .toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .toolbar select, .toolbar input { padding: 0.5rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text); }
        .toolbar input { flex: 1; min-width: 200px; }
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
