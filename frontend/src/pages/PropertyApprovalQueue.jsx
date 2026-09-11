import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const PropertyApprovalQueue = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError('');
      // Fetch only properties pending approval
      const res = await api.get('/api/properties?approvalStatus=pending_approval');
      setItems(res.data);
    } catch (err) {
      setError('Failed to fetch approval queue listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleReview = async (id, action) => {
    const confirmation = window.confirm(`Are you sure you want to ${action} this property submission?`);
    if (!confirmation) return;

    setError('');
    setSuccess('');

    try {
      await api.post(`/api/properties/${id}/approve`, { action });
      setSuccess(`Property listing has been successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
      fetchQueue();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete review action.');
    }
  };

  const formatPrice = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="container-fluid py-2 animate-fade-in">
      {/* Header */}
      <div className="glass-panel p-4 mb-4">
        <h2 className="fw-700 text-white mb-1">Super Admin Approvals Queue</h2>
        <p className="text-muted mb-0">Audit regional branch draft submissions. Only approved properties become visible to sales agents and external brokers.</p>
      </div>

      {error && (
        <div className="alert alert-danger p-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success p-3 mb-4">
          <i className="bi bi-check-circle-fill me-2"></i> {success}
        </div>
      )}

      <div className="glass-panel p-4">
        <h5 className="fw-600 text-white mb-4"><i className="bi bi-patch-check text-primary me-2"></i>Pending Property Approvals</h5>

        {loading ? (
          <div className="text-center py-4 text-muted">
            <div className="spinner-border spinner-border-sm me-2" role="status"></div> Loading submissions...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-5 text-muted small animate-fade-in">
            <i className="bi bi-check-all fs-1 d-block mb-3 text-success"></i> All submissions processed! The queue is completely empty.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>PROJECT NAME</th>
                  <th>BRANCH AFFILIATION</th>
                  <th>SUBURB</th>
                  <th>EST PRICE</th>
                  <th>PROT ACTION</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-600 text-primary">{item.property_code}</td>
                    <td>
                      <div className="fw-600 text-white">{item.project_name}</div>
                      <div className="text-muted small text-capitalize">{item.property_type} | {item.builder}</div>
                    </td>
                    <td className="small">{item.branch_name}</td>
                    <td className="small">{item.location}</td>
                    <td className="fw-600 text-success small">{item.min_price ? formatPrice(item.min_price) : 'On Request'}</td>
                    <td>
                      <div className="d-flex gap-1 justify-content-end flex-wrap">
                        <Link to={`/property/${item.property_slug}`} className="btn btn-sm btn-outline-info px-2.5" title="View files and details">
                          <i className="bi bi-eye"></i> Audit Details
                        </Link>
                        <button className="btn btn-sm btn-success px-2.5" onClick={() => handleReview(item.id, 'approve')} title="Approve listing">
                          <i className="bi bi-check-circle"></i> Approve
                        </button>
                        <button className="btn btn-sm btn-danger px-2.5" onClick={() => handleReview(item.id, 'reject')} title="Reject listing">
                          <i className="bi bi-x-circle"></i> Reject
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
  );
};

export default PropertyApprovalQueue;
