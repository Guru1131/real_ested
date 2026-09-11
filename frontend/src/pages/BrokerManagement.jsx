import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const BrokerManagement = () => {
  const { user: currentUser } = useContext(AuthContext);
  
  const [brokers, setBrokers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedLogs, setSelectedLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsBrokerName, setLogsBrokerName] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    branchIds: []
  });

  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBranchIds, setEditBranchIds] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Brokers list
      const brokersRes = await api.get('/api/users/brokers');
      setBrokers(brokersRes.data);

      // Fetch active Branches list
      const branchesRes = await api.get('/api/branches');
      setBranches(branchesRes.data);
    } catch (err) {
      setError('Failed to load broker profiles and branches directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBranchCheckboxChange = (branchId, isEdit = false) => {
    if (isEdit) {
      if (editBranchIds.includes(branchId)) {
        setEditBranchIds(editBranchIds.filter(id => id !== branchId));
      } else {
        setEditBranchIds([...editBranchIds, branchId]);
      }
    } else {
      if (formData.branchIds.includes(branchId)) {
        setFormData({
          ...formData,
          branchIds: formData.branchIds.filter(id => id !== branchId)
        });
      } else {
        setFormData({
          ...formData,
          branchIds: [...formData.branchIds, branchId]
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.username || !formData.email || !formData.password) {
      setError('Username, Email and Password are required.');
      return;
    }

    if (currentUser.role !== 'branch_admin' && formData.branchIds.length === 0) {
      setError('Please assign at least one branch to this broker.');
      return;
    }

    try {
      await api.post('/api/users/brokers', formData);
      setSuccess('External Broker account created successfully.');
      setFormData({
        username: '',
        email: '',
        password: '',
        phone: '',
        branchIds: []
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create broker account.');
    }
  };

  const handleEditInit = (broker) => {
    setEditingId(broker.id);
    setEditStatus(broker.status);
    setEditPhone(broker.phone || '');
    setEditBranchIds(broker.branches ? broker.branches.map(b => b.id) : []);
  };

  const handleUpdate = async (id) => {
    setError('');
    setSuccess('');
    try {
      const updateData = {
        status: editStatus,
        phone: editPhone
      };
      // Only Super/Assistant Admins can edit branch assignments
      if (['super_admin', 'assistant_admin'].includes(currentUser.role)) {
        updateData.branchIds = editBranchIds;
      }
      
      await api.put(`/api/users/${id}`, updateData);
      setSuccess('Broker profile updated successfully.');
      setEditingId(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update broker.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate/delete this broker? Their lead history remains preserved.')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await api.delete(`/api/users/${id}`);
      setSuccess('Broker account soft-deleted successfully.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete broker account.');
    }
  };

  const fetchLogs = async (brokerId, brokerName) => {
    try {
      setLogsLoading(true);
      setLogsBrokerName(brokerName);
      setSelectedLogs([]);
      const res = await api.get(`/api/users/broker/${brokerId}/logs`);
      setSelectedLogs(res.data.logs);
      
      // Scroll to logs container
      setTimeout(() => {
        document.getElementById('logs-container')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err) {
      setError('Failed to retrieve activity logs for ' + brokerName);
    } finally {
      setLogsLoading(false);
    }
  };

  const getLogIcon = (type) => {
    switch(type) {
      case 'login': return 'bi-box-arrow-in-right text-success';
      case 'property_view': return 'bi-eye-fill text-info';
      case 'property_share_whatsapp': return 'bi-whatsapp text-success';
      case 'property_share_email': return 'bi-envelope-fill text-primary';
      case 'lead_submission': return 'bi-person-plus-fill text-warning';
      default: return 'bi-info-circle text-secondary';
    }
  };

  const formatLogText = (log) => {
    const meta = log.metadata || {};
    switch(log.activity_type) {
      case 'login': return `Logged in from IP: ${meta.ip || '127.0.0.1'}`;
      case 'property_view': return `Viewed details for property: ${log.project_name || 'N/A'}`;
      case 'property_share_whatsapp': return `Shared ${log.project_name || 'N/A'} via WhatsApp to: ${meta.recipient || 'N/A'}`;
      case 'property_share_email': return `Shared ${log.project_name || 'N/A'} via Email to: ${meta.recipient || 'N/A'}`;
      case 'lead_submission': return `Submitted lead for client: ${meta.lead_name || 'N/A'}`;
      default: return 'Performed unknown activity';
    }
  };

  return (
    <div className="container-fluid py-2">
      {/* Header */}
      <div className="glass-panel p-4 mb-4 animate-fade-in">
        <h2 className="fw-700 text-white mb-1">External Broker Registry</h2>
        <p className="text-muted mb-0">Create third-party broker profiles, map regional branch allowances, toggle access states, and audit tracking logs.</p>
      </div>

      <div className="row g-4">
        
        {/* Left Column: Create Broker */}
        <div className="col-12 col-lg-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="glass-panel p-4">
            <h5 className="fw-600 text-white mb-4"><i className="bi bi-person-plus text-primary me-2"></i>Create Broker Account</h5>
            
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
                <label className="form-label text-muted small fw-600">BROKER USERNAME *</label>
                <input 
                  type="text" 
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-control form-premium-control" 
                  placeholder="Enter login username"
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
                  placeholder="e.g. broker@gmail.com"
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
                <label className="form-label text-muted small fw-600">CONTACT PHONE</label>
                <input 
                  type="text" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-control form-premium-control" 
                  placeholder="e.g. +91 97777 77777"
                />
              </div>

              <div className="mb-4">
                <label className="form-label text-muted small fw-600">ASSIGN BRANCH ALLOWANCES *</label>
                {currentUser.role === 'branch_admin' ? (
                  <div className="form-check text-light">
                    <input className="form-check-input text-primary" type="checkbox" checked disabled id="branchAdminCheck" />
                    <label className="form-check-label small" htmlFor="branchAdminCheck">
                      Pune Kondhwa Branch (Your Branch)
                    </label>
                  </div>
                ) : (
                  <div className="bg-dark bg-opacity-20 p-3 rounded" style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)' }}>
                    {branches.map(b => (
                      <div key={b.id} className="form-check mb-2">
                        <input 
                          type="checkbox" 
                          className="form-check-input"
                          id={`branch_${b.id}`}
                          checked={formData.branchIds.includes(b.id)}
                          onChange={() => handleBranchCheckboxChange(b.id)}
                        />
                        <label className="form-check-label small text-light" htmlFor={`branch_${b.id}`}>
                          {b.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-premium w-100 py-2">
                Create Broker Profile
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Listing Table */}
        <div className="col-12 col-lg-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="glass-panel p-4">
            <h5 className="fw-600 text-white mb-4"><i className="bi bi-people text-primary me-2"></i>Registered External Brokers</h5>
            
            {loading ? (
              <div className="text-center py-4 text-muted">
                <div className="spinner-border spinner-border-sm me-2" role="status"></div> Loading brokers roster...
              </div>
            ) : brokers.length === 0 ? (
              <div className="text-center py-5 text-muted small">
                <i className="bi bi-person-badge fs-1 d-block mb-3 text-muted"></i> No external brokers registered for this scope yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th>BROKER DETS</th>
                      <th>PHONE</th>
                      <th>ALLOWED BRANCHES</th>
                      <th>STATUS</th>
                      <th className="text-end">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brokers.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <div className="fw-600 text-white">{b.username}</div>
                          <div className="text-muted small">{b.email}</div>
                        </td>
                        <td className="small">{editingId === b.id ? (
                          <input 
                            type="text" 
                            className="form-control form-premium-control py-1 px-2 text-white" 
                            style={{ fontSize: '0.85rem' }} 
                            value={editPhone} 
                            onChange={(e) => setEditPhone(e.target.value)} 
                          />
                        ) : b.phone || 'N/A'}</td>
                        <td>
                          {editingId === b.id && ['super_admin', 'assistant_admin'].includes(currentUser.role) ? (
                            <div className="bg-dark bg-opacity-30 p-2 rounded" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                              {branches.map(br => (
                                <div key={br.id} className="form-check">
                                  <input 
                                    type="checkbox" 
                                    className="form-check-input"
                                    id={`edit_branch_${br.id}`}
                                    checked={editBranchIds.includes(br.id)}
                                    onChange={() => handleBranchCheckboxChange(br.id, true)}
                                  />
                                  <label className="form-check-label text-light" style={{ fontSize: '0.75rem' }} htmlFor={`edit_branch_${br.id}`}>
                                    {br.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="d-flex flex-wrap gap-1">
                              {b.branches && b.branches.map(br => (
                                <span key={br.id} className="badge bg-secondary text-light small rounded-pill px-2.5 py-1">
                                  {br.name}
                                </span>
                              ))}
                              {(!b.branches || b.branches.length === 0) && <span className="text-muted small">None</span>}
                            </div>
                          )}
                        </td>
                        <td>{editingId === b.id ? (
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
                          <span className={`badge ${b.status === 'active' ? 'badge-active' : 'badge-inactive'} rounded-pill px-2.5 py-1`}>
                            {b.status === 'active' ? 'Active' : 'Deactivated'}
                          </span>
                        )}</td>
                        <td className="text-end">
                          {editingId === b.id ? (
                            <div className="d-flex justify-content-end gap-1 flex-wrap">
                              <button className="btn btn-sm btn-success px-2" onClick={() => handleUpdate(b.id)} title="Save changes">
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button className="btn btn-sm btn-secondary px-2" onClick={() => setEditingId(null)} title="Cancel">
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </div>
                          ) : (
                            <div className="d-flex justify-content-end gap-1 flex-wrap">
                              <button className="btn btn-sm btn-outline-info px-2.5" onClick={() => fetchLogs(b.id, b.username)} title="View audit activity logs">
                                <i className="bi bi-activity"></i>
                              </button>
                              <button className="btn btn-sm btn-outline-primary px-2.5" onClick={() => handleEditInit(b)} title="Edit broker">
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button className="btn btn-sm btn-outline-danger px-2.5" onClick={() => handleDelete(b.id)} title="Deactivate broker account">
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

      {/* Logs Audit panel */}
      {selectedLogs && (
        <div id="logs-container" className="row mt-4 animate-fade-in">
          <div className="col-12">
            <div className="glass-panel p-4">
              <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="fw-600 text-white mb-0">
                  <i className="bi bi-clock-history text-primary me-2"></i>Activity Tracking Logs for Broker: <strong>{logsBrokerName}</strong>
                </h5>
                <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={() => setSelectedLogs(null)}>Close Logs</button>
              </div>

              {logsLoading ? (
                <div className="text-center py-4 text-muted">
                  <div className="spinner-border spinner-border-sm me-2" role="status"></div> Loading audit stream...
                </div>
              ) : selectedLogs.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  <i className="bi bi-activity fs-3 d-block mb-2"></i> No logins or share actions recorded for this broker account yet.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>ACTIVITY ID</th>
                        <th>TYPE</th>
                        <th>EVENT DETAILS</th>
                        <th>IP / DEVICE INFO</th>
                        <th>TIMESTAMP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="small text-muted">{log.id}</td>
                          <td>
                            <span className="badge-status badge-approved text-capitalize d-inline-flex align-items-center gap-1.5" style={{ fontSize: '0.7rem' }}>
                              <i className={`bi ${getLogIcon(log.activity_type)}`}></i>
                              {log.activity_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="fw-500 text-white small">{formatLogText(log)}</td>
                          <td className="small text-muted">{log.metadata?.ip || log.metadata?.user_agent || 'N/A'}</td>
                          <td className="small text-muted">{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerManagement;
