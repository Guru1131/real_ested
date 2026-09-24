import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const BrokerStaffManagement = () => {
  const { user } = useContext(AuthContext);

  const [staffData, setStaffData] = useState({
    sub_account_limit: 5,
    sub_account_count: 0,
    remaining_slots: 5,
    staff: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    username: '',
    email: '',
    password: '',
    phone: ''
  });
  const [creating, setCreating] = useState(false);

  // Password reset modal
  const [resetModalId, setResetModalId] = useState(null);
  const [resetUsername, setResetUsername] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/api/users/broker-staff');
        setStaffData(res.data);
      } catch (err1) {
        const res2 = await api.get('/api/users/broker_staff.php');
        setStaffData(res2.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load staff sub-accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.username || !newStaff.email || !newStaff.password) {
      alert('Username, Email, and Password are required.');
      return;
    }

    setCreating(true);
    setError('');
    setSuccess('');

    try {
      let res;
      try {
        res = await api.post('/api/users/broker-staff', newStaff);
      } catch (e1) {
        res = await api.post('/api/users/broker_staff.php', newStaff);
      }

      setSuccess(res.data?.message || 'Staff sub-account ID created successfully!');
      setShowAddModal(false);
      setNewStaff({ username: '', email: '', password: '', phone: '' });
      fetchStaffData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create staff sub-account.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (staffId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      try {
        await api.put(`/api/users/broker-staff/${staffId}`, { status: nextStatus });
      } catch (e1) {
        await api.put(`/api/users/broker_staff.php?id=${staffId}`, { status: nextStatus });
      }
      setSuccess(`Sub-account status updated to ${nextStatus}.`);
      fetchStaffData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update account status.');
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }

    setUpdatingPassword(true);
    try {
      try {
        await api.put(`/api/users/broker-staff/${resetModalId}`, { password: newPasswordInput });
      } catch (e1) {
        await api.put(`/api/users/broker_staff.php?id=${resetModalId}`, { password: newPasswordInput });
      }
      alert(`Password for staff "${resetUsername}" updated successfully.`);
      setResetModalId(null);
      setNewPasswordInput('');
      fetchStaffData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset staff password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteStaff = async (staffId, username) => {
    if (!window.confirm(`Are you sure you want to delete staff sub-account "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      try {
        await api.delete(`/api/users/broker-staff/${staffId}`);
      } catch (e1) {
        await api.delete(`/api/users/broker_staff.php?id=${staffId}`);
      }
      setSuccess(`Staff sub-account "${username}" deleted successfully.`);
      fetchStaffData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete staff sub-account.');
    }
  };

  const usagePercent = Math.min(100, Math.round((staffData.sub_account_count / (staffData.sub_account_limit || 1)) * 100));

  return (
    <div className="container-fluid py-2 animate-fade-in">
      
      {/* Header Banner */}
      <div className="glass-panel p-4 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h2 className="fw-700 text-white mb-1">
            <i className="bi bi-people-fill text-warning me-2"></i>My Staff Sub-Accounts
          </h2>
          <p className="text-muted mb-0">Create and manage sub-accounts for your office team members. Staff sub-accounts inherit your branch access allowances.</p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)} 
          className="btn btn-premium px-4 py-2"
          disabled={staffData.sub_account_count >= staffData.sub_account_limit}
        >
          <i className="bi bi-person-plus-fill me-1.5"></i> Add Staff Sub-Account
        </button>
      </div>

      {/* Limit & Counter Overview Widget */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <div className="glass-panel p-4 h-100 border-start border-4 border-warning">
            <span className="text-muted small fw-700 d-block mb-1 text-uppercase">Sub-Accounts Used</span>
            <div className="d-flex align-items-baseline gap-2">
              <h2 className="fw-800 text-white mb-0">{staffData.sub_account_count}</h2>
              <span className="text-muted fs-5">/ {staffData.sub_account_limit} Allowed IDs</span>
            </div>
            <div className="progress mt-3 style-progress" style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <div 
                className={`progress-bar ${usagePercent >= 100 ? 'bg-danger' : usagePercent >= 80 ? 'bg-warning' : 'bg-success'}`} 
                style={{ width: `${usagePercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="glass-panel p-4 h-100 border-start border-4 border-success">
            <span className="text-muted small fw-700 d-block mb-1 text-uppercase">Available Slots</span>
            <h2 className="fw-800 text-success mb-1">{staffData.remaining_slots} Slots Free</h2>
            <span className="small text-muted">Ready for immediate staff onboarding</span>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="glass-panel p-4 h-100 border-start border-4 border-info">
            <span className="text-muted small fw-700 d-block mb-1 text-uppercase">Limit Upgrade Notice</span>
            <p className="small text-light mb-1">Account limits are assigned by Super Admin.</p>
            <span className="badge bg-dark text-warning border border-warning border-opacity-30 rounded-pill px-3 py-1.5 small">
              Need more IDs? Request Super Admin
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger p-3 mb-4 animate-fade-in">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success p-3 mb-4 animate-fade-in">
          <i className="bi bi-check-circle-fill me-2"></i> {success}
        </div>
      )}

      {/* Staff Roster Table */}
      <div className="glass-panel p-4 mb-4">
        <h5 className="fw-700 text-white mb-3">Staff Sub-Account Roster</h5>

        {loading ? (
          <div className="text-center py-5 text-muted">
            <div className="spinner-border text-warning me-2" role="status"></div>
            <span>Loading staff accounts...</span>
          </div>
        ) : staffData.staff.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-person-badge fs-1 d-block mb-2 text-warning opacity-75"></i>
            <h5 className="fw-600 text-white mb-1">No Staff Sub-Accounts Created Yet</h5>
            <p className="small mb-3">Click "Add Staff Sub-Account" above to create your first team member login ID.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: 'transparent' }}>
              <thead>
                <tr className="text-muted small border-bottom border-secondary border-opacity-30">
                  <th>USERNAME & ID</th>
                  <th>EMAIL ADDRESS</th>
                  <th>PHONE</th>
                  <th>STATUS</th>
                  <th>CREATED ON</th>
                  <th className="text-end">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {staffData.staff.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="fw-700 text-white d-flex align-items-center gap-2">
                        <i className="bi bi-person-circle text-warning"></i>
                        <span>{member.username}</span>
                      </div>
                      <span className="text-muted small">ID: #{member.id}</span>
                    </td>
                    <td className="small text-light">{member.email}</td>
                    <td className="small text-light">{member.phone || 'N/A'}</td>
                    <td>
                      <button 
                        onClick={() => handleToggleStatus(member.id, member.status)}
                        className={`btn btn-xs rounded-pill px-3 py-1 fw-600 border-0 ${member.status === 'active' ? 'bg-success bg-opacity-20 text-success' : 'bg-danger bg-opacity-20 text-danger'}`}
                      >
                        <i className={`bi bi-circle-fill me-1 fs-6`} style={{ fontSize: '0.6rem' }}></i>
                        {member.status === 'active' ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="small text-muted">{new Date(member.created_at).toLocaleDateString()}</td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <button 
                          onClick={() => { setResetModalId(member.id); setResetUsername(member.username); }} 
                          className="btn btn-sm btn-outline-warning px-2.5"
                          title="Reset Password"
                        >
                          <i className="bi bi-key-fill me-1"></i> Password
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(member.id, member.username)} 
                          className="btn btn-sm btn-outline-danger px-2.5"
                          title="Delete Account"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel border-0 text-white">
              <div className="modal-header border-bottom border-secondary border-opacity-30">
                <h5 className="modal-title fw-700"><i className="bi bi-person-plus-fill text-warning me-2"></i>Create Staff Sub-Account</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateStaff}>
                <div className="modal-body py-3">
                  <div className="alert alert-info py-2 small mb-3">
                    <i className="bi bi-info-circle-fill me-1.5"></i>
                    Using slot <strong>#{staffData.sub_account_count + 1}</strong> of <strong>{staffData.sub_account_limit}</strong> total allowed staff IDs.
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted small fw-600">STAFF USERNAME *</label>
                    <input 
                      type="text" 
                      value={newStaff.username}
                      onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                      className="form-control form-premium-control" 
                      placeholder="e.g. rahul_sales"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted small fw-600">EMAIL ADDRESS *</label>
                    <input 
                      type="email" 
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      className="form-control form-premium-control" 
                      placeholder="e.g. rahul@brokeragency.com"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted small fw-600">STAFF PASSWORD *</label>
                    <input 
                      type="password" 
                      value={newStaff.password}
                      onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                      className="form-control form-premium-control" 
                      placeholder="Min 6 characters password"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted small fw-600">PHONE NUMBER</label>
                    <input 
                      type="text" 
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      className="form-control form-premium-control" 
                      placeholder="e.g. +91 98888 88888"
                    />
                  </div>
                </div>
                <div className="modal-footer border-top border-secondary border-opacity-30">
                  <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-premium px-4" disabled={creating}>
                    {creating ? 'Creating ID...' : 'Create Staff ID'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModalId && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content glass-panel border-0 text-white">
              <div className="modal-header border-bottom border-secondary border-opacity-30">
                <h6 className="modal-title fw-700"><i className="bi bi-key-fill text-warning me-2"></i>Reset Password: {resetUsername}</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setResetModalId(null)}></button>
              </div>
              <form onSubmit={handlePasswordResetSubmit}>
                <div className="modal-body py-3">
                  <label className="form-label text-muted small fw-600">NEW PASSWORD *</label>
                  <input 
                    type="password" 
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="form-control form-premium-control" 
                    placeholder="Enter new password"
                    required
                    autoFocus
                  />
                </div>
                <div className="modal-footer border-top border-secondary border-opacity-30">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setResetModalId(null)}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-warning fw-700" disabled={updatingPassword}>
                    {updatingPassword ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BrokerStaffManagement;
