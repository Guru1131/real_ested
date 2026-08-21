import React, { useState, useContext, useEffect } from 'react';
import { CustomizationContext } from '../context/CustomizationContext';

const CustomizationModal = ({ show, onClose }) => {
  const { config, updateConfig, resetConfig } = useContext(CustomizationContext);

  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    brandName: '',
    primaryColor: '',
    accentColor: '',
    accentColorSecondary: '',
    heroTitle: '',
    heroSubtitle: '',
    licenseText: '',
    headerStyle: 'standard'
  });

  // Load configuration values into local state on opening
  useEffect(() => {
    if (show) {
      setFormData({
        brandName: config.brandName,
        primaryColor: config.primaryColor,
        accentColor: config.accentColor,
        accentColorSecondary: config.accentColorSecondary,
        heroTitle: config.heroTitle,
        heroSubtitle: config.heroSubtitle,
        licenseText: config.licenseText,
        headerStyle: config.headerStyle || 'standard'
      });
      // Reset authentication states when modal closes/re-opens
      setIsAuthenticated(false);
      setPasscode('');
      setAuthError('');
    }
  }, [show, config]);

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (passcode === 'admin123') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid admin passcode. Access denied.');
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateConfig(formData);
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('Reset customization settings to default Slate & Gold theme values?')) {
      resetConfig();
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', zIndex: 1060, backdropFilter: 'blur(8px)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '24px', backgroundColor: '#ffffff' }}>
          
          <div className="modal-header border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
            <h5 className="modal-title fw-800 text-dark d-flex align-items-center gap-2">
              <i className="bi bi-gear-fill text-warning"></i> Admin Customization Panel
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>

          {!isAuthenticated ? (
            /* Passcode Verification screen */
            <form onSubmit={handleAuthSubmit}>
              <div className="modal-body p-4 text-center">
                <i className="bi bi-shield-lock-fill text-warning display-4 mb-3 d-block"></i>
                <h5 className="fw-700 text-dark mb-2">Access Authentication Required</h5>
                <p className="text-muted small mb-4">Enter the administrative passcode to customize layout, branding, and color settings.</p>
                
                {authError && (
                  <div className="alert alert-danger py-2 mb-3 small" style={{ borderRadius: '10px' }}>
                    <i className="bi bi-exclamation-triangle-fill me-1.5"></i> {authError}
                  </div>
                )}

                <div className="mx-auto" style={{ maxWidth: '320px' }}>
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter admin passcode"
                    className="form-control text-center py-2.5 fw-600 mb-3"
                    style={{ borderRadius: '12px', letterSpacing: '2px' }}
                    required
                    autoFocus
                  />
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary w-50 py-2" onClick={onClose} style={{ borderRadius: '12px' }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-warning w-50 py-2 text-white fw-600" style={{ borderRadius: '12px' }}>
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* Customization controls screen */
            <form onSubmit={handleSave}>
              <div className="modal-body p-4 overflow-auto" style={{ maxHeight: '70vh' }}>
                <div className="row g-4">
                  {/* Branding Group */}
                  <div className="col-12 border-bottom pb-3">
                    <h6 className="fw-700 text-dark mb-3"><i className="bi bi-tag-fill me-1.5 text-warning"></i>Branding Setup</h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label text-muted small fw-600">PORTAL / BRAND LOGO TEXT</label>
                        <input
                          type="text"
                          name="brandName"
                          value={formData.brandName}
                          onChange={handleInputChange}
                          className="form-control"
                          style={{ borderRadius: '10px' }}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small fw-600">HEADER STYLING MODE</label>
                        <select
                          name="headerStyle"
                          value={formData.headerStyle}
                          onChange={handleInputChange}
                          className="form-select"
                          style={{ borderRadius: '10px' }}
                        >
                          <option value="standard">Opaque Solid Header</option>
                          <option value="glass">Glassmorphic Blurred Header</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Colors Group */}
                  <div className="col-12 border-bottom pb-3">
                    <h6 className="fw-700 text-dark mb-3"><i className="bi bi-palette-fill me-1.5 text-warning"></i>Color Theme Customizer</h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label text-muted small fw-600 d-block">PRIMARY BRAND COLOR</label>
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="color"
                            name="primaryColor"
                            value={formData.primaryColor}
                            onChange={handleInputChange}
                            className="form-control form-control-color"
                            style={{ border: 'none', padding: '0px', width: '42px', height: '42px' }}
                          />
                          <input
                            type="text"
                            name="primaryColor"
                            value={formData.primaryColor}
                            onChange={handleInputChange}
                            className="form-control py-1 px-2.5 small text-uppercase"
                            style={{ borderRadius: '8px', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label text-muted small fw-600 d-block">ACCENT HIGHLIGHT (PRIMARY)</label>
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="color"
                            name="accentColor"
                            value={formData.accentColor}
                            onChange={handleInputChange}
                            className="form-control form-control-color"
                            style={{ border: 'none', padding: '0px', width: '42px', height: '42px' }}
                          />
                          <input
                            type="text"
                            name="accentColor"
                            value={formData.accentColor}
                            onChange={handleInputChange}
                            className="form-control py-1 px-2.5 small text-uppercase"
                            style={{ borderRadius: '8px', fontSize: '0.85rem' }}
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
                            className="form-control form-control-color"
                            style={{ border: 'none', padding: '0px', width: '42px', height: '42px' }}
                          />
                          <input
                            type="text"
                            name="accentColorSecondary"
                            value={formData.accentColorSecondary}
                            onChange={handleInputChange}
                            className="form-control py-1 px-2.5 small text-uppercase"
                            style={{ borderRadius: '8px', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Landing Curation texts Group */}
                  <div className="col-12 border-bottom pb-3">
                    <h6 className="fw-700 text-dark mb-3"><i className="bi bi-file-earmark-slides-fill me-1.5 text-warning"></i>Hero Curation Info</h6>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label text-muted small fw-600">HERO INTRO TITLE</label>
                        <input
                          type="text"
                          name="heroTitle"
                          value={formData.heroTitle}
                          onChange={handleInputChange}
                          className="form-control"
                          style={{ borderRadius: '10px' }}
                          required
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label text-muted small fw-600">HERO SUBTITLE DESCRIPTIONS</label>
                        <textarea
                          name="heroSubtitle"
                          value={formData.heroSubtitle}
                          onChange={handleInputChange}
                          rows="2"
                          className="form-control"
                          style={{ borderRadius: '10px' }}
                          required
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  {/* Footers Group */}
                  <div className="col-12">
                    <h6 className="fw-700 text-dark mb-3"><i className="bi bi-file-break-fill me-1.5 text-warning"></i>Footer & License</h6>
                    <div>
                      <label className="form-label text-muted small fw-600">FOOTER LICENSE / REGISTRATION / COPYRIGHT TEXT</label>
                      <textarea
                        name="licenseText"
                        value={formData.licenseText}
                        onChange={handleInputChange}
                        rows="2"
                        className="form-control"
                        style={{ borderRadius: '10px' }}
                        required
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top py-3 px-4 d-flex gap-2">
                <button type="button" className="btn btn-outline-danger me-auto fw-600 py-2.5" onClick={handleReset} style={{ borderRadius: '12px' }}>
                  Reset Defaults
                </button>
                <button type="button" className="btn btn-outline-secondary px-4 py-2.5 fw-600" onClick={onClose} style={{ borderRadius: '12px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning px-5 py-2.5 text-white fw-700" style={{ borderRadius: '12px' }}>
                  Save and Apply Changes
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default CustomizationModal;
