import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const InventoryManagement = () => {
  const { user } = useContext(AuthContext);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null); // id of property being updated

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/properties');
      setProperties(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch properties.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id, field, value) => {
    setProperties(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const [successMsg, setSuccessMsg] = useState('');

  const handleUpdateInventory = async (property) => {
    try {
      setUpdating(property.id);
      setSuccessMsg('');
      setError('');
      await api.post('/api/properties/update_inventory.php', {
        id: property.id,
        total_units: parseInt(property.total_units) || 0,
        available_units: parseInt(property.available_units) || 0
      });
      setSuccessMsg(`Inventory count updated successfully for "${property.project_name}".`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      const errMsg = err.response?.data?.details ? `${err.response.data.error} (${err.response.data.details})` : (err.response?.data?.error || err.message || 'Failed to update inventory.');
      setError(errMsg);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="p-4 text-center text-muted"><div className="spinner-border text-primary me-2"></div>Loading inventory data...</div>;

  return (
    <div className="container-fluid py-4 animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-800 mb-0" style={{ color: 'var(--text-primary)' }}><i className="bi bi-box-seam me-2 text-primary"></i> Inventory Management</h3>
        <button onClick={fetchProperties} className="btn btn-outline-secondary btn-sm"><i className="bi bi-arrow-clockwise"></i> Refresh</button>
      </div>

      {successMsg && <div className="alert alert-success animate-fade-in mb-3"><i className="bi bi-check-circle-fill me-2"></i>{successMsg}</div>}
      {error && <div className="alert alert-danger animate-fade-in mb-3"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}

      <div className="glass-panel p-4">
        <div className="table-responsive">
          <table className="table table-borderless table-hover align-middle mb-0" style={{ '--bs-table-bg': 'transparent', color: 'var(--text-primary)' }}>
            <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
              <tr className="small text-muted">
                <th>Property Code</th>
                <th>Project Name</th>
                <th>Location</th>
                <th style={{ width: '150px' }}>Total Units</th>
                <th style={{ width: '150px' }}>Available Units</th>
                <th style={{ width: '100px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {properties.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-4 text-muted">No properties found.</td></tr>
              ) : (
                properties.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="fw-600 small">{p.property_code}</td>
                    <td className="fw-700">{p.project_name}</td>
                    <td className="small text-muted">{p.location}</td>
                    <td>
                      <input 
                        type="number" 
                        className="form-control form-control-sm fw-600" 
                        style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
                        value={p.total_units || 0}
                        onChange={(e) => handleInputChange(p.id, 'total_units', e.target.value)}
                        min="0"
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="form-control form-control-sm fw-600" 
                        style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
                        value={p.available_units || 0}
                        onChange={(e) => handleInputChange(p.id, 'available_units', e.target.value)}
                        min="0"
                        max={p.total_units || 0}
                      />
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary w-100"
                        onClick={() => handleUpdateInventory(p)}
                        disabled={updating === p.id}
                      >
                        {updating === p.id ? <span className="spinner-border spinner-border-sm"></span> : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;
