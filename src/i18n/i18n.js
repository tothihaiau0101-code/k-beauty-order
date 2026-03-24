/**
 * i18n (Internationalization) Helper Module
 * Handles language switching, translation lookup, and localStorage persistence
 */

import translations from './translations';

const STORAGE_KEY = 'k-beauty-language';
const DEFAULT_LANGUAGE = 'vi';
const SUPPORTED_LANGUAGES = ['en', 'vi'];

// Current language state
let currentLanguage = DEFAULT_LANGUAGE;

// Listeners for language changes
const languageChangeListeners = [];

/**
 * Initialize i18n - Load saved language from localStorage
 */
export function initI18n() {
  const savedLanguage = localStorage.getItem(STORAGE_KEY);
  
  if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
    currentLanguage = savedLanguage;
  } else {
    currentLanguage = DEFAULT_LANGUAGE;
  }
  
  // Apply initial language
  applyLanguage(currentLanguage);
  
  return currentLanguage;
}

/**
 * Get current language
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

/**
 * Set and save language preference
 */
export function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    console.warn(`Language '${lang}' is not supported. Falling back to '${DEFAULT_LANGUAGE}'`);
    lang = DEFAULT_LANGUAGE;
  }
  
  if (currentLanguage !== lang) {
    currentLanguage = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyLanguage(lang);
    notifyLanguageChange(lang);
  }
  
  return currentLanguage;
}

/**
 * Toggle between EN and VI
 */
export function toggleLanguage() {
  const newLanguage = currentLanguage === 'en' ? 'vi' : 'en';
  setLanguage(newLanguage);
  return newLanguage;
}

/**
 * Get translation for a key
 */
export function t(key, defaultValue = '') {
  const langTranslations = translations[currentLanguage] || translations[DEFAULT_LANGUAGE];
  return langTranslations[key] || defaultValue || key;
}

/**
 * Get translation with interpolation
 */
export function tWithParams(key, params = {}, defaultValue = '') {
  let translation = t(key, defaultValue);
  
  Object.keys(params).forEach(paramKey => {
    const placeholder = `{${paramKey}}`;
    translation = translation.replace(placeholder, params[paramKey]);
  });
  
  return translation;
}

/**
 * Apply language to all elements with data-i18n attribute
 */
export function applyLanguage(lang = currentLanguage) {
  const langTranslations = translations[lang] || translations[DEFAULT_LANGUAGE];
  
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = langTranslations[key];
    
    if (translation) {
      // Check if element has data-i18n-placeholder for input elements
      const placeholderKey = element.getAttribute('data-i18n-placeholder');
      if (placeholderKey && langTranslations[placeholderKey]) {
        element.placeholder = langTranslations[placeholderKey];
      }
      
      // Check if element has data-i18n-title for title attribute
      const titleKey = element.getAttribute('data-i18n-title');
      if (titleKey && langTranslations[titleKey]) {
        element.title = langTranslations[titleKey];
      }
      
      // Set text content
      element.textContent = translation;
    }
  });
  
  // Update document language attribute
  document.documentElement.lang = lang;
  
  // Update direction for RTL languages if needed
  const isRTL = ['ar', 'he', 'fa'].includes(lang);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
}

/**
 * Subscribe to language change events
 */
export function onLanguageChange(callback) {
  languageChangeListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = languageChangeListeners.indexOf(callback);
    if (index > -1) {
      languageChangeListeners.splice(index, 1);
    }
  };
}

/**
 * Notify all listeners of language change
 */
function notifyLanguageChange(lang) {
  languageChangeListeners.forEach(callback => {
    try {
      callback(lang);
    } catch (error) {
      console.error('Error in language change listener:', error);
    }
  });
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(lang = currentLanguage) {
  const names = {
    en: 'English',
    vi: 'Tiếng Việt'
  };
  return names[lang] || lang;
}

/**
 * Check if current language is RTL
 */
export function isRTL() {
  return ['ar', 'he', 'fa'].includes(currentLanguage);
}

// Export as default object
const i18n = {
  init: initI18n,
  getCurrentLanguage,
  getSupportedLanguages,
  setLanguage,
  toggleLanguage,
  t,
  tWithParams,
  applyLanguage,
  onLanguageChange,
  getLanguageDisplayName,
  isRTL
};

export default i18n;
