import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

// Get saved language or detect from browser
const savedLanguage = localStorage.getItem('language');
const browserLanguage = navigator.language.split('-')[0];
const defaultLanguage = savedLanguage || (browserLanguage === 'fr' ? 'fr' : 'en');

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            fr: { translation: fr },
        },
        lng: defaultLanguage,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React already escapes
        },
    });

// Save language preference
i18n.on('languageChanged', (lng) => {
    localStorage.setItem('language', lng);
    // Future: Add RTL support for Arabic
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
});

export default i18n;
