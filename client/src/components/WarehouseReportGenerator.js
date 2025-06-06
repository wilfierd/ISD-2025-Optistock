// client/src/components/WarehouseReportGenerator.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';
import { utils, write } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import './WarehouseReportGenerator.css';

function WarehouseReportGenerator({ user }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const logoutMutation = useLogout();
  const tableRef = useRef(null);
  const sortByLabel = {
    id: 'ID',
    product_name: 'Product Name',
    inspection_date: 'Inspection Date'
  };
  
  // State for report settings
  const [reportTitle, setReportTitle] = useState('Warehouse Report April 2025');
  const [dateRangeInput, setDateRangeInput] = useState({
    from: '01/04/2025',
    to: '30/04/2025'
  });
  const [appliedDateRange, setAppliedDateRange] = useState({
    from: '01/04/2025',
    to: '30/04/2025'
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');
  const [selectedFields, setSelectedFields] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [reportTemplates, setReportTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [sortBy, setSortBy] = useState('id'); // Default sort by ID
  const [printOptions, setPrintOptions] = useState({
    includeHeaders: true,
    includeTitle: true,
    includeDateRange: true,
    includePageNumbers: true
  });
  
  // Fetch finished products
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['finished-products'],
    queryFn: async () => {
      const response = await apiService.finishedProducts.getAll();
      return response.data.data || [];
    },
    retry: 1,
  });

  // Create sample data if we don't have real data
  const reportData = products.length > 0 ? products : [
    { id: '001', product_code: 'BT-2025-V1', product_name: 'Button Control Module', quantity: 1000, status: 'in_stock', completion_date: '2025-04-18', created_at: '2025-04-20', group_id: 1 },
    { id: '002', product_code: 'KB-2025-C2021', product_name: 'Button Protection Frame', quantity: 450, status: 'in_stock', completion_date: '2025-04-19', created_at: '2025-04-20', group_id: 2 },
    { id: '003', product_code: 'BT-2025-V2', product_name: 'Button Control Module', quantity: 800, status: 'defective', completion_date: '2025-04-15', created_at: '2025-04-17', group_id: 1 },
    { id: '004', product_code: 'KB-2025-C2022', product_name: 'Button Protection Frame', quantity: 250, status: 'defective', completion_date: '2025-04-19', created_at: '2025-04-20', group_id: 2 },
    { id: '005', product_code: 'BT-2025-V3', product_name: 'Button Control Module', quantity: 20, status: 'defective', completion_date: '2025-05-11', created_at: '2025-05-11', group_id: 5 },
  ];

  // Field definitions with grouping
  const fieldGroups = [
    {
      name: 'Basic Information',
      fields: [
        { id: 'id', name: 'ID', selected: true },
        { id: 'product_code', name: 'Product Code', selected: true },
        { id: 'product_name', name: 'Product Name', selected: true },
        { id: 'product_type', name: 'Product Type', selected: true },
      ]
    },
    {
      name: 'Quantity & Status',
      fields: [
        { id: 'quantity', name: 'Quantity', selected: true },
        { id: 'status', name: 'Status', selected: true },
        { id: 'defect_count', name: 'Defect Count', selected: false },
      ]
    },
    {
      name: 'Time Information',
      fields: [
        { id: 'completion_date', name: 'Production Date', selected: true },
        { id: 'inspection_date', name: 'Inspection Date', selected: true },
      ]
    }
  ];

  // Initialize selected fields and load templates
  useEffect(() => {
    const initialSelected = [];
    
    fieldGroups.forEach(group => {
      group.fields.forEach(field => {
        if (field.selected) {
          initialSelected.push(field.id);
        }
      });
    });
    
    setSelectedFields(initialSelected);
    
    // In a real implementation, you would load the user's report templates from the API
    setReportTemplates([
      { id: 1, name: 'Default Template', fields: initialSelected },
      { id: 2, name: 'Minimal Template', fields: ['product_code', 'quantity', 'status'] },
      { id: 3, name: 'Full Report', fields: initialSelected.concat(['defect_count']) }
    ]);
  }, []);

  // Convert a date string to Date object
  const parseDate = (dateString) => {
    if (!dateString) return null;
    
    // Handle date format: "DD/MM/YYYY"
    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Handle ISO format
    return new Date(dateString);
  };

  // Handle field toggle
  const handleFieldToggle = (fieldId) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        return [...prev, fieldId];
      }
    });
  };

  // Select all fields in a group
  const selectAllInGroup = (groupIndex) => {
    const groupFieldIds = fieldGroups[groupIndex].fields.map(field => field.id);
    setSelectedFields(prev => {
      const withoutGroup = prev.filter(id => !groupFieldIds.includes(id));
      return [...withoutGroup, ...groupFieldIds];
    });
  };

  // Deselect all fields in a group
  const deselectAllInGroup = (groupIndex) => {
    const groupFieldIds = fieldGroups[groupIndex].fields.map(field => field.id);
    setSelectedFields(prev => prev.filter(id => !groupFieldIds.includes(id)));
  };

  // Handle timeframe selection
  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);
    
    const today = new Date();
    let fromDate = new Date();
    let toDate = new Date();
    
    switch(timeframe) {
      case 'today':
        // Keep from and to as today
        break;
      case 'week':
        fromDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case '30days':
        fromDate.setDate(today.getDate() - 30);
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        fromDate = new Date(today.getFullYear(), quarter * 3, 1);
        toDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
        break;
      default:
        break;
    }
    
    const newDateRange = {
      from: `${fromDate.getDate().toString().padStart(2, '0')}/${(fromDate.getMonth() + 1).toString().padStart(2, '0')}/${fromDate.getFullYear()}`,
      to: `${toDate.getDate().toString().padStart(2, '0')}/${(toDate.getMonth() + 1).toString().padStart(2, '0')}/${toDate.getFullYear()}`
    };
    
    setDateRangeInput(newDateRange);
    setAppliedDateRange(newDateRange); // Apply date range immediately when selecting a preset timeframe
  };

  // Load a template
  const loadTemplate = (templateId) => {
    const template = reportTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedFields(template.fields);
      setCurrentTemplate(template);
      setTemplateName(template.name);
    }
    setShowTemplateDropdown(false);
  };

  // Save current selection as template
  const saveAsTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    
    setIsSaving(true);
    
    // In a real implementation, you would save this to the API
    setTimeout(() => {
      const newTemplate = {
        id: reportTemplates.length + 1,
        name: templateName,
        fields: selectedFields
      };
      
      setReportTemplates(prev => [...prev, newTemplate]);
      setCurrentTemplate(newTemplate);
      
      toast.success('Template saved successfully');
      setIsSaving(false);
    }, 1000);
  };

  // Apply date range filter
  const handleApplyDateRange = () => {
    setAppliedDateRange(dateRangeInput);
    toast.info('Date range applied');
  };

  const deleteTemplate = (templateId, event) => {
    // Stop event propagation to prevent template selection when clicking delete
    if (event) {
      event.stopPropagation();
    }
    
    // Confirmation before deleting
    if (window.confirm('Are you sure you want to delete this template?')) {
      setIsSaving(true);
      
      // In a real implementation, you would delete from the API
      setTimeout(() => {
        // Filter out the template with the given ID
        const updatedTemplates = reportTemplates.filter(t => t.id !== templateId);
        setReportTemplates(updatedTemplates);
        
        // If the current template is being deleted, reset current template
        if (currentTemplate && currentTemplate.id === templateId) {
          setCurrentTemplate(null);
          setTemplateName('');
        }
        
        toast.success('Template deleted successfully');
        setIsSaving(false);
      }, 500);
    }
  };
  
  // Handle sort change
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  // Handle export to Excel
  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      
      // Create workbook
      const wb = utils.book_new();
      
      // Prepare header row
      const wsData = [];
      const headerRow = [];
      const selectedFieldNames = [];
      
      // Add title and date range if needed
      if (printOptions.includeTitle) {
        wsData.push([reportTitle]);
        wsData.push([]);  // Empty row
      }
      
      if (printOptions.includeDateRange) {
        wsData.push([`Date Range: ${appliedDateRange.from} - ${appliedDateRange.to}`]);
        wsData.push([]);  // Empty row
      }
      
      // Add headers
      selectedFields.forEach(field => {
        switch(field) {
          case 'id': headerRow.push('ID'); selectedFieldNames.push('id'); break;
          case 'product_code': headerRow.push('Product Code'); selectedFieldNames.push('product_code'); break;
          case 'product_name': headerRow.push('Product Name'); selectedFieldNames.push('product_name'); break;
          case 'product_type': headerRow.push('Product Type'); selectedFieldNames.push('product_type'); break;
          case 'quantity': headerRow.push('Quantity'); selectedFieldNames.push('quantity'); break;
          case 'status': headerRow.push('Status'); selectedFieldNames.push('status'); break;
          case 'defect_count': headerRow.push('Defect Count'); selectedFieldNames.push('defect_count'); break;
          case 'completion_date': headerRow.push('Production Date'); selectedFieldNames.push('completion_date'); break;
          case 'inspection_date': headerRow.push('Inspection Date'); selectedFieldNames.push('inspection_date'); break;
          default: break;
        }
      });
      
      wsData.push(headerRow);
      
      // Add data rows
      filteredAndSortedProducts.forEach((product, index) => {
        const row = [];
        selectedFieldNames.forEach(fieldName => {
          switch(fieldName) {
            case 'id': 
              row.push(product.id || `00${index + 1}`);
              break;
            case 'product_code': 
              row.push(product.product_code || `BT-2025-V${index + 1}`);
              break;
            case 'product_name': 
              row.push(product.product_name || 'Button Control Module');
              break;
            case 'product_type': 
              row.push(getProductType(product) || (index % 2 === 0 ? 'BT' : 'KB'));
              break;
            case 'quantity': 
              row.push(product.quantity || 1000 - (index * 200));
              break;
            case 'status': 
              row.push(getStatusDisplay(product.status) || (index % 2 === 0 ? 'OK' : 'NG'));
              break;
            case 'defect_count': 
              row.push(product.defect_count || (product.status === 'defective' ? product.quantity : 0));
              break;
            case 'completion_date': 
              row.push(formatDate(product.completion_date) || `${18 - index}/04/2025`);
              break;
            case 'inspection_date': 
              row.push(formatDate(product.created_at) || '20/04/2025');
              break;
            default:
              row.push('');
          }
        });
        wsData.push(row);
      });
      
      // Create worksheet and add to workbook
      const ws = utils.aoa_to_sheet(wsData);
      utils.book_append_sheet(wb, ws, "Warehouse Report");
      
      // Generate and download Excel file
      const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Ensure filename is not longer than 50 characters
      const truncatedFileName = reportTitle.replace(/\s+/g, '_');
      const limitedFileName = truncatedFileName.length > 50 ? truncatedFileName.substring(0, 50) : truncatedFileName;
      
      // Use saveAs from file-saver
      saveAs(blob, `${limitedFileName}.xlsx`);
      
      toast.success('Excel report exported successfully');
    } catch (error) {
      console.error('Error exporting Excel file:', error);
      toast.error('Failed to export Excel report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle export to PDF
  const handleExportPDF = () => {
    try {
      setIsExporting(true);
      
      // Create a new jsPDF instance
      const doc = new jsPDF();
      
      // Add title and date if needed
      let yPos = 20;
      
      if (printOptions.includeTitle) {
        doc.setFontSize(16);
        doc.text(reportTitle, 14, yPos);
        yPos += 10;
      }
      
      if (printOptions.includeDateRange) {
        doc.setFontSize(12);
        doc.text(`Date Range: ${appliedDateRange.from} - ${appliedDateRange.to}`, 14, yPos);
        yPos += 10;
      }
      
      // Set up columns for the table
      const columns = [];
      const selectedFieldNames = [];
      
      selectedFields.forEach(field => {
        switch(field) {
          case 'id':
            columns.push('ID');
            selectedFieldNames.push('id');
            break;
          case 'product_code':
            columns.push('Product Code');
            selectedFieldNames.push('product_code');
            break;
          case 'product_name':
            columns.push('Product Name');
            selectedFieldNames.push('product_name');
            break;
          case 'product_type':
            columns.push('Product Type');
            selectedFieldNames.push('product_type');
            break;
          case 'quantity':
            columns.push('Quantity');
            selectedFieldNames.push('quantity');
            break;
          case 'status':
            columns.push('Status');
            selectedFieldNames.push('status');
            break;
          case 'defect_count':
            columns.push('Defect Count');
            selectedFieldNames.push('defect_count');
            break;
          case 'completion_date':
            columns.push('Production Date');
            selectedFieldNames.push('completion_date');
            break;
          case 'inspection_date':
            columns.push('Inspection Date');
            selectedFieldNames.push('inspection_date');
            break;
          default:
            break;
        }
      });
      
      // Prepare data rows
      const rows = filteredAndSortedProducts.map((product, index) => {
        const row = [];
        
        selectedFieldNames.forEach(fieldName => {
          switch(fieldName) {
            case 'id':
              row.push(product.id || `00${index + 1}`);
              break;
            case 'product_code':
              row.push(product.product_code || `BT-2025-V${index + 1}`);
              break;
            case 'product_name':
              row.push(product.product_name || 'Button Control Module');
              break;
            case 'product_type':
              row.push(getProductType(product) || (index % 2 === 0 ? 'BT' : 'KB'));
              break;
            case 'quantity':
              row.push(product.quantity || 1000 - (index * 200));
              break;
            case 'status':
              row.push(getStatusDisplay(product.status) || (index % 2 === 0 ? 'OK' : 'NG'));
              break;
            case 'defect_count':
              row.push(product.defect_count || (product.status === 'defective' ? product.quantity : 0));
              break;
            case 'completion_date':
              row.push(formatDate(product.completion_date) || `${18 - index}/04/2025`);
              break;
            case 'inspection_date':
              row.push(formatDate(product.created_at) || '20/04/2025');
              break;
            default:
              row.push('');
          }
        });
        
        return row;
      });
      
      // Create the table
      autoTable(doc, {
        startY: yPos,
        head: printOptions.includeHeaders ? [columns] : [],
        body: rows,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [26, 75, 140],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { top: 20 },
        didDrawPage: function (data) {
          if (printOptions.includePageNumbers) {
            const str = `Page ${doc.internal.getNumberOfPages()}`;
            doc.setFontSize(10);
            doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
          }
        }
      });      
      
      // Ensure filename is not longer than 50 characters
      const truncatedFileName = reportTitle.replace(/\s+/g, '_');
      const limitedFileName = truncatedFileName.length > 50 ? truncatedFileName.substring(0, 50) : truncatedFileName;
      
      // Save the PDF
      doc.save(`${limitedFileName}.pdf`);
      
      toast.success('PDF report exported successfully');
    } catch (error) {
      console.error('Error exporting PDF file:', error);
      toast.error('Failed to export PDF report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle print preview
  const handlePrintPreview = () => {
    window.print();
  };

  // Handle preview report
  const handlePreviewReport = () => {
    setShowPreview(true);
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/product-warehouse');
  };

  // Handle field selection modal close
  const handleApplyFieldSelection = () => {
    setShowFieldSelector(false);
  };

  // Handle print option change
  const handlePrintOptionChange = (option) => {
    setPrintOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (e) {
      return dateString;
    }
  };

  // Filter and sort products based on applied date range and sort option
  const filteredAndSortedProducts = React.useMemo(() => {
    // First filter by date range - filter by inspection date (created_at)
    const filtered = reportData.filter(product => {
      const inspectionDate = product.created_at ? new Date(product.created_at) : null;
      
      if (!inspectionDate) return true; // Include products without dates
      
      const fromDate = parseDate(appliedDateRange.from);
      const toDate = parseDate(appliedDateRange.to);
      
      // If either date is invalid, don't filter
      if (!fromDate || !toDate) return true;
      
      // Set hours to include the full day
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      
      return inspectionDate >= fromDate && inspectionDate <= toDate;
    });
    
    // Then sort the filtered data
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'id':
          // Sort by numeric ID if possible, otherwise alphabetical
          const aId = parseInt(a.id);
          const bId = parseInt(b.id);
          if (!isNaN(aId) && !isNaN(bId)) {
            return aId - bId;
          }
          return String(a.id).localeCompare(String(b.id));
          
        case 'product_name':
          return (a.product_name || '').localeCompare(b.product_name || '');
          
        case 'inspection_date':
          const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
          const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
          return dateB - dateA; // Newest first
          
        default:
          return 0;
      }
    });
  }, [reportData, appliedDateRange, sortBy]);
  
  // Get status display
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'in_stock':
        return 'OK';
      case 'defective':
        return 'NG';
      case 'shipped':
        return 'Shipped';
      case 'reserved':
        return 'Reserved';
      default:
        return status || 'N/A';
    }
  };

  // Get status class
  const getStatusClass = (status) => {
    switch (status) {
      case 'in_stock':
      case 'OK':
        return 'status-ok';
      case 'defective':
      case 'NG':
        return 'status-ng';
      case 'shipped':
        return 'status-shipped';
      case 'reserved':
        return 'status-reserved';
      default:
        return 'status-pending';
    }
  };

  // Get product type from group_id
  const getProductType = (product) => {
    if (!product.group_id) return '-';
    
    // This is just a placeholder - you would map group IDs to product types
    // based on your actual data model
    const groupTypes = {
      1: 'BT', // Button components
      2: 'KB', // Keyboard parts
      // Add more mappings as needed
    };
    
    if (groupTypes[product.group_id]) {
      return groupTypes[product.group_id];
    }
    
    // If no explicit mapping exists, return "Group X"
    return `Group ${product.group_id}`;
  };

  // Field Selection Component
  const FieldSelector = React.memo(() => {
    // Use local state for template name to prevent parent re-renders
    const [localTemplateName, setLocalTemplateName] = useState(templateName);
    
    // Only update parent state when focus is lost
    const handleTemplateNameChange = (e) => {
      setLocalTemplateName(e.target.value);
    };
    
    // Update parent state when needed
    const handleTemplateSave = () => {
      setTemplateName(localTemplateName);
      saveAsTemplate();
    };
    
    return (
      <div className="modal-overlay">
        <div className="modal-container">
          <div className="modal-header">
            <h5>Select Display Fields</h5>
            <button 
              type="button" 
              className="close-btn"
              onClick={() => setShowFieldSelector(false)}
            >
              ×
            </button>
          </div>
          <div className="modal-body">
            <div className="template-section">
              <div className="template-select">
                <h6 className="mb-0">Report Templates:</h6>
                <div className="template-dropdown">
                  <button 
                    className="template-dropdown-btn"
                    onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                  >
                    <span>{currentTemplate ? currentTemplate.name : 'Select a template'}</span>
                    <i className={`fas fa-chevron-${showTemplateDropdown ? 'up' : 'down'}`}></i>
                  </button>
                  
                  {showTemplateDropdown && (
                    <div className="template-dropdown-menu">
                      {reportTemplates.length > 0 ? (
                        reportTemplates.map(template => (
                          <div 
                            key={template.id} 
                            className="template-dropdown-item"
                          >
                            <div 
                              className="template-name"
                              onClick={() => loadTemplate(template.id)}
                            >
                              {template.name}
                            </div>
                            <button 
                              className="template-delete-btn"
                              onClick={(e) => deleteTemplate(template.id, e)}
                              disabled={isSaving}
                              title="Delete template"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="template-dropdown-item template-empty">No templates available</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
  
              <div className="template-save">
                <input
                  type="text"
                  placeholder="Enter template name..."
                  value={localTemplateName}
                  onChange={handleTemplateNameChange}
                  className="template-name-input"
                  onBlur={() => setTemplateName(localTemplateName)}
                />
                <button 
                  className="toolbar-btn save-template-btn"
                  onClick={handleTemplateSave}
                  disabled={isSaving || !localTemplateName.trim()}
                >
                  {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                  {isSaving ? ' Saving...' : ' Save Template'}
                </button>
              </div>
            </div>
  
            <div className="recently-used">
              <h6>Recently Used</h6>
              <div className="recently-used-items">
                <div className="field-item">
                  <input
                    type="checkbox"
                    id="recent-product-code"
                    checked={selectedFields.includes('product_code')}
                    onChange={() => handleFieldToggle('product_code')}
                  />
                  <label htmlFor="recent-product-code">Product Code</label>
                </div>
                <div className="field-item">
                  <input
                    type="checkbox"
                    id="recent-quantity"
                    checked={selectedFields.includes('quantity')}
                    onChange={() => handleFieldToggle('quantity')}
                  />
                  <label htmlFor="recent-quantity">Quantity</label>
                </div>
                <div className="field-item">
                  <input
                    type="checkbox"
                    id="recent-status"
                    checked={selectedFields.includes('status')}
                    onChange={() => handleFieldToggle('status')}
                  />
                  <label htmlFor="recent-status">Status</label>
                </div>
              </div>
            </div>
  
            {fieldGroups.map((group, groupIndex) => (
              <div key={group.name} className="field-group">
                <div className="field-group-header">
                  <h6>{group.name}</h6>
                  <div>
                    <button 
                      className="toolbar-btn"
                      onClick={() => selectAllInGroup(groupIndex)}
                    >
                      Select All
                    </button>
                    <button 
                      className="toolbar-btn"
                      onClick={() => deselectAllInGroup(groupIndex)}
                    >
                      Deselect
                    </button>
                  </div>
                </div>
                
                <div className="field-list">
                  {group.fields.map(field => (
                    <div key={field.id} className="field-item">
                      <input
                        type="checkbox"
                        id={`field-${field.id}`}
                        checked={selectedFields.includes(field.id)}
                        onChange={() => handleFieldToggle(field.id)}
                      />
                      <label htmlFor={`field-${field.id}`}>
                        {field.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowFieldSelector(false)}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleApplyFieldSelection}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    );
  });

  // Report Preview Component
  const ReportPreview = () => {
    return (
      <div className="modal-overlay">
        <div className="modal-container preview-modal">
          <div className="modal-header">
            <h5>Report Preview</h5>
            <button 
              type="button" 
              className="close-btn"
              onClick={() => setShowPreview(false)}
            >
              ×
            </button>
          </div>
          <div className="modal-body">
            <div className="preview-container" ref={tableRef}>
              <div className="preview-header">
                {printOptions.includeTitle && (
                  <div className="preview-title">{reportTitle}</div>
                )}
                                      {printOptions.includeDateRange && (
                  <div className="preview-date">Date Range: {appliedDateRange.from} - {appliedDateRange.to}</div>
                )}
              </div>
              
              <table className="preview-table table-bordered">
                <thead>
                  {printOptions.includeHeaders && (
                    <tr>
                      <th>#</th>
                      {selectedFields.includes('id') && <th>ID</th>}
                      {selectedFields.includes('product_code') && <th>Product Code</th>}
                      {selectedFields.includes('product_name') && <th>Product Name</th>}
                      {selectedFields.includes('product_type') && <th>Product Type</th>}
                      {selectedFields.includes('quantity') && <th>Quantity</th>}
                      {selectedFields.includes('status') && <th>Status</th>}
                      {selectedFields.includes('defect_count') && <th>Defect Count</th>}
                      {selectedFields.includes('completion_date') && <th>Production Date</th>}
                      {selectedFields.includes('inspection_date') && <th>Inspection Date</th>}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {filteredAndSortedProducts.map((product, index) => (
                    <tr key={product.id || index}>
                      <td>{index + 1}</td>
                      {selectedFields.includes('id') && <td>{product.id || `00${index + 1}`}</td>}
                      {selectedFields.includes('product_code') && <td>{product.product_code || `BT-2025-V${index + 1}`}</td>}
                      {selectedFields.includes('product_name') && <td>{product.product_name || 'Button Control Module'}</td>}
                      {selectedFields.includes('product_type') && <td>{getProductType(product) || (index % 2 === 0 ? 'BT' : 'KB')}</td>}
                      {selectedFields.includes('quantity') && <td>{product.quantity || 1000 - (index * 200)}</td>}
                      {selectedFields.includes('status') && (
                        <td>
                          <span className={`status-badge ${getStatusClass(product.status || (index % 2 === 0 ? 'in_stock' : 'defective'))}`}>
                            {getStatusDisplay(product.status) || (index % 2 === 0 ? 'OK' : 'NG')}
                          </span>
                        </td>
                      )}
                      {selectedFields.includes('defect_count') && <td>{product.defect_count || (product.status === 'defective' ? product.quantity : 0)}</td>}
                      {selectedFields.includes('completion_date') && <td>{formatDate(product.completion_date) || `${18 - index}/04/2025`}</td>}
                      {selectedFields.includes('inspection_date') && <td>{formatDate(product.created_at) || '20/04/2025'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {printOptions.includePageNumbers && (
                <div className="preview-footer">
                  <div className="preview-page-info">Page 1 of 1</div>
                </div>
              )}
            </div>
            
            <div className="export-options">
              <div className="export-options-label">Preview Options:</div>
              <label className="export-option">
                <input
                  type="checkbox"
                  className="export-checkbox"
                  checked={printOptions.includeTitle}
                  onChange={() => handlePrintOptionChange('includeTitle')}
                />
                Include Title
              </label>
              <label className="export-option">
                <input
                  type="checkbox"
                  className="export-checkbox"
                  checked={printOptions.includeDateRange}
                  onChange={() => handlePrintOptionChange('includeDateRange')}
                />
                Include Date Range
              </label>
              <label className="export-option">
                <input
                  type="checkbox"
                  className="export-checkbox"
                  checked={printOptions.includeHeaders}
                  onChange={() => handlePrintOptionChange('includeHeaders')}
                />
                Include Headers
              </label>
              <label className="export-option">
                <input
                  type="checkbox"
                  className="export-checkbox"
                  checked={printOptions.includePageNumbers}
                  onChange={() => handlePrintOptionChange('includePageNumbers')}
                />
                Include Page Numbers
              </label>
              <button
                className="print-button"
                onClick={handlePrintPreview}
              >
                <i className="fas fa-print"></i> Print
              </button>
            </div>
          </div>
          <div className="modal-footer">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowPreview(false)}
            >
              Close
            </button>
            <div>
              <button 
                className="btn btn-success me-2" 
                onClick={handleExportExcel}
                disabled={isExporting}
              >
                <i className="fas fa-file-excel me-2"></i>
                {isExporting ? 'Exporting...' : 'Export Excel'}
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                <i className="fas fa-file-pdf me-2"></i>
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add validation for report title length when it's changed
  const handleReportTitleChange = (e) => {
    // Limit report title to 50 characters
    setReportTitle(e.target.value.substring(0, 50));
  };

  return (
    <div className="warehouse-report-generator">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container-fluid mt-4">
        <div className="report-card">
          <div className="report-header">
            <h5>Warehouse Report Generator</h5>
          </div>
          <div className="report-body">
            <div className="report-title-section">
              <div className="input-group">
                <div className="input-group-prepend">
                  <span className="input-group-text">Report Name:</span>
                </div>
                <input
                  type="text"
                  className="form-control"
                  id="reportTitle"
                  value={reportTitle}
                  onChange={handleReportTitleChange}
                  maxLength={50}
                />
                <div className="input-group-append d-flex">
                  <span className="input-group-text">
                    <i className="fas fa-info-circle me-1"></i>
                    Selected fields: <span className="ms-1 badge bg-primary">{selectedFields.length}</span>
                  </span>
                </div>
              </div>
              <small className="text-muted d-block mt-1">Report title length: {reportTitle.length}/50</small>
            </div>

            <div className="time-period-section">
              <h6>Time Period (Filter by Inspection Date) </h6>
            <small className="text-muted d-block mb-2">Changes will only be applied when you click the Apply button</small>
              <div className="btn-group time-period-buttons">
                <button 
                  type="button" 
                  className={`btn ${selectedTimeframe === 'today' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => handleTimeframeChange('today')}
                >
                  Today
                </button>
                <button 
                  type="button" 
                  className={`btn ${selectedTimeframe === 'week' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => handleTimeframeChange('week')}
                >
                  This Week
                </button>
                <button 
                  type="button" 
                  className={`btn ${selectedTimeframe === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => handleTimeframeChange('month')}
                >
                  This Month
                </button>
                <button 
                  type="button" 
                  className={`btn ${selectedTimeframe === '30days' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => handleTimeframeChange('30days')}
                >
                  Last 30 Days
                </button>
                <button 
                  type="button" 
                  className={`btn ${selectedTimeframe === 'quarter' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => handleTimeframeChange('quarter')}
                >
                  This Quarter
                </button>
              </div>

              <div className="date-range-selector">
                <div className="d-flex align-items-center">
                  <div className="date-range-input">
                    <label>From:</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={dateRangeInput.from}
                      onChange={(e) => setDateRangeInput({...dateRangeInput, from: e.target.value})}
                    />
                  </div>
                  <div className="date-range-input">
                    <label>To:</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={dateRangeInput.to}
                      onChange={(e) => setDateRangeInput({...dateRangeInput, to: e.target.value})}
                    />
                  </div>
                  <button className="btn btn-primary date-apply-btn" onClick={handleApplyDateRange}>
                    Apply
                  </button>
                </div>
              </div>
            </div>

            <div className="report-tools-section">
              <div className="export-buttons">
                <button 
                  className="export-btn excel"
                  onClick={handleExportExcel}
                  disabled={isExporting}
                >
                  <i className="fas fa-file-excel"></i> Export Excel
                </button>
                <button 
                  className="export-btn pdf"
                  onClick={handleExportPDF}
                  disabled={isExporting}
                >
                  <i className="fas fa-file-pdf"></i> Export PDF
                </button>
              </div>

              <div className="toolbar">
                <button 
                    className="toolbar-btn"
                    onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                >
                    {sortByLabel[sortBy] || 'Sort by'} ▼
                </button>

                {showTemplateDropdown && (
                    <div className="sort-dropdown-menu">
                    <div 
                        className="sort-dropdown-item"
                        onClick={() => {
                        setSortBy('id');
                        setShowTemplateDropdown(false);
                        }}
                    >
                        ID
                    </div>
                    <div 
                        className="sort-dropdown-item"
                        onClick={() => {
                        setSortBy('product_name');
                        setShowTemplateDropdown(false);
                        }}
                    >
                        Product Name
                    </div>
                    <div 
                        className="sort-dropdown-item"
                        onClick={() => {
                        setSortBy('inspection_date');
                        setShowTemplateDropdown(false);
                        }}
                    >
                        Inspection Date
                    </div>
                    </div>
                )}

                <button className="toolbar-btn" onClick={() => setShowFieldSelector(true)}>
                    <i className="fas fa-cog"></i> Edit Fields
                </button>
              </div>
            </div>

            <div className="report-data-section">
              <div className="table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {selectedFields.includes('id') && <th>ID</th>}
                      {selectedFields.includes('product_code') && <th>Product Code</th>}
                      {selectedFields.includes('product_name') && <th>Product Name</th>}
                      {selectedFields.includes('product_type') && <th>Product Type</th>}
                      {selectedFields.includes('quantity') && <th>Quantity</th>}
                      {selectedFields.includes('status') && <th>Status</th>}
                      {selectedFields.includes('defect_count') && <th>Defect Count</th>}
                      {selectedFields.includes('completion_date') && <th>Production Date</th>}
                      {selectedFields.includes('inspection_date') && <th>Inspection Date</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={selectedFields.length + 1} className="text-center py-3">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={selectedFields.length + 1} className="text-center py-3 text-danger">
                          Error loading data: {error.message}
                        </td>
                      </tr>
                    ) : filteredAndSortedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={selectedFields.length + 1} className="text-center py-3">
                          No products found in the selected date range
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedProducts.map((product, index) => (
                        <tr key={product.id || index}>
                          <td>{index + 1}</td>
                          {selectedFields.includes('id') && <td>{product.id || `00${index + 1}`}</td>}
                          {selectedFields.includes('product_code') && <td>{product.product_code || `BT-2025-V${index + 1}`}</td>}
                          {selectedFields.includes('product_name') && <td>{product.product_name || 'Button Control Module'}</td>}
                          {selectedFields.includes('product_type') && <td>{getProductType(product) || (index % 2 === 0 ? 'BT' : 'KB')}</td>}
                          {selectedFields.includes('quantity') && <td>{product.quantity || 1000 - (index * 200)}</td>}
                          {selectedFields.includes('status') && (
                            <td>
                              <span className={`status-badge ${getStatusClass(product.status || (index % 2 === 0 ? 'in_stock' : 'defective'))}`}>
                                {getStatusDisplay(product.status) || (index % 2 === 0 ? 'OK' : 'NG')}
                              </span>
                            </td>
                          )}
                          {selectedFields.includes('defect_count') && <td>{product.defect_count || (product.status === 'defective' ? product.quantity : 0)}</td>}
                          {selectedFields.includes('completion_date') && <td>{formatDate(product.completion_date) || `${18 - index}/04/2025`}</td>}
                          {selectedFields.includes('inspection_date') && <td>{formatDate(product.created_at) || '20/04/2025'}</td>}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="preview-notice">
                <i className="fas fa-info-circle"></i> This is only a preview. The full report will be displayed when generated.
              </div>
            </div>

            <div className="report-actions">
              <button 
                className="btn-preview" 
                onClick={handlePreviewReport}
              >
                <i className="fas fa-eye"></i> Preview Report
              </button>
              
              <div className="action-buttons">
                <button 
                  className="btn-cancel" 
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button 
                  className="btn-generate" 
                  onClick={handlePreviewReport}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Generating...
                    </>
                  ) : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Field Selection Modal */}
      {showFieldSelector && <FieldSelector />}
      
      {/* Report Preview Modal */}
      {showPreview && <ReportPreview />}
    </div>
  );
}

export default WarehouseReportGenerator;

// /* Template Management Styles for WarehouseReportGenerator.css */

// /* Template Section Layout */
