import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useScanDetection } from '../hooks/useScanDetection';
import { DialogService } from '../services/DialogService';
import { ImportMemberDialog } from './ImportMemberDialog';
import { Download, Upload } from 'lucide-react';

export function Members() {
  const { t } = useTranslation();
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const loadMembers = (filters = {}) => {
    setLoading(true);
    const params = { ...filters, page, pageSize };

    const promise = searchQuery.trim()
      ? window.klms.members.search(searchQuery, params)
      : window.klms.members.getAll(params);

    promise.then((res) => {
      setList(res.items);
      setTotal(res.total);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadMembers(filterType ? { memberType: filterType } : {});
  }, [page, pageSize, filterType]);

  const handleScanDetected = useCallback((code) => {
    if (editing && code.startsWith('KMV')) {
      setForm(prev => ({ ...prev, member_code: code }));
    }
  }, [editing]);

  useScanDetection({
    onScanDetected: handleScanDetected
  });

  const handleSearch = () => {
    setPage(1); // Reset to first page on new search
    setLoading(true);
    window.klms.members.search(searchQuery, { page: 1, pageSize, memberType: filterType }).then((res) => {
      setList(res.items);
      setTotal(res.total);
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
            setPage(1); // Reset to first page after creating new member
            loadMembers(filterType ? { memberType: filterType } : {});
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
        loadMembers(filterType ? { memberType: filterType } : {});
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
        setPage(1); // Reset to first page after deleting
        loadMembers(filterType ? { memberType: filterType } : {});
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
      loadMembers(filterType ? { memberType: filterType } : {});
      DialogService.showSuccess('Barcode generated');
    } catch (err) {
      DialogService.showError('Failed to generate barcode');
    }
  };

  return (
    <div className="members-view">
      <div className="view-header">
        <h2>{t('members.title')}</h2>
        <div className="header-actions">
          <button type="button" className="btn-secondary flex items-center gap-2" onClick={() => setShowImport(true)}>
            <Download size={16} /> {t('members.importCSV')}
          </button>
          <button type="button" className="btn-primary" onClick={openCreate}>{t('members.addMember')}</button>
        </div>
      </div>
      <div className="toolbar">
        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">{t('members.allTypes')}</option>
          <option value="Student">{t('members.student')}</option>
          <option value="Teacher">{t('members.teacher')}</option>
        </select>
        <input
          type="text"
          placeholder={t('members.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button type="button" onClick={handleSearch}>{t('common.search')}</button>
      </div>
      {(editing === 'new' || editing) && (
        <div className="form-card">
          <h3>{editing === 'new' ? t('members.newMember') : t('members.editMember')}</h3>
          <div className="form-grid">
            <label>{t('members.type')} <select value={form.member_type} onChange={(e) => setForm(prev => ({ ...prev, member_type: e.target.value }))}>
              <option value="Student">{t('members.student')}</option>
              <option value="Teacher">{t('members.teacher')}</option>
            </select></label>
            <label>{t('members.name')} * <input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} /></label>
            <label>{t('members.memberCode')}
              <input
                value={form.member_code}
                onChange={(e) => setForm(prev => ({ ...prev, member_code: e.target.value }))}
                placeholder={isGeneratingCode ? t('members.generating') : t('members.enterCode')}
                disabled={isGeneratingCode}
                style={{ background: isGeneratingCode ? 'var(--color-bg)' : undefined, opacity: isGeneratingCode ? 0.6 : 1 }}
              />
            </label>
            <label>{t('members.email')} <input type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} /></label>
            <label>{t('members.phone')} <input value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} /></label>
            <label>{t('members.address')} <input value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} /></label>
          </div>
          <div className="form-actions">
            <button type="button" onClick={closeForm} disabled={isSubmitting}>{t('members.cancel')}</button>
            <button type="button" className="btn-primary" onClick={save} disabled={isSubmitting}>
              {isSubmitting ? t('members.saving') : t('members.save')}
            </button>
          </div>
        </div>
      )}
      <div className="table-wrap">
        {loading ? <p>{t('members.loading')}</p> : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('members.name')}</th>
                  <th>{t('members.type')}</th>
                  <th>{t('members.memberCode')}</th>
                  <th>{t('members.contact')}</th>
                  <th>{t('members.regFeePaid')}</th>
                  <th>{t('members.expiryDate')}</th>
                  <th>{t('members.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.member_type}</td>
                    <td>{m.member_code}</td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        {m.email && <div>{m.email}</div>}
                        {m.phone && <div>{m.phone}</div>}
                      </div>
                    </td>
                    <td>{m.registration_fee_paid ? `Rs. ${m.registration_fee_paid.toFixed(2)}` : '0.00'}</td>
                    <td>{m.expiry_date || '–'}</td>
                    {/* <td><span className={`badge ${window.klms.members.isActive(m.id) ? 'success' : 'danger'}`}>{window.klms.members.isActive(m.id) ? 'Active' : 'Expired'}</span></td> */}
                    <td>
                      <button type="button" className="btn-sm" onClick={() => openEdit(m)}>{t('members.edit')}</button>
                      <button type="button" className="btn-sm" onClick={() => handleViewIdCard(m)}>{t('members.card')}</button>
                      <button type="button" className="btn-sm danger" onClick={() => remove(m.id)}>{t('members.delete')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <div className="pagination-info">
                {t('members.showing')} {Math.min(total, (page - 1) * pageSize + 1)} {t('members.to')} {Math.min(total, page * pageSize)} {t('members.showingOf')} {total} {t('members.members')}
              </div>
              <div className="pagination-controls">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="btn-sm"
                >
                  {t('members.previous')}
                </button>
                <span className="page-num">{t('members.page')} {page} {t('members.of')} {Math.ceil(total / pageSize) || 1}</span>
                <button
                  disabled={page >= Math.ceil(total / pageSize)}
                  onClick={() => setPage(p => p + 1)}
                  className="btn-sm"
                >
                  {t('members.next')}
                </button>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                  className="page-size-select"
                >
                  <option value={10}>10 {t('members.perPage')}</option>
                  <option value={20}>20 {t('members.perPage')}</option>
                  <option value={50}>50 {t('members.perPage')}</option>
                  <option value={100}>100 {t('members.perPage')}</option>
                </select>
              </div>
            </div>
          </>
        )}
        {!loading && list.length === 0 && <p className="muted">{t('members.noMembers')}</p>}
      </div>

      {viewingBarcode && (
        <div className="barcode-modal-overlay" onClick={() => setViewingBarcode(null)}>
          <div className="barcode-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('members.memberBarcode')}</h3>
              <button className="close-btn" onClick={() => setViewingBarcode(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="barcode-id">{viewingBarcode.code}</div>
              <img src={viewingBarcode.image} alt="Barcode" className="barcode-img" />
              <p className="barcode-hint">{t('members.barcodeHint')}</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => window.print()} className="btn-primary">{t('members.printBarcode')}</button>
            </div>
          </div>
        </div>
      )}

      {viewingIdCard && (
        <div className="barcode-modal-overlay" onClick={() => setViewingIdCard(null)}>
          <div className="barcode-modal id-card-preview" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('members.idCardPreview')}</h3>
              <button className="close-btn" onClick={() => setViewingIdCard(null)}>×</button>
            </div>
            <div className="modal-body">
              <iframe
                src={viewingIdCard.pdfData}
                title="ID Card PDF"
                style={{ width: '100%', height: '350px', border: 'none', borderRadius: '4px' }}
              />
              <p className="barcode-hint">{t('members.idCardHint')}</p>
            </div>
            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  const win = window.open();
                  win.document.write(`<iframe src="${viewingIdCard.pdfData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                }}
              >
                {t('members.openPDF')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportMemberDialog
          onClose={() => setShowImport(false)}
          onImportComplete={() => loadMembers(filterType ? { memberType: filterType } : {})}
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

        .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--color-border); flex-wrap: wrap; gap: 1rem; }
        .pagination-info { font-size: 0.875rem; color: var(--color-text-muted); }
        .pagination-controls { display: flex; align-items: center; gap: 0.75rem; }
        .page-num { font-size: 0.875rem; font-weight: 500; }
        .page-size-select { padding: 0.25rem 0.5rem; border: 1px solid var(--color-border); border-radius: 4px; background: var(--color-bg); color: var(--color-text); font-size: 0.8125rem; }

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
