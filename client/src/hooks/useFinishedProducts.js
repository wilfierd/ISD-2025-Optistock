// client/src/hooks/useFinishedProducts.js
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

// Hook to fetch all finished products
export const useFinishedProducts = () => {
  return useQuery({
    queryKey: ['finished-products'],
    queryFn: async () => {
      const response = await apiService.finishedProducts.getAll();
      return response.data.data || [];
    },
    retry: 1,
  });
};

// Hook to fetch a single finished product by ID
export const useFinishedProduct = (productId) => {
  return useQuery({
    queryKey: ['finished-product', productId],
    queryFn: async () => {
      if (!productId) return null;
      const response = await apiService.finishedProducts.getById(productId);
      return response.data.data || null;
    },
    retry: 1,
    enabled: !!productId,
  });
};

// Hook to create a new finished product
export const useCreateFinishedProduct = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  return useMutation({
    mutationFn: (productData) => apiService.finishedProducts.create(productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finished-products'] });
      toast.success(safeTranslate(t, 'productAdded', 'Product added successfully'));
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || safeTranslate(t, 'productAddFailed', 'Failed to add product'));
    },
  });
};

// Hook to update product status
export const useUpdateProductStatus = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  return useMutation({
    mutationFn: ({ id, status }) => apiService.finishedProducts.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finished-products'] });
      toast.success(safeTranslate(t, 'productStatusUpdated', 'Product status updated successfully'));
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || safeTranslate(t, 'productStatusUpdateFailed', 'Failed to update product status'));
    },
  });
};

// Hook for scanning QR codes (simulated)
export const useQRScanner = () => {
  const { t } = useLanguage();
  
  const scanQRCode = async (qrData) => {
    try {
      // Parse QR data
      let productId;
      
      if (typeof qrData === 'string') {
        // Try to parse as JSON
        try {
          const data = JSON.parse(qrData);
          productId = data.id;
        } catch (e) {
          // If not valid JSON, check for direct ID
          if (/^\d+$/.test(qrData.trim())) {
            productId = parseInt(qrData.trim());
          } else if (qrData.includes('/product/')) {
            // Extract ID from URL format
            const parts = qrData.split('/product/');
            const idPart = parts[parts.length - 1].trim();
            const matches = idPart.match(/^(\d+)/);
            if (matches && matches[1]) {
              productId = parseInt(matches[1]);
            }
          }
        }
      } else if (typeof qrData === 'object' && qrData !== null) {
        // If already an object
        productId = qrData.id;
      }
      
      if (!productId) {
        throw new Error(safeTranslate(t, 'invalidQrCode', 'Invalid QR code'));
      }
      
      // Fetch product data
      const response = await apiService.finishedProducts.getById(productId);
      return response.data.data;
    } catch (error) {
      throw new Error(error.message || safeTranslate(t, 'scanError', 'Error scanning QR code'));
    }
  };
  
  return { scanQRCode };
};

