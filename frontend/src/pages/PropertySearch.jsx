import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import PropertyCard from '../components/PropertyCard';

const PropertySearch = () => {
  const { user } = useContext(AuthContext);
  
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState({
    projectName: '',
    type: '',
    location: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    bhk: '',
    availability: '',
    status: '',
    approvalStatus: user.role === 'branch_admin' ? '' : 'approved'
  });

  const fetchProperties = async (currentFilters = filters) => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams();
      Object.keys(currentFilters).forEach(key => {
        if (currentFilters[key]) {
          queryParams.append(key, currentFilters[key]);
        }
      });
      
      const res = await api.get(`/api/properties?${queryParams.toString()}`);
      setProperties(res.data);
    } catch (err) {
      setError('Failed to fetch property listings. Please check server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchProperties();
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      projectName: '',
      type: '',
      location: '',
      city: '',
      minPrice: '',
      maxPrice: '',
      bhk: '',
      availability: '',
      status: '',
      approvalStatus: user.role === 'branch_admin' ? '' : 'approved'
    };
    setFilters(defaultFilters);
    fetchProperties(defaultFilters);
  };

  const handleStatusSubmit = async (propertyId) => {
    if (!window.confirm('Submit this property draft for Super Admin review and approval? Once submitted, it cannot be modified until approved or rejected.')) {
      return;
    }
    try {
      await api.post(`/api/properties/${propertyId}/submit`);
      alert('Property draft submitted successfully.');
      fetchProperties();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit draft.');
    }
  };

  return (
    <div className="container-fluid py-2">
      {/* Header Banner */}
      <div className="glass-panel p-4 mb-4 animate-fade-in d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h2 className="fw-700 text-white mb-1">Properties Search Catalog</h2>
          <p className="text-muted mb-0">Search and filter internal real estate holdings. Staff can only access matching branch records.</p>
        </div>
        
        {/* New draft shortcut button (Branch Admin only) */}
        {user.role === 'branch_admin' && (
          <Link to="/properties/new" className="btn btn-premium py-2.5">
            <i className="bi bi-plus-circle me-1"></i> Add Property Draft
          </Link>
        )}
      </div>

      {/* Advanced Filter Form */}
      <div className="glass-panel p-4 mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <h5 className="fw-600 text-white mb-3"><i className="bi bi-funnel-fill text-primary me-2"></i>Filter Property Parameters</h5>
        
        <form onSubmit={handleApplyFilters} className="row g-3">
          <div className="col-md-3">
            <label className="form-label text-muted small fw-600">PROJECT / KEYWORD</label>
            <input 
              type="text" 
              name="projectName"
              value={filters.projectName}
              onChange={handleFilterChange}
              className="form-control form-premium-control" 
              placeholder="e.g. Sai Sanskruti"
            />
          </div>

          <div className="col-md-2">
            <label className="form-label text-muted small fw-600">PROPERTY TYPE</label>
            <select 
              name="type" 
              value={filters.type}
              onChange={handleFilterChange}
              className="form-select form-premium-control"
            >
              <option value="">All Types</option>
              <option value="flat">Flat/Apartment</option>
              <option value="villa">Villa</option>
              <option value="bungalow">Bungalow</option>
              <option value="shop">Commercial Shop</option>
              <option value="office">Office Space</option>
              <option value="commercial">Commercial Complex</option>
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label text-muted small fw-600">CITY</label>
            <input 
              type="text" 
              name="city"
              value={filters.city}
              onChange={handleFilterChange}
              className="form-control form-premium-control" 
              placeholder="e.g. Pune"
            />
          </div>

          <div className="col-md-2">
            <label className="form-label text-muted small fw-600">LOCATION / SUBURB</label>
            <input 
              type="text" 
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              className="form-control form-premium-control" 
              placeholder="e.g. Kondhwa"
            />
          </div>

          <div className="col-md-3">
            <label className="form-label text-muted small fw-600">BHK / UNIT CONFIG</label>
            <input 
              type="text" 
              name="bhk"
              value={filters.bhk}
              onChange={handleFilterChange}
              className="form-control form-premium-control" 
              placeholder="e.g. 2 BHK"
            />
          </div>

          <div className="col-md-3">
            <label className="form-label text-muted small fw-600">MIN PRICE (INR)</label>
            <input 
              type="number" 
              name="minPrice"
              value={filters.minPrice}
              onChange={handleFilterChange}
              className="form-control form-premium-control" 
              placeholder="Min value"
            />
          </div>

          <div className="col-md-3">
            <label className="form-label text-muted small fw-600">MAX PRICE (INR)</label>
            <input 
              type="number" 
              name="maxPrice"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              className="form-control form-premium-control" 
              placeholder="Max value"
            />
          </div>

          <div className="col-md-3">
            <label className="form-label text-muted small fw-600">AVAILABILITY</label>
            <select 
              name="availability" 
              value={filters.availability}
              onChange={handleFilterChange}
              className="form-select form-premium-control"
            >
              <option value="">All Availability</option>
              <option value="available">Available</option>
              <option value="booked">Booked</option>
              <option value="sold_out">Sold Out</option>
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label text-muted small fw-600">PROJECT STAGE / STATUS</label>
            <select 
              name="status" 
              value={filters.status}
              onChange={handleFilterChange}
              className="form-select form-premium-control"
            >
              <option value="">All Project Stages</option>
              <option value="new_launch">New Launch</option>
              <option value="under_construction">Under Construction</option>
              <option value="ready_possession">Ready to Move</option>
            </select>
          </div>

          {/* Show review queue filters only for admins */}
          {['super_admin', 'assistant_admin', 'branch_admin'].includes(user.role) && (
            <div className="col-md-4">
              <label className="form-label text-muted small fw-600">APPROVAL STATUS</label>
              <select 
                name="approvalStatus" 
                value={filters.approvalStatus}
                onChange={handleFilterChange}
                className="form-select form-premium-control"
              >
                <option value="">All (Draft/Pending/Approved/Rejected)</option>
                <option value="draft">Drafts Only</option>
                <option value="pending_approval">Pending Review Only</option>
                <option value="approved">Approved & Visible</option>
                <option value="rejected">Rejected Only</option>
              </select>
            </div>
          )}

          <div className="col d-flex align-items-end gap-2 justify-content-end">
            <button type="button" className="btn btn-premium-outline px-4 py-2" onClick={handleResetFilters}>
              Reset
            </button>
            <button type="submit" className="btn btn-premium px-4 py-2">
              <i className="bi bi-search me-1"></i> Search Catalog
            </button>
          </div>
        </form>
      </div>

      {/* Grid Results */}
      {error && (
        <div className="alert alert-danger p-3 animate-fade-in">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5 text-muted animate-fade-in">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p>Querying matching real estate records...</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="glass-panel text-center py-5 animate-fade-in">
          <i className="bi bi-building fs-1 d-block mb-3 text-muted"></i>
          <h4 className="fw-600 text-white">No Properties Matched</h4>
          <p className="text-muted mb-0">Try clearing some query filters or search keywords.</p>
        </div>
      ) : (
        <div className="row g-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {properties.map(p => (
            <div key={p.id} className="col-lg-4 col-md-6">
              <PropertyCard 
                property={p} 
                onStatusSubmit={handleStatusSubmit} 
                userRole={user.role} 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertySearch;
