import React, { createContext, useState, useEffect } from 'react';

export const CustomizationContext = createContext();

export const CustomizationProvider = ({ children }) => {
  // Load configuration with default Slate-Gold values
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('custom_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing stored customization config', e);
      }
    }
    return {
      brandName: 'Apex Estates',
      primaryColor: '#0f172a', // Slate Navy
      accentColor: '#d97706',  // Amber Gold
      accentColorSecondary: '#b45309', // Darker Amber
      heroTitle: 'Curated Premium Living Spaces',
      heroSubtitle: 'Explore and compare verified premium properties across regional branches with absolute transparency.',
      licenseText: 'Copyright © 2026 Apex Estates. All rights reserved. MAHARERA Registration No: A041262501974.',
      headerStyle: 'standard', // 'standard' or 'glass'
      footerBgColor: '#0f172a'
    };
  });

  // Apply CSS variables dynamically to the document head root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--text-primary', config.primaryColor);
    root.style.setProperty('--accent-primary', config.accentColor);
    root.style.setProperty('--accent-secondary', config.accentColorSecondary);
    root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${config.accentColor} 0%, ${config.accentColorSecondary} 100%)`);
    
    // Also save config
    localStorage.setItem('custom_config', JSON.stringify(config));
  }, [config]);

  const updateConfig = (newConfig) => {
    setConfig((prev) => ({
      ...prev,
      ...newConfig
    }));
  };

  const resetConfig = () => {
    setConfig({
      brandName: 'Apex Estates',
      primaryColor: '#0f172a',
      accentColor: '#d97706',
      accentColorSecondary: '#b45309',
      heroTitle: 'Curated Premium Living Spaces',
      heroSubtitle: 'Explore and compare verified premium properties across regional branches with absolute transparency.',
      licenseText: 'Copyright © 2026 Apex Estates. All rights reserved. MAHARERA Registration No: A041262501974.',
      headerStyle: 'standard',
      footerBgColor: '#0f172a'
    });
  };

  return (
    <CustomizationContext.Provider value={{ config, updateConfig, resetConfig }}>
      {children}
    </CustomizationContext.Provider>
  );
};
