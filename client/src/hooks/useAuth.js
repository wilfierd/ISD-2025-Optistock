// client/src/hooks/useAuth.js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';

export const useAuthStatus = () => {
  return useQuery({
    queryKey: ['authStatus'],
    queryFn: async () => {
      const response = await apiService.auth.checkStatus();
      return response.data;
    },
    retry: false,
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const { t } = useLanguage();

  const mutation = useMutation({
    mutationFn: (credentials) => apiService.auth.login(credentials),
    onSuccess: (response) => {
      // Update auth status in cache
      queryClient.setQueryData(['authStatus'], {
        authenticated: true,
        user: response.data.user,
      });
      
      // Clear any previous errors
      setError(null);
      
      // Show success message
      // Try to use translation, but fall back to a simple message
      try {
        toast.success(t('loginSuccess'));
      } catch (e) {
        toast.success('Login successful');
      }
      
      // Navigate to dashboard
      navigate('/dashboard');
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
      toast.error(err.response?.data?.error || 'Login failed');
    },
  });

  return {
    login: mutation.mutate,
    isLoading: mutation.isPending,
    error,
    setError,
  };
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: () => apiService.auth.logout(),
    onSuccess: () => {
      // Clear auth status in cache
      queryClient.setQueryData(['authStatus'], {
        authenticated: false,
        user: null,
      });
      
      // Invalidate all queries
      queryClient.invalidateQueries();
      
      // Show success message
      // Try to use translation, but fall back to a simple message
      try {
        toast.success(t('logoutSuccess'));
      } catch (e) {
        toast.success('Logged out successfully');
      }
      
      // Navigate to login
      navigate('/login');
    },
  });
};