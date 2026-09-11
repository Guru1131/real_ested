import React, { useState } from 'react';
import api from '../services/api';

const LeadFormModal = ({ propertyId, propertyName, show, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    lead_name: '',
    lead_email: '',
    lead_phone: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lead_name || !formData.lead_phone) {
      setError('Lead Name and Contact Phone are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/api/leads', {
        property_id: propertyId,
        ...formData
      });
      
      // Reset form
      setFormData({
        lead_name: '',
        lead_email: '',
        lead_phone: '',
        notes: ''
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit lead. Please check network.');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered px-2">
        <div className="modal-content glass-panel text-light" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          
          <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
            <h5 className="modal-title fw-700 fs-6 fs-sm-5">Submit Lead for {propertyName}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger py-2" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
                </div>
              )}
              
              <div className="mb-3">
                <label className="form-label text-muted small fw-600">CLIENT NAME *</label>
                <input 
                  type="text" 
                  name="lead_name"
                  value={formData.lead_name}
                  onChange={handleChange}
                  className="form-control form-premium-control" 
                  placeholder="Enter buyer's full name"
                  required
                />
              </div>

              <div className="row">
                <div className="col-12 col-sm-6 mb-3">
                  <label className="form-label text-muted small fw-600">CLIENT PHONE *</label>
                  <input 
                    type="tel" 
                    name="lead_phone"
                    value={formData.lead_phone}
                    onChange={handleChange}
                    className="form-control form-premium-control" 
                    placeholder="e.g. +91 98765 43210"
                    required
                  />
                </div>
                <div className="col-12 col-sm-6 mb-3">
                  <label className="form-label text-muted small fw-600">CLIENT EMAIL</label>
                  <input 
                    type="email" 
                    name="lead_email"
                    value={formData.lead_email}
                    onChange={handleChange}
                    className="form-control form-premium-control" 
                    placeholder="e.g. client@gmail.com"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-600">INQUIRY NOTES & REQUIREMENT</label>
                <textarea 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  className="form-control form-premium-control" 
                  placeholder="Describe client specific requirements (e.g. floor preference, budget, configurations)..."
                ></textarea>
              </div>
            </div>
            
            <div className="modal-footer border-top" style={{ borderColor: 'var(--border-color)' }}>
              <button type="button" className="btn btn-premium-outline py-2" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-premium py-2" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-plus-fill me-1"></i> Submit Referral
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default LeadFormModal;
