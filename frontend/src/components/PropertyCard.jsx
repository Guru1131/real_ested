import React from 'react';
import { Link } from 'react-router-dom';

const PropertyCard = ({ property, onStatusSubmit, userRole }) => {
  // Format price to Indian Rupees (Lakhs / Crores) or standard format
  const formatPrice = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const badgeClasses = {
    draft: 'badge-draft',
    pending_approval: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected'
  };

  const statusLabels = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected'
  };

  return (
    <div className="card glass-panel glass-panel-hover h-100 overflow-hidden d-flex flex-column justify-content-between animate-fade-in" style={{ padding: '0px' }}>
      
      {/* Property Head Image/Header */}
      <div className="p-4 pb-0">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <span className="text-muted small fw-600">{property.property_code}</span>
          <span className={`badge-status ${badgeClasses[property.approval_status]}`}>
            {statusLabels[property.approval_status]}
          </span>
        </div>
        
        <h5 className="card-title fw-700 mb-1" style={{ color: 'var(--text-primary)' }}>{property.project_name}</h5>
        <p className="text-muted mb-3"><i className="bi bi-geo-alt-fill text-primary"></i> {property.location}, {property.branch_name}</p>
        
        {/* Detail specs grid with light fresh styling */}
        <div className="row g-2 mb-3 p-2.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
          <div className="col-6">
            <span className="text-muted d-block" style={{ fontSize: '0.75rem', fontWeight: '500' }}>TYPE</span>
            <span className="fw-600 text-capitalize" style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{property.property_type}</span>
          </div>
          <div className="col-6">
            <span className="text-muted d-block" style={{ fontSize: '0.75rem', fontWeight: '500' }}>STARTING AREA</span>
            <span className="fw-600" style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{property.min_area ? `${property.min_area} sq ft+` : 'N/A'}</span>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>STARTING PRICE</span>
            <h5 className="mb-0 text-success fw-700">
              {property.min_price ? `${formatPrice(property.min_price)}` : 'On Request'}
            </h5>
          </div>
          
          {property.availability_status === 'available' ? (
            <span className="badge fw-600 rounded-pill px-2.5 py-1.5" style={{ backgroundColor: 'rgba(5, 150, 105, 0.08)', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.15)', fontSize: '0.75rem' }}>
              Available
            </span>
          ) : property.availability_status === 'booked' ? (
            <span className="badge fw-600 rounded-pill px-2.5 py-1.5" style={{ backgroundColor: 'rgba(217, 119, 6, 0.08)', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.15)', fontSize: '0.75rem' }}>
              Booked
            </span>
          ) : (
            <span className="badge fw-600 rounded-pill px-2.5 py-1.5" style={{ backgroundColor: 'rgba(220, 38, 38, 0.08)', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.15)', fontSize: '0.75rem' }}>
              Sold Out
            </span>
          )}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="p-4 pt-0 border-top mt-auto" style={{ borderColor: 'var(--border-color)' }}>
        <div className="d-flex gap-2 pt-3">
          <Link to={`/property/${property.property_slug}`} className="btn btn-premium-outline flex-grow-1 text-center py-2 px-3" style={{ fontSize: '0.85rem' }}>
            <i className="bi bi-eye"></i> View Details
          </Link>
          
          {/* Direct Submit Action for Branch Admins on drafts */}
          {userRole === 'branch_admin' && property.approval_status === 'draft' && onStatusSubmit && (
            <button 
              onClick={() => onStatusSubmit(property.id)} 
              className="btn btn-premium py-2 px-3" 
              style={{ fontSize: '0.85rem' }}
              title="Submit for Approval"
            >
              <i className="bi bi-send-fill"></i> Submit
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default PropertyCard;
