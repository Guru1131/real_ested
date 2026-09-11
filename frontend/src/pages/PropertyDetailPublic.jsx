import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CustomizationContext } from '../context/CustomizationContext';
import api from '../services/api';
import CustomizationModal from '../components/CustomizationModal';
import { formatImageUrl, handleImageError } from '../utils/imageHelper';

const PropertyDetailPublic = () => {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);
  const { config } = useContext(CustomizationContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('overview');

  // Customization Modal trigger
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Lead inquiry form state
  const [leadForm, setLeadForm] = useState({
    lead_name: '',
    lead_email: '',
    lead_phone: '',
    notes: ''
  });
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccessMsg, setLeadSuccessMsg] = useState('');
  const [leadError, setLeadError] = useState('');

  // Shortcut key listener for Ctrl + Shift + A
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAdminModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/properties/public/detail/${slug}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to retrieve property details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [slug]);

  const handleLeadChange = (e) => {
    setLeadForm({
      ...leadForm,
      [e.target.name]: e.target.value
    });
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    if (!leadForm.lead_name || !leadForm.lead_phone) {
      setLeadError('Name and Phone number are required.');
      return;
    }

    setSubmittingLead(true);
    setLeadError('');
    setLeadSuccessMsg('');

    try {
      const res = await api.post('/api/leads/public', {
        property_id: data.property.id,
        ...leadForm
      });
      
      setLeadSuccessMsg(res.data.message || 'Inquiry submitted successfully!');
      setLeadForm({
        lead_name: '',
        lead_email: '',
        lead_phone: '',
        notes: ''
      });
    } catch (err) {
      setLeadError(err.response?.data?.error || 'Failed to submit inquiry. Please try again.');
    } finally {
      setSubmittingLead(false);
    }
  };

  const formatPrice = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Split logo branding text dynamically
  const getBrandSplit = () => {
    const name = config.brandName || 'Apex Estates';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return {
        first: parts[0],
        second: parts.slice(1).join(' ')
      };
    }
    return { first: name, second: '' };
  };

  const brandParts = getBrandSplit();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 text-muted" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="spinner-border text-warning me-2" role="status"></div>
        <span>Loading project details...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger p-4 mx-auto" style={{ maxWidth: '600px' }}>
          <h5 className="fw-700"><i className="bi bi-exclamation-triangle-fill"></i> Property Not Found</h5>
          <p className="mb-0">{error || 'The requested property could not be found or has not been approved.'}</p>
          <Link to="/" className="btn btn-premium mt-3">Back to Homepage</Link>
        </div>
      </div>
    );
  }

  const { property, configurations, amenities, specifications, media } = data;

  const mainPhoto = media.images && media.images.length > 0 
    ? formatImageUrl(media.images[0].url)
    : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';

  const statusLabels = {
    new_launch: 'New Launch',
    under_construction: 'Under Construction',
    ready_possession: 'Ready to Move'
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }} className="d-flex flex-column">
      
      {/* Dynamic Header */}
      <header 
        className="navbar navbar-expand-lg sticky-top py-3" 
        style={{ 
          borderBottom: '1px solid rgba(25, 41, 81, 0.08)', 
          backgroundColor: config.headerStyle === 'glass' ? 'rgba(255, 255, 255, 0.85)' : '#ffffff', 
          backdropFilter: config.headerStyle === 'glass' ? 'blur(12px)' : 'none', 
          zIndex: 1020 
        }}
      >
        <div className="container d-flex justify-content-between align-items-center">
          <Link to="/" className="navbar-brand d-flex align-items-center gap-2 text-decoration-none">
            <div className="d-flex align-items-center gap-1.5">
              <span className="fw-800 text-uppercase tracking-wider fs-4" style={{ color: config.primaryColor }}>
                {brandParts.first}
              </span>
              {brandParts.second && (
                <span className="fw-800 text-uppercase tracking-wider fs-4" style={{ color: config.accentColor }}>
                  {brandParts.second}
                </span>
              )}
            </div>
          </Link>
          <div className="d-flex align-items-center gap-3">
            {user ? (
              <Link 
                to="/dashboard" 
                className="btn px-4 py-2 fw-600 text-white shadow-sm" 
                style={{ backgroundColor: config.primaryColor, borderRadius: '12px', fontSize: '0.9rem' }}
              >
                <i className="bi bi-speedometer2 me-1.5"></i> Dashboard Portal
              </Link>
            ) : (
              <Link 
                to="/login" 
                className="btn px-4 py-2 fw-600 shadow-sm" 
                style={{ border: `1px solid ${config.primaryColor}`, color: config.primaryColor, borderRadius: '12px', fontSize: '0.9rem' }}
              >
                <i className="bi bi-box-arrow-in-right me-1.5"></i> Partner Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Body container */}
      <div className="container my-4 flex-grow-1">
        {/* Back navigation & Edit action */}
        <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <Link to="/" className="btn px-3 py-2 fw-600 shadow-sm" style={{ border: '1px solid rgba(25, 41, 81, 0.1)', color: '#192951', borderRadius: '12px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}>
            <i className="bi bi-arrow-left me-1"></i> Back to Homepage
          </Link>
          {user && (user.role === 'super_admin' || user.role === 'branch_admin') && (
            <Link to={`/properties/edit/${property.id}`} className="btn px-4 py-2 fw-600 text-white shadow-sm" style={{ backgroundColor: '#0284c7', borderRadius: '12px', fontSize: '0.85rem' }}>
              <i className="bi bi-pencil-square me-1"></i> Edit Property Listing
            </Link>
          )}
        </div>

        {/* Hero image and title banner */}
        <div className="position-relative rounded-4 overflow-hidden mb-4 animate-fade-in" style={{ 
          height: '380px', 
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1), ${config.primaryColor}F3), url(${mainPhoto})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          border: '1px solid rgba(25, 41, 81, 0.08)',
          borderRadius: '32px'
        }}>
          <div className="position-absolute bottom-0 left-0 p-4 w-100 d-flex justify-content-between align-items-end flex-wrap g-3">
            <div>
              <span className="text-muted small fw-700 tracking-wide text-uppercase d-block mb-1">{property.property_code}</span>
              <h1 className="fw-800 text-white mb-2">{property.project_name}</h1>
              <p className="mb-2 text-light"><i className="bi bi-geo-alt-fill text-warning"></i> {property.location}, {property.address}, {property.city}</p>
              {property.rera_id && (
                <span className="badge text-white border border-secondary border-opacity-30 rounded px-2.5 py-1.5 small" style={{ backgroundColor: 'rgba(25, 41, 81, 0.8)' }}>
                  RERA ID: {property.rera_id}
                </span>
              )}
            </div>
            
            <div className="text-md-end text-start mt-3 mt-md-0">
              <span className="text-light opacity-75 d-block small">PROJECT STAGE</span>
              <h3 className="fw-800 mb-1" style={{ color: config.accentColor }}>{statusLabels[property.project_status] || property.project_status}</h3>
              <span className={`badge rounded-pill px-2.5 py-1.5 fw-600 text-capitalize`} style={{
                backgroundColor: property.availability_status === 'available' ? 'rgba(5, 150, 105, 0.2)' : 'rgba(217, 119, 6, 0.2)',
                color: property.availability_status === 'available' ? '#10b981' : '#f59e0b',
                border: `1px solid ${property.availability_status === 'available' ? 'rgba(5, 150, 105, 0.3)' : 'rgba(217, 119, 6, 0.3)'}`
              }}>
                {property.availability_status}
              </span>
            </div>
          </div>
        </div>

        {/* Content columns */}
        <div className="row g-4">
          {/* Left Main details column */}
          <div className="col-lg-8">
            <div className="p-4 mb-4 bg-white shadow-sm" style={{ border: '1px solid rgba(25, 41, 81, 0.06)', borderRadius: '24px' }}>
              
              {/* Tab options header */}
              <ul className="nav nav-tabs border-bottom mb-4" style={{ borderColor: 'rgba(25, 41, 81, 0.08)' }}>
                <li className="nav-item">
                  <button 
                    className={`nav-link bg-transparent text-light border-0 py-2 px-3 fw-600 ${activeTab === 'overview' ? 'active text-warning border-bottom border-warning' : 'text-muted'}`}
                    style={{ borderBottomWidth: '2px !important' }}
                    onClick={() => setActiveTab('overview')}
                  >
                    Overview & Configurations
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link bg-transparent text-light border-0 py-2 px-3 fw-600 ${activeTab === 'specifications' ? 'active text-warning border-bottom border-warning' : 'text-muted'}`}
                    style={{ borderBottomWidth: '2px !important' }}
                    onClick={() => setActiveTab('specifications')}
                  >
                    Specifications
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link bg-transparent text-light border-0 py-2 px-3 fw-600 ${activeTab === 'amenities' ? 'active text-warning border-bottom border-warning' : 'text-muted'}`}
                    style={{ borderBottomWidth: '2px !important' }}
                    onClick={() => setActiveTab('amenities')}
                  >
                    Amenities
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link bg-transparent text-light border-0 py-2 px-3 fw-600 ${activeTab === 'location' ? 'active text-warning border-bottom border-warning' : 'text-muted'}`}
                    style={{ borderBottomWidth: '2px !important' }}
                    onClick={() => setActiveTab('location')}
                  >
                    Location Map
                  </button>
                </li>
              </ul>

              {/* Tab Contents */}
              {activeTab === 'overview' && (
                <div>
                  <h5 className="fw-800 text-dark mb-3">Project Summary</h5>
                  <p className="text-muted mb-4">{property.highlights || 'No highlights summary details recorded yet.'}</p>
                  
                  <h5 className="fw-800 text-dark mb-3">BHK Configurations & Pricing</h5>
                  {configurations && configurations.length > 0 ? (
                    <div className="table-responsive mb-4">
                      <table className="table table-bordered border-light text-dark">
                        <thead style={{ backgroundColor: '#f8fafc' }}>
                          <tr className="text-muted small">
                            <th>BHK/Unit Variant</th>
                            <th>Carpet Area</th>
                            <th>Starting Price</th>
                            <th>Estimated EMI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {configurations.map((c, idx) => (
                            <tr key={idx} className="small">
                              <td className="fw-600 text-dark">{c.bhk_type}</td>
                              <td>{c.carpet_area} sq.ft.</td>
                              <td className="text-success fw-700">₹{parseFloat(c.price).toLocaleString('en-IN')}</td>
                              <td>{c.estimated_emi ? `₹${parseFloat(c.estimated_emi).toLocaleString('en-IN')}` : 'Price on Request'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted small">No configurations listed for this project.</p>
                  )}

                  <div className="row g-3">
                    <div className="col-sm-6">
                      <div className="p-3 bg-light rounded border border-light" style={{ borderRadius: '16px' }}>
                        <span className="text-muted small d-block mb-1">BUILDER GROUP</span>
                        <strong className="text-dark fs-6">{property.builder}</strong>
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="p-3 bg-light rounded border border-light" style={{ borderRadius: '16px' }}>
                        <span className="text-muted small d-block mb-1">ESTIMATED COMPLETION</span>
                        <strong className="text-dark fs-6">{property.completion_date ? new Date(property.completion_date).toLocaleDateString() : 'N/A'}</strong>
                      </div>
                    </div>
                  </div>

                  {property.developer_legacy && (
                    <div className="mt-4">
                      <h5 className="fw-800 text-dark mb-2">Developer Legacy</h5>
                      <p className="text-muted small">{property.developer_legacy}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'specifications' && (
                <div>
                  <h5 className="fw-800 text-dark mb-3">Construction Specifications</h5>
                  {specifications && specifications.length > 0 ? (
                    <div className="row g-3">
                      {specifications.map((spec, idx) => (
                        <div key={idx} className="col-12 border-bottom border-light pb-3">
                          <h6 className="text-warning fw-600 mb-1">{spec.title}</h6>
                          <p className="text-muted mb-0 small">{spec.details}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted small">No technical specifications listed.</p>
                  )}
                </div>
              )}

              {activeTab === 'amenities' && (
                <div>
                  <h5 className="fw-800 text-dark mb-4">Amenities Offered</h5>
                  {amenities && amenities.length > 0 ? (
                    <div className="row g-3">
                      {amenities.map((amenity, index) => (
                        <div key={index} className="col-sm-6 col-md-4">
                          <div className="d-flex align-items-center gap-2 p-2.5 bg-light rounded" style={{ borderRadius: '12px' }}>
                            <i className="bi bi-patch-check-fill text-warning"></i>
                            <span className="small text-dark fw-600">{amenity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted small">No amenities specified for this project.</p>
                  )}
                </div>
              )}

              {activeTab === 'location' && (
                <div>
                  <h5 className="fw-800 text-dark mb-3">Site Location Map</h5>
                  {property.map_embed_url ? (
                    <div className="ratio ratio-16x9 rounded overflow-hidden border border-light" style={{ borderRadius: '16px' }}>
                      <iframe 
                        src={property.map_embed_url} 
                        allowFullScreen="" 
                        loading="lazy" 
                        title="Location Map"
                      ></iframe>
                    </div>
                  ) : (
                    <p className="text-muted small">Location map view not configured.</p>
                  )}
                </div>
              )}

            </div>

            {/* Gallery Images List */}
            <div className="p-4 bg-white shadow-sm" style={{ border: '1px solid rgba(25, 41, 81, 0.06)', borderRadius: '24px' }}>
              <h5 className="fw-800 text-dark mb-4"><i className="bi bi-images text-warning me-2"></i>Project Assets Gallery</h5>
              
              {media.images && media.images.length > 0 ? (
                <div className="row g-3 mb-4">
                  {media.images.map((img) => (
                    <div key={img.id} className="col-6 col-sm-4">
                      <div className="glass-panel p-1 overflow-hidden" style={{ borderRadius: '16px', border: '1px solid rgba(25, 41, 81, 0.06)' }}>
                        <a href={formatImageUrl(img.url)} target="_blank" rel="noreferrer">
                          <img 
                            src={formatImageUrl(img.url)} 
                            alt={img.name} 
                            onError={handleImageError}
                            className="img-fluid rounded hover-scale" 
                            style={{ objectFit: 'cover', height: '120px', width: '100%', borderRadius: '12px' }}
                          />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted small">
                  <i className="bi bi-image fs-2 d-block mb-2"></i> No images uploaded yet.
                </div>
              )}

              {media.floor_plans && media.floor_plans.length > 0 && (
                <div className="mt-4 border-top pt-4" style={{ borderColor: 'rgba(25, 41, 81, 0.08)' }}>
                  <h6 className="fw-700 text-dark mb-3">Floor Layout Plans</h6>
                  <div className="row g-3">
                    {media.floor_plans.map((fp) => (
                      <div key={fp.id} className="col-sm-6 text-center">
                        <div className="p-2 bg-light d-inline-block w-100" style={{ border: '1px solid rgba(25, 41, 81, 0.06)', borderRadius: '16px' }}>
                          <a href={formatImageUrl(fp.url)} target="_blank" rel="noreferrer">
                            <img 
                              src={formatImageUrl(fp.url)} 
                              alt={fp.name} 
                              onError={handleImageError}
                              className="img-fluid rounded hover-scale" 
                              style={{ maxHeight: '200px', objectFit: 'contain' }}
                            />
                          </a>
                        </div>
                        <p className="small text-muted mt-1 mb-0">{fp.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Lead Inquiry Column */}
          <div className="col-lg-4">
            <div className="p-4 sticky-top bg-white shadow-sm" style={{ top: '100px', border: '1px solid rgba(25, 41, 81, 0.06)', borderRadius: '24px', zIndex: 10 }}>
              <h5 className="fw-800 text-dark mb-2">Inquire About Project</h5>
              <p className="text-muted small mb-4">Submit your details below and a branch executive will get back to you with custom catalog configurations.</p>
              
              {leadSuccessMsg && (
                <div className="alert alert-success py-2.5 animate-fade-in mb-3" style={{ borderRadius: '12px' }}>
                  <i className="bi bi-check-circle-fill me-2"></i> {leadSuccessMsg}
                </div>
              )}

              {leadError && (
                <div className="alert alert-danger py-2.5 animate-fade-in mb-3" style={{ borderRadius: '12px' }}>
                  <i className="bi bi-exclamation-triangle-fill me-2"></i> {leadError}
                </div>
              )}

              <form onSubmit={handleLeadSubmit} className="d-flex flex-column gap-3">
                <div>
                  <label className="form-label text-muted small fw-600">FULL NAME *</label>
                  <input 
                    type="text" 
                    name="lead_name"
                    value={leadForm.lead_name}
                    onChange={handleLeadChange}
                    className="form-control form-premium-control w-100" 
                    placeholder="Enter your name"
                    required
                  />
                </div>

                <div>
                  <label className="form-label text-muted small fw-600">CONTACT PHONE *</label>
                  <input 
                    type="tel" 
                    name="lead_phone"
                    value={leadForm.lead_phone}
                    onChange={handleLeadChange}
                    className="form-control form-premium-control w-100" 
                    placeholder="e.g. +91 99999 99999"
                    required
                  />
                </div>

                <div>
                  <label className="form-label text-muted small fw-600">EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    name="lead_email"
                    value={leadForm.lead_email}
                    onChange={handleLeadChange}
                    className="form-control form-premium-control w-100" 
                    placeholder="e.g. buyer@gmail.com"
                  />
                </div>

                <div>
                  <label className="form-label text-muted small fw-600">YOUR MESSAGE / ENQUIRY</label>
                  <textarea 
                    name="notes"
                    value={leadForm.notes}
                    onChange={handleLeadChange}
                    rows="3"
                    className="form-control form-premium-control w-100" 
                    placeholder="Ask about pricing, floor details, EMI options..."
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className="btn w-100 py-2.5 mt-2 fw-700 text-white" 
                  style={{ backgroundColor: config.primaryColor, borderRadius: '12px', border: 'none' }}
                  disabled={submittingLead}
                >
                  {submittingLead ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-fill me-1.5"></i> Request Callback
                    </>
                  )}
                </button>
              </form>

              {media.brochures && media.brochures.length > 0 && (
                <div className="mt-4 border-top pt-3 text-center" style={{ borderColor: 'rgba(25, 41, 81, 0.08)' }}>
                  <a 
                    href={`/${media.brochures[0].url}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-outline-danger w-100 py-2.5 fw-600"
                    style={{ borderRadius: '12px' }}
                  >
                    <i className="bi bi-file-earmark-pdf-fill me-1.5"></i> Download Brochure PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Customizable Footer */}
      <footer className="py-5 mt-auto text-light" style={{ backgroundColor: config.primaryColor }}>
        <div className="container">
          <div className="row g-4 text-center text-md-start">
            <div className="col-md-5">
              <div className="d-flex align-items-center gap-1.5 mb-3 justify-content-center justify-content-md-start">
                <span className="fw-800 text-uppercase tracking-wider fs-4 text-white">
                  {brandParts.first}
                </span>
                {brandParts.second && (
                  <span className="fw-800 text-uppercase tracking-wider fs-4" style={{ color: config.accentColor }}>
                    {brandParts.second}
                  </span>
                )}
              </div>
              <p className="text-muted small pr-md-5" style={{ maxWidth: '400px', color: 'rgba(255, 255, 255, 0.6) !important' }}>
                Simplifying premium search across regional office branch hubs. Compare carpet rates, locations, and blueprints seamlessly.
              </p>
            </div>
            <div className="col-md-3">
              <h6 className="fw-700 text-white mb-3">Property Index</h6>
              <ul className="list-unstyled text-muted small d-flex flex-column gap-2" style={{ color: 'rgba(255, 255, 255, 0.6) !important' }}>
                <li><span className="cursor-pointer hover:text-white transition">Pune Real Estate</span></li>
                <li><span className="cursor-pointer hover:text-white transition">Mumbai Properties</span></li>
                <li><span className="cursor-pointer hover:text-white transition">BHK configuration listings</span></li>
              </ul>
            </div>
            <div className="col-md-4">
              <h6 className="fw-700 text-white mb-3">Partner Links</h6>
              <ul className="list-unstyled text-muted small d-flex flex-column gap-2" style={{ color: 'rgba(255, 255, 255, 0.6) !important' }}>
                <li><Link to="/login" className="text-muted text-decoration-none hover:text-white transition" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Sales Executives Portal</Link></li>
                <li><Link to="/login" className="text-muted text-decoration-none hover:text-white transition" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>External Broker Portal</Link></li>
                <li><Link to="/login" className="text-muted text-decoration-none hover:text-white transition" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Branch Administrator Portal</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-top mt-4 pt-4 text-center text-muted small" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
            <p className="mb-0">{config.licenseText}</p>
          </div>
        </div>
      </footer>

      {/* Hidden customization modal */}
      <CustomizationModal show={showAdminModal} onClose={() => setShowAdminModal(false)} />
    </div>
  );
};

export default PropertyDetailPublic;
