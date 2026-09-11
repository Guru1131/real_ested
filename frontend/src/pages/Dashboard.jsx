import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import PropertyCard from '../components/PropertyCard';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
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

          const pending = propertiesRes.data.filter(p => p.approval_status === 'pending_approval').length;
          const brokers = usersRes.data.filter(u => u.role === 'external_broker' && u.status === 'active').length;
          const staff = usersRes.data.filter(u => u.role !== 'external_broker').length;

          setStats({
            branchesCount: branchesRes.data.length,
            pendingApprovals: pending,
            activeBrokers: brokers,
            activeStaff: staff,
            leadsCount: leadsRes.data.length,
            propertiesCount: propertiesRes.data.length,
            draftCount: propertiesRes.data.filter(p => p.approval_status === 'draft').length
          });

          // Fetch recent activity logs of the first active broker if any exists
          const firstBroker = usersRes.data.find(u => u.role === 'external_broker');
          if (firstBroker) {
            const logsRes = await api.get(`/api/users/broker/${firstBroker.id}/logs`);
            setRecentLogs(logsRes.data.logs.slice(0, 5));
          }

        } else if (user.role === 'branch_admin') {
          const [propertiesRes, usersRes, leadsRes] = await Promise.all([
            api.get('/api/properties'),
            api.get('/api/users'),
            api.get('/api/leads')
          ]);

          setStats({
            propertiesCount: propertiesRes.data.length,
            draftCount: propertiesRes.data.filter(p => p.approval_status === 'draft').length,
            pendingApprovals: propertiesRes.data.filter(p => p.approval_status === 'pending_approval').length,
            activeBrokers: usersRes.data.filter(u => u.role === 'external_broker' && u.status === 'active').length,
            activeStaff: usersRes.data.filter(u => u.role === 'branch_executive' && u.status === 'active').length,
            leadsCount: leadsRes.data.length
          });

          // Get logs of first assigned broker
          const brokersList = usersRes.data.filter(u => u.role === 'external_broker');
          if (brokersList.length > 0) {
            const logsRes = await api.get(`/api/users/broker/${brokersList[0].id}/logs`);
            setRecentLogs(logsRes.data.logs.slice(0, 5));
          }

        } else if (user.role === 'branch_executive') {
          const [propertiesRes, leadsRes] = await Promise.all([
            api.get('/api/properties'),
            api.get('/api/leads')
          ]);

          setStats({
            propertiesCount: propertiesRes.data.length, // Only approved properties
            leadsCount: leadsRes.data.length, // Only leads assigned to them
          });

        } else if (user.role === 'external_broker') {
          const [propertiesRes, leadsRes] = await Promise.all([
            api.get('/api/properties'),
            api.get('/api/leads')
          ]);

          setProperties(propertiesRes.data); // Save listings for categorized grouping
          setStats({
            propertiesCount: propertiesRes.data.length, // Only assigned, approved properties
            leadsCount: leadsRes.data.length, // Only leads submitted by them
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
  // RENDER BROKER BEYONDWALLS-INSPIRED CATEGORIZED VIEW
  // ----------------------------------------------------
  if (user.role === 'external_broker') {
    // Dynamically partition properties into categories
    const residential = properties.filter(p => ['flat', 'villa', 'bungalow'].includes(p.property_type));
    const commercial = properties.filter(p => ['shop', 'office', 'commercial'].includes(p.property_type));
    const puneProperties = properties.filter(p => p.city.toLowerCase() === 'pune');
    const mumbaiProperties = properties.filter(p => p.city.toLowerCase() === 'mumbai');

    return (
      <div className="container-fluid py-2">
        {/* Header Hero */}
        <div className="glass-panel p-4 p-md-5 mb-4 animate-fade-in text-center text-md-start d-md-flex align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(59, 130, 246, 0.1) 100%)' }}>
          <div>
            <h2 className="fw-700 text-white mb-2">Welcome to BeyondWalls Broker Portal</h2>
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
            <h4 className="fw-700 text-white mb-0 fs-5 fs-md-4"><i className="bi bi-house-door text-primary me-2"></i>Premium Residential Launches</h4>
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
            <h4 className="fw-700 text-white mb-0 fs-5 fs-md-4"><i className="bi bi-briefcase text-info me-2"></i>Commercial complex & Retail Shops</h4>
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

        {/* Category 3: Geographic collections */}
        <div className="row mb-5">
          {/* Pune Collection */}
          <div className="col-md-6 mb-4 mb-md-0">
            <div className="glass-panel p-4 h-100">
              <h5 className="fw-700 text-white mb-3 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
                <i className="bi bi-geo-alt-fill text-danger me-2"></i>Projects in Pune
              </h5>
              {puneProperties.length === 0 ? (
                <div className="text-muted small">No Pune properties assigned to your account.</div>
              ) : (
                <div className="row row-cols-1 row-cols-sm-2 g-3">
                  {puneProperties.map(p => (
                    <div key={p.id} className="col">
                      <PropertyCard property={p} userRole={user.role} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mumbai Collection */}
          <div className="col-md-6">
            <div className="glass-panel p-4 h-100">
              <h5 className="fw-700 text-white mb-3 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
                <i className="bi bi-geo-alt-fill text-warning me-2"></i>Projects in Mumbai
              </h5>
              {mumbaiProperties.length === 0 ? (
                <div className="text-muted small">No Mumbai properties assigned to your account.</div>
              ) : (
                <div className="row row-cols-1 row-cols-sm-2 g-3">
                  {mumbaiProperties.map(p => (
                    <div key={p.id} className="col">
                      <PropertyCard property={p} userRole={user.role} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
          <h2 className="fw-700 text-white mb-1">Workspace Dashboard</h2>
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
                  <h3 className="fw-700 text-white mb-0">{stats.branchesCount}</h3>
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
                  <h3 className="fw-700 text-white mb-0">{stats.propertiesCount}</h3>
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

      {/* Admin Panel: Recent Broker logs */}
      {['super_admin', 'assistant_admin', 'branch_admin'].includes(user.role) && (
        <div className="row animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="col-12">
            <div className="glass-panel p-4">
              <h5 className="fw-600 text-white mb-3"><i className="bi bi-clock-history text-primary me-2"></i> Live Broker Activity Stream</h5>
              {recentLogs.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  <i className="bi bi-activity fs-2 d-block mb-2"></i> No recent broker activities recorded.
                </div>
              ) : (
                <div className="list-group list-group-flush bg-transparent">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="list-group-item bg-transparent text-light border-bottom border-secondary d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center py-3 px-1 gap-2">
                      <div className="d-flex align-items-center gap-3">
                        <div className="p-2 bg-dark bg-opacity-40 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                          <i className={`bi ${getLogIcon(log.activity_type)} fs-5`}></i>
                        </div>
                        <div>
                          <p className="mb-0 fw-500" style={{ wordBreak: 'break-word' }}>{formatLogText(log)}</p>
                          <small className="text-muted text-capitalize">Log ID: {log.id} | Type: {log.activity_type.replace(/_/g, ' ')}</small>
                        </div>
                      </div>
                      <span className="small text-muted flex-shrink-0 align-self-end align-self-sm-center">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  ))}
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
