import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CustomizationContext } from '../context/CustomizationContext';
import api from '../services/api';
import AnnouncementManagerModal from './AnnouncementManagerModal';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const { config, toggleThemeMode } = useContext(CustomizationContext);
  const navigate = useNavigate();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!newPassword || newPassword.length < 4) {
      setPassError('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match.');
      return;
    }

    try {
      setPassLoading(true);
      await api.put(`/api/users/${user.id}`, { password: newPassword });
      setPassSuccess('Password updated successfully! Please use your new password next time you log in.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPassSuccess('');
      }, 2000);
    } catch (err) {
      setPassError(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setPassLoading(false);
    }
  };

  if (!user) return null;

  // Generate initials
  const initials = user.username ? user.username.slice(0, 2).toUpperCase() : 'US';

  // Human readable role mappings
  const roleLabels = {
    super_admin: 'Super Admin',
    assistant_admin: 'Assistant Admin',
    branch_admin: 'Branch Admin',
    branch_executive: 'Sales Executive',
    external_broker: 'External Broker'
  };

  const isDarkMode = config.themeMode === 'dark';

  return (
    <>
      <nav className="navbar navbar-expand-lg border-bottom sticky-top" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', padding: '12px 16px', zIndex: 1020 }}>
        <div className="container-fluid d-flex justify-content-between align-items-center flex-wrap gap-2">
          
          {/* Left Side: Hamburger toggle & Branch Scope Info */}
          <div className="d-flex align-items-center gap-2">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button 
              onClick={onToggleSidebar}
              className="btn btn-outline-secondary btn-sm d-lg-none me-1 px-2 py-1"
              aria-label="Toggle sidebar menu"
              title="Toggle Menu"
            >
              <i className="bi bi-list fs-4" style={{ lineHeight: 1 }}></i>
            </button>

            {user.branch_name ? (
              <span className="badge bg-primary text-white px-3 py-2 fw-600 rounded-pill shadow-sm" style={{ letterSpacing: '0.5px', fontSize: '0.8rem', backgroundColor: '#0284c7', color: '#ffffff' }}>
                <i className="bi bi-geo-alt-fill me-1"></i> {user.branch_name}
              </span>
            ) : (
              <span className="badge bg-primary text-white px-3 py-2 fw-600 rounded-pill shadow-sm" style={{ letterSpacing: '0.5px', fontSize: '0.8rem', backgroundColor: '#0284c7', color: '#ffffff' }}>
                <i className="bi bi-shield-fill-check me-1"></i> Global Scope
              </span>
            )}
          </div>

          {/* Right Side: Profile Info, Theme Toggle, Marquee Broadcast (Admin), Password Change & Logout */}
          <div className="d-flex align-items-center gap-2 gap-sm-3">
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleThemeMode}
              className={`btn btn-sm rounded-pill px-2.5 py-1 fw-600 border transition ${isDarkMode ? 'btn-outline-warning text-warning' : 'btn-outline-dark text-dark'}`}
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              style={{ fontSize: '0.8rem' }}
            >
              {isDarkMode ? <i className="bi bi-sun-fill me-1"></i> : <i className="bi bi-moon-stars-fill me-1"></i>}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            {['super_admin', 'assistant_admin'].includes(user.role) && (
              <button 
                onClick={() => setShowAnnouncementModal(true)}
                className="btn btn-warning text-dark btn-sm rounded-pill px-3 py-1 fw-600 shadow-sm"
                title="Super Admin Marquee Announcement Control Center"
                style={{ fontSize: '0.8rem' }}
              >
                <i className="bi bi-megaphone-fill me-1"></i> Broadcast
              </button>
            )}

            <div className="text-end d-none d-sm-block">
              <h6 className="mb-0 fw-700" style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user.username}</h6>
              <small className="text-muted d-block" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{roleLabels[user.role] || user.role}</small>
            </div>
            
            <div className="d-flex justify-content-center align-items-center bg-primary text-white rounded-circle fw-600" style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}>
              {initials}
            </div>

            <button 
              onClick={() => setShowPasswordModal(true)}
              className="btn btn-outline-secondary btn-sm rounded-pill px-2.5 py-1"
              title="Change Password"
              style={{ fontSize: '0.8rem', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            >
              <i className="bi bi-key-fill me-1"></i> Password
            </button>

            <button 
              onClick={handleLogout} 
              className="btn btn-outline-danger btn-sm rounded-pill px-2.5 py-1"
              title="Log Out"
              style={{ fontSize: '0.8rem' }}
            >
              <i className="bi bi-box-arrow-right me-1"></i> Logout
            </button>
          </div>

        </div>
      </nav>

      {/* Super Admin Marquee Announcement Control Modal */}
      <AnnouncementManagerModal 
        show={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
      />

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel text-light border-secondary">
              <div className="modal-header border-secondary">
                <h5 className="modal-title fw-700 text-white">
                  <i className="bi bi-shield-lock-fill text-warning me-2"></i>Change Account Password
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPasswordModal(false)}></button>
              </div>
              <form onSubmit={handlePasswordChangeSubmit}>
                <div className="modal-body">
                  <p className="text-muted small">Update your login security credentials. Changes take effect immediately.</p>
                  
                  {passError && (
                    <div className="alert alert-danger p-2 small mb-3">
                      <i className="bi bi-exclamation-circle me-1"></i>{passError}
                    </div>
                  )}
                  {passSuccess && (
                    <div className="alert alert-success p-2 small mb-3">
                      <i className="bi bi-check-circle me-1"></i>{passSuccess}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label text-white small fw-600">NEW PASSWORD</label>
                    <input 
                      type="password" 
                      className="form-control form-premium-control"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-white small fw-600">CONFIRM NEW PASSWORD</label>
                    <input 
                      type="password" 
                      className="form-control form-premium-control"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-secondary">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-warning text-dark fw-600 btn-sm" disabled={passLoading}>
                    {passLoading ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
