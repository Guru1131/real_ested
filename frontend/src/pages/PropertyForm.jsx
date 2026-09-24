import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { extractMapUrl } from '../utils/mapHelper';
import { getAmenityIcon } from '../utils/amenityIcons';

const PropertyForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const [formData, setFormData] = useState({
    project_name: '',
    property_type: 'flat',
    location: '',
    address: '',
    survey_number: '',
    city: '',
    builder: '',
    rera_id: '',
    completion_date: '',
    project_status: 'under_construction',
    highlights: '',
    map_embed_url: '',
    virtual_tour_url: '',
    developer_legacy: '',
    availability_status: 'available',
    branch_id: ''
  });

  useEffect(() => {
    if (['super_admin', 'assistant_admin'].includes(user?.role)) {
      api.get('/api/branches')
        .then(res => setBranches(res.data || []))
        .catch(err => console.error('Error fetching branches list', err));
    }
  }, [user]);

  // Dynamic lists states
  const [configurations, setConfigurations] = useState([]);
  const [specifications, setSpecifications] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [customAmenityInput, setCustomAmenityInput] = useState('');

  // Temp states for sub-forms
  const [tempConfig, setTempConfig] = useState({ bhk_type: '', carpet_area: '', price: '', estimated_emi: '', floor_plan_url: '' });
  const [tempSpec, setTempSpec] = useState({ title: '', details: '' });

  // File upload state bindings
  const [images, setImages] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [brochures, setBrochures] = useState([]);
  const [existingMedia, setExistingMedia] = useState(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('draft');

  const [notFoundError, setNotFoundError] = useState(false);
  const [reraWarning, setReraWarning] = useState('');
  const [checkingRera, setCheckingRera] = useState(false);

  // Real-time RERA ID Uniqueness check hook
  useEffect(() => {
    if (!formData.rera_id || !formData.rera_id.trim()) {
      setReraWarning('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingRera(true);
        const excludeParam = id ? `&exclude_id=${id}` : '';
        let res;
        try {
          res = await api.get(`/api/properties/check-rera?rera_id=${encodeURIComponent(formData.rera_id.trim())}${excludeParam}`);
        } catch (e1) {
          res = await api.get(`/api/properties/check_rera.php?rera_id=${encodeURIComponent(formData.rera_id.trim())}${excludeParam}`);
        }
        if (res.data && res.data.exists) {
          setReraWarning(`Warning: RERA ID "${formData.rera_id.trim()}" is already registered for property "${res.data.project_name}"! Duplicate RERA IDs are not allowed.`);
        } else {
          setReraWarning('');
        }
      } catch (err) {
        console.error('Error checking RERA ID uniqueness', err);
      } finally {
        setCheckingRera(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.rera_id, id]);

  // Load existing property data if in Edit Mode
  useEffect(() => {
    if (!isEditMode) return;

    const fetchPropertyData = async () => {
      try {
        setInitialLoading(true);
        setError('');
        setNotFoundError(false);
        let res;
        try {
          res = await api.get(`/api/properties/detail/${id}`);
        } catch (err1) {
          try {
            res = await api.get(`/api/properties/detail-by-id/${id}`);
          } catch (err2) {
            res = await api.get(`/api/properties/detail.php?id=${id}`);
          }
        }

        const { property, configurations: fetchedConfigs, amenities: fetchedAmenities, specifications: fetchedSpecs, media: fetchedMedia } = res.data || {};

        if (!property) {
          setNotFoundError(true);
          throw new Error(`Property listing #${id} was not found in the database.`);
        }

        if (property.branch_id) {
          setSelectedBranchId(String(property.branch_id));
        }

        setFormData({
          project_name: property.project_name || '',
          property_type: property.property_type || 'flat',
          location: property.location || '',
          address: property.address || '',
          survey_number: property.survey_number || '',
          city: property.city || '',
          builder: property.builder || '',
          rera_id: property.rera_id || '',
          completion_date: property.completion_date ? property.completion_date.split('T')[0] : '',
          project_status: property.project_status || 'under_construction',
          highlights: property.highlights || '',
          map_embed_url: property.map_embed_url || '',
          virtual_tour_url: property.virtual_tour_url || '',
          developer_legacy: property.developer_legacy || '',
          availability_status: property.availability_status || 'available',
          branch_id: property.branch_id || ''
        });

        setConfigurations(fetchedConfigs || []);
        setSpecifications(fetchedSpecs || []);
        
        let normalizedAmenities = [];
        if (Array.isArray(fetchedAmenities)) {
          normalizedAmenities = fetchedAmenities;
        } else if (typeof property.amenities === 'string' && property.amenities.trim() !== '') {
          try { normalizedAmenities = JSON.parse(property.amenities); } catch (e) {}
        } else if (Array.isArray(property.amenities)) {
          normalizedAmenities = property.amenities;
        }
        setSelectedAmenities(normalizedAmenities);

        setExistingMedia(fetchedMedia || null);
        setApprovalStatus(property.approval_status || 'draft');

      } catch (err) {
        if (err.response?.status === 404 || err.message?.includes('not found')) {
          setNotFoundError(true);
        }
        setError(err.response?.data?.error || err.message || 'Failed to load property details for editing.');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchPropertyData();
  }, [id, isEditMode]);

  // Standard preset amenities list
  const defaultAmenitiesList = [
    "Swimming Pool", "Club House", "Gymnasium", 
    "Landscape Garden", "24/7 Security", "Children Play Area",
    "Power Backup", "Car Parking", "Visitor Parking", "Jogging Track", 
    "Intercom", "Private Garden", "Solar Water System", "Home Automation",
    "EV Charging Station", "Multi-purpose Hall", "Badminton Court", "Fire Fighting System"
  ];

  // Popular Maharashtra & Indian Real Estate Hub Cities
  const quickCityList = [
    'Pune', 'Mumbai', 'Navi Mumbai', 'Thane', 'Nashik', 
    'Nagpur', 'PCMC', 'Chhatrapati Sambhajinagar', 'Goa'
  ];

  const handleTextChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'map_embed_url') {
      const extracted = extractMapUrl(value);
      if (extracted) value = extracted;
    }
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleAmenityToggle = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const handleAddCustomAmenity = (e) => {
    e.preventDefault();
    if (!customAmenityInput || !customAmenityInput.trim()) return;
    const trimmed = customAmenityInput.trim();
    if (!selectedAmenities.includes(trimmed)) {
      setSelectedAmenities([...selectedAmenities, trimmed]);
    }
    setCustomAmenityInput('');
  };

  // Add BHK Configuration item
  const addConfiguration = () => {
    if (!tempConfig.bhk_type || !tempConfig.carpet_area || !tempConfig.price) {
      alert('Please fill in BHK/Unit Type, Carpet Area, and Total Price.');
      return;
    }
    setConfigurations([...configurations, { ...tempConfig, price: parseFloat(tempConfig.price), estimated_emi: tempConfig.estimated_emi ? parseFloat(tempConfig.estimated_emi) : null }]);
    setTempConfig({ bhk_type: '', carpet_area: '', price: '', estimated_emi: '', floor_plan_url: '' });
  };

  // Remove BHK Configuration item
  const removeConfiguration = (index) => {
    setConfigurations(configurations.filter((_, i) => i !== index));
  };

  // Add Specification item to list
  const addSpecification = () => {
    if (!tempSpec.title || !tempSpec.details) {
      alert('Please specify both Title (e.g. Structure) and details.');
      return;
    }
    setSpecifications([...specifications, { ...tempSpec }]);
    setTempSpec({ title: '', details: '' });
  };

  // Remove Specification item
  const removeSpecification = (index) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e, submitForApproval = false) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.project_name || !formData.location || !formData.city || !formData.address || !formData.builder) {
      setError('Please fill in all required fields (Project name, location, city, address, builder).');
      return;
    }

    if (reraWarning) {
      setError(reraWarning);
      return;
    }

    if (configurations.length === 0) {
      setError('Please add at least one BHK Unit Configuration.');
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null) {
          payload.append(key, formData[key]);
        }
      });

      if (selectedBranchId) {
        payload.append('branch_id', selectedBranchId);
      }

      if (submitForApproval) {
        payload.append('action', 'submit');
      }

      payload.append('configurations', JSON.stringify(configurations));
      payload.append('amenities', JSON.stringify(selectedAmenities));
      payload.append('specifications', JSON.stringify(specifications));

      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          payload.append('images', images[i]);
        }
      }
      if (floorPlans.length > 0) {
        for (let i = 0; i < floorPlans.length; i++) {
          payload.append('floor_plans', floorPlans[i]);
        }
      }
      if (brochures.length > 0) {
        for (let i = 0; i < brochures.length; i++) {
          payload.append('brochures', brochures[i]);
        }
      }

      if (isEditMode) {
        let res;
        try {
          res = await api.put(`/api/properties/${id}`, payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (putErr) {
          res = await api.post(`/api/properties/update.php?id=${id}`, payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        setSuccess(res.data?.message || 'Property updated successfully.');
      } else {
        let res;
        try {
          res = await api.post('/api/properties', payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (postErr) {
          res = await api.post('/api/properties/create.php', payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        setSuccess(res.data?.message || `Property draft registered successfully with code: ${res.data?.property_code || ''}.`);
      }
      
      setTimeout(() => {
        navigate('/properties');
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save property. Please check server constraints.');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchSelect = (e) => {
    const bId = e.target.value;
    setSelectedBranchId(bId);
    const matchedBranch = branches.find(b => String(b.id) === String(bId));
    if (matchedBranch && matchedBranch.city) {
      setFormData(prev => ({
        ...prev,
        branch_id: bId,
        city: prev.city || matchedBranch.city
      }));
    }
  };

  const handleCategorySelect = (category) => {
    if (category === 'commercial') {
      if (!['shop', 'office', 'commercial'].includes(formData.property_type)) {
        setFormData(prev => ({ ...prev, property_type: 'commercial' }));
      }
    } else {
      if (!['flat', 'villa', 'bungalow'].includes(formData.property_type)) {
        setFormData(prev => ({ ...prev, property_type: 'flat' }));
      }
    }
  };

  if (initialLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-50 text-muted">
        <div className="spinner-border text-primary me-2" role="status"></div> Loading property details...
      </div>
    );
  }

  if (isEditMode && notFoundError) {
    return (
      <div className="container-fluid py-5 animate-fade-in text-center">
        <div className="glass-panel p-5 mx-auto rounded-4 shadow-sm" style={{ maxWidth: '640px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          <div className="text-warning mb-3" style={{ fontSize: '3.5rem' }}>
            <i className="bi bi-exclamation-triangle-fill"></i>
          </div>
          <h3 className="fw-800 mb-2" style={{ color: 'var(--text-primary)' }}>Property Listing Not Found</h3>
          <p className="text-muted mb-4 fs-6">
            Property listing <strong>#{id}</strong> was not found in the database. It may have been deleted or the ID is invalid.
          </p>
          <div className="d-flex justify-content-center flex-wrap gap-3">
            <Link to="/properties" className="btn btn-primary rounded-pill px-4 py-2 fw-600">
              <i className="bi bi-search me-1.5"></i> Search & Browse Properties
            </Link>
            <Link to="/properties/new" className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-600">
              <i className="bi bi-plus-circle me-1.5"></i> Create New Property
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCommercialType = ['commercial', 'shop', 'office'].includes(formData.property_type);

  return (
    <div className="container-fluid py-2 animate-fade-in">
      
      {/* Header Panel */}
      <div className="glass-panel p-4 mb-4" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2 className="fw-800 mb-1" style={{ color: 'var(--text-primary)' }}>
              {isEditMode 
                ? <><i className="bi bi-pencil-square text-primary me-2"></i>Edit Property Listing</> 
                : <><i className="bi bi-plus-circle text-primary me-2"></i>Create New Property Listing</>}
            </h2>
            <p className="text-muted mb-0">
              {isEditMode 
                ? 'Update specifications, pricing, configurations, or uploaded assets. Submit changes for Super Admin approval.'
                : 'Fill in project specs, layout configurations, and upload brochures. Drafts will be submitted to the Super Admin queue.'}
            </p>
          </div>
          {isEditMode && (
            <span className={`badge-status badge-${approvalStatus === 'approved' ? 'approved' : approvalStatus === 'pending_approval' ? 'pending' : 'draft'}`}>
              Status: {approvalStatus.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Main Form Section */}
      <div className="glass-panel p-4" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
        <h5 className="fw-800 mb-4 border-bottom pb-3" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
          <i className="bi bi-building text-primary me-2"></i>{isEditMode ? 'Update Property Parameters' : 'Property Details & Specs Form'}
        </h5>

        {error && (
          <div className="alert alert-danger p-3 mb-4 fw-600" style={{ borderRadius: '12px' }}>
            <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success p-3 mb-4 fw-600" style={{ borderRadius: '12px' }}>
            <i className="bi bi-check-circle-fill me-2"></i> {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Target Branch Assignment (Super Admin) */}
          {['super_admin', 'assistant_admin'].includes(user?.role) && (
            <div className="mb-4 p-3 rounded border border-primary border-opacity-40" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <label className="form-label text-primary small fw-800 mb-1 d-block">
                <i className="bi bi-diagram-3-fill me-1"></i> TARGET BRANCH ASSIGNMENT (SUPER ADMIN SCOPE) *
              </label>
              <select 
                name="branch_id" 
                value={selectedBranchId}
                onChange={handleBranchSelect}
                className="form-select form-premium-control"
                required
              >
                <option value="">Select Branch Office...</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code}) - {b.city}</option>
                ))}
              </select>
            </div>
          )}

          {/* Property Category / Sector Selection */}
          <div className="mb-4 p-3 rounded border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
            <label className="form-label small fw-800 mb-2 d-block" style={{ color: 'var(--text-primary)' }}>
              <i className="bi bi-tags-fill text-warning me-1.5"></i> PROPERTY SECTOR & CATEGORY *
            </label>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleCategorySelect('residential')}
                className={`btn btn-sm ${!isCommercialType ? 'btn-primary' : 'btn-outline-secondary'}`}
              >
                <i className="bi bi-house-door-fill me-1"></i> Residential Projects (Flats, Villas, Bungalows)
              </button>
              <button
                type="button"
                onClick={() => handleCategorySelect('commercial')}
                className={`btn btn-sm ${isCommercialType ? 'btn-info text-dark fw-600' : 'btn-outline-secondary'}`}
              >
                <i className="bi bi-briefcase-fill me-1"></i> Commercial Complex & Retail Shops
              </button>
            </div>
            <small className="text-muted d-block">
              {isCommercialType 
                ? 'ℹ️ Selecting Commercial places this property in the "Commercial complex & Retail Shops" dashboard showcase.'
                : 'ℹ️ Selecting Residential places this property in the "Premium Residential Launches" dashboard showcase.'}
            </small>
          </div>

          {/* Main Info Row */}
          <div className="row g-3 mb-3">
            <div className="col-md-5">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>PROJECT / PROPERTY NAME *</label>
              <input 
                type="text" 
                name="project_name"
                value={formData.project_name}
                onChange={handleTextChange}
                className="form-control form-premium-control" 
                placeholder="e.g. Sai Sanskruti Phase 2"
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>PROPERTY TYPE *</label>
              <select 
                name="property_type" 
                value={formData.property_type}
                onChange={handleTextChange}
                className="form-select form-premium-control"
                required
              >
                <optgroup label="Residential">
                  <option value="flat">Flat / Apartment</option>
                  <option value="villa">Villa</option>
                  <option value="bungalow">Bungalow</option>
                </optgroup>
                <optgroup label="Commercial & Retail">
                  <option value="commercial">Commercial Complex</option>
                  <option value="shop">Commercial Shop / Retail</option>
                  <option value="office">Office Space</option>
                </optgroup>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>BUILDER / DEVELOPER GROUP *</label>
              <input 
                type="text" 
                name="builder"
                value={formData.builder}
                onChange={handleTextChange}
                className="form-control form-premium-control" 
                placeholder="e.g. Sanskruti Builders"
                required
              />
            </div>
          </div>

          {/* City & Locality Row */}
          <div className="row g-3 mb-3">
            <div className="col-md-5">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>
                CITY (PROJECT MARKET) *
              </label>
              <input 
                type="text" 
                name="city"
                list="city-options-list"
                value={formData.city}
                onChange={handleTextChange}
                className="form-control form-premium-control" 
                placeholder="Type or pick city e.g. Pune, Mumbai, Thane..."
                required
              />
              <datalist id="city-options-list">
                {quickCityList.map(c => <option key={c} value={c} />)}
              </datalist>

              {/* Quick Select City Pills */}
              <div className="mt-2 d-flex gap-1.5 flex-wrap align-items-center">
                <span className="small text-muted me-1 fw-600">Quick Pick:</span>
                {quickCityList.map(cityItem => {
                  const isActive = formData.city.toLowerCase() === cityItem.toLowerCase();
                  return (
                    <button 
                      key={cityItem}
                      type="button" 
                      className={`btn btn-xs rounded-pill px-2 py-0.5 fw-600 transition ${isActive ? 'btn-warning text-dark shadow-sm' : 'btn-outline-secondary'}`} 
                      onClick={() => setFormData(prev => ({ ...prev, city: cityItem }))}
                      style={{ fontSize: '0.75rem' }}
                    >
                      📍 {cityItem}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>LOCALITY / SUBURB *</label>
              <input 
                type="text" 
                name="location"
                value={formData.location}
                onChange={handleTextChange}
                className="form-control form-premium-control" 
                placeholder="e.g. Kondhwa or Andheri West"
                required
              />
            </div>

            <div className="col-md-2">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>SURVEY NUMBER</label>
              <input 
                type="text" 
                name="survey_number"
                value={formData.survey_number}
                onChange={handleTextChange}
                className="form-control form-premium-control" 
                placeholder="e.g. Survey No 42/1A"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-700 d-flex justify-content-between align-items-center" style={{ color: 'var(--text-primary)' }}>
                <span>RERA ID</span>
                {checkingRera && <span className="spinner-border spinner-border-sm text-primary" role="status"></span>}
              </label>
              <input 
                type="text" 
                name="rera_id"
                value={formData.rera_id}
                onChange={handleTextChange}
                className={`form-control form-premium-control ${reraWarning ? 'is-invalid border-danger' : ''}`} 
                placeholder="e.g. P52100024567"
              />
              {reraWarning ? (
                <div className="alert alert-danger p-2 mt-1 mb-0 small fw-700 d-flex align-items-start gap-1.5" style={{ fontSize: '0.78rem', borderRadius: '8px' }}>
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0 mt-0.5"></i>
                  <span>{reraWarning}</span>
                </div>
              ) : formData.rera_id && !checkingRera ? (
                <div className="text-success small fw-600 mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.78rem' }}>
                  <i className="bi bi-check-circle-fill"></i>
                  <span>RERA ID available & unique</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>PROJECT STAGE / STATUS *</label>
              <select 
                name="project_status" 
                value={formData.project_status}
                onChange={handleTextChange}
                className="form-select form-premium-control"
                required
              >
                <option value="new_launch">New Launch</option>
                <option value="under_construction">Under Construction</option>
                <option value="ready_possession">Ready to Move</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>ESTIMATED COMPLETION DATE</label>
              <input 
                type="date" 
                name="completion_date"
                value={formData.completion_date}
                onChange={handleTextChange}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>AVAILABILITY STATUS *</label>
              <select 
                name="availability_status" 
                value={formData.availability_status}
                onChange={handleTextChange}
                className="form-select form-premium-control"
                required
              >
                <option value="available">Available</option>
                <option value="booked">Booked</option>
                <option value="sold_out">Sold Out</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>OFFICE / SITE STREET ADDRESS *</label>
            <input 
              type="text" 
              name="address"
              value={formData.address}
              onChange={handleTextChange}
              className="form-control form-premium-control" 
              placeholder="e.g. Sai Sanskruti Phase 2, Kondhwa Budruk, Pune"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>PROJECT SUMMARY & HIGHLIGHTS</label>
            <textarea 
              name="highlights"
              value={formData.highlights}
              onChange={handleTextChange}
              rows="2"
              className="form-control form-premium-control" 
              placeholder="Brief details or highlights of the project..."
            ></textarea>
          </div>

          <div className="mb-3">
            <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>DEVELOPER LEGACY DETAILS</label>
            <textarea 
              name="developer_legacy"
              value={formData.developer_legacy}
              onChange={handleTextChange}
              rows="2"
              className="form-control form-premium-control" 
              placeholder="Builder's background, past projects count, and legacy details..."
            ></textarea>
          </div>

          <div className="mb-3">
            <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>GOOGLE MAPS EMBED IFRAME URL OR EMBED CODE</label>
            <input 
              type="text" 
              name="map_embed_url"
              value={formData.map_embed_url}
              onChange={handleTextChange}
              className="form-control form-premium-control" 
              placeholder='Paste Google Maps URL or iframe code e.g. <iframe src="https://www.google.com/maps/embed?pb=..."></iframe>'
            />
          </div>

          <div className="mb-3 p-3 rounded border border-warning border-opacity-30" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
              <label className="form-label text-warning small fw-800 mb-0">
                <i className="bi bi-vr me-1"></i> 360° VIRTUAL TOUR EMBED LINK (MATTERPORT / KUULA / GOOGLE 360)
              </label>
              <a 
                href="/360_VIRTUAL_TOUR_CREATION_GUIDE.html" 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-xs btn-outline-warning"
                style={{ fontSize: '0.75rem', padding: '2px 8px' }}
              >
                <i className="bi bi-book-fill me-1"></i> 360 Tour Creation Guide
              </a>
            </div>
            <input 
              type="text" 
              name="virtual_tour_url"
              value={formData.virtual_tour_url || ''}
              onChange={handleTextChange}
              className="form-control form-premium-control" 
              placeholder="e.g. https://kuula.co/share/collection/7yX... or https://my.matterport.com/show/?m=..."
            />
          </div>

          {/* Dynamic BHK Layouts Configs */}
          <h6 className="fw-800 mb-3 mt-4 border-bottom pb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
            <i className="bi bi-grid-3x3-gap text-primary me-1"></i>BHK Configurations & Pricing *
          </h6>

          <div className="row g-2 mb-3 align-items-end p-3 rounded border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>BHK / UNIT TYPE</label>
              <input 
                type="text" 
                placeholder="e.g. 2 BHK Standard"
                value={tempConfig.bhk_type} 
                onChange={(e) => setTempConfig({ ...tempConfig, bhk_type: e.target.value })}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>CARPET AREA (SQ. FT.)</label>
              <input 
                type="number" 
                placeholder="e.g. 1050"
                value={tempConfig.carpet_area} 
                onChange={(e) => setTempConfig({ ...tempConfig, carpet_area: e.target.value })}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>TOTAL PRICE (INR)</label>
              <input 
                type="number" 
                placeholder="e.g. 7500000"
                value={tempConfig.price} 
                onChange={(e) => setTempConfig({ ...tempConfig, price: e.target.value })}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>ESTIMATED EMI (/MO)</label>
              <input 
                type="number" 
                placeholder="e.g. 55000"
                value={tempConfig.estimated_emi} 
                onChange={(e) => setTempConfig({ ...tempConfig, estimated_emi: e.target.value })}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>FLOOR PLAN IMAGE / LINK</label>
              <input 
                type="text" 
                placeholder="e.g. https://... or /uploads/fp1.jpg"
                value={tempConfig.floor_plan_url || ''} 
                onChange={(e) => setTempConfig({ ...tempConfig, floor_plan_url: e.target.value })}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-12 col-md-1 mt-2 mt-md-0">
              <button type="button" onClick={addConfiguration} className="btn btn-premium w-100 py-2">Add</button>
            </div>
          </div>

          {/* List Added configurations */}
          {configurations.length > 0 && (
            <div className="table-responsive mb-4">
              <table className="table table-bordered align-middle small" style={{ color: 'var(--text-primary)' }}>
                <thead>
                  <tr className="table-light text-muted">
                    <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>BHK/Unit Type</th>
                    <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Carpet Area</th>
                    <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Price</th>
                    <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Est. EMI</th>
                    <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Floor Plan</th>
                    <th className="text-center" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {configurations.map((c, i) => (
                    <tr key={i}>
                      <td className="fw-600">{c.bhk_type}</td>
                      <td>{c.carpet_area} sq.ft.</td>
                      <td className="text-success fw-700">₹{Number(c.price).toLocaleString('en-IN')}</td>
                      <td>{c.estimated_emi ? `₹${Number(c.estimated_emi).toLocaleString('en-IN')}` : 'N/A'}</td>
                      <td>
                        {c.floor_plan_url || c.floor_plan ? (
                          <a href={c.floor_plan_url || c.floor_plan} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline-primary py-0.5 px-2">
                            <i className="bi bi-image me-1"></i> View Plan
                          </a>
                        ) : (
                          <span className="text-muted small">No Plan</span>
                        )}
                      </td>
                      <td className="text-center">
                        <button type="button" onClick={() => removeConfiguration(i)} className="btn btn-sm btn-outline-danger py-0 px-2"><i className="bi bi-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Dynamic Specifications */}
          <h6 className="fw-800 mb-3 mt-4 border-bottom pb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
            <i className="bi bi-sliders text-primary me-1"></i>Technical Specifications
          </h6>

          <div className="row g-2 mb-3 align-items-end p-3 rounded border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
            <div className="col-12 col-sm-5 col-md-4">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>SPECIFICATION TITLE</label>
              <input 
                type="text" 
                placeholder="e.g. Flooring"
                value={tempSpec.title} 
                onChange={(e) => setTempSpec({ ...tempSpec, title: e.target.value })}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-12 col-sm-7 col-md-7">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>SPECIFICATION DETAILS</label>
              <input 
                type="text" 
                placeholder="e.g. Vitrified double-charged tiles in all rooms"
                value={tempSpec.details} 
                onChange={(e) => setTempSpec({ ...tempSpec, details: e.target.value })}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-12 col-md-1 mt-2 mt-md-0">
              <button type="button" onClick={addSpecification} className="btn btn-premium w-100 py-2">Add</button>
            </div>
          </div>

          {/* List Added Specifications */}
          {specifications.length > 0 && (
            <div className="mb-4 p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              {specifications.map((s, i) => (
                <div key={i} className="d-flex justify-content-between align-items-start border-bottom py-2 small" style={{ borderColor: 'var(--border-color)' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{s.title}:</strong> <span className="text-muted">{s.details}</span>
                  </div>
                  <button type="button" onClick={() => removeSpecification(i)} className="btn btn-sm text-danger py-0 px-1"><i className="bi bi-x-circle"></i></button>
                </div>
              ))}
            </div>
          )}

          {/* Amenities Selector */}
          <div className="mb-4">
            <label className="form-label small fw-800 d-block" style={{ color: 'var(--text-primary)' }}>
              <i className="bi bi-patch-check-fill text-warning me-1.5"></i> PROJECT AMENITIES (CHECK ALL THAT APPLY)
            </label>

            {/* Checkbox Preset Grid */}
            <div className="row g-2 p-3 rounded border mb-3" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
              {defaultAmenitiesList.map(a => {
                const iconInfo = getAmenityIcon(a);
                return (
                  <div key={a} className="col-md-3 col-sm-4 col-6">
                    <div className="form-check d-flex align-items-center gap-1.5">
                      <input 
                        type="checkbox" 
                        className="form-check-input mt-0"
                        id={`form_amenity_${a}`}
                        checked={selectedAmenities.includes(a)}
                        onChange={() => handleAmenityToggle(a)}
                      />
                      <label className="form-check-label small d-flex align-items-center gap-1.5 cursor-pointer text-truncate" htmlFor={`form_amenity_${a}`} style={{ color: 'var(--text-primary)' }}>
                        <i className={`bi ${iconInfo.icon}`} style={{ color: iconInfo.color }}></i>
                        <span>{a}</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Custom Amenity Input */}
            <div className="p-3 rounded border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
              <label className="form-label small fw-700 mb-2" style={{ color: 'var(--text-primary)' }}>
                ➕ ADD CUSTOM PROJECT AMENITY (SUPER ADMIN PROVISION)
              </label>
              <div className="d-flex gap-2">
                <input 
                  type="text" 
                  className="form-control form-premium-control flex-grow-1"
                  placeholder="e.g. Skate Park, Co-Working Lounge, Rooftop Infinity Pool..."
                  value={customAmenityInput}
                  onChange={(e) => setCustomAmenityInput(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={handleAddCustomAmenity}
                  className="btn btn-warning text-dark fw-700 px-3"
                >
                  Add Amenity
                </button>
              </div>

              {/* Custom Added Amenity Pills */}
              {selectedAmenities.length > 0 && (
                <div className="mt-3 d-flex flex-wrap gap-2 align-items-center">
                  <span className="small text-muted fw-600 me-1">Selected Amenities ({selectedAmenities.length}):</span>
                  {selectedAmenities.map(amenity => {
                    const iconInfo = getAmenityIcon(amenity);
                    return (
                      <span 
                        key={amenity}
                        className="badge px-3 py-2 rounded-pill d-flex align-items-center gap-2 shadow-sm"
                        style={{
                          backgroundColor: `${iconInfo.color}15`,
                          color: iconInfo.color,
                          border: `1px solid ${iconInfo.color}35`
                        }}
                      >
                        <i className={`bi ${iconInfo.icon}`}></i>
                        <span className="fw-700">{amenity}</span>
                        <i 
                          className="bi bi-x-circle-fill cursor-pointer ms-1 opacity-75 hover-opacity-100" 
                          onClick={() => handleAmenityToggle(amenity)}
                          title="Remove amenity"
                        ></i>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Files Upload Row */}
          <h6 className="fw-800 mb-3 mt-4 border-bottom pb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
            <i className="bi bi-images text-primary me-1"></i>Media & Brochure Assets
          </h6>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>PROJECT GALLERY IMAGES</label>
              <input 
                type="file" 
                multiple
                accept="image/*"
                onChange={(e) => setImages(e.target.files)}
                className="form-control form-premium-control" 
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>FLOOR PLAN BLUEPRINTS</label>
              <input 
                type="file" 
                multiple
                accept="image/*,.pdf"
                onChange={(e) => setFloorPlans(e.target.files)}
                className="form-control form-premium-control" 
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-700" style={{ color: 'var(--text-primary)' }}>PDF BROCHURES</label>
              <input 
                type="file" 
                multiple
                accept=".pdf,.doc,.docx"
                onChange={(e) => setBrochures(e.target.files)}
                className="form-control form-premium-control" 
              />
            </div>
          </div>

          {/* Existing Media Preview in Edit Mode */}
          {isEditMode && existingMedia && (
            <div className="mb-4 p-3 rounded border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
              <h6 className="fw-700 mb-2" style={{ color: 'var(--text-primary)' }}>Existing Uploaded Assets</h6>
              <div className="d-flex gap-3 flex-wrap">
                {existingMedia.images && existingMedia.images.map(img => (
                  <div key={img.id} className="border rounded p-1" style={{ width: '80px', height: '60px', backgroundImage: `url(${img.url})`, backgroundSize: 'cover' }}></div>
                ))}
              </div>
            </div>
          )}

          {/* Form Action Buttons */}
          <div className="d-flex justify-content-end gap-3 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
            <Link to="/properties" className="btn btn-outline-secondary px-4 py-2 rounded-pill fw-600">
              Cancel
            </Link>

            {!isEditMode && (
              <button 
                type="button" 
                onClick={(e) => handleSubmit(e, false)}
                disabled={loading}
                className="btn btn-outline-primary px-4 py-2 rounded-pill fw-600"
              >
                {loading ? 'Saving...' : 'Save Draft'}
              </button>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-premium px-5 py-2.5 rounded-pill fw-700 shadow-sm"
            >
              {loading ? 'Processing...' : isEditMode ? 'Update Property Listing' : 'Submit for Super Admin Approval'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};

export default PropertyForm;
