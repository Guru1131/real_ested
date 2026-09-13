import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const AnnouncementManagerModal = ({ show, onClose }) => {
  const { user } = useContext(AuthContext);
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
      setError('Failed to fetch announcements.');
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
          await api.post(`/api/announcements/index.php?id=${editingId}`, formData);
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
      setError(err.response?.data?.error || 'Failed to publish announcement.');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      try {
        await api.put(`/api/announcements/${id}`, { is_active: !currentStatus });
      } catch (e1) {
        await api.post(`/api/announcements/index.php?id=${id}`, { is_active: !currentStatus });
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
        await api.post(`/api/announcements/index.php?id=${id}&_method=DELETE`);
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
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1070 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content glass-panel text-light border-secondary">
          
          <div className="modal-header border-secondary">
            <h5 className="modal-title fw-700 text-white">
              <i className="bi bi-broadcast text-warning me-2"></i>Super Admin Marquee Announcement Control Center
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4">
            
            {error && (
              <div className="alert alert-danger p-2 small mb-3">
                <i className="bi bi-exclamation-circle me-1"></i>{error}
              </div>
            )}
            {success && (
              <div className="alert alert-success p-2 small mb-3">
                <i className="bi bi-check-circle me-1"></i>{success}
              </div>
            )}

            {/* Broadcast Form */}
            <form onSubmit={handleSubmit} className="p-3 bg-dark bg-opacity-40 rounded border border-primary border-opacity-30 mb-4">
              <h6 className="fw-700 text-white mb-3">
                {editingId ? 'Edit Announcement Broadcast' : 'Create New Marquee Broadcast'}
              </h6>

              <div className="mb-3">
                <label className="form-label text-white small fw-600">ANNOUNCEMENT TICKER MESSAGE *</label>
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
                  <label className="form-label text-white small fw-600">TARGET AUDIENCE FILTER *</label>
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
                  <label className="form-label text-white small fw-600">THEME COLOR</label>
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
                    <label className="form-check-label text-white small fw-600" htmlFor="is_active_toggle">
                      Active Banner
                    </label>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                {editingId && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditingId(null); setFormData({ message: '', target_audience: 'all', theme: 'warning', is_active: true }); }}>
                    Cancel Edit
                  </button>
                )}
                <button type="submit" className="btn btn-warning text-dark fw-600 btn-sm">
                  <i className="bi bi-send-fill me-1"></i> {editingId ? 'Save Changes' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>

            {/* List of Existing Broadcasts */}
            <h6 className="fw-700 text-white mb-3"><i className="bi bi-list-stars me-1"></i>Active & Past Announcements</h6>
            {loading ? (
              <div className="text-center py-3 text-muted">Loading announcements...</div>
            ) : announcements.length === 0 ? (
              <div className="text-muted small py-3 text-center">No marquee announcements configured yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover small">
                  <thead>
                    <tr>
                      <th>MESSAGE</th>
                      <th>TARGET AUDIENCE</th>
                      <th>THEME</th>
                      <th>STATUS</th>
                      <th className="text-end">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map(a => (
                      <tr key={a.id}>
                        <td style={{ maxWidth: '300px' }}>{a.message}</td>
                        <td className="small">{audienceLabels[a.target_audience] || a.target_audience}</td>
                        <td>
                          <span className={`badge bg-${a.theme === 'danger' ? 'danger' : a.theme === 'info' ? 'info' : a.theme === 'success' ? 'success' : 'warning text-dark'}`}>
                            {a.theme}
                          </span>
                        </td>
                        <td>
                          <button 
                            className={`btn btn-xs ${a.is_active ? 'btn-success' : 'btn-secondary'}`}
                            onClick={() => handleToggleActive(a.id, a.is_active)}
                          >
                            {a.is_active ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="text-end">
                          <button 
                            className="btn btn-xs btn-outline-primary me-1"
                            onClick={() => {
                              setEditingId(a.id);
                              setFormData({ message: a.message, target_audience: a.target_audience, theme: a.theme, is_active: Boolean(a.is_active) });
                            }}
                          >
                            Edit
                          </button>
                          <button className="btn btn-xs btn-outline-danger" onClick={() => handleDelete(a.id)}>
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
          
          <div className="modal-footer border-secondary">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AnnouncementManagerModal;
