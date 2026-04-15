/**
 * Multi-Language Vocabulary Mode — Language Configuration
 * Drop-in module for Picture Hunt
 * 
 * Usage:
 *   <script src="content/translations/languages-config.js"></script>
 *   Then use SUPPORTED_LANGUAGES and getSelectedLanguage() in app.js
 * 
 * Created: 2026-04-12
 */

var SUPPORTED_LANGUAGES = [
  { code: 'none', name: 'Off', emoji: '🚫', speechLang: null },
  { code: 'es', name: 'Spanish', emoji: '🇪🇸', speechLang: 'es-ES' },
  { code: 'fr', name: 'French', emoji: '🇫🇷', speechLang: 'fr-FR' },
  { code: 'zh', name: 'Mandarin', emoji: '🇨🇳', speechLang: 'zh-CN' },
  { code: 'ja', name: 'Japanese', emoji: '🇯🇵', speechLang: 'ja-JP' },
  { code: 'de', name: 'German', emoji: '🇩🇪', speechLang: 'de-DE' },
  { code: 'ko', name: 'Korean', emoji: '🇰🇷', speechLang: 'ko-KR' },
  { code: 'it', name: 'Italian', emoji: '🇮🇹', speechLang: 'it-IT' },
  { code: 'hi', name: 'Hindi', emoji: '🇮🇳', speechLang: 'hi-IN' },
  { code: 'pt', name: 'Portuguese', emoji: '🇧🇷', speechLang: 'pt-BR' },
  { code: 'ar', name: 'Arabic', emoji: '🇸🇦', speechLang: 'ar-SA' },
];

/**
 * Get the currently selected learning language from localStorage.
 * Returns the language object, or the 'none' entry if not set.
 */
function getSelectedLanguage() {
  var code = localStorage.getItem('PH_LANG') || 'none';
  return SUPPORTED_LANGUAGES.find(function(l) { return l.code === code; }) || SUPPORTED_LANGUAGES[0];
}

/**
 * Save the selected learning language to localStorage.
 * @param {string} code — language code (e.g., 'es', 'fr', 'none')
 */
function setSelectedLanguage(code) {
  localStorage.setItem('PH_LANG', code || 'none');
}

/**
 * Speak a translated word using Web Speech API.
 * Speaks slowly (rate 0.8) for toddler comprehension.
 * @param {string} word — the foreign word to speak
 * @param {string} langCode — BCP 47 language tag (e.g., 'es-ES')
 */
function speakTranslation(word, langCode) {
  if (!langCode || !word) return;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = langCode;
  utterance.rate = 0.7;
  utterance.pitch = 1.1;
  utterance.volume = 1.0;
  speechSynthesis.speak(utterance);
}

/**
 * Get the translation for an item in the currently selected language.
 * @param {object} item — content pack item (must have .translations object)
 * @returns {object|null} — { word, langName, emoji, speechLang } or null if language is 'none'
 */
function getTranslation(item) {
  var lang = getSelectedLanguage();
  if (lang.code === 'none' || !item.translations) return null;
  var word = item.translations[lang.code];
  if (!word) return null;
  return {
    word: word,
    langName: lang.name,
    emoji: lang.emoji,
    speechLang: lang.speechLang
  };
}
