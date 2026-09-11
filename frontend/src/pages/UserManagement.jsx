import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const UserManagement = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
    branch_id: '',
    phone: ''
  });

  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch users
      const usersRes = await api.get('/api/users');
      // Filter out brokers from this staff-only page
      const staffList = usersRes.data.filter(u => u.role !== 'external_broker');
      setUsers(staffList);

      // Fetch branches (if super_admin or assistant_admin)
      if (['super_admin', 'assistant_admin'].includes(currentUser.role)) {
        const branchesRes = await api.get('/api/branches');
        setBranches(branchesRes.data);
      }
    } catch (err) {
      setError('Failed to fetch users and branches data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Set default branch for Branch Admin
  useEffect(() => {
    if (currentUser.role === 'branch_admin') {
      setFormData(prev => ({
        ...prev,
        branch_id: currentUser.branch_id,
        role: 'branch_executive' // Pre-selected since Branch Admins can only create executives or brokers
      }));
    }
  }, [currentUser]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.username || !formData.email || !formData.password || !formData.role) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      await api.post('/api/users', formData);
      setSuccess('Internal staff user registered successfully.');
      
      // Reset Form
      setFormData({
        username: '',
        email: '',
        password: '',
        role: currentUser.role === 'branch_admin' ? 'branch_executive' : '',
        branch_id: currentUser.role === 'branch_admin' ? currentUser.branch_id : '',
        phone: ''
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register user.');
    }
  };

  const handleEditInit = (user) => {
    setEditingId(user.id);
    setEditStatus(user.status);
    setEditPhone(user.phone || '');
    setEditPassword('');
  };

  const handleUpdate = async (id) => {
    setError('');
    setSuccess('');
    try {
      const updateData = {
        status: editStatus,
        phone: editPhone
      };
      if (editPassword) {
        updateData.password = editPassword;
      }

      await api.put(`/api/users/${id}`, updateData);
      setSuccess('User profile updated successfully.');
      setEditingId(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to soft-delete this user account? Historical transaction links will be preserved but login access is immediately revoked.')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await api.delete(`/api/users/${id}`);
      setSuccess('User soft-deleted successfully.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  const roleLabels = {
    super_admin: 'Super Admin',
    assistant_admin: 'Assistant Admin',
    branch_admin: 'Branch Admin',
    branch_executive: 'Sales Executive'
  };

  return (
    <div className="container-fluid py-2">
      {/* Header */}
      <div className="glass-panel p-4 mb-4 animate-fade-in">
        <h2 className="fw-700 text-white mb-1">Internal Staff Directory</h2>
        <p className="text-muted mb-0">Manage roles, branch scope, and activation status for system administrators and field sales staff. Super Admin account is protected.</p>
      </div>

      <div className="row g-4">
        
        {/* Left Column: Register Employee */}
        <div className="col-12 col-lg-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="glass-panel p-4">
            <h5 className="fw-600 text-white mb-4"><i className="bi bi-person-plus text-primary me-2"></i>Register Staff Account</h5>
            
            {error && (
              <div className="alert alert-danger py-2" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success py-2" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-check-circle-fill me-2"></i> {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label text-muted small fw-600">USERNAME *</label>
                <input 
                  type="text" 
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-control form-premium-control" 
                  placeholder="Enter unique login name"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-600">EMAIL ADDRESS *</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-control form-premium-control" 
                  placeholder="Enter contact email"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-600">SECURE PASSWORD *</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-control form-premium-control" 
                  placeholder="Min 6 characters"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-600">ASSIGN ROLE *</label>
                <select 
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="form-select form-premium-control"
                  required
                  disabled={currentUser.role === 'branch_admin'}
                >
                  <option value="">-- Choose Role --</option>
                  {currentUser.role === 'super_admin' && <option value="assistant_admin">Assistant Admin</option>}
                  {['super_admin', 'assistant_admin'].includes(currentUser.role) && <option value="branch_admin">Branch Admin</option>}
                  <option value="branch_executive">Branch Executive</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-600">AFFILIATED BRANCH *</label>
                {currentUser.role === 'branch_admin' ? (
                  <input 
                    type="text" 
                    className="form-control form-premium-control" 
                    value={currentUser.branch_name || ''} 
                    disabled 
                  />
                ) : (
                  <select 
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={handleChange}
                    className="form-select form-premium-control"
                    required={formData.role !== 'assistant_admin'}
                    disabled={formData.role === 'assistant_admin'}
                  >
                    <option value="">-- Choose Branch Scope --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="mb-4">
                <label className="form-label text-muted small fw-600">PHONE NUMBER</label>
                <input 
                  type="text" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-control form-premium-control" 
                  placeholder="e.g. +91 98888 88888"
                />
              </div>

              <button type="submit" className="btn btn-premium w-100 py-2">
                Register User
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Listing Table */}
        <div className="col-12 col-lg-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="glass-panel p-4">
            <h5 className="fw-600 text-white mb-4"><i className="bi bi-people text-primary me-2"></i>Active Staff Listing</h5>
            
            {loading ? (
              <div className="text-center py-4 text-muted">
                <div className="spinner-border spinner-border-sm me-2" role="status"></div> Loading staff list...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-5 text-muted small">
                <i className="bi bi-people fs-1 d-block mb-3 text-muted"></i> No staff users registered for this scope yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th>STAFF USERNAME</th>
                      <th>ROLE</th>
                      <th>BRANCH</th>
                      <th>PHONE</th>
                      <th>STATUS</th>
                      <th className="text-end">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="fw-600 text-white">{u.username}</div>
                          <div className="text-muted small">{u.email}</div>
                        </td>
                        <td className="small fw-500 text-capitalize">{roleLabels[u.role] || u.role}</td>
                        <td className="small">{u.branch_name || <span className="text-muted">Global Scope</span>}</td>
                        <td className="small">{editingId === u.id ? (
                          <input 
                            type="text" 
                            className="form-control form-premium-control py-1 px-2 text-white" 
                            style={{ fontSize: '0.85rem' }} 
                            value={editPhone} 
                            onChange={(e) => setEditPhone(e.target.value)} 
                          />
                        ) : u.phone || 'N/A'}</td>
                        <td>{editingId === u.id ? (
                          <select 
                            className="form-select form-premium-control py-1 px-2 text-white" 
                            style={{ fontSize: '0.85rem' }}
                            value={editStatus} 
                            onChange={(e) => setEditStatus(e.target.value)}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        ) : (
                          <span className={`badge ${u.status === 'active' ? 'badge-active' : 'badge-inactive'} rounded-pill px-2.5 py-1`}>
                            {u.status === 'active' ? 'Active' : 'Deactivated'}
                          </span>
                        )}</td>
                        <td className="text-end">
                          {editingId === u.id ? (
                            <div className="d-flex justify-content-end gap-1 flex-wrap">
                              <button className="btn btn-sm btn-success px-2" onClick={() => handleUpdate(u.id)} title="Save changes">
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button className="btn btn-sm btn-secondary px-2" onClick={() => setEditingId(null)} title="Cancel">
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </div>
                          ) : (
                            <div className="d-flex justify-content-end gap-1 flex-wrap">
                              <button className="btn btn-sm btn-outline-primary px-2.5" onClick={() => handleEditInit(u)} title="Edit user">
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button className="btn btn-sm btn-outline-danger px-2.5" onClick={() => handleDelete(u.id)} title="Soft delete user">
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserManagement;
