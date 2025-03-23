// client/src/utils/toastService.js
import { toast } from 'react-toastify';

// Create toast service with language support and fallback mechanism
const createToastService = (translateFn) => {
  // Helper function to safely translate a message
  const safeTranslate = (message) => {
    // If no translation function is provided, return the message as is
    if (!translateFn) return message;
    
    try {
      // Try to translate the message
      const translated = translateFn(message);
      
      // If translation returns undefined or the same as the key, it might be missing
      // In that case, return the original message or a fallback
      if (!translated || translated === message) {
        // Check if message looks like a key (no spaces, all lowercase)
        if (/^[a-z]+[A-Za-z]*$/.test(message)) {
          // Convert camelCase to readable text
          return message.replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase());
        }
        return message;
      }
      
      return translated;
    } catch (error) {
      // If translation fails for any reason, return the original message
      console.warn(`Translation failed for key: ${message}`, error);
      return message;
    }
  };
  
  return {
    success: (message, options = {}) => {
      const translatedMessage = safeTranslate(message);
      return toast.success(translatedMessage, options);
    },
    
    error: (message, options = {}) => {
      const translatedMessage = safeTranslate(message);
      return toast.error(translatedMessage, options);
    },
    
    info: (message, options = {}) => {
      const translatedMessage = safeTranslate(message);
      return toast.info(translatedMessage, options);
    },
    
    warn: (message, options = {}) => {
      const translatedMessage = safeTranslate(message);
      return toast.warn(translatedMessage, options);
    }
  };
};

export default createToastService;