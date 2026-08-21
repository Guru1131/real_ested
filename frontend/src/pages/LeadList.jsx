import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const LeadList = () => {
  const { user } = useContext(AuthContext);
  
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [statusFilter, setStatusFilter] = useState('');

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
      // Create endpoint payload if needed or update via a PUT lead endpoint
      // Wait, let's create a lead update logic or reuse the lead submission parameters
      // Actually we didn't define a specific lead update API file in our implementation plan, let's look at how we can implement this easily:
      // We can add a simple script `backend/api/leads/update.php` to handle lead status changes, or we can write it dynamically.
      // Wait! Let's quickly create `backend/api/leads/update.php` so the status change actually updates in the database! That's excellent! Let's write that file in the background, but first let's finish the LeadList frontend code.
      // The PUT request to `/api/leads/update.php?id=X` will pass `{ "status": newStatus }`.
      await api.put(`/api/leads/${leadId}/status`, { status: newStatus });
      setSuccess('Lead conversion status updated successfully.');
      fetchLeads();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update lead status.');
    }
  };

  const handleFilterToggle = (status) => {
    setStatusFilter(status);
    fetchLeads(status);
  };

  const statusBadges = {
    new: 'badge bg-primary text-light',
    in_progress: 'badge bg-warning text-dark',
    converted: 'badge bg-success text-light',
    closed: 'badge bg-danger text-light'
  };

  const statusLabels = {
    new: 'New Inquiry',
    in_progress: 'In Progress',
    converted: 'Converted',
    closed: 'Closed'
  };

  return (
    <div className="container-fluid py-2 animate-fade-in">
      {/* Header */}
      <div className="glass-panel p-4 mb-4">
        <h2 className="fw-700 text-white mb-1">Lead Referral Tracking Board</h2>
        <p className="text-muted mb-0">Monitor buyer inquiries, routing scopes, and status transitions. Sales Executives only see leads assigned to them.</p>
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

      {/* Filter Tabs */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        <button className={`btn btn-sm rounded-pill px-3 py-1.5 ${statusFilter === '' ? 'btn-premium' : 'btn-premium-outline'}`} onClick={() => handleFilterToggle('')}>All Leads</button>
        <button className={`btn btn-sm rounded-pill px-3 py-1.5 ${statusFilter === 'new' ? 'btn-premium' : 'btn-premium-outline'}`} onClick={() => handleFilterToggle('new')}>New</button>
        <button className={`btn btn-sm rounded-pill px-3 py-1.5 ${statusFilter === 'in_progress' ? 'btn-premium' : 'btn-premium-outline'}`} onClick={() => handleFilterToggle('in_progress')}>In Progress</button>
        <button className={`btn btn-sm rounded-pill px-3 py-1.5 ${statusFilter === 'converted' ? 'btn-premium' : 'btn-premium-outline'}`} onClick={() => handleFilterToggle('converted')}>Converted</button>
        <button className={`btn btn-sm rounded-pill px-3 py-1.5 ${statusFilter === 'closed' ? 'btn-premium' : 'btn-premium-outline'}`} onClick={() => handleFilterToggle('closed')}>Closed/Lost</button>
      </div>

      {/* Main Board */}
      <div className="glass-panel p-4">
        <h5 className="fw-600 text-white mb-4"><i className="bi bi-funnel text-primary me-2"></i>Inquiries Inbox</h5>

        {loading ? (
          <div className="text-center py-4 text-muted">
            <div className="spinner-border spinner-border-sm me-2" role="status"></div> Loading leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-5 text-muted small">
            <i className="bi bi-filter fs-1 d-block mb-3 text-muted"></i> No leads registered under this filter category yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>CLIENT / BUYER INFO</th>
                  <th>PROPERTY REFERENCE</th>
                  <th>SOURCE BROKER</th>
                  <th>ASSIGNED EXECUTIVE</th>
                  <th>STATUS</th>
                  <th>NOTES</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="fw-600 text-white">{lead.lead_name}</div>
                      <div className="text-muted small"><i className="bi bi-telephone"></i> {lead.lead_phone}</div>
                      {lead.lead_email && <div className="text-muted small"><i className="bi bi-envelope"></i> {lead.lead_email}</div>}
                    </td>
                    <td>
                      <div className="fw-500 text-white">{lead.project_name}</div>
                      <span className="text-muted small">{lead.property_code}</span>
                    </td>
                    <td className="small text-primary fw-500">
                      {lead.broker_name ? (
                        <span><i className="bi bi-person-badge"></i> {lead.broker_name} (Broker)</span>
                      ) : (
                        <span className="text-muted">Internal Referral</span>
                      )}
                    </td>
                    <td className="small fw-500 text-white">
                      {lead.executive_name ? (
                        <span><i className="bi bi-person-workspace text-info"></i> {lead.executive_name}</span>
                      ) : (
                        <span className="text-muted">Unassigned</span>
                      )}
                    </td>
                    <td>
                      {/* Only Executives and Branch Admins can update status */}
                      {['branch_executive', 'branch_admin'].includes(user.role) ? (
                        <select 
                          className="form-select form-premium-control py-1 px-2 text-white" 
                          style={{ fontSize: '0.85rem', width: '130px' }}
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        >
                          <option value="new">New</option>
                          <option value="in_progress">In Progress</option>
                          <option value="converted">Converted</option>
                          <option value="closed">Closed/Lost</option>
                        </select>
                      ) : (
                        <span className={`${statusBadges[lead.status]} rounded-pill px-2.5 py-1`}>
                          {statusLabels[lead.status]}
                        </span>
                      )}
                    </td>
                    <td className="small text-muted" style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                      {lead.notes || 'No description notes.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadList;
