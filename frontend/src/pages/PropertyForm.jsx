import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const PropertyForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

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
    developer_legacy: '',
    availability_status: 'available'
  });

  // Dynamic lists states
  const [configurations, setConfigurations] = useState([]);
  const [specifications, setSpecifications] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  // Temp states for sub-forms
  const [tempConfig, setTempConfig] = useState({ bhk_type: '', carpet_area: '', price: '', estimated_emi: '' });
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

  // Load existing property data if in Edit Mode
  useEffect(() => {
    if (!isEditMode) return;

    const fetchPropertyData = async () => {
      try {
        setInitialLoading(true);
        const res = await api.get(`/api/properties/detail-by-id/${id}`);
        const { property, configurations: fetchedConfigs, amenities: fetchedAmenities, specifications: fetchedSpecs, media: fetchedMedia } = res.data;

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
          developer_legacy: property.developer_legacy || '',
          availability_status: property.availability_status || 'available'
        });

        setConfigurations(fetchedConfigs || []);
        setSpecifications(fetchedSpecs || []);
        setSelectedAmenities(fetchedAmenities || []);
        setExistingMedia(fetchedMedia || null);
        setApprovalStatus(property.approval_status || 'draft');

      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load property details for editing.');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchPropertyData();
  }, [id, isEditMode]);

  const amenitiesList = [
    "Swimming Pool", "Club House", "Gymnasium", 
    "Landscape Garden", "24/7 Security", "Children Play Area",
    "Power Backup", "Car Parking", "Jogging Track", "Intercom",
    "Private Garden", "Solar Water System", "Home Automation"
  ];

  const handleTextChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAmenityToggle = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(item => item !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  // Add BHK configuration item to list
  const addConfiguration = () => {
    if (!tempConfig.bhk_type || !tempConfig.carpet_area || !tempConfig.price) {
      alert('Please fill out Type, Carpet Area, and Price for the BHK configuration.');
      return;
    }
    setConfigurations([...configurations, {
      bhk_type: tempConfig.bhk_type,
      carpet_area: parseInt(tempConfig.carpet_area),
      price: parseFloat(tempConfig.price),
      estimated_emi: tempConfig.estimated_emi ? parseFloat(tempConfig.estimated_emi) : null
    }]);
    setTempConfig({ bhk_type: '', carpet_area: '', price: '', estimated_emi: '' });
  };

  // Remove configuration item
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

    if (configurations.length === 0) {
      setError('Please add at least one BHK Unit Configuration.');
      return;
    }

    setLoading(true);

    try {
      // Create FormData payload for multipart file upload
      const payload = new FormData();
      
      // Append text fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '') {
          payload.append(key, formData[key]);
        }
      });

      if (submitForApproval) {
        payload.append('action', 'submit');
      }

      // Append relational data arrays as JSON strings
      payload.append('configurations', JSON.stringify(configurations));
      payload.append('amenities', JSON.stringify(selectedAmenities));
      payload.append('specifications', JSON.stringify(specifications));

      // Append files
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
        // PUT request to update existing property
        const res = await api.put(`/api/properties/${id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setSuccess(res.data.message || 'Property updated successfully.');
      } else {
        // POST request to create new property
        const res = await api.post('/api/properties', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setSuccess(`Property draft registered successfully with code: ${res.data.property_code}.`);
      }
      
      // Redirect to catalog after brief delay
      setTimeout(() => {
        navigate('/properties');
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save property. Please check server constraints.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-50 text-light">
        <div className="spinner-border text-primary me-2" role="status"></div> Loading property details...
      </div>
    );
  }


  return (
    <div className="container-fluid py-2 animate-fade-in">
      {/* Header */}
      <div className="glass-panel p-4 mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2 className="fw-700 text-white mb-1">
              {isEditMode ? <><i className="bi bi-pencil-square text-primary me-2"></i>Edit Property Listing</> : <><i className="bi bi-plus-circle text-primary me-2"></i>Create Property Listing Draft</>}
            </h2>
            <p className="text-muted mb-0">
              {isEditMode 
                ? 'Update specifications, pricing, configurations, or uploaded assets. Submit changes for Super Admin re-approval.'
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

      <div className="glass-panel p-4 text-light">
        <h5 className="fw-600 text-white mb-4 border-bottom pb-3" style={{ borderColor: 'var(--border-color)' }}>
          <i className="bi bi-building text-primary me-2"></i>{isEditMode ? 'Update Property Parameters' : 'Property Information Form'}
        </h5>

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

        <form onSubmit={handleSubmit}>
          
          {/* Main Info Row */}
          <div className="row g-3 mb-3">
            <div className="col-md-5">
              <label className="form-label text-muted small fw-600">PROJECT / PROPERTY NAME *</label>
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
              <label className="form-label text-muted small fw-600">PROPERTY TYPE *</label>
              <select 
                name="property_type" 
                value={formData.property_type}
                onChange={handleTextChange}
                className="form-select form-premium-control"
                required
              >
                <option value="flat">Flat/Apartment</option>
                <option value="villa">Villa</option>
                <option value="bungalow">Bungalow</option>
                <option value="shop">Commercial Shop</option>
                <option value="office">Office Space</option>
                <option value="commercial">Commercial Complex</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label text-muted small fw-600">BUILDER / DEVELOPER GROUP *</label>
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

          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <label className="form-label text-muted small fw-600">CITY *</label>
              <input 
                type="text" 
                name="city"
                value={formData.city}
                onChange={handleTextChange}
                className="form-control form-premium-control" 
                placeholder="e.g. Pune"
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label text-muted small fw-600">LOCALITY / SUBURB *</label>
              <input 
                type="text" 
                name="location"
                value={formData.location}
                onChange={handleTextChange}
                className="form-control form-premium-control" 
                placeholder="e.g. Kondhwa"
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label text-muted small fw-600">SURVEY NUMBER</label>
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
              <label className="form-label text-muted small fw-600">RERA REGISTRATION ID</label>
              <input 
                type="text" 
                name="rera_id"
                value={formData.rera_id}
                onChange={handleTextChange}
                className="form-control form-premium-control" 
                placeholder="e.g. P52100024567"
              />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label text-muted small fw-600">PROJECT STAGE / STATUS *</label>
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
              <label className="form-label text-muted small fw-600">ESTIMATED COMPLETION DATE</label>
              <input 
                type="date" 
                name="completion_date"
                value={formData.completion_date}
                onChange={handleTextChange}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label text-muted small fw-600">AVAILABILITY STATUS *</label>
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
            <label className="form-label text-muted small fw-600">OFFICE / SITE STREET ADDRESS *</label>
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
            <label className="form-label text-muted small fw-600">PROJECT SUMMARY & HIGHLIGHTS</label>
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
            <label className="form-label text-muted small fw-600">DEVELOPER LEGACY DETAILS</label>
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
            <label className="form-label text-muted small fw-600">GOOGLE MAPS EMBED IFRAME URL</label>
            <input 
              type="text" 
              name="map_embed_url"
              value={formData.map_embed_url}
              onChange={handleTextChange}
              className="form-control form-premium-control" 
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
          </div>

          {/* Dynamic BHK Layouts Configs */}
          <h6 className="fw-600 text-white mb-3 mt-4 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
            <i className="bi bi-grid-3x3-gap text-primary me-1"></i>BHK Configurations & Pricing *
          </h6>

          <div className="row g-2 mb-3 align-items-end bg-dark bg-opacity-20 p-3 rounded border border-secondary border-opacity-10">
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label text-muted small fw-600">BHK / UNIT TYPE</label>
              <input 
                type="text" 
                placeholder="e.g. 2 BHK Standard"
                value={tempConfig.bhk_type} 
                onChange={(e) => setTempConfig({ ...tempConfig, bhk_type: e.target.value })}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label text-muted small fw-600">CARPET AREA (SQ. FT.)</label>
              <input 
                type="number" 
                placeholder="e.g. 1050"
                value={tempConfig.carpet_area} 
                onChange={(e) => setTempConfig({ ...tempConfig, carpet_area: e.target.value })}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label text-muted small fw-600">TOTAL PRICE (INR)</label>
              <input 
                type="number" 
                placeholder="e.g. 7500000"
                value={tempConfig.price} 
                onChange={(e) => setTempConfig({ ...tempConfig, price: e.target.value })}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label text-muted small fw-600">ESTIMATED EMI (/MO)</label>
              <input 
                type="number" 
                placeholder="e.g. 55000"
                value={tempConfig.estimated_emi} 
                onChange={(e) => setTempConfig({ ...tempConfig, estimated_emi: e.target.value })}
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
              <table className="table table-bordered border-secondary text-white">
                <thead>
                  <tr className="text-muted small">
                    <th>BHK/Unit Type</th>
                    <th>Carpet Area</th>
                    <th>Price</th>
                    <th>Est. EMI</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {configurations.map((c, i) => (
                    <tr key={i} className="small">
                      <td>{c.bhk_type}</td>
                      <td>{c.carpet_area} sq.ft.</td>
                      <td>₹{c.price.toLocaleString('en-IN')}</td>
                      <td>{c.estimated_emi ? `₹${c.estimated_emi.toLocaleString('en-IN')}` : 'N/A'}</td>
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
          <h6 className="fw-600 text-white mb-3 mt-4 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
            <i className="bi bi-sliders text-primary me-1"></i>Technical Specifications
          </h6>

          <div className="row g-2 mb-3 align-items-end bg-dark bg-opacity-20 p-3 rounded border border-secondary border-opacity-10">
            <div className="col-12 col-sm-5 col-md-4">
              <label className="form-label text-muted small fw-600">SPECIFICATION TITLE</label>
              <input 
                type="text" 
                placeholder="e.g. Flooring"
                value={tempSpec.title} 
                onChange={(e) => setTempSpec({ ...tempSpec, title: e.target.value })}
                className="form-control form-premium-control"
              />
            </div>
            <div className="col-12 col-sm-7 col-md-7">
              <label className="form-label text-muted small fw-600">SPECIFICATION DETAILS</label>
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
            <div className="mb-4 bg-dark bg-opacity-10 p-3 rounded">
              {specifications.map((s, i) => (
                <div key={i} className="d-flex justify-content-between align-items-start border-bottom border-secondary border-opacity-20 py-2 small">
                  <div>
                    <strong>{s.title}:</strong> <span className="text-muted">{s.details}</span>
                  </div>
                  <button type="button" onClick={() => removeSpecification(i)} className="btn btn-sm text-danger py-0 px-1"><i className="bi bi-x-circle"></i></button>
                </div>
              ))}
            </div>
          )}

          {/* Amenities Selector */}
          <div className="mb-3">
            <label className="form-label text-muted small fw-600">PROJECT AMENITIES (CHECK ALL THAT APPLY)</label>
            <div className="row g-2 p-3 bg-dark bg-opacity-20 rounded border border-secondary border-opacity-10">
              {amenitiesList.map(a => (
                <div key={a} className="col-md-3 col-sm-4 col-6">
                  <div className="form-check">
                    <input 
                      type="checkbox" 
                      className="form-check-input"
                      id={`form_amenity_${a}`}
                      checked={selectedAmenities.includes(a)}
                      onChange={() => handleAmenityToggle(a)}
                    />
                    <label className="form-check-label small" htmlFor={`form_amenity_${a}`}>
                      {a}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Files Upload Row */}
          <h6 className="fw-600 text-white mb-3 mt-4 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
            <i className="bi bi-paperclip text-primary me-1"></i>Marketing Assets Uploads
          </h6>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label className="form-label text-muted small fw-600">PROPERTY PHOTOS GALLERY (MULTIPLE)</label>
              <input 
                type="file" 
                multiple
                accept="image/*"
                onChange={(e) => setImages(e.target.files)}
                className="form-control form-premium-control"
              />
            </div>
            
            <div className="col-md-4">
              <label className="form-label text-muted small fw-600">FLOOR PLANS / LAYOUT DIAGRAMS (MULTIPLE)</label>
              <input 
                type="file" 
                multiple
                accept="image/*"
                onChange={(e) => setFloorPlans(e.target.files)}
                className="form-control form-premium-control"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label text-muted small fw-600">PDF BROCHURE FILE (MULTIPLE)</label>
              <input 
                type="file" 
                multiple
                accept="application/pdf"
                onChange={(e) => setBrochures(e.target.files)}
                className="form-control form-premium-control"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="d-flex gap-3 justify-content-end border-top pt-4 flex-wrap" style={{ borderColor: 'var(--border-color)' }}>
            <Link to="/properties" className="btn btn-premium-outline px-4 py-2">
              Cancel
            </Link>
            <button 
              type="button" 
              className="btn btn-premium-outline px-4 py-2" 
              disabled={loading}
              onClick={(e) => handleSubmit(e, false)}
            >
              <i className="bi bi-save me-1"></i> {isEditMode ? 'Save Changes as Draft' : 'Save Draft'}
            </button>
            <button 
              type="button" 
              className="btn btn-premium px-5 py-2" 
              disabled={loading}
              onClick={(e) => handleSubmit(e, true)}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Processing...
                </>
              ) : (
                <>
                  <i className="bi bi-send-check me-1"></i> {isEditMode ? 'Save & Submit for Review' : 'Create & Submit for Review'}
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default PropertyForm;