// Hook for report templates and field selection
export const useReportFields = () => {
  const { t } = useLanguage();
  
  // Define available field groups
  const getFieldGroups = () => [
    {
      id: 'general',
      name: safeTranslate(t, 'generalFields', 'General Fields'),
      fields: [
        { id: 'id', name: safeTranslate(t, 'batchId', 'Batch ID'), default: true },
        { id: 'group_id', name: safeTranslate(t, 'groupId', 'Group ID'), default: true },
        { id: 'product_name', name: safeTranslate(t, 'productName', 'Product Name'), default: true },
        { id: 'product_code', name: safeTranslate(t, 'productCode', 'Product Code'), default: true },
        { id: 'quantity', name: safeTranslate(t, 'quantity', 'Quantity'), default: true },
        { id: 'completion_date', name: safeTranslate(t, 'completionDate', 'Completion Date'), default: true },
        { id: 'status', name: safeTranslate(t, 'status', 'Status'), default: true },
        { id: 'created_by', name: safeTranslate(t, 'createdBy', 'Created By'), default: false },
        { id: 'created_at', name: safeTranslate(t, 'createdAt', 'Created At'), default: false },
      ]
    },
    {
      id: 'material',
      name: safeTranslate(t, 'materialFields', 'Material Fields'),
      fields: [
        { id: 'material_id', name: safeTranslate(t, 'materialId', 'Material ID'), default: false },
        { id: 'material_name', name: safeTranslate(t, 'materialName', 'Material Name'), default: true },
        { id: 'material_code', name: safeTranslate(t, 'materialCode', 'Material Code'), default: true },
        { id: 'material_type', name: safeTranslate(t, 'materialType', 'Material Type'), default: false },
        { id: 'supplier', name: safeTranslate(t, 'supplier', 'Supplier'), default: true },
        { id: 'material_length', name: safeTranslate(t, 'length', 'Length'), default: false },
        { id: 'material_width', name: safeTranslate(t, 'width', 'Width'), default: false },
      ]
    },
    {
      id: 'production',
      name: safeTranslate(t, 'productionFields', 'Production Fields'),
      fields: [
        { id: 'machine_id', name: safeTranslate(t, 'machineId', 'Machine ID'), default: false },
        { id: 'machine_name', name: safeTranslate(t, 'machineName', 'Machine Name'), default: true },
        { id: 'mold_id', name: safeTranslate(t, 'moldId', 'Mold ID'), default: false },
        { id: 'mold_code', name: safeTranslate(t, 'moldCode', 'Mold Code'), default: true },
        { id: 'production_start_date', name: safeTranslate(t, 'startDate', 'Start Date'), default: true },
        { id: 'production_end_date', name: safeTranslate(t, 'endDate', 'End Date'), default: false },
        { id: 'expected_output', name: safeTranslate(t, 'expectedOutput', 'Expected Output'), default: false },
        { id: 'actual_output', name: safeTranslate(t, 'actualOutput', 'Actual Output'), default: false },
      ]
    },
    {
      id: 'assembly',
      name: safeTranslate(t, 'assemblyFields', 'Assembly Fields'),
      fields: [
        { id: 'assembly_id', name: safeTranslate(t, 'assemblyId', 'Assembly ID'), default: false },
        { id: 'assembly_date', name: safeTranslate(t, 'assemblyDate', 'Assembly Date'), default: true },
        { id: 'assembly_completion_date', name: safeTranslate(t, 'assemblyCompletionDate', 'Assembly Completion Date'), default: false },
        { id: 'pic_id', name: safeTranslate(t, 'picId', 'PIC ID'), default: false },
        { id: 'pic_name', name: safeTranslate(t, 'picName', 'PIC Name'), default: true },
        { id: 'product_quantity', name: safeTranslate(t, 'assemblyQuantity', 'Assembly Quantity'), default: false },
      ]
    },
    {
      id: 'plating',
      name: safeTranslate(t, 'platingFields', 'Plating Fields'),
      fields: [
        { id: 'plating_id', name: safeTranslate(t, 'platingId', 'Plating ID'), default: false },
        { id: 'plating_date', name: safeTranslate(t, 'platingDate', 'Plating Date'), default: true },
        { id: 'plating_completion_date', name: safeTranslate(t, 'platingCompletionDate', 'Plating Completion Date'), default: true },
        { id: 'plating_status', name: safeTranslate(t, 'platingStatus', 'Plating Status'), default: false },
      ]
    },
    {
      id: 'quality',
      name: safeTranslate(t, 'qualityFields', 'Quality Fields'),
      fields: [
        { id: 'quality_status', name: safeTranslate(t, 'qualityStatus', 'Quality Status'), default: true },
        { id: 'defect_count', name: safeTranslate(t, 'defectCount', 'Defect Count'), default: false },
        { id: 'inspection_date', name: safeTranslate(t, 'inspectionDate', 'Inspection Date'), default: false },
        { id: 'inspector_id', name: safeTranslate(t, 'inspectorId', 'Inspector ID'), default: false },
        { id: 'inspector_name', name: safeTranslate(t, 'inspectorName', 'Inspector Name'), default: false },
        { id: 'quality_notes', name: safeTranslate(t, 'qualityNotes', 'Quality Notes'), default: false },
      ]
    },
  ];
  
  // Define available templates
  const getTemplates = () => [
    { id: 'default', name: safeTranslate(t, 'defaultTemplate', 'Default Template') },
    { id: 'basic', name: safeTranslate(t, 'basicInfoTemplate', 'Basic Info Template') },
    { id: 'production', name: safeTranslate(t, 'productionTemplate', 'Production Template') },
    { id: 'quality', name: safeTranslate(t, 'qualityTemplate', 'Quality Template') },
  ];
  
  return { getFieldGroups, getTemplates };
};