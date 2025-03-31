// client/src/hooks/useMolds.js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import { toast } from 'react-toastify';

// Hook to fetch all molds
export const useMolds = () => {
  return useQuery({
    queryKey: ['molds'],
    queryFn: async () => {
      const response = await apiService.molds.getAll();
      return response.data.data;
    },
    retry: 1,
  });
};

// Hook to create a new mold
export const useCreateMold = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (moldData) => apiService.molds.create(moldData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['molds'] });
      toast.success('Mold added successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to add mold');
    },
  });
};

// Hook to update a mold
export const useUpdateMold = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => apiService.molds.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['molds'] });
      toast.success('Mold updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update mold');
    },
  });
};

// Hook to delete a mold
export const useDeleteMold = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => apiService.molds.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['molds'] });
      toast.success('Mold deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete mold');
    },
  });
};
