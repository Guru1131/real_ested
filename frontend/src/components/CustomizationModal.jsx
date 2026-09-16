import React, { useState, useContext, useEffect } from 'react';
import { CustomizationContext, defaultConfig } from '../context/CustomizationContext';

const CustomizationModal = ({ show, onClose }) => {
  const { config, updateConfig, resetConfig } = useContext(CustomizationContext);

  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('branding'); // 'branding', 'business', 'whitelabel', 'features'
  const [saveSuccess, setSaveSuccess] = useState('');

  // Form state holding config values
  const [formData, setFormData] = useState({
    brandName: '',
    brandTagline: '',
    logoUrl: '',
    primaryColor: '',
    accentColor: '',
    accentColorSecondary: '',
    headerStyle: 'standard',
    footerBgColor: '',
    themeMode: 'light',

    businessName: '',
    contactEmail: '',
    contactPhone: '',
    officeAddress: '',
    reraNumber: '',
    taxId: '',
    currencySymbol: '₹',
    currencyCode: 'INR',

    brokerPortalName: '',
    heroTitle: '',
    heroSubtitle: '',
    licenseText: '',

    featureToggles: {
      brokerPortal: true,
      leadTracker: true,
      vr360: true,
      whatsappShare: true,
      publicLanding: true
    }
  });

  // Load context config values whenever modal opens
  useEffect(() => {
    if (show) {
      setFormData({
        brandName: config.brandName || defaultConfig.brandName,
        brandTagline: config.brandTagline || defaultConfig.brandTagline,
        logoUrl: config.logoUrl || '',
        primaryColor: config.primaryColor || defaultConfig.primaryColor,
        accentColor: config.accentColor || defaultConfig.accentColor,
        accentColorSecondary: config.accentColorSecondary || defaultConfig.accentColorSecondary,
        headerStyle: config.headerStyle || 'standard',
        footerBgColor: config.footerBgColor || defaultConfig.footerBgColor,
        themeMode: config.themeMode || 'light',

        businessName: config.businessName || defaultConfig.businessName,
        contactEmail: config.contactEmail || defaultConfig.contactEmail,
        contactPhone: config.contactPhone || defaultConfig.contactPhone,
        officeAddress: config.officeAddress || defaultConfig.officeAddress,
        reraNumber: config.reraNumber || defaultConfig.reraNumber,
        taxId: config.taxId || defaultConfig.taxId,
        currencySymbol: config.currencySymbol || '₹',
        currencyCode: config.currencyCode || 'INR',

        brokerPortalName: config.brokerPortalName || defaultConfig.brokerPortalName,
        heroTitle: config.heroTitle || defaultConfig.heroTitle,
        heroSubtitle: config.heroSubtitle || defaultConfig.heroSubtitle,
        licenseText: config.licenseText || defaultConfig.licenseText,

        featureToggles: {
          ...defaultConfig.featureToggles,
          ...(config.featureToggles || {})
        }
      });
      
      // Reset auth state when re-opening modal
      setIsAuthenticated(false);
      setPasscode('');
      setAuthError('');
      setSaveSuccess('');
      setActiveTab('branding');
    }
  }, [show, config]);

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (passcode.trim() === '1131512') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Access Denied: Invalid Master Passcode.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleToggleChange = (featureKey) => {
    setFormData((prev) => ({
      ...prev,
      featureToggles: {
        ...prev.featureToggles,
        [featureKey]: !prev.featureToggles[featureKey]
      }
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateConfig(formData);
    setSaveSuccess('White-label & branding settings applied successfully!');
    setTimeout(() => {
      setSaveSuccess('');
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    if (window.confirm('Reset all white-labeling and business settings back to system defaults?')) {
      resetConfig();
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', zIndex: 1090, backdropFilter: 'blur(8px)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg px-2">
        <div className="modal-content border-0 shadow-lg overflow-hidden" style={{ borderRadius: '24px', backgroundColor: '#ffffff' }}>
          
          {/* Header */}
          <div className="modal-header border-bottom py-3 px-4 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
            <h5 className="modal-title fw-800 text-white d-flex align-items-center gap-2 fs-6 fs-sm-5 mb-0">
              <i className="bi bi-sliders text-warning"></i> White-Label & System Configuration Panel
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
          </div>

          {!isAuthenticated ? (
            /* Passcode Verification Screen */
            <form onSubmit={handleAuthSubmit}>
              <div className="modal-body p-4 p-md-5 text-center">
                <div className="d-inline-flex align-items-center justify-content-center bg-warning bg-opacity-10 text-warning rounded-circle mb-3" style={{ width: '80px', height: '80px', border: '1px solid rgba(217, 119, 6, 0.3)' }}>
                  <i className="bi bi-shield-lock-fill display-5"></i>
                </div>
                <h4 className="fw-800 text-dark mb-2">System Admin Access Required</h4>
                <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: '420px' }}>
                  Enter your master password to proceed.
                </p>
                
                {authError && (
                  <div className="alert alert-danger py-2 px-3 mb-3 small mx-auto" style={{ borderRadius: '12px', maxWidth: '360px' }}>
                    <i className="bi bi-exclamation-triangle-fill me-1.5"></i> {authError}
                  </div>
                )}

                <div className="mx-auto" style={{ maxWidth: '340px' }}>
                  <div className="input-group mb-3">
                    <span className="input-group-text bg-light border-end-0 text-muted">
                      <i className="bi bi-key-fill"></i>
                    </span>
                    <input
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Enter passcode (1131512)"
                      className="form-control border-start-0 text-center py-2.5 fw-700"
                      style={{ borderRadius: '0 12px 12px 0', letterSpacing: '3px', fontSize: '1.1rem' }}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary w-50 py-2.5 fw-600" onClick={onClose} style={{ borderRadius: '12px' }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-warning w-50 py-2.5 text-dark fw-700" style={{ borderRadius: '12px' }}>
                      Unlock Panel
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* Main Configuration Control Screen */
            <form onSubmit={handleSave}>
              {/* Tab Navigation */}
              <div className="bg-light border-bottom px-4 pt-3 pb-0">
                <ul className="nav nav-tabs border-0 flex-nowrap overflow-auto g-2">
                  <li className="nav-item">
                    <button
                      type="button"
                      onClick={() => setActiveTab('branding')}
                      className={`nav-link border-0 py-2.5 px-3 fw-700 small rounded-top ${activeTab === 'branding' ? 'bg-white text-dark border-top border-warning shadow-sm' : 'text-muted'}`}
                      style={{ borderTopWidth: '3px !important' }}
                    >
                      <i className="bi bi-palette-fill me-1.5 text-warning"></i> Branding & Aesthetics
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      onClick={() => setActiveTab('business')}
                      className={`nav-link border-0 py-2.5 px-3 fw-700 small rounded-top ${activeTab === 'business' ? 'bg-white text-dark border-top border-warning shadow-sm' : 'text-muted'}`}
                      style={{ borderTopWidth: '3px !important' }}
                    >
                      <i className="bi bi-briefcase-fill me-1.5 text-info"></i> Business & Contact Info
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      onClick={() => setActiveTab('whitelabel')}
                      className={`nav-link border-0 py-2.5 px-3 fw-700 small rounded-top ${activeTab === 'whitelabel' ? 'bg-white text-dark border-top border-warning shadow-sm' : 'text-muted'}`}
                      style={{ borderTopWidth: '3px !important' }}
                    >
                      <i className="bi bi-globe me-1.5 text-success"></i> Whitelabel & Portal Text
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      onClick={() => setActiveTab('features')}
                      className={`nav-link border-0 py-2.5 px-3 fw-700 small rounded-top ${activeTab === 'features' ? 'bg-white text-dark border-top border-warning shadow-sm' : 'text-muted'}`}
                      style={{ borderTopWidth: '3px !important' }}
                    >
                      <i className="bi bi-toggle-on me-1.5 text-primary"></i> Feature Toggles
                    </button>
                  </li>
                </ul>
              </div>

              {/* Tab Contents */}
              <div className="modal-body p-4 overflow-auto" style={{ maxHeight: '65vh' }}>
                
                {saveSuccess && (
                  <div className="alert alert-success py-2.5 px-3 mb-4 small rounded-3 d-flex align-items-center gap-2">
                    <i className="bi bi-check-circle-fill fs-5"></i> {saveSuccess}
                  </div>
                )}

                {/* TAB 1: BRANDING */}
                {activeTab === 'branding' && (
                  <div className="row g-3 animate-fade-in">
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-700">BRAND / SYSTEM NAME</label>
                      <input
                        type="text"
                        name="brandName"
                        value={formData.brandName}
                        onChange={handleInputChange}
                        className="form-control py-2"
                        placeholder="e.g. PROP-MANAGER or Apex Estates"
                        style={{ borderRadius: '10px' }}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-700">TAGLINE / SUBTITLE</label>
                      <input
                        type="text"
                        name="brandTagline"
                        value={formData.brandTagline}
                        onChange={handleInputChange}
                        className="form-control py-2"
                        placeholder="e.g. Enterprise Real Estate Ecosystem"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-700">BRAND LOGO IMAGE URL (OPTIONAL)</label>
                      <input
                        type="text"
                        name="logoUrl"
                        value={formData.logoUrl}
                        onChange={handleInputChange}
                        className="form-control py-2"
                        placeholder="https://example.com/logo.png"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label text-muted small fw-700">HEADER STYLING MODE</label>
                      <select
                        name="headerStyle"
                        value={formData.headerStyle}
                        onChange={handleInputChange}
                        className="form-select py-2"
                        style={{ borderRadius: '10px' }}
                      >
                        <option value="standard">Opaque Solid Header</option>
                        <option value="glass">Glassmorphic Blurred Header</option>
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label text-muted small fw-700">THEME MODE</label>
                      <select
                        name="themeMode"
                        value={formData.themeMode}
                        onChange={handleInputChange}
                        className="form-select py-2"
                        style={{ borderRadius: '10px' }}
                      >
                        <option value="light">Light Theme Mode</option>
                        <option value="dark">Dark Slate Mode</option>
                      </select>
                    </div>

                    <div className="col-12 border-top pt-3 mt-3">
                      <h6 className="fw-700 text-dark mb-3"><i className="bi bi-palette me-1.5 text-warning"></i>Color Theme Palette</h6>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label text-muted small fw-600 d-block">PRIMARY BRAND COLOR</label>
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="color"
                              name="primaryColor"
                              value={formData.primaryColor}
                              onChange={handleInputChange}
                              className="form-control form-control-color border-0 p-0"
                              style={{ width: '42px', height: '42px', borderRadius: '8px' }}
                            />
                            <input
                              type="text"
                              name="primaryColor"
                              value={formData.primaryColor}
                              onChange={handleInputChange}
                              className="form-control py-1 px-2.5 small text-uppercase"
                              style={{ borderRadius: '8px' }}
                            />
                          </div>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label text-muted small fw-600 d-block">ACCENT COLOR (PRIMARY)</label>
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="color"
                              name="accentColor"
                              value={formData.accentColor}
                              onChange={handleInputChange}
                              className="form-control form-control-color border-0 p-0"
                              style={{ width: '42px', height: '42px', borderRadius: '8px' }}
                            />
                            <input
                              type="text"
                              name="accentColor"
                              value={formData.accentColor}
                              onChange={handleInputChange}
                              className="form-control py-1 px-2.5 small text-uppercase"
                              style={{ borderRadius: '8px' }}
                            />
                          </div>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label text-muted small fw-600 d-block">ACCENT GRADIENT (SECONDARY)</label>
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="color"
                              name="accentColorSecondary"
                              value={formData.accentColorSecondary}
                              onChange={handleInputChange}
                              className="form-control form-control-color border-0 p-0"
                              style={{ width: '42px', height: '42px', borderRadius: '8px' }}
                            />
                            <input
                              type="text"
                              name="accentColorSecondary"
                              value={formData.accentColorSecondary}
                              onChange={handleInputChange}
                              className="form-control py-1 px-2.5 small text-uppercase"
                              style={{ borderRadius: '8px' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: BUSINESS & CONTACT INFO */}
                {activeTab === 'business' && (
                  <div className="row g-3 animate-fade-in">
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-700">BUSINESS / LEGAL ENTITY NAME</label>
                      <input
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleInputChange}
                        className="form-control py-2"
                        placeholder="e.g. Apex Real Estate Management Ltd."
                        style={{ borderRadius: '10px' }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-700">SUPPORT / CONTACT EMAIL</label>
                      <input
                        type="email"
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleInputChange}
                        className="form-control py-2"
                        placeholder="e.g. contact@realestate.com"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-700">HELPLINE / CONTACT PHONE</label>
                      <input
                        type="text"
                        name="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleInputChange}
                        className="form-control py-2"
                        placeholder="e.g. +91 98765 43210"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-700">OFFICIAL HEADQUARTERS ADDRESS</label>
                      <input
                        type="text"
                        name="officeAddress"
                        value={formData.officeAddress}
                        onChange={handleInputChange}
                        className="form-control py-2"
                        placeholder="e.g. Financial Center, BKC, Mumbai"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-muted small fw-700">RERA REGISTRATION NO.</label>
                      <input
                        type="text"
                        name="reraNumber"
                        value={formData.reraNumber}
                        onChange={handleInputChange}
                        className="form-control py-2"
                        placeholder="e.g. A041262501974"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-muted small fw-700">TAX / GST REGISTRATION NO.</label>
                      <input
                        type="text"
                        name="taxId"
                        value={formData.taxId}
                        onChange={handleInputChange}
                        className="form-control py-2"
                        placeholder="e.g. 27AAACA1234A1Z5"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>

                    <div className="col-md-2">
                      <label className="form-label text-muted small fw-700">CURRENCY SYMBOL</label>
                      <input
                        type="text"
                        name="currencySymbol"
                        value={formData.currencySymbol}
                        onChange={handleInputChange}
                        className="form-control py-2 text-center"
                        placeholder="₹"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>

                    <div className="col-md-2">
                      <label className="form-label text-muted small fw-700">CURRENCY CODE</label>
                      <input
                        type="text"
                        name="currencyCode"
                        value={formData.currencyCode}
                        onChange={handleInputChange}
                        className="form-control py-2 text-uppercase text-center"
                        placeholder="INR"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: WHITELABEL & PORTAL TEXT */}
                {activeTab === 'whitelabel' && (
                  <div className="row g-3 animate-fade-in">
                    <div className="col-md-12">
                      <label className="form-label text-muted small fw-700">EXTERNAL BROKER PORTAL TITLE</label>
                      <input
                        type="text"
                        name="brokerPortalName"
                        value={formData.brokerPortalName}
                        onChange={handleInputChange}
                        className="form-control py-2"
                        placeholder="e.g. Partner Broker Portal"
                        style={{ borderRadius: '10px' }}
                      />
                      <small className="text-muted">Displayed on the Broker Dashboard landing hero header.</small>
                    </div>

                    <div className="col-12">
                      <label className="form-label text-muted small fw-700">HERO INTRO TITLE (PUBLIC CATALOG)</label>
                      <input
                        type="text"
                        name="heroTitle"
                        value={formData.heroTitle}
                        onChange={handleInputChange}
                        className="form-control py-2"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-muted small fw-700">HERO SUBTITLE DESCRIPTION</label>
                      <textarea
                        name="heroSubtitle"
                        value={formData.heroSubtitle}
                        onChange={handleInputChange}
                        rows="2"
                        className="form-control"
                        style={{ borderRadius: '10px' }}
                      ></textarea>
                    </div>

                    <div className="col-12">
                      <label className="form-label text-muted small fw-700">FOOTER COPYRIGHT & REGISTRATION TEXT</label>
                      <textarea
                        name="licenseText"
                        value={formData.licenseText}
                        onChange={handleInputChange}
                        rows="2"
                        className="form-control"
                        style={{ borderRadius: '10px' }}
                      ></textarea>
                    </div>
                  </div>
                )}

                {/* TAB 4: FEATURE TOGGLES */}
                {activeTab === 'features' && (
                  <div className="row g-3 animate-fade-in">
                    <div className="col-12">
                      <h6 className="fw-700 text-dark mb-3"><i className="bi bi-toggle-on me-1.5 text-primary"></i>System Functional Module Toggles</h6>
                      
                      <div className="list-group">
                        <label className="list-group-item d-flex justify-content-between align-items-center py-3 px-3 cursor-pointer">
                          <div>
                            <strong className="d-block text-dark">External Broker Portal Module</strong>
                            <small className="text-muted">Allow external channel partners and brokers to view categorized property listings.</small>
                          </div>
                          <div className="form-check form-switch fs-4">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={formData.featureToggles.brokerPortal}
                              onChange={() => handleToggleChange('brokerPortal')}
                            />
                          </div>
                        </label>

                        <label className="list-group-item d-flex justify-content-between align-items-center py-3 px-3 cursor-pointer">
                          <div>
                            <strong className="d-block text-dark">Lead Referral Tracker</strong>
                            <small className="text-muted">Enable lead submission, tracking inbox, and sales executive conversion workflows.</small>
                          </div>
                          <div className="form-check form-switch fs-4">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={formData.featureToggles.leadTracker}
                              onChange={() => handleToggleChange('leadTracker')}
                            />
                          </div>
                        </label>

                        <label className="list-group-item d-flex justify-content-between align-items-center py-3 px-3 cursor-pointer">
                          <div>
                            <strong className="d-block text-dark">360° Virtual VR Tour Player</strong>
                            <small className="text-muted">Display interactive 360° tour launchers on public and internal listing pages.</small>
                          </div>
                          <div className="form-check form-switch fs-4">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={formData.featureToggles.vr360}
                              onChange={() => handleToggleChange('vr360')}
                            />
                          </div>
                        </label>

                        <label className="list-group-item d-flex justify-content-between align-items-center py-3 px-3 cursor-pointer">
                          <div>
                            <strong className="d-block text-dark">WhatsApp Sharing Integration</strong>
                            <small className="text-muted">Provide one-click WhatsApp share buttons for brokers and public buyers.</small>
                          </div>
                          <div className="form-check form-switch fs-4">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={formData.featureToggles.whatsappShare}
                              onChange={() => handleToggleChange('whatsappShare')}
                            />
                          </div>
                        </label>

                        <label className="list-group-item d-flex justify-content-between align-items-center py-3 px-3 cursor-pointer">
                          <div>
                            <strong className="d-block text-dark">Public Catalog Landing Page</strong>
                            <small className="text-muted">Allow non-logged-in visitors to search properties at the main root URL.</small>
                          </div>
                          <div className="form-check form-switch fs-4">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={formData.featureToggles.publicLanding}
                              onChange={() => handleToggleChange('publicLanding')}
                            />
                          </div>
                        </label>
                      </div>

                    </div>
                  </div>
                )}

              </div>

              {/* Footer Buttons */}
              <div className="modal-footer border-top py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ backgroundColor: '#f8fafc' }}>
                <button type="button" className="btn btn-outline-danger fw-600 py-2 px-3" onClick={handleReset} style={{ borderRadius: '12px' }}>
                  <i className="bi bi-arrow-counterclockwise me-1"></i> Reset Defaults
                </button>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary px-4 py-2 fw-600" onClick={onClose} style={{ borderRadius: '12px' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning px-4 py-2 text-dark fw-800 shadow-sm" style={{ borderRadius: '12px' }}>
                    <i className="bi bi-check-circle-fill me-1.5"></i> Apply White-Label Settings
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default CustomizationModal;
