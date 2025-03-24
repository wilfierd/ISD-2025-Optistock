// client/src/hooks/useMaterialRequests.js (fixed version with proper translations)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';

// Hook to fetch all material requests (admin only)
export const useMaterialRequests = (status = 'pending') => {
  const { t } = useLanguage();
  
  return useQuery({
    queryKey: ['materialRequests', status],
    queryFn: async () => {
      try {
        const response = await apiService.materialRequests.getAll(status);
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching material requests:', error);
        throw new Error(error.response?.data?.error || t('Failed to fetch material requests'));
      }
    },
    retry: 2,
    refetchOnWindowFocus: true,
  });
};

// Hook to fetch user's own material requests
export const useMyMaterialRequests = () => {
  const { t } = useLanguage();
  
  return useQuery({
    queryKey: ['myMaterialRequests'],
    queryFn: async () => {
      try {
        const response = await apiService.materialRequests.getMyRequests();
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching my material requests:', error);
        throw new Error(error.response?.data?.error || t('Failed to fetch your material requests'));
      }
    },
    retry: 2,
    refetchOnWindowFocus: true,
  });
};

// Hook to create a material request
export const useCreateMaterialRequest = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  return useMutation({
    mutationFn: async (requestData) => {
      try {
        const response = await apiService.materialRequests.create(requestData);
        return response.data;
      } catch (error) {
        console.error('Error creating material request:', error);
        throw new Error(error.response?.data?.error || t('Failed to submit request'));
      }
    },
    onSuccess: () => {
      // Invalidate both admin requests and user requests queries
      queryClient.invalidateQueries({ queryKey: ['myMaterialRequests'] });
      queryClient.invalidateQueries({ queryKey: ['materialRequests'] });
      
      // Show success message
      toast.success(t('requestSubmitted'));
    },
    onError: (error) => {
      toast.error(error.message || t('requestSubmitFailed'));
    },
  });
};

// Hook to process a material request (admin only)
export const useProcessMaterialRequest = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        const response = await apiService.materialRequests.process(id, data);
        return response.data;
      } catch (error) {
        console.error('Error processing material request:', error);
        throw new Error(error.response?.data?.error || t('Failed to process request'));
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['materialRequests'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Display appropriate success message based on the action taken
      const status = variables.data.status;
      if (status === 'approved') {
        toast.success(t('requestApproved'));
      } else {
        toast.success(t('requestRejected'));
      }
    },
    onError: (error) => {
      toast.error(error.message || t('requestProcessFailed'));
    },
  });
};