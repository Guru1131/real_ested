import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { CustomizationContext } from '../context/CustomizationContext';
import api from '../services/api';

const AnnouncementManagerModal = ({ show, onClose }) => {
  const { user } = useContext(AuthContext);
  const { config } = useContext(CustomizationContext);
  const isDarkMode = config?.themeMode === 'dark';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    message: '',
    target_audience: 'all',
    theme: 'warning',
    is_active: true
  });

  const [editingId, setEditingId] = useState(null);

  const fetchAdminAnnouncements = async () => {
    try {
      setLoading(true);
      let res;
      try {
        res = await api.get('/api/announcements/admin');
      } catch (e1) {
        res = await api.get('/api/announcements/index.php?action=admin');
      }
      setAnnouncements(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show && ['super_admin', 'assistant_admin'].includes(user?.role)) {
      fetchAdminAnnouncements();
    }
  }, [show, user]);

  if (!show || !['super_admin', 'assistant_admin'].includes(user?.role)) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.message || !formData.message.trim()) {
      setError('Announcement text message is required.');
      return;
    }

    try {
      if (editingId) {
        try {
          await api.put(`/api/announcements/${editingId}`, formData);
        } catch (e1) {
          await api.put(`/api/announcements/index.php?id=${editingId}`, formData);
        }
        setSuccess('Announcement updated successfully.');
        setEditingId(null);
      } else {
        try {
          await api.post('/api/announcements', formData);
        } catch (e1) {
          await api.post('/api/announcements/index.php', formData);
        }
        setSuccess('Marquee announcement broadcast published successfully!');
      }

      setFormData({ message: '', target_audience: 'all', theme: 'warning', is_active: true });
      fetchAdminAnnouncements();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to publish announcement.';
      setError(errMsg);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      try {
        await api.put(`/api/announcements/${id}`, { is_active: !currentStatus });
      } catch (e1) {
        await api.put(`/api/announcements/index.php?id=${id}`, { is_active: !currentStatus });
      }
      fetchAdminAnnouncements();
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this marquee announcement?')) return;
    try {
      try {
        await api.delete(`/api/announcements/${id}`);
      } catch (e1) {
        await api.delete(`/api/announcements/index.php?id=${id}`);
      }
      fetchAdminAnnouncements();
    } catch (err) {
      alert('Failed to delete announcement.');
    }
  };

  const audienceLabels = {
    all: '🌐 All Users (Brokers, Staff, Admins)',
    external_broker: '🤝 External Brokers Only',
    branch_executive: '💼 Sales Executives Only',
    branch_admin: '🏢 Branch Admins Only',
    staff: '👥 Internal Staff Only'
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1070 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: '20px' }}>
          
          <div className="modal-header border-bottom py-3 px-4" style={{ borderColor: 'var(--border-color)' }}>
            <h5 className="modal-title fw-800 d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <i className="bi bi-broadcast text-warning"></i> Super Admin Marquee Announcement Control Center
            </h5>
            <button 
              type="button" 
              className={`btn-close ${isDarkMode ? 'btn-close-white' : ''}`} 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body p-4">
            
            {error && (
              <div className="alert alert-danger p-3 small mb-3 fw-600" style={{ borderRadius: '12px' }}>
                <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
              </div>
            )}
            {success && (
              <div className="alert alert-success p-3 small mb-3 fw-600" style={{ borderRadius: '12px' }}>
                <i className="bi bi-check-circle-fill me-2"></i>{success}
              </div>
            )}

            {/* Broadcast Form */}
            <form onSubmit={handleSubmit} className="p-4 rounded-3 border mb-4 shadow-sm" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
              <h6 className="fw-800 mb-3" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'Edit Announcement Broadcast' : 'Create New Marquee Broadcast'}
              </h6>

              <div className="mb-3">
                <label className="form-label small fw-700 text-uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  ANNOUNCEMENT TICKER MESSAGE *
                </label>
                <textarea
                  className="form-control form-premium-control"
                  rows="2"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="e.g. 🚀 Special Offer: 2.5% Commission Bonus on all Pune Kondhwa bookings closed before end of month!"
                  required
                ></textarea>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-700 text-uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    TARGET AUDIENCE FILTER *
                  </label>
                  <select 
                    className="form-select form-premium-control"
                    value={formData.target_audience}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  >
                    <option value="all">🌐 All Users (Brokers & Staff)</option>
                    <option value="external_broker">🤝 External Brokers Only</option>
                    <option value="branch_executive">💼 Sales Executives Only</option>
                    <option value="branch_admin">🏢 Branch Admins Only</option>
                    <option value="staff">👥 Internal Staff Only</option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label small fw-700 text-uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    THEME COLOR
                  </label>
                  <select 
                    className="form-select form-premium-control"
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                  >
                    <option value="warning">📣 Yellow (Warning)</option>
                    <option value="danger">🚨 Red (Urgent)</option>
                    <option value="info">ℹ️ Blue (Info)</option>
                    <option value="success">🎉 Green (Offer)</option>
                  </select>
                </div>

                <div className="col-md-3 d-flex align-items-end">
                  <div className="form-check form-switch mb-2">
                    <input 
                      type="checkbox" 
                      className="form-check-input"
                      id="is_active_toggle"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <label className="form-check-label small fw-700" htmlFor="is_active_toggle" style={{ color: 'var(--text-primary)' }}>
                      Active Banner
                    </label>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                {editingId && (
                  <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={() => { setEditingId(null); setFormData({ message: '', target_audience: 'all', theme: 'warning', is_active: true }); }}>
                    Cancel Edit
                  </button>
                )}
                <button type="submit" className="btn btn-warning text-dark fw-700 btn-sm rounded-pill px-4 shadow-sm">
                  <i className="bi bi-send-fill me-1.5"></i> {editingId ? 'Save Changes' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>

            {/* List of Existing Broadcasts */}
            <h6 className="fw-800 mb-3" style={{ color: 'var(--text-primary)' }}>
              <i className="bi bi-list-stars me-1 text-warning"></i> Active & Past Announcements
            </h6>
            
            {loading ? (
              <div className="text-center py-4 text-muted">
                <div className="spinner-border spinner-border-sm text-warning me-2"></div>
                Loading announcements...
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-muted small py-4 text-center border rounded-3" style={{ borderColor: 'var(--border-color)' }}>
                No marquee announcements configured yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle small" style={{ color: 'var(--text-primary)' }}>
                  <thead>
                    <tr className="table-light text-muted">
                      <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>MESSAGE</th>
                      <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>TARGET AUDIENCE</th>
                      <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>THEME</th>
                      <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>STATUS</th>
                      <th className="text-end" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ maxWidth: '280px' }} className="fw-600">{a.message}</td>
                        <td className="small text-muted">{audienceLabels[a.target_audience] || a.target_audience}</td>
                        <td>
                          <span className={`badge bg-${a.theme === 'danger' ? 'danger' : a.theme === 'info' ? 'info' : a.theme === 'success' ? 'success' : 'warning text-dark'} px-2.5 py-1 fw-600`}>
                            {a.theme}
                          </span>
                        </td>
                        <td>
                          <button 
                            className={`btn btn-xs rounded-pill px-2.5 py-0.5 fw-600 ${a.is_active ? 'btn-success' : 'btn-secondary'}`}
                            onClick={() => handleToggleActive(a.id, a.is_active)}
                          >
                            {a.is_active ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="text-end">
                          <button 
                            className="btn btn-xs btn-outline-primary rounded-pill me-1 px-2.5 py-0.5"
                            onClick={() => {
                              setEditingId(a.id);
                              setFormData({ message: a.message, target_audience: a.target_audience, theme: a.theme, is_active: Boolean(a.is_active) });
                            }}
                          >
                            Edit
                          </button>
                          <button className="btn btn-xs btn-outline-danger rounded-pill px-2.5 py-0.5" onClick={() => handleDelete(a.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
          
          <div className="modal-footer border-top py-3 px-4" style={{ borderColor: 'var(--border-color)' }}>
            <button type="button" className="btn btn-secondary btn-sm rounded-pill px-4" onClick={onClose}>Close</button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AnnouncementManagerModal;
