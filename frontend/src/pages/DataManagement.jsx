import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const DataManagement = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Backup state
  const [selectedTables, setSelectedTables] = useState(['properties', 'users']);
  
  // Import state
  const [importFile, setImportFile] = useState(null);

  // Export filters
  const [exportFilters, setExportFilters] = useState({
    project_status: '',
    property_type: ''
  });

  const availableTables = ['properties', 'users', 'property_leads', 'branches', 'property_configurations'];

  if (user?.role !== 'super_admin' && user?.role !== 'assistant_admin') {
    return <div className="p-4 text-center">Unauthorized access. Only super admins and assistant admins can access this page.</div>;
  }

  const handleTableToggle = (table) => {
    if (selectedTables.includes(table)) {
      setSelectedTables(selectedTables.filter(t => t !== table));
    } else {
      setSelectedTables([...selectedTables, table]);
    }
  };

  const handleBackup = async () => {
    if (selectedTables.length === 0) {
      setError('Please select at least one table for backup.');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/api/data/backup', { tables: selectedTables }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setMessage('Backup generated successfully.');
    } catch (err) {
      setError('Failed to generate backup.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/api/data/properties/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `property_import_template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to download template.');
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      let query = '?';
      if (exportFilters.project_status) query += `project_status=${exportFilters.project_status}&`;
      if (exportFilters.property_type) query += `property_type=${exportFilters.property_type}`;

      const response = await api.get(`/api/data/properties/export${query}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `properties_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setMessage('Export completed successfully.');
    } catch (err) {
      setError('Failed to export properties. Note: Export fails if no matching properties are found.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setError('Please select a CSV file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await api.post('/api/data/properties/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(res.data.message);
      if (res.data.errors && res.data.errors.length > 0) {
        setError(`Import partially succeeded with some errors: \n${res.data.errors.join('\\n')}`);
      }
      setImportFile(null);
      document.getElementById('csvFileInput').value = '';
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Import failed.';
      const detailedErrors = err.response?.data?.details;
      setError(`${errorMsg} ${detailedErrors ? '\\n' + detailedErrors.join('\\n') : ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4 animate-fade-in">
      <div className="glass-panel p-4 mb-4">
        <h2 className="fw-700 text-white mb-1"><i className="bi bi-database-check text-primary me-2"></i>Data Management Hub</h2>
        <p className="text-muted mb-0">Securely export backups, import bulk properties via CSV, or export property lists.</p>
      </div>

      {error && (
        <div className="alert alert-danger p-3 mb-4" style={{ whiteSpace: 'pre-line' }}>
          <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
        </div>
      )}
      {message && (
        <div className="alert alert-success p-3 mb-4">
          <i className="bi bi-check-circle-fill me-2"></i> {message}
        </div>
      )}

      <div className="row g-4">
        {/* Smart Backup Section */}
        <div className="col-md-6">
          <div className="glass-panel p-4 h-100">
            <h5 className="fw-600 text-white mb-3"><i className="bi bi-hdd-network text-info me-2"></i>Smart JSON Backup</h5>
            <p className="small text-muted mb-3">Select the tables you wish to backup. The output will be a raw JSON database dump containing all active and soft-deleted rows.</p>
            
            <div className="d-flex flex-wrap gap-2 mb-4">
              {availableTables.map(table => (
                <div className="form-check form-switch" key={table}>
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    role="switch" 
                    id={`switch-${table}`} 
                    checked={selectedTables.includes(table)}
                    onChange={() => handleTableToggle(table)}
                  />
                  <label className="form-check-label small text-white ms-1" htmlFor={`switch-${table}`}>
                    {table}
                  </label>
                </div>
              ))}
            </div>

            <button 
              onClick={handleBackup} 
              disabled={loading || selectedTables.length === 0} 
              className="btn btn-outline-info rounded-pill px-4"
            >
              <i className="bi bi-cloud-download me-2"></i> Download Backup
            </button>
          </div>
        </div>

        {/* CSV Export Section */}
        <div className="col-md-6">
          <div className="glass-panel p-4 h-100">
            <h5 className="fw-600 text-white mb-3"><i className="bi bi-file-earmark-spreadsheet text-success me-2"></i>Export Properties to CSV</h5>
            <p className="small text-muted mb-3">Filter properties to export into a CSV format compatible with Excel.</p>
            
            <div className="row g-2 mb-4">
              <div className="col-6">
                <label className="small text-muted">Project Status</label>
                <select 
                  className="form-select form-select-sm bg-dark text-white border-secondary"
                  value={exportFilters.project_status}
                  onChange={(e) => setExportFilters({...exportFilters, project_status: e.target.value})}
                >
                  <option value="">Any Status</option>
                  <option value="new_launch">New Launch</option>
                  <option value="under_construction">Under Construction</option>
                  <option value="ready_possession">Ready Possession</option>
                </select>
              </div>
              <div className="col-6">
                <label className="small text-muted">Property Type</label>
                <select 
                  className="form-select form-select-sm bg-dark text-white border-secondary"
                  value={exportFilters.property_type}
                  onChange={(e) => setExportFilters({...exportFilters, property_type: e.target.value})}
                >
                  <option value="">Any Type</option>
                  <option value="flat">Flat/Apartment</option>
                  <option value="bungalow">Bungalow</option>
                  <option value="villa">Villa</option>
                  <option value="shop">Shop</option>
                  <option value="office">Office</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleExport} 
              disabled={loading} 
              className="btn btn-outline-success rounded-pill px-4"
            >
              <i className="bi bi-download me-2"></i> Export to CSV
            </button>
          </div>
        </div>

        {/* CSV Bulk Import Section */}
        <div className="col-12">
          <div className="glass-panel p-4">
            <h5 className="fw-600 text-white mb-3"><i className="bi bi-cloud-upload text-warning me-2"></i>Bulk Property Import (Excel/CSV)</h5>
            <p className="small text-muted mb-3">Upload an Excel (.xlsx) or CSV file to bulk-import properties. The system will pre-validate rows before inserting.</p>
            
            <div className="mb-4">
              <button onClick={handleDownloadTemplate} className="btn btn-sm btn-outline-secondary">
                <i className="bi bi-file-earmark-arrow-down me-1"></i> Download Excel Template (with Dropdowns)
              </button>
              <small className="text-muted ms-2 d-block d-sm-inline mt-2 mt-sm-0">
                Please follow the column headers exactly as provided in the template.
              </small>
            </div>

            <form onSubmit={handleImport} className="d-flex flex-column flex-md-row gap-3 align-items-md-end border-top border-secondary pt-4 mt-2">
              <div className="flex-grow-1">
                <label className="small text-muted mb-1">Select Excel (.xlsx) or CSV File</label>
                <input 
                  type="file" 
                  id="csvFileInput"
                  accept=".csv, .xlsx" 
                  className="form-control bg-dark text-white border-secondary" 
                  onChange={(e) => setImportFile(e.target.files[0])}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading || !importFile} 
                className="btn btn-warning fw-600 px-5 text-dark"
              >
                {loading ? 'Processing...' : 'Upload & Import'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
