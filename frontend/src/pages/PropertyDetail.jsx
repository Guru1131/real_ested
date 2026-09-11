import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import LeadFormModal from '../components/LeadFormModal';
import { formatImageUrl, handleImageError } from '../utils/imageHelper';

const PropertyDetail = () => {
  const { slug } = useParams(); // Using property URL slug
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showLeadModal, setShowLeadModal] = useState(false);

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
    
    // Log sharing action
    handleShareLog('whatsapp', shareRecipient || 'Unspecified Contact');

    // Trigger WhatsApp web API redirection
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setShowShareMenu(false);
  };

  const handleEmailShare = () => {
    const propertyLink = `${window.location.origin}/property/${slug}`;
    const subject = `Property Information: ${data.property.project_name}`;
    const body = `Dear Client,\n\nPlease find the details for ${data.property.project_name} (${data.property.property_code}) by ${data.property.builder} located at ${data.property.location}.\nRERA ID: ${data.property.rera_id || 'N/A'}\n\nClick the link to view the complete details and download files: ${propertyLink}\n\nBest regards,\n${user.username}`;
    
    // Log sharing action
    handleShareLog('email', shareRecipient || 'Unspecified Email');

    // Trigger mailto client
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
      <div className="d-flex justify-content-center align-items-center vh-50 text-light">
        <div className="spinner-border text-primary" role="status"></div>
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

  // Resolve main banner photo
  const mainPhoto = media.images && media.images.length > 0 
    ? formatImageUrl(media.images[0].url)
    : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';

  const statusLabels = {
    new_launch: 'New Launch',
    under_construction: 'Under Construction',
    ready_possession: 'Ready to Move'
  };

  return (
    <div className="container-fluid py-2">
      
      {/* Back Button & Edit Action */}
      <div className="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <Link to="/properties" className="btn btn-sm btn-premium-outline px-3 py-1.5">
          <i className="bi bi-arrow-left me-1"></i> Back to search
        </Link>
        {['super_admin', 'assistant_admin', 'branch_admin'].includes(user?.role) && (
          <Link to={`/properties/edit/${property.id}`} className="btn btn-sm btn-premium px-4 py-1.5">
            <i className="bi bi-pencil-square me-1"></i> Edit Property Listing
          </Link>
        )}
      </div>

      {/* Main BeyondWalls Banner layout */}
      <div className="position-relative rounded-4 overflow-hidden mb-4 animate-fade-in" style={{ minHeight: '260px', backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(11,15,25,0.95)), url(${mainPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--border-color)' }}>
        <div className="position-absolute bottom-0 left-0 p-3 p-md-4 w-100 d-flex justify-content-between align-items-end flex-wrap gap-3">
          <div>
            <span className="text-muted small fw-700 tracking-wide text-uppercase d-block mb-1">{property.property_code}</span>
            <h1 className="fw-700 text-white mb-2 fs-3 fs-md-1">{property.project_name}</h1>
            <p className="mb-2 text-light small fs-md-6"><i className="bi bi-geo-alt-fill text-primary"></i> {property.location}, {property.address}</p>
            {property.rera_id && (
              <span className="badge bg-dark text-light border border-secondary border-opacity-30 rounded px-2.5 py-1 small">
                RERA ID: {property.rera_id}
              </span>
            )}
          </div>
          
          <div className="text-md-end text-start mt-2 mt-md-0">
            <span className="text-muted d-block small">PROJECT STAGE</span>
            <h3 className="text-primary fw-700 mb-1 fs-5 fs-md-3">{statusLabels[property.project_status] || property.project_status}</h3>
            <span className={`badge bg-${property.availability_status === 'available' ? 'success' : 'danger'} text-dark fw-600 rounded-pill px-2.5 py-1`}>
              {property.availability_status}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="glass-panel p-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2 gap-sm-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        
        {/* Referral hooks for Broker or Executive */}
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

        {/* Share buttons hooks */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button 
            className="btn btn-outline-success btn-sm px-3 py-2 d-flex align-items-center gap-1.5" 
            onClick={() => { setShareChannel('whatsapp'); setShowShareMenu(true); }}
            title="Log and share details on WhatsApp"
          >
            <i className="bi bi-whatsapp"></i> WhatsApp Share
          </button>
          
          <button 
            className="btn btn-outline-primary btn-sm px-3 py-2 d-flex align-items-center gap-1.5"
            onClick={() => { setShareChannel('email'); setShowShareMenu(true); }}
            title="Log and share details via email"
          >
            <i className="bi bi-envelope"></i> Email Share
          </button>

          {media.brochures && media.brochures.length > 0 ? (
            <a 
              href={`/${media.brochures[0].url}`} 
              target="_blank" 
              rel="noreferrer"
              className="btn btn-premium-outline btn-sm px-3 py-2 d-flex align-items-center gap-1.5"
              onClick={() => handleShareLog('brochure_download', 'Self Download')}
            >
              <i className="bi bi-file-earmark-pdf-fill text-danger"></i> Brochure
            </a>
          ) : (
            <button className="btn btn-premium-outline btn-sm px-3 py-2" disabled title="No brochure uploaded for this project">
              <i className="bi bi-file-earmark-pdf"></i> No Brochure
            </button>
          )}
        </div>

      </div>

      {/* Share metadata contact popup */}
      {showShareMenu && (
        <div className="glass-panel p-4 mb-4 animate-fade-in border-primary">
          <h6 className="fw-600 text-white mb-2">Configure Sharing Logging (Recipient Contact)</h6>
          <p className="text-muted small">Enter the email/phone of the buyer you are sharing this property link with to record in activity logs.</p>
          <div className="d-flex gap-2 flex-wrap">
            <input 
              type="text" 
              className="form-control form-premium-control flex-grow-1" 
              placeholder={shareChannel === 'whatsapp' ? 'e.g. +91 99999 99999' : 'e.g. buyer@gmail.com'}
              value={shareRecipient} 
              onChange={(e) => setShareRecipient(e.target.value)} 
            />
            <button 
              className={`btn btn-${shareChannel === 'whatsapp' ? 'success' : 'primary'} px-4`}
              onClick={shareChannel === 'whatsapp' ? handleWhatsAppShare : handleEmailShare}
            >
              Proceed
            </button>
            <button className="btn btn-premium-outline" onClick={() => setShowShareMenu(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Main Specifications Details & Gallery */}
      <div className="row g-4 mb-4">
        
        {/* Left Column: Spec Tabs */}
        <div className="col-12 col-lg-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="glass-panel p-4 h-100">
            
            {/* Tab Links */}
            <ul className="nav nav-tabs border-bottom mb-4 flex-nowrap overflow-auto pb-1" style={{ borderColor: 'var(--border-color)', scrollbarWidth: 'none' }}>
              <li className="nav-item">
                <button 
                  className={`nav-link bg-transparent text-light border-0 py-2 px-3 fw-600 ${activeTab === 'overview' ? 'active text-primary border-bottom border-primary' : 'text-muted'}`}
                  style={{ borderBottomWidth: '2px !important' }}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview & Layouts
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link bg-transparent text-light border-0 py-2 px-3 fw-600 ${activeTab === 'specifications' ? 'active text-primary border-bottom border-primary' : 'text-muted'}`}
                  style={{ borderBottomWidth: '2px !important' }}
                  onClick={() => setActiveTab('specifications')}
                >
                  Specifications
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link bg-transparent text-light border-0 py-2 px-3 fw-600 ${activeTab === 'amenities' ? 'active text-primary border-bottom border-primary' : 'text-muted'}`}
                  style={{ borderBottomWidth: '2px !important' }}
                  onClick={() => setActiveTab('amenities')}
                >
                  Amenities
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link bg-transparent text-light border-0 py-2 px-3 fw-600 ${activeTab === 'location' ? 'active text-primary border-bottom border-primary' : 'text-muted'}`}
                  style={{ borderBottomWidth: '2px !important' }}
                  onClick={() => setActiveTab('location')}
                >
                  Location Map
                </button>
              </li>
            </ul>

            {/* Tab content */}
            {activeTab === 'overview' && (
              <div>
                <h5 className="text-white fw-600 mb-3">Project Summary</h5>
                <p className="text-muted mb-4">{property.highlights || 'No highlights summary details recorded yet.'}</p>
                
                <h5 className="text-white fw-600 mb-3">BHK Configurations & Pricing</h5>
                {configurations && configurations.length > 0 ? (
                  <div className="table-responsive mb-4">
                    <table className="table table-bordered border-secondary text-white">
                      <thead>
                        <tr className="text-muted small">
                          <th>BHK/Unit Variant</th>
                          <th>Carpet Area</th>
                          <th>Price (INR)</th>
                          <th>Est. Monthly EMI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {configurations.map((c, idx) => (
                          <tr key={idx} className="small">
                            <td>{c.bhk_type}</td>
                            <td>{c.carpet_area} sq.ft.</td>
                            <td className="text-success fw-600">₹{parseFloat(c.price).toLocaleString('en-IN')}</td>
                            <td>{c.estimated_emi ? `₹${parseFloat(c.estimated_emi).toLocaleString('en-IN')}` : 'Price on Request'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted small">No BHK configurations listed for this project.</p>
                )}

                <div className="row g-3">
                  <div className="col-sm-6">
                    <div className="p-3 bg-dark bg-opacity-20 rounded border border-secondary border-opacity-10">
                      <span className="text-muted small d-block mb-1">BUILDER GROUP</span>
                      <strong className="text-white fs-6">{property.builder}</strong>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 bg-dark bg-opacity-20 rounded border border-secondary border-opacity-10">
                      <span className="text-muted small d-block mb-1">ESTIMATED COMPLETION</span>
                      <strong className="text-white fs-6">{property.completion_date ? new Date(property.completion_date).toLocaleDateString() : 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                {property.developer_legacy && (
                  <div className="mt-4">
                    <h5 className="text-white fw-600 mb-2">Developer Legacy</h5>
                    <p className="text-muted small">{property.developer_legacy}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specifications' && (
              <div>
                <h5 className="text-white fw-600 mb-3">Construction Specifications</h5>
                {specifications && specifications.length > 0 ? (
                  <div className="row g-3">
                    {specifications.map((spec, idx) => (
                      <div key={idx} className="col-12 border-bottom border-secondary border-opacity-20 pb-3">
                        <h6 className="text-primary fw-600 mb-1">{spec.title}</h6>
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
                <h5 className="text-white fw-600 mb-4">Amenities List</h5>
                {amenities && amenities.length > 0 ? (
                  <div className="row g-3">
                    {amenities.map((amenity, index) => (
                      <div key={index} className="col-sm-6 col-md-4">
                        <div className="d-flex align-items-center gap-2 p-2 bg-dark bg-opacity-20 rounded">
                          <i className="bi bi-patch-check-fill text-primary"></i>
                          <span className="small">{amenity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small">No amenities specified.</p>
                )}
              </div>
            )}

            {activeTab === 'location' && (
              <div>
                <h5 className="text-white fw-600 mb-3">Site Location Map</h5>
                {property.map_embed_url ? (
                  <div className="ratio ratio-16x9 rounded overflow-hidden border border-secondary border-opacity-20">
                    <iframe 
                      src={property.map_embed_url} 
                      allowFullScreen="" 
                      loading="lazy" 
                      title="Location Map"
                    ></iframe>
                  </div>
                ) : (
                  <p className="text-muted small">Google location map embed URL not configured by branch administrators.</p>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Image Gallery Grid */}
        <div className="col-12 col-lg-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="glass-panel p-4 h-100">
            <h5 className="fw-600 text-white mb-4"><i className="bi bi-images text-primary me-2"></i>Project Assets Gallery</h5>
            
            {media.images && media.images.length > 0 ? (
              <div className="row g-3">
                {media.images.map((img) => (
                  <div key={img.id} className="col-6">
                    <div className="glass-panel p-1 overflow-hidden" style={{ borderRadius: '8px' }}>
                      <a href={formatImageUrl(img.url)} target="_blank" rel="noreferrer">
                        <img 
                          src={formatImageUrl(img.url)} 
                          alt={img.name} 
                          onError={handleImageError}
                          className="img-fluid rounded hover-scale" 
                          style={{ objectFit: 'cover', height: '110px', width: '100%' }}
                        />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 text-muted small">
                <i className="bi bi-image fs-1 d-block mb-2"></i> No images uploaded yet.
              </div>
            )}

            {media.floor_plans && media.floor_plans.length > 0 && (
              <div className="mt-4">
                <h6 className="fw-600 text-white mb-3">Floor Layout Plans</h6>
                <div className="row g-3">
                  {media.floor_plans.map((fp) => (
                    <div key={fp.id} className="col-12 text-center mb-2">
                      <div className="glass-panel p-1 d-inline-block w-100">
                        <a href={formatImageUrl(fp.url)} target="_blank" rel="noreferrer">
                          <img 
                            src={formatImageUrl(fp.url)} 
                            alt={fp.name} 
                            onError={handleImageError}
                            className="img-fluid rounded hover-scale" 
                            style={{ maxHeight: '180px', objectFit: 'contain' }}
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

      </div>

      {/* Lead Inquiry Modal */}
      <LeadFormModal 
        show={showLeadModal} 
        propertyId={property.id} 
        propertyName={property.project_name} 
        onClose={() => setShowLeadModal(false)}
        onSuccess={() => alert('Referral lead inquiry has been registered in the system and routed to the corresponding branch sales executives.')}
      />
    </div>
  );
};

export default PropertyDetail;
