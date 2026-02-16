import React, { useState, useEffect } from 'react';
import { DialogService } from '../services/DialogService';

export function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '', role: 'TEACHER' });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await window.klms.users.getAll();
            setUsers(data);
            setLoading(false);
        } catch (err) {
            DialogService.showError('Failed to load users: ' + err.message);
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        DialogService.showConfirm('Are you sure you want to delete this user?', async () => {
            try {
                await window.klms.users.delete(id);
                loadUsers();
                DialogService.showSuccess('User deleted successfully');
            } catch (err) {
                DialogService.showError('Error deleting user: ' + err.message);
            }
        });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await window.klms.users.create(formData);
            setShowModal(false);
            setFormData({ username: '', password: '', role: 'TEACHER' });
            loadUsers();
            DialogService.showSuccess('User created successfully');
        } catch (err) {
            DialogService.showError('Error creating user: ' + err.message);
        }
    };

    if (loading) return <div>Loading users...</div>;

    return (
        <div className="users-page">
            <div className="page-header">
                <h2>User Management</h2>
                <button className="btn-primary" onClick={() => setShowModal(true)}>Add User</button>
            </div>


            <table className="data-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Created At</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td>{user.username}</td>
                            <td><span className={`role-badge role-${user.role.toLowerCase()}`}>{user.role}</span></td>
                            <td>{new Date(user.created_at).toLocaleDateString()}</td>
                            <td>
                                <button className="btn-danger btn-sm" onClick={() => handleDelete(user.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Add New User</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="ADMIN">Admin</option>
                                    <option value="LIBRARIAN">Librarian</option>
                                    <option value="TEACHER">Teacher</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .users-page { padding: 1rem; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { text-align: left; padding: 0.75rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
        .role-badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
        .role-admin { background: var(--button-color); color: var(--header-text-color); }
        .role-librarian { background: var(--secondary-color); color: var(--header-text-color); }
        .role-teacher { background: var(--primary-color); color: var(--header-text-color); }
        .btn-primary { background: var(--button-color); color: var(--header-text-color); border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
        .btn-danger { background: var(--color-danger); color: var(--header-text-color); border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--overlay-color); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal { background: var(--color-surface); padding: 2rem; border-radius: var(--radius); width: 400px; border: 1px solid var(--color-border); box-shadow: var(--shadow-lg); }
        .modal h3 { margin-top: 0; color: var(--color-text); }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; color: var(--color-text-muted); }
        .form-group input, .form-group select { 
            width: 100%; 
            padding: 0.5rem; 
            background: var(--color-bg); 
            border: 1px solid var(--color-border); 
            border-radius: 4px; 
            color: var(--color-text);
        }
        .form-group input:focus, .form-group select:focus { border-color: var(--color-primary); outline: none; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
        .modal-actions button[type="button"] { 
            background: transparent; 
            border: 1px solid var(--color-border); 
            color: var(--color-text); 
            padding: 0.5rem 1rem; 
            border-radius: 4px; 
        }
        .modal-actions button[type="button"]:hover { background: var(--color-surface-hover); }      `}</style>
        </div>
    );
}
