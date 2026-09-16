import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CustomizationContext } from '../context/CustomizationContext';
import api from '../services/api';
import { formatImageUrl } from '../utils/imageHelper';

const Landing = () => {
  const { user } = useContext(AuthContext);
  const { config } = useContext(CustomizationContext);

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Active Category Tab: 'all', 'residential', 'commercial', 'new_launches'
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');

  // Comparison State (up to 3 selected properties)
  const [selectedToCompare, setSelectedToCompare] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // 360 Tour Viewer Modal State
  const [activeTourUrl, setActiveTourUrl] = useState(null);

  // Popular Quick City List
  const quickCities = ['All', 'Pune', 'Mumbai', 'Thane', 'Navi Mumbai', 'Nashik', 'Nagpur'];

  // Filters state
  const [filters, setFilters] = useState({
    projectName: '',
    type: '',
    city: '',
    location: '',
    minPrice: '',
    maxPrice: ''
  });

  const fetchPublicProperties = async (currentFilters = filters, categoryTab = activeCategoryTab) => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams();
      Object.keys(currentFilters).forEach(key => {
        if (currentFilters[key]) {
          queryParams.append(key, currentFilters[key]);
        }
      });

      if (categoryTab === 'residential') {
        queryParams.append('categoryGroup', 'residential');
      } else if (categoryTab === 'commercial') {
        queryParams.append('categoryGroup', 'commercial');
      }

      const res = await api.get(`/api/properties/public?${queryParams.toString()}`);
      
      let fetchedProps = res.data;
      if (categoryTab === 'new_launches') {
        // Sort or filter recent properties
        fetchedProps = fetchedProps.slice(0, 6);
      }

      setProperties(fetchedProps);
    } catch (err) {
      setError('Failed to fetch property listings. Please check server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicProperties(filters, activeCategoryTab);
  }, [activeCategoryTab]);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchPublicProperties(filters, activeCategoryTab);
  };

  const handleCityPillClick = (cityName) => {
    const updated = {
      ...filters,
      city: cityName === 'All' ? '' : cityName
    };
    setFilters(updated);
    fetchPublicProperties(updated, activeCategoryTab);
  };

  const handleCategoryTabSelect = (tabKey) => {
    setActiveCategoryTab(tabKey);
    // Also sync property type filter if needed
    if (tabKey === 'residential') {
      setFilters(prev => ({ ...prev, type: '' }));
    } else if (tabKey === 'commercial') {
      setFilters(prev => ({ ...prev, type: 'commercial' }));
    } else {
      setFilters(prev => ({ ...prev, type: '' }));
    }
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
    setActiveCategoryTab('all');
    fetchPublicProperties(defaultFilters, 'all');
  };

  // Compare Toggle Logic
  const handleToggleCompare = (property) => {
    const exists = selectedToCompare.find(item => item.id === property.id);
    if (exists) {
      setSelectedToCompare(selectedToCompare.filter(item => item.id !== property.id));
    } else {
      if (selectedToCompare.length >= 3) {
        alert('You can compare a maximum of 3 properties at a time.');
        return;
      }
      setSelectedToCompare([...selectedToCompare, property]);
    }
  };

  const formatPrice = (value) => {
    if (!value) return 'Price On Request';
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
            {selectedToCompare.length > 0 && (
              <button 
                onClick={() => setShowCompareModal(true)}
                className="btn btn-warning text-dark fw-600 btn-sm rounded-pill px-3 py-1.5 shadow-sm"
              >
                <i className="bi bi-arrow-left-right me-1.5"></i> Compare ({selectedToCompare.length})
              </button>
            )}

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
        backgroundImage: `linear-gradient(135deg, ${config.primaryColor}F0 0%, ${config.accentColor}DD 100%), url("https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1920&q=80")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        paddingTop: '90px',
        paddingBottom: '100px',
        borderBottomRightRadius: '60px',
        borderBottomLeftRadius: '60px'
      }}>
        <div className="container py-3">
          <span className="badge mb-3 px-3.5 py-2 rounded-pill fw-600 text-uppercase shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', fontSize: '0.8rem', letterSpacing: '1px', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
            ✨ MAHARERA Certified Real Estate Ecosystem
          </span>
          <h1 className="display-4 fw-800 mb-3 text-white">{config.heroTitle}</h1>
          <p className="lead text-light mb-4 mx-auto opacity-90" style={{ maxWidth: '750px', fontSize: '1.15rem' }}>
            {config.heroSubtitle}
          </p>

          {/* Interactive Category Search Tabs */}
          <div className="d-flex justify-content-center align-items-center gap-2 mb-4 flex-wrap">
            <button 
              onClick={() => handleCategoryTabSelect('all')}
              className={`btn rounded-pill px-4 py-2 fw-700 transition ${activeCategoryTab === 'all' ? 'btn-light text-dark shadow' : 'text-white border-light bg-transparent'}`}
              style={{ fontSize: '0.9rem' }}
            >
              🏢 All Properties
            </button>
            <button 
              onClick={() => handleCategoryTabSelect('residential')}
              className={`btn rounded-pill px-4 py-2 fw-700 transition ${activeCategoryTab === 'residential' ? 'btn-light text-dark shadow' : 'text-white border-light bg-transparent'}`}
              style={{ fontSize: '0.9rem' }}
            >
              🏠 Residential
            </button>
            <button 
              onClick={() => handleCategoryTabSelect('commercial')}
              className={`btn rounded-pill px-4 py-2 fw-700 transition ${activeCategoryTab === 'commercial' ? 'btn-light text-dark shadow' : 'text-white border-light bg-transparent'}`}
              style={{ fontSize: '0.9rem' }}
            >
              🏢 Commercial Spaces
            </button>
            <button 
              onClick={() => handleCategoryTabSelect('new_launches')}
              className={`btn rounded-pill px-4 py-2 fw-700 transition ${activeCategoryTab === 'new_launches' ? 'btn-warning text-dark shadow' : 'text-white border-light bg-transparent'}`}
              style={{ fontSize: '0.9rem' }}
            >
              ✨ New Launches
            </button>
          </div>

          {/* Quick City Navigation Pills */}
          <div className="d-flex justify-content-center align-items-center gap-2 flex-wrap" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <span className="text-light small fw-600 me-2 d-none d-md-inline"><i className="bi bi-geo-alt-fill text-warning me-1"></i> Quick City Filter:</span>
            {quickCities.map(city => {
              const isActive = (city === 'All' && !filters.city) || (filters.city.toLowerCase() === city.toLowerCase());
              return (
                <button
                  key={city}
                  onClick={() => handleCityPillClick(city)}
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-600 transition ${isActive ? 'bg-warning text-dark border-0 shadow-sm' : 'btn-outline-light text-white opacity-80'}`}
                  style={{ fontSize: '0.8rem' }}
                >
                  📍 {city}
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* Trust & Stats Counter Section */}
      <section className="container animate-fade-in" style={{ marginTop: '-45px', zIndex: 10 }}>
        <div className="card border-0 p-4 shadow-lg" style={{ borderRadius: '24px', backgroundColor: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.06)' }}>
          <div className="row g-4 text-center divide-x">
            <div className="col-6 col-md-3">
              <div className="p-2">
                <h3 className="fw-800 mb-1" style={{ color: config.primaryColor }}>100+</h3>
                <span className="text-muted small fw-600 text-uppercase tracking-wider">Verified Projects</span>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-2">
                <h3 className="fw-800 mb-1" style={{ color: config.accentColor }}>100%</h3>
                <span className="text-muted small fw-600 text-uppercase tracking-wider">RERA Compliant</span>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-2">
                <h3 className="fw-800 mb-1" style={{ color: '#059669' }}>🥽 360°</h3>
                <span className="text-muted small fw-600 text-uppercase tracking-wider">Virtual Tours</span>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-2">
                <h3 className="fw-800 mb-1" style={{ color: '#0284c7' }}>₹0</h3>
                <span className="text-muted small fw-600 text-uppercase tracking-wider">Direct Buyer Commission</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Boxes Section */}
      <section className="container my-5">
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
                <i className="bi bi-camera-video-fill fs-4" style={{ color: config.accentColor }}></i>
              </div>
              <h6 className="fw-700 text-dark mb-2">360° VR Experience</h6>
              <p className="text-muted mb-0 small">Immersive virtual walk-throughs created directly for buyers and brokers online.</p>
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
      <main className="container my-4 flex-grow-1">
        
        {/* Title bar */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h3 className="fw-800 text-dark mb-1">
              Top Curated Projects {filters.city && <span className="text-warning">in {filters.city}</span>}
            </h3>
            <p className="text-muted mb-0">Browse and comparison search approved properties across regional networks.</p>
          </div>
          {selectedToCompare.length > 0 && (
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-secondary text-dark fw-600">
                {selectedToCompare.length} Selected for Comparison
              </span>
              <button 
                onClick={() => setSelectedToCompare([])}
                className="btn btn-link text-danger text-decoration-none btn-sm p-0 fw-600"
              >
                Clear All
              </button>
            </div>
          )}
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
                    placeholder="e.g. Pune, Mumbai, Thane"
                  />
                </div>

                <div>
                  <label className="form-label text-muted small fw-600">LOCATION / LOCALITY</label>
                  <input
                    type="text"
                    name="location"
                    value={filters.location}
                    onChange={handleFilterChange}
                    className="form-control form-premium-control w-100"
                    placeholder="e.g. Kondhwa, Baner"
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
                  const isCompared = selectedToCompare.some(item => item.id === p.id);

                  return (
                    <div key={p.id} className="col-md-6 col-lg-4">
                      {/* Premium Card: Slate style rounded corners and shadow */}
                      <div className="card border-0 shadow-sm h-100 overflow-hidden d-flex flex-column justify-content-between transition-up" style={{ borderRadius: '24px', backgroundColor: '#ffffff', border: '1px solid rgba(25, 41, 81, 0.04)' }}>
                        <div>
                          {/* Image & Top Badges */}
                          <div className="position-relative" style={{ height: '210px', backgroundImage: `url(${mainPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                            
                            {/* Property Type Badge */}
                            <div className="position-absolute top-0 start-0 p-3">
                              <span className="badge text-white px-2.5 py-1.5 rounded fw-600 text-uppercase text-capitalize" style={{ fontSize: '0.7rem', backgroundColor: config.primaryColor }}>
                                {p.property_type}
                              </span>
                            </div>

                            {/* 360 VR Badge if available */}
                            {p.virtual_tour_url && (
                              <div className="position-absolute top-0 end-0 p-3">
                                <button 
                                  onClick={() => setActiveTourUrl(p.virtual_tour_url)}
                                  className="badge bg-success text-white border-0 px-2.5 py-1.5 rounded-pill fw-600 text-uppercase shadow cursor-pointer"
                                  style={{ fontSize: '0.75rem' }}
                                  title="Click to launcher 360° Virtual Tour"
                                >
                                  🥽 360° VR Tour
                                </button>
                              </div>
                            )}

                            {/* Compare Checkbox pill bottom left */}
                            <div className="position-absolute bottom-0 start-0 p-3">
                              <button 
                                onClick={() => handleToggleCompare(p)}
                                className={`btn btn-sm rounded-pill px-3 py-1 fw-600 shadow-sm transition ${isCompared ? 'btn-warning text-dark' : 'btn-dark text-white opacity-90'}`}
                                style={{ fontSize: '0.75rem' }}
                              >
                                {isCompared ? '✓ Selected to Compare' : '➕ Add to Compare'}
                              </button>
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
                                  {formatPrice(p.min_price)}
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

                        {/* Card Footer Actions */}
                        <div className="p-4 border-top mt-auto bg-light bg-opacity-30 d-flex gap-2" style={{ borderColor: 'rgba(25, 41, 81, 0.06)' }}>
                          <Link to={`/property-public/${p.property_slug}`} className="btn flex-grow-1 text-center py-2.5 fw-600 text-white shadow-sm" style={{ backgroundColor: config.primaryColor, borderRadius: '12px', fontSize: '0.85rem', border: 'none' }}>
                            <i className="bi bi-eye me-1.5"></i> Details
                          </Link>
                          
                          {/* One click WhatsApp Inquiry */}
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Hello Apex Estates! I am interested in viewing details & pricing for project: ${p.project_name} in ${p.city} (${p.property_code}).`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-success py-2.5 px-3 fw-600 rounded-pill shadow-sm"
                            title="Inquire via WhatsApp"
                            style={{ fontSize: '0.85rem' }}
                          >
                            <i className="bi bi-whatsapp"></i>
                          </a>
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

      {/* Floating Comparison Bar at bottom */}
      {selectedToCompare.length > 0 && (
        <div className="position-fixed bottom-0 start-50 translate-middle-x p-3 animate-fade-in" style={{ zIndex: 1050, width: '90%', maxWidth: '800px' }}>
          <div className="card border-0 shadow-lg p-3 text-white d-flex flex-row align-items-center justify-content-between flex-wrap gap-3" style={{ backgroundColor: config.primaryColor, borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <div className="d-flex align-items-center gap-3">
              <span className="badge bg-warning text-dark fw-700 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                {selectedToCompare.length}
              </span>
              <div>
                <h6 className="mb-0 fw-700 text-white">Projects Selected for Comparison</h6>
                <small className="text-light opacity-80">
                  {selectedToCompare.map(p => p.project_name).join(', ')}
                </small>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button 
                onClick={() => setSelectedToCompare([])}
                className="btn btn-outline-light btn-sm rounded-pill px-3"
              >
                Clear
              </button>
              <button 
                onClick={() => setShowCompareModal(true)}
                className="btn btn-warning text-dark fw-700 btn-sm rounded-pill px-4 py-2 shadow-sm"
              >
                <i className="bi bi-shuffle me-1"></i> Compare Side-by-Side
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal Dialog */}
      {showCompareModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1070 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content text-dark border-0 shadow-lg" style={{ borderRadius: '24px' }}>
              <div className="modal-header border-bottom py-3 px-4" style={{ backgroundColor: '#f8fafc' }}>
                <h5 className="modal-title fw-800 text-dark">
                  <i className="bi bi-shuffle text-warning me-2"></i> Side-by-Side Property Comparison Matrix
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowCompareModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="table-responsive">
                  <table className="table table-bordered align-middle">
                    <thead>
                      <tr className="table-light">
                        <th style={{ width: '180px' }} className="fw-700 text-muted">PROPERTY SPEC</th>
                        {selectedToCompare.map(p => (
                          <th key={p.id} className="text-center fw-800 text-dark" style={{ minWidth: '220px' }}>
                            <div className="mb-2" style={{ height: '100px', backgroundImage: `url(${formatImageUrl(p.primary_image)})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '12px' }}></div>
                            {p.project_name}
                            <span className="d-block small text-muted font-monospace">{p.property_code}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="fw-700 text-muted">Property Type</td>
                        {selectedToCompare.map(p => (
                          <td key={p.id} className="text-center text-capitalize fw-600">{p.property_type}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="fw-700 text-muted">City & Location</td>
                        {selectedToCompare.map(p => (
                          <td key={p.id} className="text-center">{p.location}, {p.city}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="fw-700 text-muted">Branch Office</td>
                        {selectedToCompare.map(p => (
                          <td key={p.id} className="text-center fw-600">{p.branch_name}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="fw-700 text-muted">Starting Price</td>
                        {selectedToCompare.map(p => (
                          <td key={p.id} className="text-center text-success fw-800">{formatPrice(p.min_price)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="fw-700 text-muted">Starting Carpet Area</td>
                        {selectedToCompare.map(p => (
                          <td key={p.id} className="text-center fw-600">{p.min_area ? `${p.min_area} sq ft` : 'N/A'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="fw-700 text-muted">Availability Status</td>
                        {selectedToCompare.map(p => (
                          <td key={p.id} className="text-center text-capitalize fw-700">
                            <span className={`badge rounded-pill px-2.5 py-1 small`} style={{
                              backgroundColor: p.availability_status === 'available' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                              color: p.availability_status === 'available' ? '#059669' : '#d97706'
                            }}>
                              {p.availability_status}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="fw-700 text-muted">360° Virtual Tour</td>
                        {selectedToCompare.map(p => (
                          <td key={p.id} className="text-center">
                            {p.virtual_tour_url ? (
                              <button 
                                onClick={() => {
                                  setShowCompareModal(false);
                                  setActiveTourUrl(p.virtual_tour_url);
                                }}
                                className="btn btn-sm btn-success rounded-pill px-3 fw-600"
                              >
                                🥽 Launch Tour
                              </button>
                            ) : (
                              <span className="text-muted small">Not Available</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="fw-700 text-muted">Action</td>
                        {selectedToCompare.map(p => (
                          <td key={p.id} className="text-center">
                            <Link to={`/property-public/${p.property_slug}`} className="btn btn-sm btn-primary rounded-pill px-3 fw-600">
                              View Page
                            </Link>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer border-top py-3 px-4" style={{ backgroundColor: '#f8fafc' }}>
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowCompareModal(false)}>
                  Close Comparison
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 360 Virtual Tour Iframe Launcher Modal */}
      {activeTourUrl && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 1080 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered h-100 py-4">
            <div className="modal-content bg-dark text-white border-0 shadow-lg h-100" style={{ borderRadius: '24px' }}>
              <div className="modal-header border-secondary py-3 px-4">
                <h5 className="modal-title fw-700 text-warning">
                  <i className="bi bi-camera-video-fill me-2"></i> Interactive 360° Virtual Tour Preview
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setActiveTourUrl(null)}></button>
              </div>
              <div className="modal-body p-0 bg-black overflow-hidden position-relative">
                <iframe 
                  src={activeTourUrl} 
                  title="360 Virtual Tour" 
                  className="w-100 h-100 border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>
              </div>
              <div className="modal-footer border-secondary py-2 px-4 justify-content-between">
                <small className="text-muted">Use mouse or touch gestures to rotate 360° pan views.</small>
                <button type="button" className="btn btn-outline-light btn-sm rounded-pill px-4" onClick={() => setActiveTourUrl(null)}>
                  Exit Tour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <li><button onClick={() => handleCityPillClick('Pune')} className="btn btn-link text-muted p-0 border-0 text-decoration-none small" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Pune Real Estate</button></li>
                <li><button onClick={() => handleCityPillClick('Mumbai')} className="btn btn-link text-muted p-0 border-0 text-decoration-none small" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Mumbai Properties</button></li>
                <li><button onClick={() => handleCityPillClick('Thane')} className="btn btn-link text-muted p-0 border-0 text-decoration-none small" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Thane Listings</button></li>
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

export default Landing;
