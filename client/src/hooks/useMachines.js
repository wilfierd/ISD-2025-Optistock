// client/src/hooks/useMachines.js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import { toast } from 'react-toastify';

// Hook to fetch all machines
export const useMachines = () => {
  return useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const response = await apiService.machines.getAll();
      return response.data.data;
    },
    retry: 1,
  });
};

// Hook to create a new machine
export const useCreateMachine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (machineData) => apiService.machines.create(machineData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine added successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to add machine');
    },
  });
};

// Hook to update machine status
export const useUpdateMachineStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }) => apiService.machines.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine status updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update machine status');
    },
  });
};

// Hook to delete a machine
export const useDeleteMachine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => apiService.machines.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete machine');
    },
  });
};