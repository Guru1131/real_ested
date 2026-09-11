import React, { useState, useEffect } from 'react';
import api from '../services/api';

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: '',
    address: ''
  });
  
  const [editingId, setEditingId] = useState(null);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/branches');
      setBranches(res.data);
    } catch (err) {
      setError('Failed to fetch branches roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

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

    if (!formData.name || !formData.code || !formData.city) {
      setError('Please specify Name, Code and City.');
      return;
    }

    try {
      if (editingId) {
        // Edit Branch
        await api.put(`/api/branches/${editingId}`, formData);
        setSuccess('Branch configurations updated successfully.');
        setEditingId(null);
      } else {
        // Create Branch
        await api.post('/api/branches', formData);
        setSuccess('New Branch registered successfully.');
      }
      
      // Reset Form
      setFormData({ name: '', code: '', city: '', address: '' });
      fetchBranches();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit branch information.');
    }
  };

  const handleEdit = (branch) => {
    setEditingId(branch.id);
    setFormData({
      name: branch.name,
      code: branch.code,
      city: branch.city,
      address: branch.address || ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to soft-delete this branch? All users affiliated with it will lose branch scopes.')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.delete(`/api/branches/${id}`);
      setSuccess('Branch soft-deleted successfully.');
      fetchBranches();
    } catch (err) {
      setError('Failed to delete branch.');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', code: '', city: '', address: '' });
  };

  return (
    <div className="container-fluid py-2">
      {/* Header */}
      <div className="glass-panel p-4 mb-4 animate-fade-in">
        <h2 className="fw-700 text-white mb-1">Branch Directory Management</h2>
        <p className="text-muted mb-0">Add, edit, or remove regional system branch parameters. All operations require Super Admin authority.</p>
      </div>

      <div className="row g-4">
        
        {/* Left Column: Register Form */}
        <div className="col-12 col-lg-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="glass-panel p-4">
            <h5 className="fw-600 text-white mb-4">
              {editingId ? <><i className="bi bi-pencil-square text-primary me-2"></i>Edit Branch</> : <><i className="bi bi-plus-circle text-primary me-2"></i>Register New Branch</>}
            </h5>

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
                <label className="form-label text-muted small fw-600">BRANCH NAME *</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-control form-premium-control" 
                  placeholder="e.g. Pune Kondhwa Branch"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-600">UNIQUE BRANCH CODE *</label>
                <input 
                  type="text" 
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className="form-control form-premium-control" 
                  placeholder="e.g. PUNE-KND-01"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-600">CITY *</label>
                <input 
                  type="text" 
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="form-control form-premium-control" 
                  placeholder="e.g. Pune"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="form-label text-muted small fw-600">FULL OFFICE ADDRESS</label>
                <textarea 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="form-control form-premium-control" 
                  placeholder="Street address, landmarks, PIN..."
                ></textarea>
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-premium flex-grow-1 py-2">
                  {editingId ? 'Save Changes' : 'Create Branch'}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-premium-outline py-2" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Listing Table */}
        <div className="col-12 col-lg-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="glass-panel p-4">
            <h5 className="fw-600 text-white mb-4"><i className="bi bi-list-task text-primary me-2"></i>Active System Branches</h5>
            
            {loading ? (
              <div className="text-center py-4 text-muted">
                <div className="spinner-border spinner-border-sm me-2" role="status"></div> Loading branches...
              </div>
            ) : branches.length === 0 ? (
              <div className="text-center py-5 text-muted small">
                <i className="bi bi-diagram-3 fs-1 d-block mb-3 text-muted"></i> No branches registered in the system database yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th>CODE</th>
                      <th>NAME</th>
                      <th>CITY</th>
                      <th>ADDRESS</th>
                      <th className="text-end">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => (
                      <tr key={branch.id}>
                        <td className="fw-600 text-primary">{branch.code}</td>
                        <td className="fw-500 text-white">{branch.name}</td>
                        <td>{branch.city}</td>
                        <td className="small text-muted" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {branch.address || 'N/A'}
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1 flex-wrap">
                            <button 
                              className="btn btn-sm btn-outline-primary px-2.5" 
                              onClick={() => handleEdit(branch)}
                              title="Edit configurations"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger px-2.5" 
                              onClick={() => handleDelete(branch.id)}
                              title="Soft delete branch"
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
        </div>

      </div>
    </div>
  );
};

export default BranchManagement;
