/**
 * Language Toggle Component
 * Button to switch between EN and VI languages
 */

import React, { useState, useEffect } from 'react';
import i18n from '../i18n/i18n';
import './LanguageToggle.css';

function LanguageToggle() {
  const [currentLang, setCurrentLang] = useState(i18n.getCurrentLanguage());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    // Subscribe to language changes
    const unsubscribe = i18n.onLanguageChange((lang) => {
      setCurrentLang(lang);
    });
    
    return unsubscribe;
  }, []);

  const handleToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLanguageSelect = (lang) => {
    i18n.setLanguage(lang);
    setIsDropdownOpen(false);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.language-toggle')) {
        closeDropdown();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isDropdownOpen]);

  return (
    <div className="language-toggle">
      <button 
        className="language-toggle-btn"
        onClick={handleToggle}
        aria-label={i18n.t('lang.toggle', 'Language')}
        title={i18n.t('lang.toggle', 'Language')}
      >
        <span className="language-icon">🌐</span>
        <span className="current-language">{currentLang.toUpperCase()}</span>
        <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isDropdownOpen && (
        <div className="language-dropdown">
          <button
            className={`language-option ${currentLang === 'en' ? 'active' : ''}`}
            onClick={() => handleLanguageSelect('en')}
          >
            <span className="lang-code">EN</span>
            <span className="lang-name">English</span>
          </button>
          <button
            className={`language-option ${currentLang === 'vi' ? 'active' : ''}`}
            onClick={() => handleLanguageSelect('vi')}
          >
            <span className="lang-code">VI</span>
            <span className="lang-name">Tiếng Việt</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default LanguageToggle;
