import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function ActivityLogPage() {
    const { t } = useTranslation();
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        userId: '',
        actionType: ''
    });

    const ACTION_TYPES = [
        'LOGIN', 'LOGOUT', 'LOCK_SESSION', 'UNLOCK_SESSION',
        'ISSUE_BOOK', 'RETURN_BOOK', 'ADD_BOOK', 'DELETE_BOOK',
        'REGISTER_MEMBER', 'DELETE_MEMBER', 'UPDATE_SETTINGS',
        'EXPORT_REPORT', 'RESET_PASSWORD'
    ];

    useEffect(() => {
        loadUsers();
        loadLogs();
    }, []);

    const loadUsers = async () => {
        try {
            if (window.klms?.logs?.getUsers) {
                const userList = await window.klms.logs.getUsers();
                setUsers(userList);
            }
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    };


    const handleExport = async () => {
        try {
            if (window.klms?.logs?.export) {
                const result = await window.klms.logs.export(filters);
                if (result.success) {
                    alert('Logs exported successfully!');
                }
            }
        } catch (err) {
            console.error('Failed to export logs:', err);
            alert('Failed to export logs.');
        }
    };

    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const loadLogs = async (pageNum = 1) => {
        setLoading(true);
        try {
            if (window.klms?.logs?.getAll) {
                const result = await window.klms.logs.getAll({ ...filters, page: pageNum, limit: pagination.limit });
                if (result && Array.isArray(result.data)) {
                    setLogs(result.data);
                    setPagination(prev => ({ ...prev, page: pageNum, total: result.total }));
                } else {
                    // Fallback for old API response format
                    setLogs(Array.isArray(result) ? result : []);
                }
            }
        } catch (err) {
            console.error('Failed to load logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        loadLogs(1); // Reset to page 1
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= Math.ceil(pagination.total / pagination.limit)) {
            loadLogs(newPage);
        }
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    // ... (Filter form remains the same) ...

    return (
        <div className="activity-log-page p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--header-text-color)' }}>{t('activity.title')}</h1>
                <div className="flex space-x-2">
                    <button onClick={() => loadLogs(pagination.page)} className="px-4 py-2 rounded text-white font-medium hover:opacity-90" style={{ backgroundColor: 'var(--secondary-color)' }}>
                        {t('activity.refresh')}
                    </button>
                    <button onClick={handleExport} className="px-4 py-2 rounded text-white font-medium" style={{ backgroundColor: 'var(--button-color)' }}>
                        {t('activity.exportCSV')}
                    </button>
                </div>
            </div>

            {/* Filters Form */}
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 rounded-lg border border-[var(--secondary-color)]" style={{ backgroundColor: 'var(--background-color)' }}>
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>{t('activity.fromDate')}</label>
                    <input
                        type="date"
                        className="w-full p-2 rounded border border-[var(--secondary-color)] bg-transparent"
                        style={{ color: 'var(--text-color)' }}
                        value={filters.fromDate}
                        onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>{t('activity.toDate')}</label>
                    <input
                        type="date"
                        className="w-full p-2 rounded border border-[var(--secondary-color)] bg-transparent"
                        style={{ color: 'var(--text-color)' }}
                        value={filters.toDate}
                        onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>{t('activity.user')}</label>
                    <select className="w-full p-2 rounded border border-[var(--secondary-color)] bg-transparent" style={{ color: 'var(--text-color)' }} value={filters.userId} onChange={(e) => handleFilterChange('userId', e.target.value)}>
                        <option value="">{t('activity.allUsers')}</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>{t('activity.actionType')}</label>
                    <select className="w-full p-2 rounded border border-[var(--secondary-color)] bg-transparent" style={{ color: 'var(--text-color)' }} value={filters.actionType} onChange={(e) => handleFilterChange('actionType', e.target.value)}>
                        <option value="">{t('activity.allActions')}</option>
                        {ACTION_TYPES.map(type => (
                            <option key={type} value={type}>{type.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-end">
                    <button type="submit" className="w-full py-2 rounded text-white font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--primary-color)' }}>
                        {t('activity.filterLogs')}
                    </button>
                </div>
            </form>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-[var(--secondary-color)]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                            <th className="p-3 whitespace-nowrap">{t('activity.timestamp')}</th>
                            <th className="p-3 whitespace-nowrap">{t('activity.user')}</th>
                            <th className="p-3 whitespace-nowrap">{t('activity.action')}</th>
                            <th className="p-3 w-full">{t('activity.description')}</th>
                        </tr>
                    </thead>
                    <tbody style={{ color: 'var(--text-color)' }}>
                        {loading ? (
                            <tr><td colSpan="4" className="p-6 text-center">{t('activity.loadingLogs')}</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="4" className="p-6 text-center">{t('activity.noActivity')}</td></tr>
                        ) : (
                            logs.map((log, index) => (
                                <tr key={log.activity_id || index} className="border-t border-[var(--secondary-color)] hover:bg-[rgba(255,255,255,0.05)]">
                                    <td className="p-3 whitespace-nowrap text-sm">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
                                    <td className="p-3 font-medium whitespace-nowrap">{log.user_name || t('activity.unknownUser')}</td>
                                    <td className="p-3 whitespace-nowrap">
                                        <span className="px-2 py-1 rounded text-xs font-semibold bg-[rgba(255,255,255,0.1)] border border-[var(--secondary-color)]">
                                            {log.action_type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-sm">{log.description}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {pagination.total > 0 && (
                <div className="flex justify-between items-center mt-4 text-sm" style={{ color: 'var(--text-color)' }}>
                    <div>
                {t('activity.showing')} {((pagination.page - 1) * pagination.limit) + 1} {t('activity.to')} {Math.min(pagination.page * pagination.limit, pagination.total)} {t('activity.of')} {pagination.total} {t('activity.entries')}
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} className={`px-3 py-1 rounded border border-[var(--secondary-color)] ${pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--secondary-color)] hover:text-white'}`}>
                            {t('activity.previous')}
                        </button>
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            // Simple logic to show first 5 pages, proper logic adds complexity
                            const p = i + 1;
                            return (
                                <button
                                    key={p}
                                    onClick={() => handlePageChange(p)}
                                    className={`px-3 py-1 rounded border border-[var(--secondary-color)] ${pagination.page === p ? 'bg-[var(--primary-color)] text-white' : 'hover:bg-[var(--secondary-color)] hover:text-white'}`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === totalPages} className={`px-3 py-1 rounded border border-[var(--secondary-color)] ${pagination.page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--secondary-color)] hover:text-white'}`}>
                            {t('activity.next')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
