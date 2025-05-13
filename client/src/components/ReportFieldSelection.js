// client/src/components/ReportFieldSelection.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';
import { useFinishedProducts } from '../hooks/useFinishedProducts';
import './ReportFieldSelection.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function ReportFieldSelection({ user }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [recentlyUsedFields, setRecentlyUsedFields] = useState([]);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [showPreview, setShowPreview] = useState(false);
  const [fileName, setFileName] = useState('inventory_report');
  const [reportTitle, setReportTitle] = useState('Inventory Report');
  const previewContainerRef = useRef(null);
  
  // Fetch products for report
  const { data: products = [], isLoading: productsLoading } = useFinishedProducts();
  
  const logoutMutation = useLogout();
  
  // Define field groups with their fields
  const fieldGroups = [
    {
      id: 'general',
      name: t('generalFields'),
      fields: [
        { id: 'id', name: t('batchId'), default: true },
        { id: 'group_id', name: t('groupId'), default: true },
        { id: 'product_name', name: t('productName'), default: true },
        { id: 'product_code', name: t('productCode'), default: true },
        { id: 'quantity', name: t('quantity'), default: true },
        { id: 'completion_date', name: t('completionDate'), default: true },
        { id: 'status', name: t('status'), default: true },
        { id: 'created_by', name: t('createdBy'), default: false },
        { id: 'created_at', name: t('createdAt'), default: false },
      ]
    },
    {
      id: 'material',
      name: t('materialFields'),
      fields: [
        { id: 'material_id', name: t('materialId'), default: false },
        { id: 'material_name', name: t('materialName'), default: true },
        { id: 'material_code', name: t('materialCode'), default: true },
        { id: 'material_type', name: t('materialType'), default: false },
        { id: 'supplier', name: t('supplier'), default: true },
        { id: 'material_length', name: t('length'), default: false },
        { id: 'material_width', name: t('width'), default: false },
      ]
    },
    {
      id: 'production',
      name: t('productionFields'),
      fields: [
        { id: 'machine_id', name: t('machineId'), default: false },
        { id: 'machine_name', name: t('machineName'), default: true },
        { id: 'mold_id', name: t('moldId'), default: false },
        { id: 'mold_code', name: t('moldCode'), default: true },
        { id: 'production_start_date', name: t('startDate'), default: true },
        { id: 'production_end_date', name: t('endDate'), default: false },
        { id: 'expected_output', name: t('expectedOutput'), default: false },
        { id: 'actual_output', name: t('actualOutput'), default: false },
      ]
    },
    {
      id: 'assembly',
      name: t('assemblyFields'),
      fields: [
        { id: 'assembly_id', name: t('assemblyId'), default: false },
        { id: 'assembly_date', name: t('assemblyDate'), default: true },
        { id: 'assembly_completion_date', name: t('assemblyCompletionDate'), default: false },
        { id: 'pic_id', name: t('picId'), default: false },
        { id: 'pic_name', name: t('picName'), default: true },
        { id: 'product_quantity', name: t('assemblyQuantity'), default: false },
      ]
    },
    {
      id: 'plating',
      name: t('platingFields'),
      fields: [
        { id: 'plating_id', name: t('platingId'), default: false },
        { id: 'plating_date', name: t('platingDate'), default: true },
        { id: 'plating_completion_date', name: t('platingCompletionDate'), default: true },
        { id: 'plating_status', name: t('platingStatus'), default: false },
      ]
    },
    {
      id: 'quality',
      name: t('qualityFields'),
      fields: [
        { id: 'quality_status', name: t('qualityStatus'), default: true },
        { id: 'defect_count', name: t('defectCount'), default: false },
        { id: 'inspection_date', name: t('inspectionDate'), default: false },
        { id: 'inspector_id', name: t('inspectorId'), default: false },
        { id: 'inspector_name', name: t('inspectorName'), default: false },
        { id: 'quality_notes', name: t('qualityNotes'), default: false },
      ]
    },
  ];
  
  // Get report templates (mock data, would be from API in real implementation)
  const templates = [
    { id: 'default', name: t('defaultTemplate') },
    { id: 'basic', name: t('basicInfoTemplate') },
    { id: 'production', name: t('productionTemplate') },
    { id: 'quality', name: t('qualityTemplate') },
  ];
  
  // Load saved field preferences on component mount
  useEffect(() => {
    // Initialize with default fields
    const defaultFields = [];
    fieldGroups.forEach(group => {
      group.fields.forEach(field => {
        if (field.default) {
          defaultFields.push(field.id);
        }
      });
    });
    
    // Load from localStorage
    const savedFields = localStorage.getItem('reportSelectedFields');
    const recentFields = localStorage.getItem('recentlyUsedFields');
    const savedReportTitle = localStorage.getItem('reportTitle');
    const savedFileName = localStorage.getItem('reportFileName');
    
    if (savedFields) {
      try {
        setSelectedFields(JSON.parse(savedFields));
      } catch (e) {
        setSelectedFields(defaultFields);
      }
    } else {
      setSelectedFields(defaultFields);
    }
    
    if (recentFields) {
      try {
        setRecentlyUsedFields(JSON.parse(recentFields));
      } catch (e) {
        setRecentlyUsedFields([]);
      }
    }
    
    if (savedReportTitle) {
      setReportTitle(savedReportTitle);
    }
    
    if (savedFileName) {
      setFileName(savedFileName);
    }
    
  }, [fieldGroups]);
  
  // Save selected fields to localStorage when they change
  useEffect(() => {
    if (selectedFields.length > 0) {
      localStorage.setItem('reportSelectedFields', JSON.stringify(selectedFields));
    }
  }, [selectedFields]);
  
  // Save report title and filename to localStorage when they change
  useEffect(() => {
    localStorage.setItem('reportTitle', reportTitle);
    localStorage.setItem('reportFileName', fileName);
  }, [reportTitle, fileName]);
  
  // Handle toggle field selection
  const handleToggleField = (fieldId) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        // Add to recently used fields
        const isAlreadyRecent = recentlyUsedFields.includes(fieldId);
        if (!isAlreadyRecent) {
          const newRecentlyUsed = [fieldId, ...recentlyUsedFields].slice(0, 5);
          setRecentlyUsedFields(newRecentlyUsed);
          localStorage.setItem('recentlyUsedFields', JSON.stringify(newRecentlyUsed));
        }
        return [...prev, fieldId];
      }
    });
  };
  
  // Handle select all in a group
  const handleSelectAll = (groupId) => {
    const group = fieldGroups.find(g => g.id === groupId);
    if (!group) return;
    
    const groupFieldIds = group.fields.map(field => field.id);
    
    setSelectedFields(prev => {
      // Check if all fields in the group are already selected
      const allSelected = groupFieldIds.every(id => prev.includes(id));
      
      if (allSelected) {
        // If all selected, deselect all
        return prev.filter(id => !groupFieldIds.includes(id));
      } else {
        // Otherwise, select all missing fields
        const missingFields = groupFieldIds.filter(id => !prev.includes(id));
        
        // Update recently used fields
        const newRecentlyUsed = [...new Set([...missingFields, ...recentlyUsedFields])].slice(0, 5);
        setRecentlyUsedFields(newRecentlyUsed);
        localStorage.setItem('recentlyUsedFields', JSON.stringify(newRecentlyUsed));
        
        return [...prev, ...missingFields];
      }
    });
  };
  
  // Handle select all fields
  const handleSelectAllFields = () => {
    const allFieldIds = fieldGroups.flatMap(group => group.fields.map(field => field.id));
    setSelectedFields(allFieldIds);
    
    // Update recently used
    setRecentlyUsedFields(allFieldIds.slice(0, 5));
    localStorage.setItem('recentlyUsedFields', JSON.stringify(allFieldIds.slice(0, 5)));
  };
  
  // Handle clear all selections
  const handleClearAll = () => {
    setSelectedFields([]);
  };
  
  // Handle template selection
  const handleTemplateSelect = (e) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    
    // Load template fields
    if (templateId === 'default') {
      const defaultFields = [];
      fieldGroups.forEach(group => {
        group.fields.forEach(field => {
          if (field.default) {
            defaultFields.push(field.id);
          }
        });
      });
      setSelectedFields(defaultFields);
    } else if (templateId === 'basic') {
      setSelectedFields(['id', 'product_name', 'product_code', 'quantity', 'status']);
    } else if (templateId === 'production') {
      setSelectedFields([
        'id', 'product_name', 'machine_name', 'mold_code', 'production_start_date',
        'expected_output', 'actual_output'
      ]);
    } else if (templateId === 'quality') {
      setSelectedFields([
        'id', 'product_name', 'quality_status', 'defect_count', 'inspection_date',
        'inspector_name'
      ]);
    }
  };
  
  // Handle save template
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.warning(t('enterTemplateName'));
      return;
    }
    
    // In a real app, this would call an API to save the template
    // For this example, we'll just save to localStorage
    
    const templates = JSON.parse(localStorage.getItem('reportTemplates') || '[]');
    templates.push({
      id: `template_${Date.now()}`,
      name: templateName,
      fields: selectedFields,
      createdAt: new Date().toISOString()
    });
    
    localStorage.setItem('reportTemplates', JSON.stringify(templates));
    
    toast.success(t('templateSaved'));
    setShowSaveTemplateModal(false);
    setTemplateName('');
  };
  
  // Get field name by ID
  const getFieldNameById = (fieldId) => {
    for (const group of fieldGroups) {
      const field = group.fields.find(f => f.id === fieldId);
      if (field) return field.name;
    }
    return fieldId;
  };
  
  // Count selected fields in a group
  const countSelectedInGroup = (groupId) => {
    const group = fieldGroups.find(g => g.id === groupId);
    if (!group) return { selected: 0, total: 0 };
    
    const total = group.fields.length;
    const selected = group.fields.filter(field => selectedFields.includes(field.id)).length;
    
    return { selected, total };
  };
  
  // Prepare data for the report
  const prepareReportData = () => {
    if (!products || !selectedFields || selectedFields.length === 0) {
      return { headers: [], rows: [] };
    }
    
    // Create headers from selected fields
    const headers = selectedFields.map(fieldId => ({
      id: fieldId,
      label: getFieldNameById(fieldId)
    }));
    
    // Create rows from product data
    const rows = products.map(product => {
      const row = {};
      
      selectedFields.forEach(fieldId => {
        // Basic data mapping
        if (fieldId === 'id') row[fieldId] = product.id;
        else if (fieldId === 'group_id') row[fieldId] = product.group_id;
        else if (fieldId === 'product_name') row[fieldId] = product.product_name;
        else if (fieldId === 'product_code') row[fieldId] = product.product_code;
        else if (fieldId === 'quantity') row[fieldId] = product.quantity;
        else if (fieldId === 'status') row[fieldId] = product.status;
        else if (fieldId === 'created_by') row[fieldId] = product.created_by_name;
        else if (fieldId === 'created_at') row[fieldId] = formatDate(product.created_at);
        else if (fieldId === 'completion_date') row[fieldId] = formatDate(product.completion_date);
        
        // Get data from history object if exists
        else if (fieldId.startsWith('material_') && product.history?.material) {
          const key = fieldId.replace('material_', '');
          row[fieldId] = product.history.material[key];
        }
        else if (fieldId.startsWith('machine_') && product.history?.production) {
          const key = fieldId.replace('machine_', '');
          row[fieldId] = product.history.production[key];
        }
        else if (fieldId === 'mold_code' && product.history?.production) {
          row[fieldId] = product.history.production.mold_code;
        }
        else if (fieldId.startsWith('production_') && product.history?.production) {
          const key = fieldId.replace('production_', '');
          row[fieldId] = formatDate(product.history.production[key]);
        }
        else if (fieldId.startsWith('assembly_') && product.history?.assembly) {
          const key = fieldId.replace('assembly_', '');
          row[fieldId] = key.includes('date') ? formatDate(product.history.assembly[key]) : product.history.assembly[key];
        }
        else if (fieldId.startsWith('plating_') && product.history?.plating) {
          const key = fieldId.replace('plating_', '');
          row[fieldId] = key.includes('date') ? formatDate(product.history.plating[key]) : product.history.plating[key];
        }
        else if (fieldId === 'pic_name' && product.history?.assembly) {
          row[fieldId] = product.history.assembly.pic_name;
        }
        else if (fieldId.startsWith('quality_') && product.qualityStatus) {
          if (fieldId === 'quality_status') {
            row[fieldId] = product.qualityStatus;
          } else if (fieldId === 'defect_count') {
            row[fieldId] = product.defectCount || 0;
          } else {
            // Other quality fields - simulated for demo
            row[fieldId] = 'N/A';
          }
        }
        // If no match found, set empty value
        else {
          row[fieldId] = '-';
        }
      });
      
      return row;
    });
    
    return { headers, rows };
  };
  
  // Handle generate report
  const handleGenerateReport = () => {
    if (selectedFields.length === 0) {
      toast.warning(t('selectAtLeastOneField'));
      return;
    }
    
    // Show preview first
    setShowPreview(true);
  };
  
  // Handle export after preview
  const handleExport = () => {
    if (exportFormat === 'pdf') {
      exportPDF();
    } else {
      exportCSV();
    }
  };
  
  // Export to PDF
  const exportPDF = () => {
    try {
      const { headers, rows } = prepareReportData();
      
      // Check if there's data to export
      if (rows.length === 0) {
        toast.warning(t('noDataToExport'));
        return;
      }
      
      // Initialize PDF with A4 size
      const pdf = new jsPDF('landscape');
      
      // Add title
      pdf.setFontSize(18);
      pdf.text(reportTitle, 14, 15);
      
      // Add date
      pdf.setFontSize(10);
      pdf.text(`${t('generatedOn')}: ${new Date().toLocaleDateString()}`, 14, 22);
      
      // Prepare data for autoTable
      const tableHeaders = headers.map(h => h.label);
      const tableData = rows.map(row => headers.map(h => row[h.id]));
      
      // Add table
      pdf.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 25,
        theme: 'striped',
        headStyles: { fillColor: [26, 75, 140] },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          text: { cellWidth: 'auto' }
        }
      });
      
      // Ensure filename is not longer than 50 characters
      const truncatedFileName = fileName.length > 50 ? fileName.substring(0, 50) : fileName;
      
      // Save PDF
      pdf.save(`${truncatedFileName}.pdf`);
      
      toast.success(t('pdfExportSuccess'));
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(t('pdfExportFailed'));
    }
  };
  
  // Export to CSV
  const exportCSV = () => {
    try {
      const { headers, rows } = prepareReportData();
      
      // Check if there's data to export
      if (rows.length === 0) {
        toast.warning(t('noDataToExport'));
        return;
      }
      
      // Prepare CSV header row
      const csvHeader = headers.map(h => `"${h.label}"`).join(',');
      
      // Prepare CSV data rows
      const csvRows = rows.map(row => {
        return headers.map(h => {
          // Escape double quotes and wrap values in quotes
          const value = row[h.id] === undefined ? '' : String(row[h.id]);
          return `"${value.replace(/"/g, '""')}"`;
        }).join(',');
      });
      
      // Combine header and data
      const csvData = [csvHeader, ...csvRows].join('\n');
      
      // Ensure filename is not longer than 50 characters
      const truncatedFileName = fileName.length > 50 ? fileName.substring(0, 50) : fileName;
      
      // Create download link
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${truncatedFileName}.csv`);
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(t('csvExportSuccess'));
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error(t('csvExportFailed'));
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="container-fluid mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>{t('reportFieldSelection')}</h2>
          <div className="d-flex">
            <button 
              className="btn btn-outline-secondary me-2"
              onClick={() => navigate('/product-warehouse')}
            >
              {t('cancel')}
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleGenerateReport}
              disabled={selectedFields.length === 0}
            >
              <i className="fas fa-file-export me-2"></i>
              {t('generateReport')}
            </button>
          </div>
        </div>
        
        <div className="row">
          <div className="col-lg-8">
            {/* Field Selection */}
            <div className="card mb-4">
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{t('selectFields')}</h5>
                <div>
                  <button 
                    className="btn btn-sm btn-light me-2"
                    onClick={handleSelectAllFields}
                  >
                    {t('selectAll')}
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-light"
                    onClick={handleClearAll}
                    disabled={selectedFields.length === 0}
                  >
                    {t('clearAll')}
                  </button>
                </div>
              </div>
              <div className="card-body">
                {/* Recently used fields */}
                {recentlyUsedFields.length > 0 && (
                  <div className="recently-used mb-4">
                    <h6 className="section-title">
                      <i className="fas fa-history me-2"></i>
                      {t('recentlyUsed')}
                    </h6>
                    <div className="recently-used-fields">
                      {recentlyUsedFields.map(fieldId => (
                        <div key={fieldId} className="form-check recently-used-field">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`recent-${fieldId}`}
                            checked={selectedFields.includes(fieldId)}
                            onChange={() => handleToggleField(fieldId)}
                          />
                          <label className="form-check-label" htmlFor={`recent-${fieldId}`}>
                            {getFieldNameById(fieldId)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Field groups */}
                <div className="field-groups accordion" id="fieldGroupsAccordion">
                  {fieldGroups.map((group, index) => {
                    const { selected, total } = countSelectedInGroup(group.id);
                    
                    return (
                      <div className="accordion-item" key={group.id}>
                        <h2 className="accordion-header" id={`heading-${group.id}`}>
                          <button 
                            className={`accordion-button ${index !== 0 ? 'collapsed' : ''}`} 
                            type="button" 
                            data-bs-toggle="collapse" 
                            data-bs-target={`#collapse-${group.id}`} 
                            aria-expanded={index === 0 ? 'true' : 'false'} 
                            aria-controls={`collapse-${group.id}`}
                          >
                            <div className="d-flex justify-content-between align-items-center w-100">
                              <div>
                                <span className="me-2">{group.name}</span>
                                <span className="field-counter">
                                  <span className={selected > 0 ? 'text-primary' : 'text-muted'}>
                                    {selected}
                                  </span>
                                  /{total}
                                </span>
                              </div>
                              <div className="ms-auto pe-3">
                                <button 
                                  className="btn btn-sm btn-outline-secondary group-select-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectAll(group.id);
                                  }}
                                >
                                  {selected === total ? t('deselectAll') : t('selectAll')}
                                </button>
                              </div>
                            </div>
                          </button>
                        </h2>
                        <div 
                          id={`collapse-${group.id}`} 
                          className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`} 
                          aria-labelledby={`heading-${group.id}`} 
                          data-bs-parent="#fieldGroupsAccordion"
                        >
                          <div className="accordion-body">
                            <div className="row">
                              {group.fields.map(field => (
                                <div className="col-md-6 mb-2" key={field.id}>
                                  <div className="form-check">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id={field.id}
                                      checked={selectedFields.includes(field.id)}
                                      onChange={() => handleToggleField(field.id)}
                                    />
                                    <label className="form-check-label" htmlFor={field.id}>
                                      {field.name}
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-4">
            {/* Preview and Templates */}
            <div className="card mb-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">{t('reportSettings')}</h5>
              </div>
              <div className="card-body">
                {/* Report title and filename */}
                <div className="mb-3">
                  <label htmlFor="reportTitle" className="form-label">
                    {t('reportTitle')}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="reportTitle"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder={t('enterReportTitle')}
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="fileName" className="form-label">
                    {t('fileName')}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="fileName"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value.substring(0, 50))}
                    placeholder={t('enterFileName')}
                    maxLength={50}
                  />
                  <div className="form-text">
                    {t('fileNameHint')} {fileName.length}/50
                  </div>
                </div>
                
                {/* Export format selection */}
                <div className="mb-3">
                  <label className="form-label">
                    {t('exportFormat')}
                  </label>
                  <div className="d-flex">
                    <div className="form-check me-3">
                      <input
                        className="form-check-input"
                        type="radio"
                        id="formatPDF"
                        name="exportFormat"
                        checked={exportFormat === 'pdf'}
                        onChange={() => setExportFormat('pdf')}
                      />
                      <label className="form-check-label" htmlFor="formatPDF">
                        PDF
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        id="formatCSV"
                        name="exportFormat"
                        checked={exportFormat === 'csv'}
                        onChange={() => setExportFormat('csv')}
                      />
                      <label className="form-check-label" htmlFor="formatCSV">
                        CSV
                      </label>
                    </div>
                  </div>
                </div>
                
                <hr />
                
                <div className="mb-3">
                  <label htmlFor="templateSelect" className="form-label">
                    {t('loadTemplate')}
                  </label>
                  <select 
                    id="templateSelect" 
                    className="form-select"
                    value={selectedTemplate}
                    onChange={handleTemplateSelect}
                  >
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="d-grid mb-4">
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => setShowSaveTemplateModal(true)}
                    disabled={selectedFields.length === 0}
                  >
                    <i className="fas fa-save me-2"></i>
                    {t('saveAsTemplate')}
                  </button>
                </div>
                
                <hr />
                
                <h6 className="mb-3">{t('selectedFields')} ({selectedFields.length})</h6>
                
                {selectedFields.length > 0 ? (
                  <div className="selected-fields-preview">
                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{t('fieldName')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFields.map((fieldId, index) => (
                          <tr key={fieldId}>
                            <td width="40px">{index + 1}</td>
                            <td>
                              {getFieldNameById(fieldId)}
                              <button 
                                className="btn btn-sm btn-link text-danger float-end remove-field"
                                onClick={() => handleToggleField(fieldId)}
                                title={t('removeField')}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-muted py-4">
                    <i className="fas fa-filter fa-2x mb-3"></i>
                    <p>{t('noFieldsSelected')}</p>
                  </div>
                )}
              </div>
              <div className="card-footer bg-light">
                <button 
                  className="btn btn-primary w-100"
                  onClick={handleGenerateReport}
                  disabled={selectedFields.length === 0}
                >
                  <i className="fas fa-file-export me-2"></i>
                  {t('generateReport')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('saveTemplate')}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowSaveTemplateModal(false);
                    setTemplateName('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="templateName" className="form-label">
                    {t('templateName')}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={t('enterTemplateName')}
                    autoFocus
                  />
                </div>
                
                <div className="template-field-summary">
                  <p>{t('templateWillInclude', { count: selectedFields.length })}</p>
                  <div className="template-fields-preview">
                    {selectedFields.slice(0, 5).map(fieldId => (
                      <span key={fieldId} className="badge bg-light text-dark me-2 mb-2">
                        {getFieldNameById(fieldId)}
                      </span>
                    ))}
                    
                    {selectedFields.length > 5 && (
                      <span className="badge bg-secondary">
                        +{selectedFields.length - 5} {t('more')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowSaveTemplateModal(false);
                    setTemplateName('');
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim()}
                >
                  {t('saveTemplate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Preview Modal */}
      {showPreview && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('reportPreview')}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowPreview(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div ref={previewContainerRef} className="report-preview">
                  <h3 className="text-center mb-3">{reportTitle}</h3>
                  <p className="text-muted text-end mb-4">
                    {t('generatedOn')}: {new Date().toLocaleDateString()}
                  </p>
                  
                  {productsLoading ? (
                    <div className="text-center my-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">{t('loading')}</span>
                      </div>
                      <p className="mt-2">{t('preparingReport')}</p>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const { headers, rows } = prepareReportData();
                        
                        if (rows.length === 0) {
                          return (
                            <div className="alert alert-warning">
                              <i className="fas fa-exclamation-triangle me-2"></i>
                              {t('noDataToExport')}
                            </div>
                          );
                        }
                        
                        return (
                          <div className="table-responsive">
                            <table className="table table-striped table-bordered">
                              <thead className="table-primary">
                                <tr>
                                  <th>#</th>
                                  {headers.map(header => (
                                    <th key={header.id}>{header.label}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row, rowIndex) => (
                                  <tr key={rowIndex}>
                                    <td>{rowIndex + 1}</td>
                                    {headers.map(header => (
                                      <td key={`${rowIndex}-${header.id}`}>
                                        {row[header.id]}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPreview(false)}
                >
                  {t('back')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleExport}
                  disabled={productsLoading}
                >
                  <i className={`fas ${exportFormat === 'pdf' ? 'fa-file-pdf' : 'fa-file-csv'} me-2`}></i>
                  {t('exportAs')} {exportFormat.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Backdrop */}
      {(showSaveTemplateModal || showPreview) && (
        <div 
          className="modal-backdrop fade show"
          onClick={() => {
            if (showSaveTemplateModal) {
              setShowSaveTemplateModal(false);
              setTemplateName('');
            } else if (showPreview) {
              setShowPreview(false);
            }
          }}
        ></div>
      )}
      
      {/* Add additional styles for report preview */}
      <style jsx="true">{`
        .report-preview {
          max-width: 100%;
          overflow-x: auto;
        }
        
        .report-preview table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .report-preview th,
        .report-preview td {
          padding: 8px;
          vertical-align: top;
        }
        
        .table-primary {
          background-color: #1a4b8c;
          color: white;
        }
        
        /* Print styles */
        @media print {
          .modal-header,
          .modal-footer {
            display: none;
          }
          
          .modal-body {
            padding: 0;
          }
          
          .report-preview {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}

export default ReportFieldSelection;