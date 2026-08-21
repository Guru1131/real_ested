import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
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
    <nav className="navbar navbar-expand-lg border-bottom" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', padding: '12px 24px' }}>
      <div className="container-fluid d-flex justify-content-between align-items-center">
        
        {/* Left Side: Branch Scope Info */}
        <div className="d-flex align-items-center gap-2">
          {user.branch_name ? (
            <span className="badge bg-primary text-light px-3 py-2 font-weight-500 rounded-pill" style={{ letterSpacing: '0.5px' }}>
              <i className="bi bi-geo-alt-fill me-1"></i> {user.branch_name}
            </span>
          ) : (
            <span className="badge bg-secondary text-light px-3 py-2 font-weight-500 rounded-pill" style={{ letterSpacing: '0.5px' }}>
              <i className="bi bi-shield-fill-check me-1"></i> Global Scope
            </span>
          )}
        </div>

        {/* Right Side: Profile Info & Logout */}
        <div className="d-flex align-items-center gap-3">
          <div className="text-end d-none d-md-block">
            <h6 className="mb-0 text-light fw-600">{user.username}</h6>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>{roleLabels[user.role] || user.role}</small>
          </div>
          
          <div className="d-flex justify-content-center align-items-center bg-primary text-white rounded-circle fw-600" style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}>
            {initials}
          </div>

          <button 
            onClick={handleLogout} 
            className="btn btn-outline-danger btn-sm rounded-pill px-3"
            title="Log Out"
          >
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
