import React, { createContext, useState, useEffect } from 'react';

export const CustomizationContext = createContext();

export const CustomizationProvider = ({ children }) => {
  // Load configuration with default Slate-Gold values & themeMode
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
      footerBgColor: '#0f172a',
      themeMode: 'light' // 'light' or 'dark'
    };
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
    
    // Also save config
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
    setConfig({
      brandName: 'Apex Estates',
      primaryColor: '#0f172a',
      accentColor: '#d97706',
      accentColorSecondary: '#b45309',
      heroTitle: 'Curated Premium Living Spaces',
      heroSubtitle: 'Explore and compare verified premium properties across regional branches with absolute transparency.',
      licenseText: 'Copyright © 2026 Apex Estates. All rights reserved. MAHARERA Registration No: A041262501974.',
      headerStyle: 'standard',
      footerBgColor: '#0f172a',
      themeMode: 'light'
    });
  };

  return (
    <CustomizationContext.Provider value={{ config, updateConfig, toggleThemeMode, resetConfig }}>
      {children}
    </CustomizationContext.Provider>
  );
};
