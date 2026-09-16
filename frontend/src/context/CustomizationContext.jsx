import React, { createContext, useState, useEffect } from 'react';

export const CustomizationContext = createContext();

export const defaultConfig = {
  // Branding & Visual Systems
  brandName: 'PROP-MANAGER',
  brandTagline: 'Enterprise Property Sales & Rental System',
  logoUrl: '',
  primaryColor: '#0f172a', // Slate Navy
  accentColor: '#d97706',  // Amber Gold
  accentColorSecondary: '#b45309', // Darker Amber
  headerStyle: 'standard', // 'standard' or 'glass'
  footerBgColor: '#0f172a',
  themeMode: 'light', // 'light' or 'dark'

  // Business & Contact Information
  businessName: 'PROP-MANAGER Real Estate & Management Systems',
  contactEmail: 'support@propmanager.com',
  contactPhone: '+91 98765 43210',
  officeAddress: 'Suite 500, Financial District, Mumbai',
  reraNumber: 'A041262501974',
  taxId: '27AAACA1234A1Z5',
  currencySymbol: '₹',
  currencyCode: 'INR',

  // Whitelabeling & Portal Customizations
  brokerPortalName: 'Partner Broker Portal',
  heroTitle: 'Curated Premium Living Spaces',
  heroSubtitle: 'Explore and compare verified premium properties across regional branches with absolute transparency.',
  licenseText: 'Copyright © 2026 PROP-MANAGER Systems. All rights reserved. MAHARERA Registration No: A041262501974.',
  
  // Feature Toggles
  featureToggles: {
    brokerPortal: true,
    leadTracker: true,
    vr360: true,
    whatsappShare: true,
    publicLanding: true
  }
};

export const CustomizationProvider = ({ children }) => {
  // Hidden modal visibility state
  const [showHiddenModal, setShowHiddenModal] = useState(false);

  // Load configuration with fallback to defaultConfig
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('custom_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultConfig,
          ...parsed,
          featureToggles: {
            ...defaultConfig.featureToggles,
            ...(parsed.featureToggles || {})
          }
        };
      } catch (e) {
        console.error('Error parsing stored customization config', e);
      }
    }
  });

  // Apply CSS variables dynamically to the document head root
  useEffect(() => {
    const root = document.documentElement;
    const isDark = config.themeMode === 'dark';

    if (isDark) {
      root.style.setProperty('--bg-primary', '#0f172a');
      root.style.setProperty('--bg-secondary', '#1e293b');
      root.style.setProperty('--bg-tertiary', '#334155');
      root.style.setProperty('--card-bg', 'rgba(30, 41, 59, 0.9)');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--text-primary', '#f8fafc');
      root.style.setProperty('--text-secondary', '#94a3b8');
    } else {
      root.style.setProperty('--bg-primary', '#f8fafc');
      root.style.setProperty('--bg-secondary', '#ffffff');
      root.style.setProperty('--bg-tertiary', '#f1f5f9');
      root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.9)');
      root.style.setProperty('--border-color', 'rgba(15, 23, 42, 0.08)');
      root.style.setProperty('--text-primary', '#0f172a');
      root.style.setProperty('--text-secondary', '#475569');
    }

    root.style.setProperty('--accent-primary', config.accentColor);
    root.style.setProperty('--accent-secondary', config.accentColorSecondary);
    root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${config.accentColor} 0%, ${config.accentColorSecondary} 100%)`);
    
    // Save updated config to localStorage
    localStorage.setItem('custom_config', JSON.stringify(config));
  }, [config]);

  const updateConfig = (newConfig) => {
    setConfig((prev) => ({
      ...prev,
      ...newConfig
    }));
  };

  const toggleThemeMode = () => {
    setConfig((prev) => ({
      ...prev,
      themeMode: prev.themeMode === 'dark' ? 'light' : 'dark'
    }));
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
    localStorage.setItem('custom_config', JSON.stringify(defaultConfig));
  };

  const openHiddenModal = () => setShowHiddenModal(true);
  const closeHiddenModal = () => setShowHiddenModal(false);
  const toggleHiddenModal = () => setShowHiddenModal(prev => !prev);

  return (
    <CustomizationContext.Provider value={{
      config,
      updateConfig,
      toggleThemeMode,
      resetConfig,
      showHiddenModal,
      openHiddenModal,
      closeHiddenModal,
      toggleHiddenModal
    }}>
      {children}
    </CustomizationContext.Provider>
  );
};
