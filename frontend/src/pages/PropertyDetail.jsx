import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import LeadFormModal from '../components/LeadFormModal';
import { formatImageUrl } from '../utils/imageHelper';
import { extractMapUrl } from '../utils/mapHelper';
import { getAmenityIcon } from '../utils/amenityIcons';
import { generateClientCatalog } from '../utils/catalogGenerator';

const PropertyDetail = () => {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showLeadModal, setShowLeadModal] = useState(false);

  // Gallery Lightbox Modal State
  const [lightboxImageIndex, setLightboxImageIndex] = useState(null);

  // Sharing states
  const [shareRecipient, setShareRecipient] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareChannel, setShareChannel] = useState('');

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/properties/detail/${slug}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to retrieve property details.');
      } finally {
        setLoading(false);
      }
    };
    fetchPropertyDetails();
  }, [slug]);

  const handleShareLog = async (channel, recipient) => {
    try {
      await api.post(`/api/properties/${data.property.id}/share`, {
        channel,
        recipient
      });
    } catch (err) {
      console.error('Error logging share activity', err);
    }
  };

  const handleWhatsAppShare = () => {
    const propertyLink = `${window.location.origin}/property/${slug}`;
    const text = `Check out this premium property: *${data.property.project_name}* (${data.property.property_code}) by ${data.property.builder} located at ${data.property.location}. RERA ID: ${data.property.rera_id || 'N/A'}. Details link: ${propertyLink}`;
    
    handleShareLog('whatsapp', shareRecipient || 'Unspecified Contact');

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setShowShareMenu(false);
  };

  const handleEmailShare = () => {
    const propertyLink = `${window.location.origin}/property/${slug}`;
    const subject = `Property Information: ${data.property.project_name}`;
    const body = `Dear Client,\n\nPlease find the details for ${data.property.project_name} (${data.property.property_code}) by ${data.property.builder} located at ${data.property.location}.\nRERA ID: ${data.property.rera_id || 'N/A'}\n\nClick the link to view details: ${propertyLink}\n\nBest regards,\n${user.username}`;
    
    handleShareLog('email', shareRecipient || 'Unspecified Email');

    const mailtoUrl = `mailto:${shareRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    setShowShareMenu(false);
  };

  const formatPrice = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-50 text-muted">
        <div className="spinner-border text-primary me-2" role="status"></div>
        <span>Loading property details...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="alert alert-danger p-4 m-3">
        <h5 className="fw-700"><i className="bi bi-exclamation-triangle-fill"></i> Access Scope Error</h5>
        <p className="mb-0">{error || 'Specified property details could not be resolved.'}</p>
        <Link to="/properties" className="btn btn-outline-danger btn-sm mt-3">Back to catalog</Link>
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

  const handleDeleteProperty = async () => {
    if (!window.confirm(`Are you sure you want to delete "${property.project_name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      try {
        await api.delete(`/api/properties/${property.id}`);
      } catch (err1) {
        await api.post(`/api/properties/delete.php?id=${property.id}`);
      }
      alert('Property listing has been deleted successfully.');
      navigate('/properties');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete property listing.');
    }
  };

  return (
    <div className="container-fluid py-2 animate-fade-in">
      
      {/* Back Button & Edit Action */}
      <div className="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <Link to="/properties" className="btn btn-sm btn-premium-outline px-3 py-1.5">
          <i className="bi bi-arrow-left me-1"></i> Back to search
        </Link>
        {['super_admin', 'assistant_admin', 'branch_admin'].includes(user?.role) && (
          <div className="d-flex gap-2">
            <Link to={`/properties/edit/${property.id}`} className="btn btn-sm btn-premium px-3 py-1.5">
              <i className="bi bi-pencil-square me-1"></i> Edit Property Listing
            </Link>
            <button onClick={handleDeleteProperty} className="btn btn-sm btn-outline-danger px-3 py-1.5">
              <i className="bi bi-trash me-1"></i> Delete
            </button>
          </div>
        )}
      </div>

      {/* Main Banner layout */}
      <div className="position-relative rounded-4 overflow-hidden mb-4 shadow-sm" style={{ minHeight: '280px', backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(15,23,42,0.92)), url(${mainPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--border-color)' }}>
        <div className="position-absolute bottom-0 left-0 p-3 p-md-4 w-100 d-flex justify-content-between align-items-end flex-wrap gap-3">
          <div>
            <span className="text-light small fw-700 tracking-wide text-uppercase d-block mb-1 opacity-90">{property.property_code}</span>
            <h1 className="fw-800 text-white mb-2 fs-3 fs-md-1">{property.project_name}</h1>
            <p className="mb-2 text-light small fs-md-6 opacity-90"><i className="bi bi-geo-alt-fill text-warning"></i> {property.location}, {property.city}</p>
            {property.rera_id && (
              <span className="badge bg-dark text-light border border-secondary border-opacity-30 rounded px-2.5 py-1 small">
                RERA ID: {property.rera_id}
              </span>
            )}
          </div>
          
          <div className="text-md-end text-start mt-2 mt-md-0">
            <span className="text-light d-block small opacity-80">PROJECT STAGE</span>
            <h3 className="text-warning fw-800 mb-1 fs-5 fs-md-3">{statusLabels[property.project_status] || property.project_status}</h3>
            <span className={`badge bg-${property.availability_status === 'available' ? 'success' : 'danger'} text-white fw-600 rounded-pill px-3 py-1 text-capitalize`}>
              {property.availability_status}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="glass-panel p-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2 gap-sm-3" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
        
        <div className="d-flex align-items-center gap-2">
          {['external_broker', 'branch_executive'].includes(user.role) ? (
            <button className="btn btn-premium px-3 px-sm-4 py-2" onClick={() => setShowLeadModal(true)}>
              <i className="bi bi-person-plus-fill me-1"></i> Refer Client Lead
            </button>
          ) : ['super_admin', 'assistant_admin', 'branch_admin'].includes(user?.role) ? (
            <Link to={`/properties/edit/${property.id}`} className="btn btn-premium px-3 py-2">
              <i className="bi bi-pencil-square me-1"></i> Edit Property Details
            </Link>
          ) : (
            <span className="text-muted small fw-500">Log Action Mode: View Only</span>
          )}
        </div>

        {/* Share & Catalog Download buttons */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button 
            className="btn btn-warning text-dark font-weight-bold btn-sm px-3 py-2 d-flex align-items-center gap-1.5 shadow-sm"
            onClick={() => generateClientCatalog(property, configurations, amenities, specifications, media)}
          >
            <i className="bi bi-file-earmark-pdf-fill"></i> Download White-Label Catalog
          </button>
          <button 
            className="btn btn-outline-success btn-sm px-3 py-2 d-flex align-items-center gap-1.5" 
            onClick={() => { setShowShareMenu(true); setShareChannel('whatsapp'); }}
          >
            <i className="bi bi-whatsapp"></i> Share WhatsApp
          </button>
          <button 
            className="btn btn-outline-primary btn-sm px-3 py-2 d-flex align-items-center gap-1.5" 
            onClick={() => { setShowShareMenu(true); setShareChannel('email'); }}
          >
            <i className="bi bi-envelope"></i> Email Client
          </button>
        </div>

      </div>

      {/* Main Details Grid */}
      <div className="row g-4 mb-4">
        
        {/* Left Column: Spec Tabs */}
        <div className="col-12 col-lg-8">
          <div className="glass-panel p-4 h-100" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            
            {/* Tab Links */}
            <ul className="nav nav-tabs border-bottom mb-4 flex-nowrap overflow-auto pb-1" style={{ borderColor: 'var(--border-color)' }}>
              <li className="nav-item">
                <button 
                  className={`nav-link bg-transparent border-0 py-2 px-3 fw-700 ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview & Layouts
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link bg-transparent border-0 py-2 px-3 fw-700 ${activeTab === 'specifications' ? 'active' : ''}`}
                  onClick={() => setActiveTab('specifications')}
                >
                  Specifications
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link bg-transparent border-0 py-2 px-3 fw-700 ${activeTab === 'amenities' ? 'active' : ''}`}
                  onClick={() => setActiveTab('amenities')}
                >
                  Amenities
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link bg-transparent border-0 py-2 px-3 fw-700 ${activeTab === 'location' ? 'active' : ''}`}
                  onClick={() => setActiveTab('location')}
                >
                  Location Map
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link bg-transparent border-0 py-2 px-3 fw-700 ${activeTab === 'virtual_tour' ? 'active text-warning' : ''}`}
                  onClick={() => setActiveTab('virtual_tour')}
                >
                  <i className="bi bi-vr text-warning me-1"></i> 360° Tour
                </button>
              </li>
            </ul>

            {/* Tab content */}
            {activeTab === 'overview' && (
              <div>
                <h5 className="fw-800 mb-3" style={{ color: 'var(--text-primary)' }}>Project Summary</h5>
                <p className="text-muted mb-4">{property.highlights || 'No highlights summary details recorded yet.'}</p>
                
                <h5 className="fw-800 mb-3" style={{ color: 'var(--text-primary)' }}>BHK Configurations & Pricing</h5>
                {configurations && configurations.length > 0 ? (
                  <div className="table-responsive mb-4">
                    <table className="table table-bordered align-middle small" style={{ color: 'var(--text-primary)' }}>
                      <thead>
                        <tr className="table-light text-muted">
                          <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>BHK/Unit Variant</th>
                          <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Carpet Area</th>
                          <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Price (INR)</th>
                          <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Est. Monthly EMI</th>
                          <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Floor Plan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {configurations.map((c, idx) => (
                          <tr key={idx}>
                            <td className="fw-600">{c.bhk_type}</td>
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
                  <p className="text-muted small mb-4">No BHK configurations listed for this project.</p>
                )}

                <div className="row g-3">
                  <div className="col-sm-6">
                    <div className="p-3 rounded border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                      <span className="text-muted small d-block mb-1 fw-700">BUILDER GROUP</span>
                      <strong className="fs-6 fw-800" style={{ color: 'var(--text-primary)' }}>{property.builder}</strong>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 rounded border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                      <span className="text-muted small d-block mb-1 fw-700">ESTIMATED COMPLETION</span>
                      <strong className="fs-6 fw-800" style={{ color: 'var(--text-primary)' }}>{property.completion_date ? new Date(property.completion_date).toLocaleDateString() : 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                {property.developer_legacy && (
                  <div className="mt-4">
                    <h5 className="fw-800 mb-2" style={{ color: 'var(--text-primary)' }}>Developer Legacy</h5>
                    <p className="text-muted small">{property.developer_legacy}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specifications' && (
              <div>
                <h5 className="fw-800 mb-3" style={{ color: 'var(--text-primary)' }}>Construction Specifications</h5>
                {specifications && specifications.length > 0 ? (
                  <div className="row g-3">
                    {specifications.map((spec, idx) => (
                      <div key={idx} className="col-12 border-bottom pb-3" style={{ borderColor: 'var(--border-color)' }}>
                        <h6 className="fw-700 mb-1" style={{ color: 'var(--accent-primary)' }}>{spec.title}</h6>
                        <p className="text-muted mb-0 small">{spec.details}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small">No custom technical specifications listed.</p>
                )}
              </div>
            )}

            {activeTab === 'amenities' && (
              <div>
                <h5 className="fw-800 mb-4" style={{ color: 'var(--text-primary)' }}>Project Amenities</h5>
                {amenities && amenities.length > 0 ? (
                  <div className="row g-3">
                    {amenities.map((amenity, index) => {
                      const iconInfo = getAmenityIcon(amenity);
                      return (
                        <div key={index} className="col-sm-6 col-md-4">
                          <div className="d-flex align-items-center gap-3 p-3 rounded-3 border shadow-sm h-100 transition-up" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                            <div className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle shadow-sm" style={{ width: '42px', height: '42px', backgroundColor: `${iconInfo.color}18`, color: iconInfo.color }}>
                              <i className={`bi ${iconInfo.icon} fs-5`}></i>
                            </div>
                            <span className="small fw-700" style={{ color: 'var(--text-primary)' }}>{amenity}</span>
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
                <h5 className="fw-800 mb-3" style={{ color: 'var(--text-primary)' }}>Location & Map Outline</h5>
                <p className="text-muted small mb-3"><i className="bi bi-geo-alt-fill text-warning me-1"></i> {property.address}</p>
                {property.map_embed_url ? (
                  <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm" style={{ border: '1px solid var(--border-color)' }}>
                    <iframe 
                      src={property.map_embed_url} 
                      title="Location Map" 
                      allowFullScreen
                      loading="lazy"
                    ></iframe>
                  </div>
                ) : (
                  <div className="text-muted small p-4 border rounded text-center" style={{ borderColor: 'var(--border-color)' }}>
                    Google maps iframe not embedded for this listing yet.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'virtual_tour' && (
              <div>
                <h5 className="fw-800 mb-3" style={{ color: 'var(--text-primary)' }}>Interactive 360° Virtual Tour</h5>
                {property.virtual_tour_url ? (
                  <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm" style={{ border: '1px solid var(--border-color)' }}>
                    <iframe 
                      src={property.virtual_tour_url} 
                      title="360 Virtual Tour" 
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <div className="text-muted small p-5 border rounded text-center" style={{ borderColor: 'var(--border-color)' }}>
                    <i className="bi bi-camera-video fs-1 d-block mb-2 text-warning"></i>
                    No 360° Virtual Tour embedded yet. You can edit this property listing to add a 360° URL from Kuula or Matterport.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Branch & Brochure info */}
        <div className="col-12 col-lg-4">
          <div className="glass-panel p-4 mb-4" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            <h6 className="fw-800 mb-3" style={{ color: 'var(--text-primary)' }}>Regional Office Scope</h6>
            <div className="p-3 rounded border mb-3" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
              <span className="text-muted small d-block mb-1 fw-600">ASSIGNED BRANCH</span>
              <strong className="fs-6 fw-800" style={{ color: 'var(--text-primary)' }}>{property.branch_name} ({property.branch_code})</strong>
            </div>

            <h6 className="fw-800 mb-3" style={{ color: 'var(--text-primary)' }}>Brochures & Documents</h6>
            {media.brochures && media.brochures.length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {media.brochures.map(b => (
                  <a 
                    key={b.id} 
                    href={b.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline-primary btn-sm text-start py-2 px-3 d-flex align-items-center justify-content-between"
                  >
                    <span><i className="bi bi-file-earmark-pdf me-2"></i> {b.name}</span>
                    <i className="bi bi-download"></i>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-muted small mb-0">No PDF brochures uploaded for this listing.</p>
            )}
          </div>
        </div>

      </div>

      {/* Refer Lead Modal */}
      <LeadFormModal
        show={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        propertyId={property.id}
        propertyName={property.project_name}
      />

    </div>
  );
};

export default PropertyDetail;
