// client/src/hooks/useDashboard.js
import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';
import config from '../config';

export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await apiService.dashboard.getData();
      
      if (response.data.success) {
        return response.data;
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    },
    retry: 1,
    staleTime: config.staleTime, // Use the staleTime from config
  });
};