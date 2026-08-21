import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  return (
    <div className="sidebar d-flex flex-column justify-content-between">
      <div>
        {/* Brand/Header */}
        <div className="px-3 mb-4 d-flex align-items-center gap-2">
          <i className="bi bi-building-fill text-primary" style={{ fontSize: '1.75rem' }}></i>
          <span className="sidebar-brand">PROP-MANAGER</span>
        </div>
        
        {/* Navigation Links */}
        <div className="nav flex-column">
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-speedometer2"></i> Dashboard
          </NavLink>

          <NavLink to="/properties" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-search"></i> Search Properties
          </NavLink>

          {/* Super Admin only: Approvals */}
          {user.role === 'super_admin' && (
            <NavLink to="/approvals" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <i className="bi bi-check-circle"></i> Approvals Queue
            </NavLink>
          )}

          {/* Super Admin only: Branch CRUD */}
          {user.role === 'super_admin' && (
            <NavLink to="/branches" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <i className="bi bi-diagram-3"></i> Branches
            </NavLink>
          )}

          {/* Admin roles: Staff Directory */}
          {['super_admin', 'assistant_admin', 'branch_admin'].includes(user.role) && (
            <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <i className="bi bi-people"></i> Staff Directory
            </NavLink>
          )}

          {/* Admin roles: Broker Control */}
          {['super_admin', 'assistant_admin', 'branch_admin'].includes(user.role) && (
            <NavLink to="/brokers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <i className="bi bi-person-badge"></i> Brokers Control
            </NavLink>
          )}

          {/* Leads: All roles (content filtered per role) */}
          <NavLink to="/leads" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-funnel"></i> Lead Referral Tracker
          </NavLink>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-3 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
        <div className="d-flex align-items-center gap-2 text-muted">
          <i className="bi bi-info-circle"></i>
          <span style={{ fontSize: '0.8rem' }}>Enterprise System v1.0</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
