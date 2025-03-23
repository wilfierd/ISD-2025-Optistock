// client/src/hooks/useMaterialRequests.js (fixed version)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';

// Helper function for safe translations
const safeTranslate = (t, key, fallback) => {
  try {
    if (t) {
      const translated = t(key);
      return translated === key ? fallback : translated;
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
};

// Hook to fetch all material requests (admin only)
export const useMaterialRequests = (status = 'pending') => {
  return useQuery({
    queryKey: ['materialRequests', status],
    queryFn: async () => {
      try {
        const response = await apiService.materialRequests.getAll(status);
        console.log('Material requests data:', response.data);
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching material requests:', error);
        throw new Error(error.response?.data?.error || 'Failed to fetch material requests');
      }
    },
    retry: 2,
    refetchOnWindowFocus: true,
  });
};

// Hook to fetch user's own material requests
export const useMyMaterialRequests = () => {
  return useQuery({
    queryKey: ['myMaterialRequests'],
    queryFn: async () => {
      try {
        const response = await apiService.materialRequests.getMyRequests();
        console.log('My requests data:', response.data);
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching my material requests:', error);
        throw new Error(error.response?.data?.error || 'Failed to fetch your material requests');
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
        console.log('Creating material request with data:', requestData);
        const response = await apiService.materialRequests.create(requestData);
        return response.data;
      } catch (error) {
        console.error('Error creating material request:', error);
        throw new Error(error.response?.data?.error || 'Failed to submit request');
      }
    },
    onSuccess: () => {
      // Invalidate both admin requests and user requests queries
      queryClient.invalidateQueries({ queryKey: ['myMaterialRequests'] });
      queryClient.invalidateQueries({ queryKey: ['materialRequests'] });
      toast.success(safeTranslate(t, 'requestSubmitted', 'Request submitted successfully'));
    },
    onError: (error) => {
      toast.error(error.message || safeTranslate(t, 'requestSubmitFailed', 'Failed to submit request'));
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
        console.log(`Processing request ${id} with data:`, data);
        const response = await apiService.materialRequests.process(id, data);
        return response.data;
      } catch (error) {
        console.error('Error processing material request:', error);
        throw new Error(error.response?.data?.error || 'Failed to process request');
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
        toast.success(safeTranslate(t, 'requestApproved', 'Request approved successfully'));
      } else {
        toast.success(safeTranslate(t, 'requestRejected', 'Request rejected successfully'));
      }
    },
    onError: (error) => {
      toast.error(error.message || safeTranslate(t, 'requestProcessFailed', 'Failed to process request'));
    },
  });
};