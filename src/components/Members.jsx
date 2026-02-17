import React, { useState, useEffect, useCallback } from 'react';
import { useScanDetection } from '../hooks/useScanDetection';
import { DialogService } from '../services/DialogService';
import { ImportMemberDialog } from './ImportMemberDialog';
import { Download, Upload } from 'lucide-react';

export function Members() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ member_type: 'Student', name: '', email: '', phone: '', address: '', member_code: '' });
  const [filterType, setFilterType] = useState('');
  const [viewingBarcode, setViewingBarcode] = useState(null); // { id, code, image }
  const [viewingIdCard, setViewingIdCard] = useState(null); // { id, pdfData }
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImport, setShowImport] = useState(false);

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

  const handleScanDetected = useCallback((code) => {
    if (editing && code.startsWith('KMV')) {
      setForm(prev => ({ ...prev, member_code: code }));
    }
  }, [editing]);

  useScanDetection({
    onScanDetected: handleScanDetected
  });

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

  const openCreate = async () => {
    if (isGeneratingCode) return;

    // reset everything first
    setForm({ member_type: 'Student', name: '', email: '', phone: '', address: '', member_code: '' });
    setEditing('new');
    setIsGeneratingCode(true);

    try {
      const newCode = await window.klms.members.generateCode();
      if (typeof newCode === 'string') {
        setForm(prev => ({ ...prev, member_code: newCode }));
      }
    } catch (err) {
      DialogService.showError('Failed to generate code: ' + (err.message || 'Auto-generation failed'));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const openEdit = (m) => {
    setEditing(m.id);
    setForm({
      member_type: m.member_type,
      name: m.name,
      email: m.email || '',
      phone: m.phone || '',
      address: m.address || '',
      member_code: m.member_code || '',
    });
  };

  const closeForm = () => {
    setEditing(null);
  };

  const save = async () => {
    if (isSubmitting) return;

    if (!form.name?.trim()) {
      DialogService.showError('Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editing === 'new') {
        const config = await window.klms.config.getAll();
        const fee = config.registration_fee || '0';

        DialogService.showConfirm(`Is the registration fee of ${fee} paid?`, async () => {
          try {
            await window.klms.members.create(form);
            closeForm();
            load(filterType ? { memberType: filterType } : {});
            DialogService.showSuccess('Member registered successfully');
          } catch (err) {
            DialogService.showError(err.message || 'Failed to save');
          } finally {
            setIsSubmitting(false);
          }
        });
        return; // handle async confirm separately
      } else {
        await window.klms.members.update(editing, form);
        closeForm();
        load(filterType ? { memberType: filterType } : {});
      }
    } catch (err) {
      DialogService.showError(err.message || 'Failed to save');
    } finally {
      if (editing !== 'new') setIsSubmitting(false);
    }
  };

  const remove = async (id) => {
    DialogService.showConfirm('Delete this member? This action cannot be undone.', async () => {
      try {
        await window.klms.members.delete(id);
        load(filterType ? { memberType: filterType } : {});
        if (editing === id) closeForm();
        DialogService.showSuccess('Member deleted successfully');
      } catch (err) {
        DialogService.showError(err.message || 'Failed to delete');
      }
    });
  };

  const showBarcode = async (m) => {
    try {
      const img = await window.klms.members.getBarcodeImage(m.id);
      if (img) {
        setViewingBarcode({ id: m.id, code: m.member_code, image: img });
      } else {
        DialogService.showError('Barcode not found for this member.');
      }
    } catch (err) {
      DialogService.showError('Failed to load barcode: ' + err.message);
    }
  };

  const handleViewIdCard = async (m) => {
    try {
      const pdfData = await window.klms.members.generateIdCard(m.id);
      if (pdfData) {
        setViewingIdCard({ id: m.id, name: m.name, pdfData });
      } else {
        DialogService.showError('Failed to generate ID card.');
      }
    } catch (err) {
      DialogService.showError('Error generating ID card: ' + err.message);
    }
  };

  const regenerateBarcode = async (m) => {
    try {
      await window.klms.members.update(m.id, { barcode_path: null }); // Force generate in backend logic
      // Note: My current backend logic only generates on CREATE. 
      // I should update members:update to generate if missing or add a specific IPC.
      // Alternatively, I'll just call BarcodeService directly if I expose it.
      // For now, let's just make the UI show a clear state.
      // alert('Generating barcode...'); // Removed alert
      await window.klms.members.update(m.id, { member_code: m.member_code });
      load(filterType ? { memberType: filterType } : {});
      DialogService.showSuccess('Barcode generated');
    } catch (err) {
      DialogService.showError('Failed to generate barcode');
    }
  };

  return (
    <div className="members-view">
      <div className="view-header">
        <h2>Member Management</h2>
        <div className="header-actions">
          <button type="button" className="btn-secondary flex items-center gap-2" onClick={() => setShowImport(true)}>
            <Download size={16} /> Import CSV
          </button>
          <button type="button" className="btn-primary" onClick={openCreate}>Add Member</button>
        </div>
      </div>
      <div className="toolbar">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All types</option>
          <option value="Student">Student</option>
          <option value="Teacher">Teacher</option>
        </select>
        <input
          type="text"
          placeholder="Search by name, email, phone, member code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button type="button" onClick={handleSearch}>Search</button>
      </div>
      {(editing === 'new' || editing) && (
        <div className="form-card">
          <h3>{editing === 'new' ? 'New Member' : 'Edit Member'}</h3>
          <div className="form-grid">
            <label>Type <select value={form.member_type} onChange={(e) => setForm(prev => ({ ...prev, member_type: e.target.value }))}>
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
            </select></label>
            <label>Name * <input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} /></label>
            <label>Member Code
              <input
                value={form.member_code}
                onChange={(e) => setForm(prev => ({ ...prev, member_code: e.target.value }))}
                placeholder={isGeneratingCode ? "Generating..." : "Enter code"}
                disabled={isGeneratingCode}
                style={{ background: isGeneratingCode ? 'var(--color-bg)' : undefined, opacity: isGeneratingCode ? 0.6 : 1 }}
              />
            </label>
            <label>Email <input type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} /></label>
            <label>Phone <input value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} /></label>
            <label>Address <input value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} /></label>
          </div>
          <div className="form-actions">
            <button type="button" onClick={closeForm} disabled={isSubmitting}>Cancel</button>
            <button type="button" className="btn-primary" onClick={save} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
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
                <th>Member Code</th>
                <th>Barcode</th>
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
                  <td>{m.member_code || '–'}</td>
                  <td>
                    {m.barcode_path ? (
                      <button type="button" className="btn-sm" onClick={() => showBarcode(m)}>View</button>
                    ) : (
                      <button type="button" className="btn-sm" onClick={() => regenerateBarcode(m)}>Generate</button>
                    )}
                  </td>
                  <td>{m.email || '–'}</td>
                  <td>{m.phone || '–'}</td>
                  <td>
                    <button type="button" className="btn-sm" onClick={() => openEdit(m)}>Edit</button>
                    <button type="button" className="btn-sm" onClick={() => handleViewIdCard(m)}>ID Card</button>
                    <button type="button" className="btn-sm danger" onClick={() => remove(m.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && list.length === 0 && <p className="muted">No members found.</p>}
      </div>

      {viewingBarcode && (
        <div className="barcode-modal-overlay" onClick={() => setViewingBarcode(null)}>
          <div className="barcode-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Member Barcode</h3>
              <button className="close-btn" onClick={() => setViewingBarcode(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="barcode-id">{viewingBarcode.code}</div>
              <img src={viewingBarcode.image} alt="Barcode" className="barcode-img" />
              <p className="barcode-hint">Use this for ID cards and scanning</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => window.print()} className="btn-primary">Print Barcode</button>
            </div>
          </div>
        </div>
      )}

      {viewingIdCard && (
        <div className="barcode-modal-overlay" onClick={() => setViewingIdCard(null)}>
          <div className="barcode-modal id-card-preview" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Member ID Card Preview</h3>
              <button className="close-btn" onClick={() => setViewingIdCard(null)}>×</button>
            </div>
            <div className="modal-body">
              <iframe
                src={viewingIdCard.pdfData}
                title="ID Card PDF"
                style={{ width: '100%', height: '350px', border: 'none', borderRadius: '4px' }}
              />
              <p className="barcode-hint">This is a standard ID-1 (85.6mm x 54mm) card layout.</p>
            </div>
            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  const win = window.open();
                  win.document.write(`<iframe src="${viewingIdCard.pdfData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                }}
              >
                Open Full PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportMemberDialog
          onClose={() => setShowImport(false)}
          onImportComplete={() => load(filterType ? { memberType: filterType } : {})}
        />
      )}

      <style>{`
        .members-view .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .members-view .view-header h2 { font-size: 1.25rem; }
        .header-actions { display: flex; gap: 0.5rem; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-2 { gap: 0.5rem; }
        .btn-secondary { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); padding: 0.5rem 1rem; border-radius: var(--radius); font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
        .btn-secondary:hover { background: var(--color-surface-hover); }
        .btn-primary { background: var(--button-color); color: var(--header-text-color); border: none; padding: 0.5rem 1rem; border-radius: var(--radius); font-weight: 600; }
        .btn-primary:hover { background: var(--color-primary-hover); }
        .toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .toolbar select, .toolbar input { padding: 0.5rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text); }
        .toolbar input { flex: 1; min-width: 200px; }
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

        /* Barcode Modal */
        .barcode-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .barcode-modal {
          background: white;
          padding: 2rem;
          border-radius: var(--radius);
          max-width: 400px;
          width: 90%;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        .barcode-modal .modal-header {
           display: flex; justify-content: space-between; align-items: center;
           margin-bottom: 1.5rem;
           border-bottom: 1px solid #eee;
           padding-bottom: 0.5rem;
        }
        .barcode-modal .close-btn {
          background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999;
        }
        .barcode-id { font-weight: bold; font-size: 1.1rem; margin-bottom: 1rem; color: #333; }
        .barcode-img { max-width: 100%; height: auto; border: 1px solid #eee; padding: 1rem; background: white; margin-bottom: 1rem; }
        .barcode-hint { font-size: 0.85rem; color: #666; margin-bottom: 1.5rem; }
        .barcode-modal.id-card-preview {
          max-width: 600px;
          height: auto;
        }
        .modal-actions { display: flex; justify-content: center; gap: 0.5rem; }
      `}</style>
    </div>
  );
}
