// client/src/hooks/useToast.js
import { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import createToastService from '../utils/toastService';

/**
 * Custom hook that provides toast notifications with language support
 * @returns {Object} Toast service with success, error, info, and warn methods
 */
export const useToast = () => {
  // Get the translation function from language context
  const { t } = useLanguage();
  
  // Create toast service with memoization to avoid recreating on each render
  const toastService = useMemo(() => createToastService(t), [t]);
  
  return toastService;
};