/**
 * Translations Service
 * Provides translations for English, Hindi, and Kannada
 */

export type Language = 'en' | 'hi' | 'kn';

export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  voiceCode: string; // For TTS
  whisperCode: string; // For Whisper API
}

export const LANGUAGES: Record<Language, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    voiceCode: 'en-IN',
    whisperCode: 'en',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    voiceCode: 'hi-IN',
    whisperCode: 'hi',
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    voiceCode: 'kn-IN',
    whisperCode: 'kn',
  },
};

// UI Translations
export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Home Screen
    welcome: 'Welcome to Vision Assist',
    doubleTapChat: 'Double tap for chat',
    tripleTapSOS: 'Triple tap for emergency',
    quadTapCurrency: 'Quadruple tap for currency',
    describeScene: 'Describe Scene',
    scanCurrency: 'Scan Currency',
    emergencySOS: 'Emergency SOS',
    language: 'Language',
    
    // Chat Screen
    chatMode: 'Chat mode. Tap to capture. Hold to speak. Double tap to exit.',
    tapToCapture: 'Tap anywhere to capture',
    doubleTapExit: 'Double tap to exit',
    holdToSpeak: 'Hold anywhere to speak',
    analyzing: 'Analyzing',
    listening: 'Listening',
    processing: 'Processing',
    thinking: 'Thinking',
    capturing: 'Capturing',
    exitingChat: 'Exiting chat',
    holdMicToAsk: 'Hold anywhere to ask a question',
    captureError: 'Could not capture image',
    recordingFailed: 'Recording failed',
    
    // Currency Screen
    currencyScanner: 'Currency scanner. Tap to scan. Double tap to go back.',
    tapToScan: 'Tap anywhere to scan',
    scanning: 'Scanning',
    goingBack: 'Going back',
    total: 'Total',
    rupees: 'rupees',
    dollars: 'dollars',
    noCurrencyDetected: 'No currency detected. Tap to try again.',
    
    // SOS Screen
    sosScreen: 'SOS Emergency screen. Tap SOS for help. Hold anywhere to record voice message.',
    emergencyAlert: 'Emergency alert',
    seconds: 'seconds',
    sending: 'Sending',
    cancelled: 'Cancelled',
    addContact: 'Add Contact',
    recording: 'Recording',
    releaseToSend: 'Release to send',
    
    // Common
    camera: 'Camera',
    microphone: 'Microphone',
    enableCamera: 'Enable Camera',
    cameraNeeded: 'Camera access is needed',
  },
  hi: {
    // Home Screen
    welcome: 'विज़न असिस्ट में आपका स्वागत है',
    doubleTapChat: 'चैट के लिए दो बार टैप करें',
    tripleTapSOS: 'आपातकाल के लिए तीन बार टैप करें',
    quadTapCurrency: 'मुद्रा के लिए चार बार टैप करें',
    describeScene: 'दृश्य का वर्णन करें',
    scanCurrency: 'मुद्रा स्कैन करें',
    emergencySOS: 'आपातकालीन SOS',
    language: 'भाषा',
    
    // Chat Screen
    chatMode: 'चैट मोड। कैप्चर करने के लिए टैप करें। बोलने के लिए होल्ड करें। बाहर निकलने के लिए डबल टैप करें।',
    tapToCapture: 'कैप्चर करने के लिए कहीं भी टैप करें',
    doubleTapExit: 'बाहर निकलने के लिए डबल टैप करें',
    holdToSpeak: 'बोलने के लिए कहीं भी होल्ड करें',
    analyzing: 'विश्लेषण हो रहा है',
    listening: 'सुन रहा है',
    processing: 'प्रोसेसिंग',
    thinking: 'सोच रहा है',
    capturing: 'कैप्चर हो रहा है',
    exitingChat: 'चैट से बाहर निकल रहे हैं',
    holdMicToAsk: 'सवाल पूछने के लिए कहीं भी होल्ड करें',
    captureError: 'इमेज कैप्चर नहीं हो सकी',
    recordingFailed: 'रिकॉर्डिंग विफल',
    
    // Currency Screen
    currencyScanner: 'मुद्रा स्कैनर। स्कैन करने के लिए टैप करें। वापस जाने के लिए डबल टैप करें।',
    tapToScan: 'स्कैन करने के लिए कहीं भी टैप करें',
    scanning: 'स्कैन हो रहा है',
    goingBack: 'वापस जा रहे हैं',
    total: 'कुल',
    rupees: 'रुपये',
    dollars: 'डॉलर',
    noCurrencyDetected: 'कोई मुद्रा नहीं मिली। फिर से टैप करें।',
    
    // SOS Screen
    sosScreen: 'SOS आपातकालीन स्क्रीन। मदद के लिए SOS टैप करें। वॉइस संदेश के लिए होल्ड करें।',
    emergencyAlert: 'आपातकालीन अलर्ट',
    seconds: 'सेकंड',
    sending: 'भेज रहा है',
    cancelled: 'रद्द',
    addContact: 'संपर्क जोड़ें',
    recording: 'रिकॉर्डिंग',
    releaseToSend: 'भेजने के लिए छोड़ें',
    
    // Common
    camera: 'कैमरा',
    microphone: 'माइक्रोफोन',
    enableCamera: 'कैमरा चालू करें',
    cameraNeeded: 'कैमरा एक्सेस आवश्यक है',
  },
  kn: {
    // Home Screen
    welcome: 'ವಿಷನ್ ಅಸಿಸ್ಟ್‌ಗೆ ಸುಸ್ವಾಗತ',
    doubleTapChat: 'ಚಾಟ್‌ಗಾಗಿ ಎರಡು ಬಾರಿ ಟ್ಯಾಪ್ ಮಾಡಿ',
    tripleTapSOS: 'ತುರ್ತು ಸಂದರ್ಭಕ್ಕೆ ಮೂರು ಬಾರಿ ಟ್ಯಾಪ್ ಮಾಡಿ',
    quadTapCurrency: 'ಕರೆನ್ಸಿಗಾಗಿ ನಾಲ್ಕು ಬಾರಿ ಟ್ಯಾಪ್ ಮಾಡಿ',
    describeScene: 'ದೃಶ್ಯವನ್ನು ವಿವರಿಸಿ',
    scanCurrency: 'ಕರೆನ್ಸಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    emergencySOS: 'ತುರ್ತು SOS',
    language: 'ಭಾಷೆ',
    
    // Chat Screen
    chatMode: 'ಚಾಟ್ ಮೋಡ್. ಕ್ಯಾಪ್ಚರ್ ಮಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ. ಮಾತನಾಡಲು ಹೋಲ್ಡ್ ಮಾಡಿ. ಹೊರಗೆ ಹೋಗಲು ಡಬಲ್ ಟ್ಯಾಪ್.',
    tapToCapture: 'ಕ್ಯಾಪ್ಚರ್ ಮಾಡಲು ಎಲ್ಲಿಯಾದರೂ ಟ್ಯಾಪ್ ಮಾಡಿ',
    doubleTapExit: 'ಹೊರಗೆ ಹೋಗಲು ಡಬಲ್ ಟ್ಯಾಪ್ ಮಾಡಿ',
    holdToSpeak: 'ಮಾತನಾಡಲು ಎಲ್ಲಿಯಾದರೂ ಹೋಲ್ಡ್ ಮಾಡಿ',
    analyzing: 'ವಿಶ್ಲೇಷಿಸುತ್ತಿದೆ',
    listening: 'ಕೇಳುತ್ತಿದೆ',
    processing: 'ಪ್ರಕ್ರಿಯೆ',
    thinking: 'ಯೋಚಿಸುತ್ತಿದೆ',
    capturing: 'ಕ್ಯಾಪ್ಚರ್ ಆಗುತ್ತಿದೆ',
    exitingChat: 'ಚಾಟ್‌ನಿಂದ ಹೊರಗೆ ಹೋಗುತ್ತಿದೆ',
    holdMicToAsk: 'ಪ್ರಶ್ನೆ ಕೇಳಲು ಎಲ್ಲಿಯಾದರೂ ಹೋಲ್ಡ್ ಮಾಡಿ',
    captureError: 'ಚಿತ್ರ ಕ್ಯಾಪ್ಚರ್ ಆಗಲಿಲ್ಲ',
    recordingFailed: 'ರೆಕಾರ್ಡಿಂಗ್ ವಿಫಲವಾಯಿತು',
    
    // Currency Screen
    currencyScanner: 'ಕರೆನ್ಸಿ ಸ್ಕ್ಯಾನರ್. ಸ್ಕ್ಯಾನ್ ಮಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ. ಹಿಂದೆ ಹೋಗಲು ಡಬಲ್ ಟ್ಯಾಪ್.',
    tapToScan: 'ಸ್ಕ್ಯಾನ್ ಮಾಡಲು ಎಲ್ಲಿಯಾದರೂ ಟ್ಯಾಪ್ ಮಾಡಿ',
    scanning: 'ಸ್ಕ್ಯಾನ್ ಆಗುತ್ತಿದೆ',
    goingBack: 'ಹಿಂದೆ ಹೋಗುತ್ತಿದೆ',
    total: 'ಒಟ್ಟು',
    rupees: 'ರೂಪಾಯಿ',
    dollars: 'ಡಾಲರ್',
    noCurrencyDetected: 'ಕರೆನ್ಸಿ ಕಂಡುಬಂದಿಲ್ಲ. ಮತ್ತೆ ಟ್ಯಾಪ್ ಮಾಡಿ.',
    
    // SOS Screen
    sosScreen: 'SOS ತುರ್ತು ಪರದೆ. ಸಹಾಯಕ್ಕಾಗಿ SOS ಟ್ಯಾಪ್ ಮಾಡಿ. ಧ್ವನಿ ಸಂದೇಶಕ್ಕಾಗಿ ಹೋಲ್ಡ್ ಮಾಡಿ.',
    emergencyAlert: 'ತುರ್ತು ಎಚ್ಚರಿಕೆ',
    seconds: 'ಸೆಕೆಂಡುಗಳು',
    sending: 'ಕಳುಹಿಸುತ್ತಿದೆ',
    cancelled: 'ರದ್ದು',
    addContact: 'ಸಂಪರ್ಕ ಸೇರಿಸಿ',
    recording: 'ರೆಕಾರ್ಡಿಂಗ್',
    releaseToSend: 'ಕಳುಹಿಸಲು ಬಿಡುಗಡೆ ಮಾಡಿ',
    
    // Common
    camera: 'ಕ್ಯಾಮೆರಾ',
    microphone: 'ಮೈಕ್ರೋಫೋನ್',
    enableCamera: 'ಕ್ಯಾಮೆರಾ ಸಕ್ರಿಯಗೊಳಿಸಿ',
    cameraNeeded: 'ಕ್ಯಾಮೆರಾ ಪ್ರವೇಶ ಅಗತ್ಯ',
  },
};

// Get translation for current language
export function t(key: string, lang: Language = 'en'): string {
  return translations[lang]?.[key] || translations.en[key] || key;
}

// Get AI prompt language instruction
export function getAILanguageInstruction(lang: Language): string {
  switch (lang) {
    case 'hi':
      return 'IMPORTANT: You MUST respond ONLY in Hindi (हिंदी). Do NOT use English. Use simple, everyday Hindi words. Example: "यहाँ एक मेज है जिस पर किताबें रखी हैं।"';
    case 'kn':
      return 'IMPORTANT: You MUST respond ONLY in Kannada (ಕನ್ನಡ). Do NOT use English. Use simple, everyday Kannada words. Example: "ಇಲ್ಲಿ ಒಂದು ಮೇಜಿದೆ, ಅದರ ಮೇಲೆ ಪುಸ್ತಕಗಳಿವೆ."';
    default:
      return 'Respond in English.';
  }
}
