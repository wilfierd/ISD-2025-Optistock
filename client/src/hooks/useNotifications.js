// client/src/hooks/useNotifications.js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import { toast } from 'react-toastify';

// Hook to fetch user notifications
export const useNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await apiService.notifications.getAll();
      return response.data.data;
    },
    refetchInterval: 60000, // Refetch every minute
    retry: 1,
  });
};

// Hook to mark notifications as read
export const useMarkNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationIds) => apiService.notifications.markAsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to mark notifications as read');
    },
  });
};