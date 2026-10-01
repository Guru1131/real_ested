import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { formatImageUrl, handleImageError } from '../utils/imageHelper';

const MediaLibraryModal = ({ show, onClose, onSelect, accept = 'image/*' }) => {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'upload'
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    if (show && activeTab === 'library') {
      fetchMedia();
    }
  }, [show, activeTab]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/media');
      setMediaList(res.data || []);
    } catch (err) {
      console.error('Error fetching media', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);
    
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post('/api/media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setSelectedFiles([]);
      setActiveTab('library');
    } catch (err) {
      console.error('Error uploading media', err);
      alert('Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this media?')) return;
    try {
      await api.delete(`/api/media/${id}`);
      fetchMedia();
    } catch (err) {
      console.error('Error deleting media', err);
    }
  };

  if (!show) return null;

  return createPortal(
    <div className={`modal fade show d-block`} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} tabIndex="-1">
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ margin: 'auto' }}>
        <div className="modal-content shadow-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
          <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
            <h5 className="modal-title fw-800" style={{ color: 'var(--text-primary)' }}><i className="bi bi-collection-play-fill me-2 text-warning"></i>Media Asset Library</h5>
            <button type="button" className="btn-close" onClick={onClose} style={{ filter: 'var(--invert-icon)' }}></button>
          </div>
          <div className="modal-body p-0">
            
            <div className="p-3 border-bottom" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <ul className="nav nav-pills gap-2">
                <li className="nav-item">
                  <button className={`nav-link rounded-pill px-4 fw-600 ${activeTab === 'library' ? 'active shadow-sm' : ''}`} onClick={() => setActiveTab('library')} style={activeTab === 'library' ? { backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' } : { color: 'var(--text-primary)' }}>
                    <i className="bi bi-grid-fill me-2"></i> Browse Library
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link rounded-pill px-4 fw-600 ${activeTab === 'upload' ? 'active shadow-sm' : ''}`} onClick={() => setActiveTab('upload')} style={activeTab === 'upload' ? { backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' } : { color: 'var(--text-primary)' }}>
                    <i className="bi bi-cloud-arrow-up-fill me-2"></i> Upload New Asset
                  </button>
                </li>
              </ul>
            </div>

            <div className="p-4">
              {activeTab === 'upload' && (
                <div className="border rounded-4 p-5 text-center" style={{ borderColor: 'var(--border-color)', borderStyle: 'dashed', backgroundColor: 'var(--bg-tertiary)' }}>
                  <i className="bi bi-cloud-upload text-primary display-4 mb-3"></i>
                  <h5 className="fw-700" style={{ color: 'var(--text-primary)' }}>Upload New Media Assets</h5>
                  <p className="text-muted small mb-4">You can reuse these assets across multiple properties and configurations.</p>
                  
                  <div className="d-flex justify-content-center">
                    <input 
                      type="file" 
                      multiple
                      className="form-control mb-3 w-50" 
                      accept={accept}
                      onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                    />
                  </div>
                  <button 
                    className="btn btn-primary px-4 py-2 fw-600 mt-2" 
                    disabled={selectedFiles.length === 0 || uploading}
                    onClick={handleUpload}
                  >
                    {uploading ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Uploading...</>
                    ) : (
                      'Upload Asset'
                    )}
                  </button>
                </div>
              )}

              {activeTab === 'library' && (
                loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary"></div>
                  </div>
                ) : (
                  <div className="row g-4">
                    {mediaList.length === 0 ? (
                      <div className="col-12 text-center py-5 text-muted">
                        <i className="bi bi-images fs-1 d-block mb-3 opacity-50"></i>
                        <h6 className="fw-600">No media found.</h6>
                        <p className="small">Upload something to get started.</p>
                      </div>
                    ) : (
                      mediaList.map(item => (
                        <div key={item.id} className="col-6 col-md-4 col-lg-3">
                          <div className="position-relative border rounded-4 p-2 h-100 d-flex flex-column glass-panel-hover transition-up cursor-pointer" style={{ backgroundColor: 'var(--bg-primary)' }}>
                            <div 
                              className="ratio ratio-4x3 mb-2 bg-light rounded-3 overflow-hidden" 
                              onClick={() => onSelect(item)} 
                              title="Click to select this asset"
                            >
                              {item.file_type.includes('image') ? (
                                <img 
                                  src={formatImageUrl(item.file_url)} 
                                  onError={handleImageError} 
                                  className="w-100 h-100 object-fit-cover hover-scale" 
                                  alt={item.file_name} 
                                />
                              ) : (
                                <div className="d-flex align-items-center justify-content-center h-100 w-100">
                                  <i className="bi bi-file-earmark-text-fill display-4 text-muted"></i>
                                </div>
                              )}
                            </div>
                            <div className="small fw-600 text-truncate px-1 mt-auto" style={{ color: 'var(--text-primary)' }} title={item.file_name}>{item.file_name}</div>
                            <button 
                              className="btn btn-sm text-danger position-absolute top-0 end-0 m-3 shadow-sm rounded-circle p-1" 
                              style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
                              onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                              title="Delete Asset"
                            >
                              <i className="bi bi-trash-fill fs-6"></i>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MediaLibraryModal;
