import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CustomizationContext } from '../context/CustomizationContext';
import api from '../services/api';
import PropertyCard from '../components/PropertyCard';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { config } = useContext(CustomizationContext);
  const navigate = useNavigate();

  const brokerPortalTitle = config?.brokerPortalName || `Welcome to ${config?.brandName || 'PROP-MANAGER'} Partner Portal`;

  const [stats, setStats] = useState({
    branchesCount: 0,
    pendingApprovals: 0,
    activeBrokers: 0,
    activeStaff: 0,
    leadsCount: 0,
    propertiesCount: 0,
    draftCount: 0,
  });
  const [properties, setProperties] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [recentProperties, setRecentProperties] = useState([]);
  const [propertyTypeStats, setPropertyTypeStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch data based on role to compute dashboard counts and retrieve listings
        if (['super_admin', 'assistant_admin'].includes(user.role)) {
          const [branchesRes, propertiesRes, usersRes, leadsRes] = await Promise.all([
            api.get('/api/branches'),
            api.get('/api/properties'),
            api.get('/api/users'),
            api.get('/api/leads')
          ]);

          const propertiesData = Array.isArray(propertiesRes.data) ? propertiesRes.data : [];
          const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
          const branchesData = Array.isArray(branchesRes.data) ? branchesRes.data : [];
          const leadsData = Array.isArray(leadsRes.data) ? leadsRes.data : [];

          const pending = propertiesData.filter(p => p.approval_status === 'pending_approval').length;
          const brokers = usersData.filter(u => u.role === 'external_broker' && u.status === 'active').length;
          const staff = usersData.filter(u => u.role !== 'external_broker').length;

          setStats({
            branchesCount: branchesData.length,
            pendingApprovals: pending,
            activeBrokers: brokers,
            activeStaff: staff,
            leadsCount: leadsData.length,
            propertiesCount: propertiesData.length,
            draftCount: propertiesData.filter(p => p.approval_status === 'draft').length
          });

          const typeCounts = {};
          propertiesData.forEach(p => {
            const type = p.property_type || 'other';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
          });
          setPropertyTypeStats(typeCounts);

          setRecentLeads(leadsData.slice(0, 5));
          setRecentProperties(propertiesData.slice(0, 5));

          // Fetch recent activity logs of the first active broker if any exists
          const firstBroker = usersData.find(u => u.role === 'external_broker');
          if (firstBroker) {
            const logsRes = await api.get(`/api/users/broker/${firstBroker.id}/logs`);
            setRecentLogs(Array.isArray(logsRes.data?.logs) ? logsRes.data.logs.slice(0, 5) : []);
          }

        } else if (user.role === 'branch_admin') {
          const [propertiesRes, usersRes, leadsRes] = await Promise.all([
            api.get('/api/properties'),
            api.get('/api/users'),
            api.get('/api/leads')
          ]);

          const propertiesData = Array.isArray(propertiesRes.data) ? propertiesRes.data : [];
          const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
          const leadsData = Array.isArray(leadsRes.data) ? leadsRes.data : [];

          setStats({
            propertiesCount: propertiesData.length,
            draftCount: propertiesData.filter(p => p.approval_status === 'draft').length,
            pendingApprovals: propertiesData.filter(p => p.approval_status === 'pending_approval').length,
            activeBrokers: usersData.filter(u => u.role === 'external_broker' && u.status === 'active').length,
            activeStaff: usersData.filter(u => u.role === 'branch_executive' && u.status === 'active').length,
            leadsCount: leadsData.length
          });

          const typeCounts = {};
          propertiesData.forEach(p => {
            const type = p.property_type || 'other';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
          });
          setPropertyTypeStats(typeCounts);

          setRecentLeads(leadsData.slice(0, 5));
          setRecentProperties(propertiesData.slice(0, 5));

          // Get logs of first assigned broker
          const brokersList = usersData.filter(u => u.role === 'external_broker');
          if (brokersList.length > 0) {
            const logsRes = await api.get(`/api/users/broker/${brokersList[0].id}/logs`);
            setRecentLogs(Array.isArray(logsRes.data?.logs) ? logsRes.data.logs.slice(0, 5) : []);
          }

        } else if (user.role === 'branch_executive') {
          const [propertiesRes, leadsRes] = await Promise.all([
            api.get('/api/properties'),
            api.get('/api/leads')
          ]);

          const propertiesData = Array.isArray(propertiesRes.data) ? propertiesRes.data : [];
          const leadsData = Array.isArray(leadsRes.data) ? leadsRes.data : [];

          setStats({
            propertiesCount: propertiesData.length, // Only approved properties
            leadsCount: leadsData.length, // Only leads assigned to them
          });

        } else if (user.role === 'external_broker') {
          const [propertiesRes, leadsRes] = await Promise.all([
            api.get('/api/properties'),
            api.get('/api/leads')
          ]);

          const propertiesData = Array.isArray(propertiesRes.data) ? propertiesRes.data : [];
          const leadsData = Array.isArray(leadsRes.data) ? leadsRes.data : [];

          setProperties(propertiesData); // Save listings for categorized grouping
          setStats({
            propertiesCount: propertiesData.length, // Only assigned, approved properties
            leadsCount: leadsData.length, // Only leads submitted by them
          });
        }

      } catch (error) {
        console.error('Error fetching dashboard statistics', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const roleLabels = {
    super_admin: 'Super Admin',
    assistant_admin: 'Assistant Admin',
    branch_admin: 'Branch Admin',
    branch_executive: 'Sales Executive',
    external_broker: 'External Broker'
  };

  const getLogIcon = (type) => {
    switch(type) {
      case 'login': return 'bi-box-arrow-in-right text-success';
      case 'property_view': return 'bi-eye-fill text-info';
      case 'property_share_whatsapp': return 'bi-whatsapp text-success';
      case 'property_share_email': return 'bi-envelope-fill text-primary';
      case 'lead_submission': return 'bi-person-plus-fill text-warning';
      default: return 'bi-info-circle text-secondary';
    }
  };

  const formatLogText = (log) => {
    const meta = log.metadata || {};
    switch(log.activity_type) {
      case 'login': return `Logged in from IP: ${meta.ip || '127.0.0.1'}`;
      case 'property_view': return `Viewed details for property: ${log.project_name || 'N/A'}`;
      case 'property_share_whatsapp': return `Shared ${log.project_name || 'N/A'} via WhatsApp to: ${meta.recipient || 'N/A'}`;
      case 'property_share_email': return `Shared ${log.project_name || 'N/A'} via Email to: ${meta.recipient || 'N/A'}`;
      case 'lead_submission': return `Submitted lead for client: ${meta.lead_name || 'N/A'}`;
      default: return 'Performed unknown activity';
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-50 text-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER BROKER CATEGORIZED VIEW
  // ----------------------------------------------------
  if (user.role === 'external_broker') {
    // Dynamically partition properties into categories
    const residential = properties.filter(p => ['flat', 'villa', 'bungalow', 'apartment', 'residential'].includes((p.property_type || '').toLowerCase()));
    const commercial = properties.filter(p => ['shop', 'office', 'commercial', 'retail', 'complex'].includes((p.property_type || '').toLowerCase()));
    
    // Group properties by City dynamically
    const cityGroups = {};
    properties.forEach(p => {
      let rawCity = (p.city || p.branch_name || 'Other Regions').trim();
      if (!rawCity) rawCity = 'Other Regions';
      const formattedCity = rawCity.charAt(0).toUpperCase() + rawCity.slice(1);
      if (!cityGroups[formattedCity]) {
        cityGroups[formattedCity] = [];
      }
      cityGroups[formattedCity].push(p);
    });
    const cityList = Object.keys(cityGroups);

    return (
      <div className="container-fluid py-2">
        {/* Header Hero */}
        <div className="glass-panel p-4 p-md-5 mb-4 animate-fade-in text-center text-md-start d-md-flex align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(59, 130, 246, 0.1) 100%)' }}>
          <div>
            <h2 className="fw-700 mb-2">{brokerPortalTitle}</h2>
            <p className="text-muted mb-0">Search premium projects, download PDF brochures, share listings, and submit leads directly to developers.</p>
            <div className="mt-3 d-flex flex-wrap gap-2 gap-sm-3 justify-content-center justify-content-md-start">
              <span className="badge bg-secondary text-light rounded-pill px-3 py-1.5 small"><i className="bi bi-person-circle"></i> Broker: {user.username}</span>
              <span className="badge bg-success text-dark rounded-pill px-3 py-1.5 small"><i className="bi bi-check-circle-fill"></i> Status: Active Partner</span>
            </div>
          </div>
          <div className="mt-4 mt-md-0 d-flex flex-wrap gap-2 justify-content-center justify-content-md-end">
            <Link to="/properties" className="btn btn-premium px-4 py-2.5"><i className="bi bi-search"></i> Search Catalog</Link>
            <Link to="/leads" className="btn btn-premium-outline px-4 py-2.5"><i className="bi bi-funnel"></i> My Referrals ({stats.leadsCount})</Link>
          </div>
        </div>

        {/* Categories Section */}
        
        {/* Category 1: Residential Launches */}
        <div className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-700 mb-0 fs-5 fs-md-4"><i className="bi bi-house-door text-primary me-2"></i>Premium Residential Launches</h4>
            <span className="text-muted small">{residential.length} Projects</span>
          </div>
          {residential.length === 0 ? (
            <div className="text-muted small p-4 bg-dark bg-opacity-20 rounded border border-secondary border-opacity-10">No residential projects available in your assigned branch scope.</div>
          ) : (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
              {residential.map(p => (
                <div key={p.id} className="col">
                  <PropertyCard property={p} userRole={user.role} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category 2: Commercial Projects */}
        <div className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-700  mb-0 fs-5 fs-md-4"><i className="bi bi-briefcase text-info me-2"></i>Commercial complex & Retail Shops</h4>
            <span className="text-muted small">{commercial.length} Projects</span>
          </div>
          {commercial.length === 0 ? (
            <div className="text-muted small p-4 bg-dark bg-opacity-20 rounded border border-secondary border-opacity-10">No commercial properties listed yet.</div>
          ) : (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
              {commercial.map(p => (
                <div key={p.id} className="col">
                  <PropertyCard property={p} userRole={user.role} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category 3: Geographic collections (Dynamic Cities) */}
        <div className="mb-5">
          <h4 className="fw-700 mb-3 fs-5 fs-md-4 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
            <i className="bi bi-geo-alt-fill text-danger me-2"></i>Projects by Location & City Market
          </h4>
          
          {cityList.length === 0 ? (
            <div className="text-muted small p-4 bg-dark bg-opacity-20 rounded border border-secondary border-opacity-10">
              No city-partitioned properties assigned to your account yet.
            </div>
          ) : (
            <div className="row g-4">
              {cityList.map(cityName => (
                <div key={cityName} className="col-12 col-md-6">
                  <div className="glass-panel p-4 h-100">
                    <h5 className="fw-700 mb-3 border-bottom pb-2 d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--border-color)' }}>
                      <span><i className="bi bi-pin-map-fill text-warning me-2"></i>Projects in {cityName}</span>
                      <span className="badge bg-secondary text-light rounded-pill small">{cityGroups[cityName].length} Listings</span>
                    </h5>
                    <div className="row row-cols-1 row-cols-sm-2 g-3">
                      {cityGroups[cityName].map(p => (
                        <div key={p.id} className="col">
                          <PropertyCard property={p} userRole={user.role} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    );
  }

  // ----------------------------------------------------
  // STANDARD ADMIN / STAFF DASHBOARD RENDER
  // ----------------------------------------------------
  return (
    <div className="container-fluid py-2">
      {/* Header Banner */}
      <div className="glass-panel p-4 mb-4 animate-fade-in d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-700  mb-1">Workspace Dashboard</h2>
          <p className="text-muted mb-0">Welcome back, <strong>{user.username}</strong>. You are logged in as a <strong>{roleLabels[user.role]}</strong>.</p>
        </div>
        <span className="text-muted d-none d-md-block small"><i className="bi bi-clock-fill"></i> Session: Active</span>
      </div>

      {/* Grid of operational metrics */}
      <div className="row g-4 mb-4">
        
        {/* Render for Super Admins / Assistant Admins */}
        {['super_admin', 'assistant_admin'].includes(user.role) && (
          <>
            <div className="col-12 col-sm-6 col-lg-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="glass-panel p-4 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="text-muted small fw-600 mb-1">TOTAL BRANCHES</h6>
                  <h3 className="fw-700  mb-0">{stats.branchesCount}</h3>
                  <Link to="/branches" className="small text-primary text-decoration-none mt-2 d-block">Manage branches <i className="bi bi-arrow-right"></i></Link>
                </div>
                <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle"><i className="bi bi-diagram-3 fs-3"></i></div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="glass-panel p-4 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="text-muted small fw-600 mb-1">PENDING APPROVALS</h6>
                  <h3 className="fw-700 text-warning mb-0">{stats.pendingApprovals}</h3>
                  <Link to="/approvals" className="small text-warning text-decoration-none mt-2 d-block">Review queue <i className="bi bi-arrow-right"></i></Link>
                </div>
                <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-circle"><i className="bi bi-check-circle fs-3"></i></div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="glass-panel p-4 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="text-muted small fw-600 mb-1">ACTIVE BROKERS</h6>
                  <h3 className="fw-700 text-info mb-0">{stats.activeBrokers}</h3>
                  <Link to="/brokers" className="small text-info text-decoration-none mt-2 d-block">Manage brokers <i className="bi bi-arrow-right"></i></Link>
                </div>
                <div className="p-3 bg-info bg-opacity-10 text-info rounded-circle"><i className="bi bi-person-badge fs-3"></i></div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="glass-panel p-4 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="text-muted small fw-600 mb-1">TOTAL LEADS</h6>
                  <h3 className="fw-700 text-success mb-0">{stats.leadsCount}</h3>
                  <Link to="/leads" className="small text-success text-decoration-none mt-2 d-block">View tracking board <i className="bi bi-arrow-right"></i></Link>
                </div>
                <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle"><i className="bi bi-funnel fs-3"></i></div>
              </div>
            </div>
          </>
        )}

        {/* Render for Branch Admins */}
        {user.role === 'branch_admin' && (
          <>
            <div className="col-12 col-sm-6 col-md-4 animate-fade-in">
              <div className="glass-panel p-4 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="text-muted small fw-600 mb-1">BRANCH PROPERTIES</h6>
                  <h3 className="fw-700  mb-0">{stats.propertiesCount}</h3>
                  <Link to="/properties" className="small text-primary text-decoration-none mt-2 d-block">Browse catalog <i className="bi bi-arrow-right"></i></Link>
                </div>
                <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle"><i className="bi bi-building fs-3"></i></div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-4 animate-fade-in">
              <div className="glass-panel p-4 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="text-muted small fw-600 mb-1">DRAFT / REVIEW LISTINGS</h6>
                  <h3 className="fw-700 text-warning mb-0">{stats.draftCount + stats.pendingApprovals}</h3>
                  <span className="small text-muted mt-2 d-block">Drafts: {stats.draftCount} | Pending: {stats.pendingApprovals}</span>
                </div>
                <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-circle"><i className="bi bi-pencil-square fs-3"></i></div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-4 animate-fade-in">
              <div className="glass-panel p-4 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="text-muted small fw-600 mb-1">BRANCH LEADS</h6>
                  <h3 className="fw-700 text-success mb-0">{stats.leadsCount}</h3>
                  <Link to="/leads" className="small text-success text-decoration-none mt-2 d-block">Leads inbox <i className="bi bi-arrow-right"></i></Link>
                </div>
                <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle"><i className="bi bi-envelope-check fs-3"></i></div>
              </div>
            </div>
          </>
        )}

        {/* Render for Sales Executives */}
        {user.role === 'branch_executive' && (
          <>
            <div className="col-12 col-md-6 animate-fade-in">
              <div className="glass-panel p-4 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="text-muted small fw-600 mb-1">AVAILABLE PROPERTIES</h6>
                  <h3 className="fw-700 text-info mb-0">{stats.propertiesCount}</h3>
                  <p className="text-muted small mb-0 mt-2">Approved properties eligible for client matching.</p>
                  <Link to="/properties" className="btn btn-premium btn-sm mt-3 px-4 py-2">
                    <i className="bi bi-search"></i> Search Properties
                  </Link>
                </div>
                <div className="p-4 bg-info bg-opacity-10 text-info rounded-circle"><i className="bi bi-building fs-1"></i></div>
              </div>
            </div>

            <div className="col-12 col-md-6 animate-fade-in">
              <div className="glass-panel p-4 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="text-muted small fw-600 mb-1">MY ASSIGNED LEADS</h6>
                  <h3 className="fw-700 text-success mb-0">{stats.leadsCount}</h3>
                  <p className="text-muted small mb-0 mt-2">Referrals currently routed for active sales conversion.</p>
                  <Link to="/leads" className="btn btn-premium-outline btn-sm mt-3 px-4 py-2">
                    <i className="bi bi-funnel"></i> Track Lead Status
                  </Link>
                </div>
                <div className="p-4 bg-success bg-opacity-10 text-success rounded-circle"><i className="bi bi-funnel fs-1"></i></div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Admin Panel: Property Portfolio Type Breakdown */}
      {['super_admin', 'assistant_admin', 'branch_admin'].includes(user.role) && Object.keys(propertyTypeStats).length > 0 && (
        <div className="glass-panel p-4 mb-4 animate-fade-in" style={{ animationDelay: '0.45s' }}>
          <h5 className="fw-600 mb-3" style={{ color: 'var(--text-primary)' }}><i className="bi bi-pie-chart text-primary me-2"></i> Portfolio Distribution</h5>
          <div className="d-flex flex-wrap gap-3">
            {Object.entries(propertyTypeStats).map(([type, count]) => {
              const formattedType = type.charAt(0).toUpperCase() + type.slice(1);
              let icon = "bi-building";
              if(type === 'flat' || type === 'villa' || type === 'bungalow') icon = "bi-house-door";
              if(type === 'commercial' || type === 'shop' || type === 'office') icon = "bi-briefcase";

              return (
                <div key={type} className="d-flex align-items-center border border-secondary border-opacity-25 rounded-pill px-3 py-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle me-2 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                    <i className={`bi ${icon}`}></i>
                  </div>
                  <div>
                    <div className="small fw-700 lh-1 mb-1" style={{ color: 'var(--text-primary)' }}>{formattedType}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', lineHeight: '1' }}>{count} Properties</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin Panel: Recent Properties & Leads */}
      {['super_admin', 'assistant_admin', 'branch_admin'].includes(user.role) && (
        <div className="row g-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          
          <div className="col-12 col-lg-6">
            <div className="glass-panel p-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-600  mb-0"><i className="bi bi-building-add text-primary me-2"></i> Recently Added Properties</h5>
                <Link to="/properties" className="btn btn-sm btn-outline-primary py-1 px-2 small">View All</Link>
              </div>
              
              {recentProperties.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  <i className="bi bi-buildings fs-2 d-block mb-2"></i> No properties added recently.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-borderless table-hover align-middle text-light mb-0">
                    <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <tr className="small text-muted">
                        <th>Property</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProperties.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="flex-shrink-0" style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'var(--bg-tertiary)' }}>
                                {p.image_url ? (
                                  <img src={p.image_url.startsWith('http') ? p.image_url : `http://localhost:5000${p.image_url}`} alt={p.project_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <i className="bi bi-image text-muted d-flex justify-content-center align-items-center h-100"></i>
                                )}
                              </div>
                              <div>
                                <span className="d-block fw-600 small">{p.project_name}</span>
                                <span className="small text-muted" style={{ fontSize: '0.75rem' }}>{p.location}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${p.approval_status === 'approved' ? 'bg-success' : p.approval_status === 'pending_approval' ? 'bg-warning text-dark' : 'bg-secondary'} rounded-pill`} style={{ fontSize: '0.7rem' }}>
                              {p.approval_status ? p.approval_status.replace('_', ' ') : 'Draft'}
                            </span>
                          </td>
                          <td className="small text-muted" style={{ fontSize: '0.8rem' }}>
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="glass-panel p-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-600  mb-0"><i className="bi bi-person-lines-fill text-success me-2"></i> Recent Client Leads</h5>
                <Link to="/leads" className="btn btn-sm btn-outline-success py-1 px-2 small">View All</Link>
              </div>

              {recentLeads.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  <i className="bi bi-inbox fs-2 d-block mb-2"></i> No new leads recorded.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-borderless table-hover align-middle text-light mb-0">
                    <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <tr className="small text-muted">
                        <th>Client</th>
                        <th>Project Interest</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLeads.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td>
                            <div>
                              <span className="d-block fw-600 small">{l.client_name}</span>
                              <span className="small text-muted" style={{ fontSize: '0.75rem' }}>{l.client_phone}</span>
                            </div>
                          </td>
                          <td className="small text-truncate" style={{ maxWidth: '120px' }}>
                            {l.project_name || 'General Inquiry'}
                          </td>
                          <td>
                            <span className={`badge ${l.status === 'new' ? 'bg-primary' : l.status === 'contacted' ? 'bg-info' : l.status === 'converted' ? 'bg-success' : 'bg-secondary'} rounded-pill`} style={{ fontSize: '0.7rem' }}>
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Dashboard;
