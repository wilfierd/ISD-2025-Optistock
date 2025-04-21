// client/src/components/ReportFieldSelection.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';
import './ReportFieldSelection.css';

function ReportFieldSelection({ user }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [recentlyUsedFields, setRecentlyUsedFields] = useState([]);
  
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
    
  }, [fieldGroups]);
  
  // Save selected fields to localStorage when they change
  useEffect(() => {
    if (selectedFields.length > 0) {
      localStorage.setItem('reportSelectedFields', JSON.stringify(selectedFields));
    }
  }, [selectedFields]);
  
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
    // For this example, we'll just show a success message
    
    toast.success(t('templateSaved'));
    setShowSaveTemplateModal(false);
    setTemplateName('');
  };
  
  // Handle generate report
  const handleGenerateReport = () => {
    if (selectedFields.length === 0) {
      toast.warning(t('selectAtLeastOneField'));
      return;
    }
    
    // In a real app, this would generate a report based on the selected fields
    // For this example, we'll just show a success message
    
    toast.success(t('reportGenerated'));
    
    // Navigate back to product warehouse
    setTimeout(() => {
      navigate('/product-warehouse');
    }, 1500);
  };
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Find field name by ID
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
                <h5 className="mb-0">{t('templateSelection')}</h5>
              </div>
              <div className="card-body">
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
      
      {/* Modal Backdrop */}
      {showSaveTemplateModal && (
        <div 
          className="modal-backdrop fade show"
          onClick={() => {
            setShowSaveTemplateModal(false);
            setTemplateName('');
          }}
        ></div>
      )}
    </div>
  );
}

export default ReportFieldSelection;