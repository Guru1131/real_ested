import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const MarqueeTicker = () => {
  const { user } = useContext(AuthContext);
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);

  useEffect(() => {
    if (!user) return;
    const fetchAnnouncements = async () => {
      try {
        let res;
        try {
          res = await api.get('/api/announcements');
        } catch (e1) {
          res = await api.get('/api/announcements/index.php');
        }
        setAnnouncements(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error fetching marquee announcements', err);
      }
    };

    fetchAnnouncements();
    // Poll for new announcements every 45 seconds
    const interval = setInterval(fetchAnnouncements, 45000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || announcements.length === 0) return null;

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));
  if (visibleAnnouncements.length === 0) return null;

  const themeStyles = {
    warning: { bg: 'linear-gradient(90deg, #b45309 0%, #d97706 100%)', text: '#ffffff', icon: 'bi-megaphone-fill text-warning' },
    danger: { bg: 'linear-gradient(90deg, #991b1b 0%, #dc2626 100%)', text: '#ffffff', icon: 'bi-exclamation-triangle-fill text-danger' },
    info: { bg: 'linear-gradient(90deg, #0369a1 0%, #0284c7 100%)', text: '#ffffff', icon: 'bi-info-circle-fill text-info' },
    success: { bg: 'linear-gradient(90deg, #15803d 0%, #16a34a 100%)', text: '#ffffff', icon: 'bi-check-circle-fill text-success' }
  };

  const currentTheme = themeStyles[visibleAnnouncements[0]?.theme] || themeStyles.warning;

  const audienceLabels = {
    all: 'Global Broadcast',
    external_broker: 'Brokers Notice',
    branch_executive: 'Sales Executives Notice',
    branch_admin: 'Branch Admins Notice',
    staff: 'Internal Staff Alert'
  };

  return (
    <div 
      className="marquee-container text-white py-2 px-3 shadow-sm d-flex align-items-center justify-content-between gap-3 animate-fade-in"
      style={{
        background: currentTheme.bg,
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        fontSize: '0.85rem',
        fontWeight: 600,
        letterSpacing: '0.3px',
        zIndex: 1010
      }}
    >
      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        <span className="badge bg-dark text-white rounded-pill px-2.5 py-1 small fw-700 shadow-sm">
          <i className="bi bi-broadcast me-1 text-warning"></i> 
          {audienceLabels[visibleAnnouncements[0]?.target_audience] || 'Announcement'}
        </span>
      </div>

      {/* Animated Marquee Text Track */}
      <div className="overflow-hidden position-relative w-100 me-2" style={{ height: '22px' }}>
        <div 
          className="marquee-text-track position-absolute d-flex align-items-center gap-4 text-nowrap"
          style={{
            animation: 'marqueeScroll 25s linear infinite',
            whiteSpace: 'nowrap'
          }}
        >
          {visibleAnnouncements.map((item, idx) => (
            <span key={item.id || idx} className="d-inline-flex align-items-center gap-2">
              <i className="bi bi-bell-fill text-warning me-1"></i>
              <span>{item.message}</span>
              {idx < visibleAnnouncements.length - 1 && <span className="mx-3 opacity-50">•</span>}
            </span>
          ))}
        </div>
      </div>

      <button 
        type="button" 
        className="btn-close btn-close-white flex-shrink-0"
        style={{ fontSize: '0.75rem' }}
        onClick={() => setDismissedIds(prev => [...prev, ...visibleAnnouncements.map(a => a.id)])}
        title="Dismiss announcement for session"
      ></button>

      <style>{`
        @keyframes marqueeScroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .marquee-text-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default MarqueeTicker;
