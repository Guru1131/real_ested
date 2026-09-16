import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { generateQRCodeSVG } from '../utils/qrHelper';

const LeadList = () => {
  const { user } = useContext(AuthContext);
  
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [qrModalLead, setQrModalLead] = useState(null);
  const [verifySearch, setVerifySearch] = useState('');

  const fetchLeads = async (status = statusFilter) => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams();
      if (status) {
        queryParams.append('status', status);
      }
      
      const res = await api.get(`/api/leads?${queryParams.toString()}`);
      setLeads(res.data);
    } catch (err) {
      setError('Failed to fetch leads records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [user]);

  const handleStatusChange = async (leadId, newStatus) => {
    setError('');
    setSuccess('');
    try {
      try {
        await api.put(`/api/leads/${leadId}/status`, { status: newStatus });
      } catch (e1) {
        await api.post(`/api/leads/update.php?id=${leadId}`, { status: newStatus });
      }
      setSuccess('Lead pipeline status updated successfully.');
      fetchLeads();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update lead status.');
    }
  };

  const statusBadges = {
    new: 'badge bg-primary text-light',
    in_progress: 'badge bg-warning text-dark',
    converted: 'badge bg-success text-light',
    closed: 'badge bg-secondary text-light'
  };

  const statusLabels = {
    new: 'New Inquiry',
    in_progress: 'Site Visit / Active',
    converted: 'Token / Converted',
    closed: 'Closed / Settled'
  };

  // Filter leads based on QR / Phone / Search string
  const filteredLeads = leads.filter(l => {
    if (!verifySearch) return true;
    const term = verifySearch.toLowerCase().trim();
    const refCode = `ref-lead-${l.id}`.toLowerCase();
    const code = (l.property_code || '').toLowerCase();
    const name = (l.lead_name || '').toLowerCase();
    const phone = (l.lead_phone || '').toLowerCase();
    return refCode.includes(term) || code.includes(term) || name.includes(term) || phone.includes(term);
  });

  // Calculate Commission Metrics (2% estimated payout per deal assuming average ~₹75 Lakhs value)
  const convertedLeads = leads.filter(l => l.status === 'converted');
  const inProgressLeads = leads.filter(l => l.status === 'in_progress');
  const estEarnedCommission = convertedLeads.length * 150000; // ~₹1.5 L per conversion
  const estPipelineCommission = inProgressLeads.length * 150000;

  const columns = [
    { key: 'new', label: '🆕 New Referrals', color: 'border-primary' },
    { key: 'in_progress', label: '📅 Site Visit / In Progress', color: 'border-warning' },
    { key: 'converted', label: '🎉 Token Paid / Converted', color: 'border-success' },
    { key: 'closed', label: '✅ Closed / Settled', color: 'border-secondary' }
  ];

  return (
    <div className="container-fluid py-2 animate-fade-in">
      {/* Header */}
      <div className="glass-panel p-4 mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2 className="fw-700 mb-1" style={{ color: 'var(--text-primary)' }}>
              <i className="bi bi-diagram-3-fill text-primary me-2"></i>Lead Referral & Commission Tracking Pipeline
            </h2>
            <p className="text-muted mb-0" style={{ color: 'var(--text-secondary)' }}>
              Manage client referrals, verify site visit QR codes, and monitor estimated commission payouts.
            </p>
          </div>
          
          <div className="d-flex gap-2 align-items-center">
            <button 
              className={`btn btn-sm fw-700 ${viewMode === 'kanban' ? 'btn-primary text-white shadow-sm' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('kanban')}
              style={{
                color: viewMode === 'kanban' ? '#ffffff' : 'var(--text-primary)',
                borderColor: viewMode === 'kanban' ? 'var(--accent-primary)' : 'var(--border-color)'
              }}
            >
              <i className="bi bi-kanban-fill me-1"></i> Kanban Board
            </button>
            <button 
              className={`btn btn-sm fw-700 ${viewMode === 'table' ? 'btn-primary text-white shadow-sm' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('table')}
              style={{
                color: viewMode === 'table' ? '#ffffff' : 'var(--text-primary)',
                borderColor: viewMode === 'table' ? 'var(--accent-primary)' : 'var(--border-color)'
              }}
            >
              <i className="bi bi-table me-1"></i> Table View
            </button>
          </div>
        </div>
      </div>

      {/* Commission & Payout Summary Card */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="glass-panel p-3.5 border-start border-4 border-success d-flex align-items-center justify-content-between">
            <div>
              <small className="text-muted fw-600 text-uppercase d-block" style={{ fontSize: '0.75rem' }}>EARNED COMMISSIONS (SETTLED)</small>
              <h4 className="fw-700 text-success mb-0">₹{estEarnedCommission.toLocaleString('en-IN')}</h4>
              <small className="text-muted">{convertedLeads.length} Converted Deals</small>
            </div>
            <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle"><i className="bi bi-cash-stack fs-3"></i></div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="glass-panel p-3.5 border-start border-4 border-warning d-flex align-items-center justify-content-between">
            <div>
              <small className="text-muted fw-600 text-uppercase d-block" style={{ fontSize: '0.75rem' }}>PIPELINE COMMISSIONS (ACTIVE)</small>
              <h4 className="fw-700 text-warning mb-0">₹{estPipelineCommission.toLocaleString('en-IN')}</h4>
              <small className="text-muted">{inProgressLeads.length} Active Site Visits</small>
            </div>
            <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-circle"><i className="bi bi-graph-up-arrow fs-3"></i></div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="glass-panel p-3.5 border-start border-4 border-info d-flex align-items-center justify-content-between">
            <div>
              <small className="text-muted fw-600 text-uppercase d-block" style={{ fontSize: '0.75rem' }}>TOTAL INQUIRIES ROUTED</small>
              <h4 className="fw-700 mb-0" style={{ color: 'var(--text-primary)' }}>{leads.length} Referrals</h4>
              <small className="text-muted">100% Verified Tracking</small>
            </div>
            <div className="p-3 bg-info bg-opacity-10 text-info rounded-circle"><i className="bi bi-people-fill fs-3"></i></div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger p-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success p-3 mb-4">
          <i className="bi bi-check-circle-fill me-2"></i> {success}
        </div>
      )}

      {/* QR Code Verification Search Bar */}
      <div className="glass-panel p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-md-7">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-warning" style={{ borderColor: 'var(--border-color)' }}>
                <i className="bi bi-qr-code-scan"></i>
              </span>
              <input 
                type="text" 
                className="form-control form-premium-control border-start-0"
                placeholder="Scan or enter Referral Code / Client Phone (e.g. REF-LEAD-1 or 9988776655)..."
                value={verifySearch}
                onChange={(e) => setVerifySearch(e.target.value)}
              />
              {verifySearch && (
                <button className="btn btn-outline-secondary" onClick={() => setVerifySearch('')}>Clear</button>
              )}
            </div>
          </div>
          <div className="col-md-5 text-md-end">
            <span className="text-muted small">
              <i className="bi bi-shield-check text-success me-1"></i> Executive QR Verification System Active
            </span>
          </div>
        </div>
      </div>

      {/* View 1: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="row g-3">
          {columns.map(col => {
            const columnLeads = filteredLeads.filter(l => l.status === col.key);
            return (
              <div key={col.key} className="col-12 col-md-6 col-xl-3">
                <div className={`glass-panel p-3 h-100 border-top border-4 ${col.color}`}>
                  <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
                    <h6 className="fw-700 mb-0" style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{col.label}</h6>
                    <span className="badge bg-secondary text-light rounded-pill small">{columnLeads.length}</span>
                  </div>

                  {columnLeads.length === 0 ? (
                    <div className="text-center py-4 text-muted small">No leads in this stage.</div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {columnLeads.map(lead => (
                        <div key={lead.id} className="p-3 rounded border shadow-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="fw-700 mb-0" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{lead.lead_name}</h6>
                            <button 
                              className="btn btn-xs btn-outline-info p-1 px-2 fw-600"
                              style={{ fontSize: '0.7rem' }}
                              onClick={() => setQrModalLead(lead)}
                              title="Show QR Code for Site Visit"
                            >
                              <i className="bi bi-qr-code me-1"></i> QR
                            </button>
                          </div>

                          <div className="small mb-2" style={{ color: 'var(--text-secondary)' }}>
                            <div><i className="bi bi-building text-primary me-1"></i> {lead.project_name}</div>
                            <div><i className="bi bi-telephone me-1"></i> {lead.lead_phone}</div>
                            {lead.broker_name && <div><i className="bi bi-person-badge text-warning me-1"></i> Broker: {lead.broker_name}</div>}
                          </div>

                          <div className="p-2 rounded small mb-2" style={{ fontSize: '0.78rem', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                            {lead.notes || 'No custom notes provided.'}
                          </div>

                          {/* Quick Stage Transitions */}
                          {['branch_executive', 'branch_admin', 'super_admin'].includes(user.role) && (
                            <div className="d-flex gap-1 flex-wrap mt-2 pt-2 border-top" style={{ borderColor: 'var(--border-color)' }}>
                              {col.key !== 'new' && (
                                <button className="btn btn-xs btn-outline-primary fw-700 px-2 py-1" style={{ fontSize: '0.72rem' }} onClick={() => handleStatusChange(lead.id, 'new')}>
                                  ← New
                                </button>
                              )}
                              {col.key !== 'in_progress' && (
                                <button className="btn btn-xs btn-warning text-dark fw-700 px-2 py-1 shadow-sm" style={{ fontSize: '0.72rem' }} onClick={() => handleStatusChange(lead.id, 'in_progress')}>
                                  Visit Scheduled
                                </button>
                              )}
                              {col.key !== 'converted' && (
                                <button className="btn btn-xs btn-success text-white fw-700 px-2 py-1 shadow-sm" style={{ fontSize: '0.72rem' }} onClick={() => handleStatusChange(lead.id, 'converted')}>
                                  Token Paid
                                </button>
                              )}
                              {col.key !== 'closed' && (
                                <button className="btn btn-xs btn-dark text-white fw-700 px-2 py-1 shadow-sm" style={{ fontSize: '0.72rem' }} onClick={() => handleStatusChange(lead.id, 'closed')}>
                                  Close Deal
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View 2: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="glass-panel p-4">
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr className="text-muted small">
                  <th>REFERRAL ID & CLIENT</th>
                  <th>PROPERTY REFERENCE</th>
                  <th>SOURCE BROKER</th>
                  <th>ASSIGNED EXECUTIVE</th>
                  <th>STATUS</th>
                  <th>VERIFICATION QR</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="fw-700" style={{ color: 'var(--text-primary)' }}>{lead.lead_name}</div>
                      <span className="badge bg-secondary text-light small me-1">REF-LEAD-{lead.id}</span>
                      <div className="text-muted small mt-1"><i className="bi bi-telephone"></i> {lead.lead_phone}</div>
                    </td>
                    <td>
                      <div className="fw-500" style={{ color: 'var(--text-primary)' }}>{lead.project_name}</div>
                      <span className="text-muted small">{lead.property_code}</span>
                    </td>
                    <td className="small text-primary fw-500">
                      {lead.broker_name ? (
                        <span><i className="bi bi-person-badge"></i> {lead.broker_name}</span>
                      ) : (
                        <span className="text-muted">Internal Direct</span>
                      )}
                    </td>
                    <td className="small fw-500" style={{ color: 'var(--text-primary)' }}>
                      {lead.executive_name ? (
                        <span><i className="bi bi-person-workspace text-info"></i> {lead.executive_name}</span>
                      ) : (
                        <span className="text-muted">Unassigned</span>
                      )}
                    </td>
                    <td>
                      {['branch_executive', 'branch_admin', 'super_admin'].includes(user.role) ? (
                        <select 
                          className="form-select py-1 px-2 fw-600" 
                          style={{ fontSize: '0.85rem', width: '150px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        >
                          <option value="new">New</option>
                          <option value="in_progress">Site Visit / Active</option>
                          <option value="converted">Token Paid</option>
                          <option value="closed">Closed / Settled</option>
                        </select>
                      ) : (
                        <span className={`${statusBadges[lead.status]} rounded-pill px-2.5 py-1`}>
                          {statusLabels[lead.status]}
                        </span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-outline-info fw-600"
                        onClick={() => setQrModalLead(lead)}
                      >
                        <i className="bi bi-qr-code me-1"></i> View QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Code Verification Modal */}
      {qrModalLead && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered text-center">
            <div className="modal-content text-dark border-0 shadow-lg" style={{ borderRadius: '24px', backgroundColor: '#ffffff' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-700 text-dark">
                  <i className="bi bi-qr-code-scan text-warning me-2"></i>Site Visit Referral QR Pass
                </h5>
                <button type="button" className="btn-close" onClick={() => setQrModalLead(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3 d-inline-block p-3 bg-white rounded shadow-sm border" dangerouslySetInnerHTML={{ __html: generateQRCodeSVG(`REF-LEAD-${qrModalLead.id}-${qrModalLead.lead_phone}`, 180) }} />
                
                <h5 className="fw-700 text-dark mb-1">{qrModalLead.lead_name}</h5>
                <div className="text-warning fw-700 mb-2">Ref Code: REF-LEAD-{qrModalLead.id}</div>
                <div className="small text-muted mb-3">
                  <div><strong>Property:</strong> {qrModalLead.project_name} ({qrModalLead.property_code})</div>
                  <div><strong>Referring Broker:</strong> {qrModalLead.broker_name || 'Direct Referral'}</div>
                  <div><strong>Client Phone:</strong> {qrModalLead.lead_phone}</div>
                </div>

                <div className="alert alert-info py-2 small mb-0" style={{ borderRadius: '12px' }}>
                  <i className="bi bi-shield-check me-1"></i> Present this QR code to the site sales executive upon arrival to verify referral commission ownership.
                </div>
              </div>
              <div className="modal-footer border-top py-3 px-4 justify-content-center">
                <button type="button" className="btn btn-secondary btn-sm rounded-pill px-4" onClick={() => setQrModalLead(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadList;
