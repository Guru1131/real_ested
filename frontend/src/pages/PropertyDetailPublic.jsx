import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CustomizationContext } from '../context/CustomizationContext';
import api from '../services/api';
import { formatImageUrl, handleImageError } from '../utils/imageHelper';
import { extractMapUrl } from '../utils/mapHelper';
import { getAmenityIcon } from '../utils/amenityIcons';
import { generateClientCatalog } from '../utils/catalogGenerator';

const PropertyDetailPublic = () => {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);
  const { config } = useContext(CustomizationContext);

  const [data, setData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('overview');

  const galleryRef = useRef(null);

  const scrollGallery = (direction) => {
    if (galleryRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      galleryRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/properties/public/detail/${slug}`);
        setData(res.data);
        
        try {
          const recRes = await api.get(`/api/properties/public/recommendations/${slug}`);
          setRecommendations(recRes.data || []);
        } catch (recErr) {
          console.error("Failed to load recommendations");
        }
        
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
      
      setLeadSuccessMsg(res.data?.message || 'Inquiry submitted successfully!');
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

  const { property, configurations, amenities, specifications, media, phases, videos } = data;

  const topBanner = media.top_banners && media.top_banners.length > 0 
    ? formatImageUrl(media.top_banners[0].url)
    : (media.images && media.images.length > 0 ? formatImageUrl(media.images[0].url) : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80');

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
        {/* Back navigation & Catalog action */}
        <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Link to="/" className="btn px-3 py-2 fw-600 shadow-sm" style={{ border: '1px solid rgba(25, 41, 81, 0.1)', color: '#192951', borderRadius: '12px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}>
              <i className="bi bi-arrow-left me-1"></i> Back to Homepage
            </Link>
            {user && (
              <button 
                onClick={() => generateClientCatalog(property, configurations, amenities, specifications, media)} 
                className="btn px-3 py-2 fw-700 text-dark shadow-sm bg-warning" 
                style={{ borderRadius: '12px', fontSize: '0.85rem', border: 'none' }}
              >
                <i className="bi bi-file-earmark-pdf-fill me-1.5"></i> Download White-Label Catalog PDF
              </button>
            )}
          </div>
          {user && (user.role === 'super_admin' || user.role === 'branch_admin') && (
            <Link to={`/properties/edit/${property.id}`} className="btn px-4 py-2 fw-600 text-white shadow-sm" style={{ backgroundColor: '#0284c7', borderRadius: '12px', fontSize: '0.85rem' }}>
              <i className="bi bi-pencil-square me-1"></i> Edit Property Listing
            </Link>
          )}
        </div>

        {/* Hero image and title banner */}
        <div className="position-relative rounded-4 overflow-hidden mb-4 animate-fade-in" style={{ 
          height: '380px', 
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1), ${config.primaryColor}F3), url(${topBanner})`, 
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
                <span className="badge text-white border border-secondary border-opacity-30 rounded px-2.5 py-1.5 small me-2" style={{ backgroundColor: 'rgba(25, 41, 81, 0.8)' }}>
                  RERA ID: {property.rera_id}
                </span>
              )}
              {property.created_at && (
                <span className="badge text-white border border-secondary border-opacity-30 rounded px-2.5 py-1.5 small" style={{ backgroundColor: 'rgba(25, 41, 81, 0.8)' }}>
                  <i className="bi bi-calendar-check me-1"></i>
                  Listed: {new Date(property.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                <li className="nav-item">
                  <button 
                    className={`nav-link bg-transparent text-light border-0 py-2 px-3 fw-600 ${activeTab === 'gallery' ? 'active text-warning border-bottom border-warning' : 'text-muted'}`}
                    style={{ borderBottomWidth: '2px !important' }}
                    onClick={() => setActiveTab('gallery')}
                  >
                    Gallery
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
                            <th>Floor Plan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {configurations.map((c, idx) => (
                            <tr key={idx} className="small">
                              <td className="fw-600 text-dark">{c.bhk_type}</td>
                              <td>{c.carpet_area} sq.ft.</td>
                              <td className="text-success fw-700">₹{parseFloat(c.price).toLocaleString('en-IN')}</td>
                              <td>{c.estimated_emi ? `₹${parseFloat(c.estimated_emi).toLocaleString('en-IN')}` : 'Price on Request'}</td>
                              <td>
                                {c.floor_plan_url || c.floor_plan ? (
                                  <a href={formatImageUrl(c.floor_plan_url || c.floor_plan)} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline-primary py-1 px-2.5 fw-600">
                                    <i className="bi bi-image me-1"></i> Floor Plan Link
                                  </a>
                                ) : (
                                  <span className="text-muted small">N/A</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted small">No configurations listed for this project.</p>
                  )}

                  {phases && phases.length > 0 && (
                    <div className="mb-4">
                      <h5 className="fw-800 text-dark mb-3">Project Phases & RERA IDs</h5>
                      <div className="table-responsive">
                        <table className="table table-bordered border-light text-dark">
                          <thead style={{ backgroundColor: '#f8fafc' }}>
                            <tr className="text-muted small">
                              <th>Phase Name</th>
                              <th>RERA ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {phases.map((p, idx) => (
                              <tr key={idx} className="small">
                                <td className="fw-600 text-dark">{p.phase_name}</td>
                                <td className="font-monospace text-primary fw-600">{p.rera_id}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="row g-3">
                    {user && (
                      <div className="col-sm-6">
                        <div className="p-3 bg-light rounded border border-light" style={{ borderRadius: '16px' }}>
                          <span className="text-muted small d-block mb-1">BUILDER GROUP</span>
                          <strong className="text-dark fs-6">{property.builder}</strong>
                        </div>
                      </div>
                    )}
                    <div className={user ? "col-sm-6" : "col-12"}>
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
                      {amenities.map((amenity, index) => {
                        const iconInfo = getAmenityIcon(amenity);
                        return (
                          <div key={index} className="col-sm-6 col-md-4">
                            <div className="d-flex align-items-center gap-3 p-3 rounded-4 bg-light border border-light shadow-sm h-100 transition-up">
                              <div className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle shadow-sm" style={{ width: '42px', height: '42px', backgroundColor: `${iconInfo.color}15`, color: iconInfo.color }}>
                                <i className={`bi ${iconInfo.icon} fs-5`}></i>
                              </div>
                              <span className="small text-dark fw-700">{amenity}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted small">No amenities specified for this project.</p>
                  )}
                </div>
              )}

              {activeTab === 'location' && (
                <div>
                  <h5 className="fw-800 text-dark mb-3">Site Location Map</h5>
                  {extractMapUrl(property.map_embed_url) ? (
                    <div className="ratio ratio-16x9 rounded overflow-hidden border border-light" style={{ borderRadius: '16px' }}>
                      <iframe 
                        src={extractMapUrl(property.map_embed_url)} 
                        allowFullScreen="" 
                        loading="lazy" 
                        title="Location Map"
                      ></iframe>
                    </div>
                  ) : (
                    <p className="text-muted small">Location map view not configured or invalid.</p>
                  )}
                </div>
              )}

              {activeTab === 'gallery' && (
                <div>
                  <h5 className="fw-800 text-dark mb-4">Property Gallery</h5>
                  {media.images && media.images.length > 0 ? (
                    <div className="gallery-slider position-relative">
                      <button 
                        className="btn btn-dark position-absolute start-0 top-50 translate-middle-y z-3 rounded-circle shadow"
                        style={{ width: '40px', height: '40px', marginLeft: '-10px', opacity: 0.8 }}
                        onClick={() => scrollGallery('left')}
                      >
                        <i className="bi bi-chevron-left"></i>
                      </button>
                      <div ref={galleryRef} className="d-flex overflow-auto gap-3 pb-3" style={{ scrollSnapType: 'x mandatory', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>
                        {media.images.map((img, idx) => (
                          <div key={idx} className="flex-shrink-0" style={{ width: '80%', scrollSnapAlign: 'center' }}>
                            <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm" style={{ border: '1px solid var(--border-color)' }}>
                              <img src={formatImageUrl(img.url)} alt={`Gallery ${idx + 1}`} className="w-100 h-100" style={{ objectFit: 'cover' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button 
                        className="btn btn-dark position-absolute end-0 top-50 translate-middle-y z-3 rounded-circle shadow"
                        style={{ width: '40px', height: '40px', marginRight: '-10px', opacity: 0.8 }}
                        onClick={() => scrollGallery('right')}
                      >
                        <i className="bi bi-chevron-right"></i>
                      </button>
                      <div className="text-center mt-2 small text-muted">
                        <i className="bi bi-arrows-expand me-1"></i> Swipe or use arrows to see more images
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted small">No gallery images uploaded for this project.</p>
                  )}

                  {videos && videos.length > 0 && (
                    <div className="mt-5">
                      <h5 className="fw-800 text-dark mb-3">Video Gallery</h5>
                      <div className="row g-3">
                        {videos.map((vid, idx) => (
                          <div key={idx} className="col-12 col-md-6 col-lg-4">
                            <a href={vid.video_url} target="_blank" rel="noreferrer" className="d-block text-decoration-none">
                              <div className="position-relative rounded overflow-hidden shadow-sm border border-light" style={{ aspectRatio: '16/9' }}>
                                <img src={formatImageUrl(vid.thumbnail_url || '/assets/default-video.png')} alt={vid.title} className="w-100 h-100 object-fit-cover" />
                                <div className="position-absolute top-50 start-50 translate-middle">
                                  <i className="bi bi-play-circle-fill text-white fs-1 shadow-sm" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}></i>
                                </div>
                              </div>
                              <div className="mt-2 text-center text-truncate small fw-600 text-dark">
                                {vid.title || 'Video Tour'}
                              </div>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
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

      {/* Auto Recommendations Section */}
      {recommendations && recommendations.length > 0 && (
        <div className="container mt-5 mb-5">
          <h3 className="fw-800 mb-4" style={{ color: 'var(--text-primary)' }}>
            <i className="bi bi-geo-alt-fill text-primary me-2"></i>Recommended Nearby Properties
          </h3>
          <div className="row g-4">
            {recommendations.map(rec => (
              <div key={rec.id} className="col-md-3 col-sm-6">
                <Link to={`/public/detail/${rec.property_slug}`} className="text-decoration-none h-100">
                  <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', transition: 'transform 0.3s ease' }}>
                    <div className="position-relative" style={{ height: '180px', backgroundColor: '#e9ecef' }}>
                      <img 
                        src={formatImageUrl(rec.thumbnail_url)} 
                        alt={rec.project_name}
                        className="w-100 h-100 object-fit-cover"
                        onError={handleImageError}
                      />
                      <span className="badge bg-primary position-absolute top-0 end-0 m-2 px-2 py-1 shadow-sm">
                        {rec.property_type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="card-body p-3">
                      <h6 className="fw-800 mb-1 text-truncate" style={{ color: 'var(--text-primary)' }}>{rec.project_name}</h6>
                      <p className="small text-muted mb-2 text-truncate">
                        <i className="bi bi-geo-alt-fill me-1"></i>{rec.location}, {rec.city}
                      </p>
                      {rec.min_price && (
                        <p className="mb-0 fw-700 text-success small">
                          Starts from ₹{new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 3 }).format(rec.min_price)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
};

export default PropertyDetailPublic;
