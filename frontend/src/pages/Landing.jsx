import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CustomizationContext } from '../context/CustomizationContext';
import api from '../services/api';
import CustomizationModal from '../components/CustomizationModal';
import { formatImageUrl } from '../utils/imageHelper';

const Landing = () => {
  const { user } = useContext(AuthContext);
  const { config } = useContext(CustomizationContext);

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Customization Modal trigger
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    projectName: '',
    type: '',
    city: '',
    location: '',
    minPrice: '',
    maxPrice: ''
  });

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

  const fetchPublicProperties = async (currentFilters = filters) => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams();
      Object.keys(currentFilters).forEach(key => {
        if (currentFilters[key]) {
          queryParams.append(key, currentFilters[key]);
        }
      });

      const res = await api.get(`/api/properties/public?${queryParams.toString()}`);
      setProperties(res.data);
    } catch (err) {
      setError('Failed to fetch property listings. Please check server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicProperties();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchPublicProperties();
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      projectName: '',
      type: '',
      city: '',
      location: '',
      minPrice: '',
      maxPrice: ''
    };
    setFilters(defaultFilters);
    fetchPublicProperties(defaultFilters);
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

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }} className="d-flex flex-column">
      
      {/* Header Panel */}
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

      {/* Hero Intro Banner Section */}
      <section className="position-relative py-5 overflow-visible text-center text-white" style={{
        backgroundImage: `linear-gradient(135deg, ${config.primaryColor}E6 0%, ${config.accentColor}CC 100%), url("https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1920&q=80")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        paddingTop: '90px',
        paddingBottom: '90px',
        borderBottomRightRadius: '60px',
        borderBottomLeftRadius: '60px'
      }}>
        <div className="container py-3">
          <span className="badge mb-3 px-3 py-2 rounded-pill fw-600 text-uppercase" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', fontSize: '0.8rem', letterSpacing: '1px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            Real Estate Portal
          </span>
          <h1 className="display-4 fw-800 mb-3 text-white">{config.heroTitle}</h1>
          <p className="lead text-light mb-4 mx-auto opacity-90" style={{ maxWidth: '720px', fontSize: '1.1rem' }}>
            {config.heroSubtitle}
          </p>
        </div>
      </section>

      {/* Value Proposition Boxes Section */}
      <section className="container animate-fade-in" style={{ marginTop: '-45px', zIndex: 10 }}>
        <div className="row g-4 justify-content-center">
          <div className="col-md-6 col-lg-3">
            <div className="card border-0 p-4 shadow-sm h-100 transition-up" style={{ borderRadius: '20px', backgroundColor: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.04)' }}>
              <div className="d-flex align-items-center justify-content-center mb-3" style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: `${config.accentColor}1A` }}>
                <i className="bi bi-patch-check-fill fs-4" style={{ color: config.accentColor }}></i>
              </div>
              <h6 className="fw-700 text-dark mb-2">Verified Listings</h6>
              <p className="text-muted mb-0 small">Only approved and updated price catalog records straight from regional branch systems.</p>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card border-0 p-4 shadow-sm h-100 transition-up" style={{ borderRadius: '20px', backgroundColor: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.04)' }}>
              <div className="d-flex align-items-center justify-content-center mb-3" style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: `${config.primaryColor}1A` }}>
                <i className="bi bi-shuffle fs-4" style={{ color: config.primaryColor }}></i>
              </div>
              <h6 className="fw-700 text-dark mb-2">Comparison Engine</h6>
              <p className="text-muted mb-0 small">Evaluate BHK configurations, carpet area, EMIs side by side to choose optimal matches.</p>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card border-0 p-4 shadow-sm h-100 transition-up" style={{ borderRadius: '20px', backgroundColor: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.04)' }}>
              <div className="d-flex align-items-center justify-content-center mb-3" style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: `${config.accentColor}1A` }}>
                <i className="bi bi-exclude fs-4" style={{ color: config.accentColor }}></i>
              </div>
              <h6 className="fw-700 text-dark mb-2">Zero Spamming Policy</h6>
              <p className="text-muted mb-0 small">Your inquiry goes only to verified branch executors. No third-party caller harassments.</p>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card border-0 p-4 shadow-sm h-100 transition-up" style={{ borderRadius: '20px', backgroundColor: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.04)' }}>
              <div className="d-flex align-items-center justify-content-center mb-3" style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: `${config.primaryColor}1A` }}>
                <i className="bi bi-lightning-charge-fill fs-4" style={{ color: config.primaryColor }}></i>
              </div>
              <h6 className="fw-700 text-dark mb-2">Direct Expert Insights</h6>
              <p className="text-muted mb-0 small">Detailed blueprints, RERA certificates, brochures, and map outlines instantly online.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main catalog listing and search filters */}
      <main className="container my-5 flex-grow-1">
        
        {/* Title bar */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h3 className="fw-800 text-dark mb-1">Top Curated Projects</h3>
            <p className="text-muted mb-0">Browse and comparison search approved properties across regional networks.</p>
          </div>
        </div>

        <div className="row g-4">
          {/* Left Filter Pane */}
          <div className="col-lg-3">
            <div className="p-4 shadow-sm border border-light sticky-top animate-fade-in" style={{ top: '100px', borderRadius: '24px', backgroundColor: '#fdfdfd' }}>
              <h5 className="fw-700 text-dark mb-4 d-flex align-items-center gap-2">
                <i className="bi bi-funnel-fill text-warning"></i> Filter Search
              </h5>
              
              <form onSubmit={handleApplyFilters} className="d-flex flex-column gap-3">
                <div>
                  <label className="form-label text-muted small fw-600">PROJECT KEYWORD</label>
                  <input
                    type="text"
                    name="projectName"
                    value={filters.projectName}
                    onChange={handleFilterChange}
                    className="form-control form-premium-control w-100"
                    placeholder="e.g. Sai Sanskruti"
                  />
                </div>

                <div>
                  <label className="form-label text-muted small fw-600">PROPERTY TYPE</label>
                  <select
                    name="type"
                    value={filters.type}
                    onChange={handleFilterChange}
                    className="form-select form-premium-control w-100 text-capitalize"
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

                <div>
                  <label className="form-label text-muted small fw-600">CITY</label>
                  <input
                    type="text"
                    name="city"
                    value={filters.city}
                    onChange={handleFilterChange}
                    className="form-control form-premium-control w-100"
                    placeholder="e.g. Pune"
                  />
                </div>

                <div>
                  <label className="form-label text-muted small fw-600">LOCATION</label>
                  <input
                    type="text"
                    name="location"
                    value={filters.location}
                    onChange={handleFilterChange}
                    className="form-control form-premium-control w-100"
                    placeholder="e.g. Kondhwa"
                  />
                </div>

                <div>
                  <label className="form-label text-muted small fw-600">MIN PRICE (INR)</label>
                  <input
                    type="number"
                    name="minPrice"
                    value={filters.minPrice}
                    onChange={handleFilterChange}
                    className="form-control form-premium-control w-100"
                    placeholder="Min Value"
                  />
                </div>

                <div>
                  <label className="form-label text-muted small fw-600">MAX PRICE (INR)</label>
                  <input
                    type="number"
                    name="maxPrice"
                    value={filters.maxPrice}
                    onChange={handleFilterChange}
                    className="form-control form-premium-control w-100"
                    placeholder="Max Value"
                  />
                </div>

                <div className="d-flex gap-2 mt-2 pt-2 border-top" style={{ borderColor: 'var(--border-color)' }}>
                  <button type="button" className="btn btn-premium-outline flex-grow-1" onClick={handleResetFilters}>
                    Reset
                  </button>
                  <button type="submit" className="btn btn-premium flex-grow-1">
                    Apply
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Listings Grid */}
          <div className="col-lg-9">
            {error && (
              <div className="alert alert-danger p-3 animate-fade-in mb-4">
                <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-5 text-muted animate-fade-in">
                <div className="spinner-border text-warning mb-3" role="status"></div>
                <p>Retrieving matching real estate holdings...</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-5 animate-fade-in" style={{ border: '1px dashed rgba(25, 41, 81, 0.15)', borderRadius: '32px' }}>
                <i className="bi bi-building fs-1 d-block mb-3 text-muted"></i>
                <h4 className="fw-700 text-dark">No Properties Match Your Query</h4>
                <p className="text-muted mb-0">Try clearing active filters or search terms.</p>
              </div>
            ) : (
              <div className="row g-4 animate-fade-in">
                {properties.map(p => {
                  const mainPhoto = formatImageUrl(p.primary_image);

                  return (
                    <div key={p.id} className="col-md-6 col-lg-4">
                      {/* Premium Card: Slate style rounded corners and shadow */}
                      <div className="card border-0 shadow-sm h-100 overflow-hidden d-flex flex-column justify-content-between transition-up" style={{ borderRadius: '24px', backgroundColor: '#ffffff', border: '1px solid rgba(25, 41, 81, 0.04)' }}>
                        <div>
                          {/* Image */}
                          <div className="position-relative" style={{ height: '200px', backgroundImage: `url(${mainPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                            <div className="position-absolute top-0 right-0 p-3">
                              <span className="badge text-white px-2.5 py-1.5 rounded fw-600 text-uppercase text-capitalize" style={{ fontSize: '0.7rem', backgroundColor: config.primaryColor }}>
                                {p.property_type}
                              </span>
                            </div>
                          </div>

                          {/* Body */}
                          <div className="p-4">
                            <span className="text-muted small fw-700 d-block mb-1">{p.property_code}</span>
                            <h5 className="card-title fw-800 text-dark mb-1">{p.project_name}</h5>
                            <p className="text-muted mb-3 small"><i className="bi bi-geo-alt-fill text-warning me-1"></i> {p.location}, {p.city}</p>

                            <div className="row g-2 mb-3 p-2.5 rounded" style={{ backgroundColor: '#f8fafc' }}>
                              <div className="col-6">
                                <span className="text-muted d-block small" style={{ fontSize: '0.7rem', fontWeight: '600' }}>REGIONAL OFFICE</span>
                                <span className="fw-700 text-dark small">{p.branch_name}</span>
                              </div>
                              <div className="col-6">
                                <span className="text-muted d-block small" style={{ fontSize: '0.7rem', fontWeight: '600' }}>STARTING AREA</span>
                                <span className="fw-700 text-dark small">{p.min_area ? `${p.min_area} sq ft+` : 'N/A'}</span>
                              </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center pt-2">
                              <div>
                                <span className="text-muted d-block small" style={{ fontSize: '0.7rem', fontWeight: '600' }}>STARTING PRICE</span>
                                <h6 className="mb-0 text-success fw-800" style={{ fontSize: '1rem' }}>
                                  {p.min_price ? `${formatPrice(p.min_price)}` : 'On Request'}
                                </h6>
                              </div>

                              <span className={`badge rounded-pill px-2.5 py-1.5 small fw-600 text-capitalize`} style={{
                                backgroundColor: p.availability_status === 'available' ? 'rgba(5, 150, 105, 0.08)' : p.availability_status === 'booked' ? 'rgba(217, 119, 6, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                                color: p.availability_status === 'available' ? '#059669' : p.availability_status === 'booked' ? '#d97706' : '#dc2626',
                                border: `1px solid ${p.availability_status === 'available' ? 'rgba(5, 150, 105, 0.15)' : p.availability_status === 'booked' ? 'rgba(217, 119, 6, 0.15)' : 'rgba(220, 38, 38, 0.15)'}`,
                                fontSize: '0.7rem'
                              }}>
                                {p.availability_status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-top mt-auto bg-light bg-opacity-30" style={{ borderColor: 'rgba(25, 41, 81, 0.06)' }}>
                          <Link to={`/property-public/${p.property_slug}`} className="btn w-100 text-center py-2.5 fw-600 text-white" style={{ backgroundColor: config.primaryColor, borderRadius: '12px', fontSize: '0.85rem', border: 'none' }}>
                            <i className="bi bi-eye me-1.5"></i> View Project Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Comparison Callout section */}
      <section className="container py-5">
        <div className="p-5 text-white" style={{
          backgroundColor: config.primaryColor,
          borderRadius: '32px',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)'
        }}>
          <div className="row align-items-center">
            <div className="col-lg-7 text-center text-lg-start">
              <h2 className="fw-800 mb-3 text-white">Compare Your Top Choices</h2>
              <p className="mb-0 text-light opacity-90" style={{ fontSize: '1.05rem' }}>
                Evaluate multiple configurations side-by-side on carpet sizes, blueprints, pricing models, and locations to choose the ideal property.
              </p>
            </div>
            <div className="col-lg-5 text-center text-lg-end mt-4 mt-lg-0">
              <button 
                onClick={() => window.scrollTo({ top: 350, behavior: 'smooth' })} 
                className="btn px-5 py-3 fw-700 text-white shadow-sm" 
                style={{ borderRadius: '50px', backgroundColor: config.accentColor, border: 'none' }}
              >
                Compare Projects Now
              </button>
            </div>
          </div>
        </div>
      </section>

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

export default Landing;
