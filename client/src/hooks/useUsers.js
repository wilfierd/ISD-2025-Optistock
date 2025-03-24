// client/src/hooks/useUsers.js
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

// Hook to fetch all users
export const useUsers = () => {
  const { t } = useLanguage();
  
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await apiService.users.getAll();
        return response.data.data;
      } catch (error) {
        throw new Error(error.response?.data?.error || safeTranslate(t, 'failedToFetchUsers', 'Failed to fetch users'));
      }
    },
    retry: 1,
  });
};

// Hook to fetch a single user
export const useUser = (id) => {
  const { t } = useLanguage();
  
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      try {
        const response = await apiService.users.getById(id);
        return response.data.data;
      } catch (error) {
        throw new Error(error.response?.data?.error || safeTranslate(t, 'failedToFetchUserDetails', 'Failed to fetch user details'));
      }
    },
    retry: 1,
    enabled: !!id, // Only run the query if id is provided
  });
};

// Hook to create a new user
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  return useMutation({
    mutationFn: (userData) => apiService.users.create(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(safeTranslate(t, 'employeeAdded', 'Employee added successfully'));
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || safeTranslate(t, 'employeeAddFailed', 'Failed to add employee'));
    },
  });
};

// Hook to update an existing user
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  return useMutation({
    mutationFn: ({ id, data }) => apiService.users.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
      toast.success(safeTranslate(t, 'employeeUpdated', 'Employee updated successfully'));
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || safeTranslate(t, 'employeeUpdateFailed', 'Failed to update employee'));
    },
  });
};

// Hook to delete a user
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  return useMutation({
    mutationFn: (id) => apiService.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(safeTranslate(t, 'employeeDeleted', 'Employee deleted successfully'));
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || safeTranslate(t, 'employeeDeleteFailed', 'Failed to delete employee'));
    },
  });
};