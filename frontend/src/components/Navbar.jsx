import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  return (
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
            <span className="badge bg-primary text-light px-3 py-2 font-weight-500 rounded-pill" style={{ letterSpacing: '0.5px', fontSize: '0.8rem' }}>
              <i className="bi bi-geo-alt-fill me-1"></i> {user.branch_name}
            </span>
          ) : (
            <span className="badge bg-secondary text-light px-3 py-2 font-weight-500 rounded-pill" style={{ letterSpacing: '0.5px', fontSize: '0.8rem' }}>
              <i className="bi bi-shield-fill-check me-1"></i> Global Scope
            </span>
          )}
        </div>

        {/* Right Side: Profile Info & Logout */}
        <div className="d-flex align-items-center gap-2 gap-sm-3">
          <div className="text-end d-none d-sm-block">
            <h6 className="mb-0 text-light fw-600" style={{ fontSize: '0.9rem' }}>{user.username}</h6>
            <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>{roleLabels[user.role] || user.role}</small>
          </div>
          
          <div className="d-flex justify-content-center align-items-center bg-primary text-white rounded-circle fw-600" style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}>
            {initials}
          </div>

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
  );
};

export default Navbar;

