// client/src/hooks/useNotifications.js - Cải thiện với thêm chức năng
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';

// Hook to fetch user notifications
export const useNotifications = () => {
  const { t } = useLanguage();
<<<<<<< HEAD
=======
  
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await apiService.notifications.getAll();
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching notifications:', error);
        throw new Error(error.response?.data?.error || t('Không thể tải thông báo'));
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    retry: 1,
  });
};

// Hook to fetch unread notifications count (for badge)
export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: ['unreadNotificationsCount'],
    queryFn: async () => {
      try {
        const response = await apiService.notifications.getUnreadCount();
        return response.data.count || 0;
      } catch (error) {
        console.error('Error fetching unread notifications count:', error);
        return 0; // Default to 0 in case of error
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    retry: 1,
  });
};

// Hook to mark notifications as read
export const useMarkNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  return useMutation({
    mutationFn: (notificationIds) => apiService.notifications.markAsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || t('Không thể đánh dấu thông báo đã đọc'));
    },
  });
};