// client/src/components/Materials.js (with complete language support)
import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './Navbar';
import { canManageMaterials } from '../utils/rolePermissions';
import { useLogout } from '../hooks/useAuth';
import { 
  useMaterials, 
  useCreateMaterial, 
  useUpdateMaterial, 
  useDeleteMaterial
} from '../hooks/useMaterials';
import { useCreateMaterialRequest } from '../hooks/useMaterialRequests';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useLanguage } from '../contexts/LanguageContext';

function Materials({ user }) {
  // Get translation function
  const { t } = useLanguage();
  
  // State for search and selected material
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('partName'); // Default search field
  const [showFilterDropdown, setShowFilterDropdown] = useState(false); // State for dropdown visibility
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState('add');
  
  // QR code state
  const [showQrModal, setShowQrModal] = useState(false);
  
  // Form state for add/edit modal
  const [formData, setFormData] = useState({
    materialId: '',
    packetNo: '',
    partName: '',
    materialCode: '',
    length: '',
    width: '',
    materialType: '',
    quantity: '',
    supplier: ''
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});

  // React Query hooks
  const { data: materials = [], isLoading, error } = useMaterials();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const createRequest = useCreateMaterialRequest();
  const logoutMutation = useLogout();

  // Check if user has permission to directly manage materials
  const canEditMaterials = canManageMaterials(user);

  // Filter materials based on search term and search field
  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return materials;
    
    return materials.filter(material => {
      switch(searchField) {
        case 'packetNo':
          return material.packetNo.toString().includes(searchTerm);
        case 'partName':
          return material.partName.toLowerCase().includes(searchTerm.toLowerCase());
        case 'supplier':
          return material.supplier.toLowerCase().includes(searchTerm.toLowerCase());
        case 'updatedBy':
          return material.updatedBy.toLowerCase().includes(searchTerm.toLowerCase());
        default:
          return material.partName.toLowerCase().includes(searchTerm.toLowerCase());
      }
    });
  }, [materials, searchTerm, searchField]);

  // Validation function to check for duplicate packet numbers
  const checkDuplicatePacketNo = () => {
    const packetNoToCheck = parseInt(formData.packetNo);
    
    // When editing, exclude the current material from the check
    if (formData.materialId) {
      return materials.some(material => 
        material.packetNo === packetNoToCheck && material.id !== formData.materialId
      );
    }
    
    // When adding a new material, check against all existing materials
    return materials.some(material => material.packetNo === packetNoToCheck);
  };

  // Form validation function
  const validateForm = () => {
    const errors = {};
    
    // Basic required field validation
    if (!formData.packetNo) {
      errors.packetNo = t('packetNo') + ' ' + t('is required');
    }
    
    if (!formData.partName) {
      errors.partName = t('partName') + ' ' + t('is required');
    }
    if (!formData.materialCode) {
      errors.materialCode = t('materialCode') + ' ' + t('is required');
    }
    if (!formData.length) {
      errors.length = t('length') + ' ' + t('is required');
    }
    
    if (!formData.width) {
      errors.width = t('width') + ' ' + t('is required');
    }
    
    if (!formData.materialType) {
      errors.materialType = t('materialType') + ' ' + t('is required');
    }
    
    if (!formData.quantity) {
      errors.quantity = t('quantity') + ' ' + t('is required');
    }
    
    if (!formData.supplier) {
      errors.supplier = t('supplier') + ' ' + t('is required');
    }
    
    // Check for duplicate packet number
    const isDuplicate = checkDuplicatePacketNo();
    if (isDuplicate) {
      errors.packetNo = t('This packet number already exists. Packet numbers must be unique.');
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0; // Return true if no errors
  };

  // Handle search input change
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle search field change
  const handleSearchFieldChange = (e) => {
    setSearchField(e.target.value);
    setSearchTerm(''); // Clear search term when changing fields
    setShowFilterDropdown(false); // Close dropdown after selection
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (showFilterDropdown && 
          !event.target.closest('.dropdown')) {
        setShowFilterDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);

  // Handle material row click
  const handleMaterialClick = (material) => {
    setSelectedMaterial(material);
    setFormData({
      materialId: material.id,
      packetNo: material.packetNo,
      partName: material.partName,
      materialCode: material.materialCode,
      length: material.length,
      width: material.width,
      materialType: material.materialType,
      quantity: material.quantity,
      supplier: material.supplier
    });
    setValidationErrors({}); // Clear any previous validation errors
    setShowDetailsModal(true);
  };

  // Toggle add modal
  const handleAddClick = () => {
    setFormData({
      materialId: '',
      packetNo: '',
      partName: '',
      materialCode: '',
      length: '',
      width: '',
      materialType: '',
      quantity: '',
      supplier: ''
    });
    setValidationErrors({}); // Clear any previous validation errors
    
    if (canEditMaterials) {
      setShowAddModal(true);
    } else {
      setRequestType('add');
      setShowRequestModal(true);
    }
  };

  // Toggle edit modal (in detail view)
  const handleEditClick = () => {
    if (!canEditMaterials) {
      setShowDetailsModal(false);
      setRequestType('edit');
      setShowRequestModal(true);
    }
  };

  // Toggle delete modal (in detail view)
  const handleDeleteClick = () => {
    if (canEditMaterials) {
      setShowDeleteModal(true);
      setShowDetailsModal(false);
    } else {
      setShowDetailsModal(false);
      setRequestType('delete');
      setShowRequestModal(true);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    
    // Clear the specific validation error when the user starts typing
    if (validationErrors[id]) {
      setValidationErrors(prev => ({
        ...prev,
        [id]: null
      }));
    }
  };

  // Handle form submission (admin only)
  const handleSaveClick = (isNewMaterial = false) => {
    // Run validation before proceeding
    if (!validateForm()) {
      // If validation fails, display error message and don't submit
      try {
        toast.error(t('validationError'));
      } catch (e) {
        toast.error('Please correct the errors before saving');
      }
      return;
    }
    
    const materialData = {
      packetNo: parseInt(formData.packetNo),
      partName: formData.partName,
      materialCode: formData.materialCode,
      length: parseInt(formData.length),
      width: parseInt(formData.width),
      materialType: formData.materialType,
      quantity: parseInt(formData.quantity),
      supplier: formData.supplier
    };

    try {
      if (isNewMaterial) {
        createMaterial.mutate(materialData, {
          onSuccess: () => {
            setShowAddModal(false);
            setValidationErrors({}); // Clear validation errors on success
          },
          onError: (error) => {
            // Handle server-side validation errors
            if (error.response?.data?.error) {
              toast.error(error.response.data.error);
              
              // If the error is about duplicate packet_no, update validation errors
              if (error.response.data.error.includes('packet number already exists')) {
                setValidationErrors(prev => ({
                  ...prev,
                  packetNo: t('This packet number already exists. Packet numbers must be unique.')
                }));
              }
            } else {
              toast.error(t('materialAddFailed') || 'Failed to add material');
            }
          }
        });
      } else {
        updateMaterial.mutate({ 
          id: formData.materialId, 
          data: materialData 
        }, {
          onSuccess: () => {
            setShowDetailsModal(false);
            setValidationErrors({}); // Clear validation errors on success
          },
          onError: (error) => {
            // Handle server-side validation errors
            if (error.response?.data?.error) {
              toast.error(error.response.data.error);
              
              // If the error is about duplicate packet_no, update validation errors
              if (error.response.data.error.includes('packet number already exists')) {
                setValidationErrors(prev => ({
                  ...prev,
                  packetNo: t('This packet number already exists. Packet numbers must be unique.')
                }));
              }
            } else {
              toast.error(t('materialUpdateFailed') || 'Failed to update material');
            }
          }
        });
      }
    } catch (e) {
      console.error("Error in save operation", e);
      toast.error(t('operationFailed') || 'An unexpected error occurred. Please try again.');
    }
  };

  // Handle delete confirmation (admin only)
  const handleConfirmDelete = () => {
    if (!selectedMaterial) return;
    
    try {
      deleteMaterial.mutate(selectedMaterial.id, {
        onSuccess: () => {
          setShowDeleteModal(false);
        },
        onError: (error) => {
          toast.error(error.message || t('materialDeleteFailed') || 'Failed to delete material');
        }
      });
    } catch (e) {
      console.error("Error in delete operation", e);
      toast.error(t('operationFailed') || 'An unexpected error occurred. Please try again.');
    }
  };

  // Handle request submission (non-admin users)
  const handleSubmitRequest = () => {
    // Run validation before proceeding
    if (!validateForm()) {
      // If validation fails, display error message and don't submit
      toast.error(t('validationError') || 'Please correct the errors before submitting the request');
      return;
    }
    
    const materialData = {
      packetNo: parseInt(formData.packetNo),
      partName: formData.partName,
      materialCode: formData.materialCode,
      length: parseInt(formData.length),
      width: parseInt(formData.width),
      materialType: formData.materialType,
      quantity: parseInt(formData.quantity),
      supplier: formData.supplier
    };
    
    let requestData = {};
    
    if (requestType === 'add') {
      requestData = {
        requestType: 'add',
        requestData: materialData
      };
    } else if (requestType === 'edit') {
      requestData = {
        requestType: 'edit',
        materialId: formData.materialId,
        requestData: materialData
      };
    } else if (requestType === 'delete') {
      requestData = {
        requestType: 'delete',
        materialId: selectedMaterial.id
      };
    }
    
    try {
      createRequest.mutate(requestData, {
        onSuccess: () => {
          setShowRequestModal(false);
          setValidationErrors({}); // Clear validation errors on success
        },
        onError: (error) => {
          // Handle server-side validation errors
          if (error.response?.data?.error) {
            toast.error(error.response.data.error);
            
            // If the error is about duplicate packet_no, update validation errors
            if (error.response.data.error.includes('packet number already exists')) {
              setValidationErrors(prev => ({
                ...prev,
                packetNo: t('This packet number already exists. Packet numbers must be unique.')
              }));
            }
          } else {
            toast.error(t('requestSubmitFailed') || 'Failed to submit request');
          }
        }
      });
    } catch (e) {
      console.error("Error in request submission", e);
      toast.error(t('operationFailed') || 'An unexpected error occurred. Please try again.');
    }
  };

  // Handle QR code generation
  const handlePrint = (id, e) => {
    e.stopPropagation(); // Prevent row click event
    
    const material = materials.find(m => m.id === id);
    if (!material) return;
    
    // Set up QR code modal data
    setSelectedMaterial(material);
    const materialUrl = `${window.location.origin}/material/${id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(materialUrl)}`;
    
    setShowQrModal(true);
  };

  // Get placeholder text based on selected search field
  const getPlaceholderText = () => {
    switch(searchField) {
      case 'packetNo':
        return t('searchByPacketNo');
      case 'partName':
        return t('searchByPartName');
      case 'supplier':
        return t('searchBySupplier');
      case 'updatedBy':
        return t('searchByUpdatedBy');
      default:
        return t('search');
    }
  };

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="container-fluid mt-4">
        {/* Search and Add Button */}
        <div className="row mb-3">
          <div className="col-md-8">
            <div className="d-flex">
              <div className="search-container flex-grow-1">
                <span className="search-icon"><i className="fas fa-search"></i></span>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={getPlaceholderText()}
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
              
              {/* Filter Dropdown Button */}
              <div className="dropdown ms-2 position-relative">
                <button 
                  className="btn btn-light" 
                  type="button"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <i className="fas fa-filter me-2"></i> {t('searchBy')}
                </button>
                
                {showFilterDropdown && (
                  <div 
                    className="dropdown-menu shadow p-3 position-absolute" 
                    style={{ 
                      display: 'block', 
                      minWidth: '200px',
                      top: '100%',
                      left: 0,
                      zIndex: 1000
                    }}
                  >
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="searchFieldOptions"
                        id="packetNoOption"
                        value="packetNo"
                        checked={searchField === 'packetNo'}
                        onChange={handleSearchFieldChange}
                      />
                      <label className="form-check-label" htmlFor="packetNoOption">
                        {t('packetNo')}
                      </label>
                    </div>
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="searchFieldOptions"
                        id="partNameOption"
                        value="partName"
                        checked={searchField === 'partName'}
                        onChange={handleSearchFieldChange}
                      />
                      <label className="form-check-label" htmlFor="partNameOption">
                        {t('partName')}
                      </label>
                    </div>
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="searchFieldOptions"
                        id="supplierOption"
                        value="supplier"
                        checked={searchField === 'supplier'}
                        onChange={handleSearchFieldChange}
                      />
                      <label className="form-check-label" htmlFor="supplierOption">
                        {t('supplier')}
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="searchFieldOptions"
                        id="updatedByOption"
                        value="updatedBy"
                        checked={searchField === 'updatedBy'}
                        onChange={handleSearchFieldChange}
                      />
                      <label className="form-check-label" htmlFor="updatedByOption">
                        {t('updatedBy')}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-4 text-end">
            <button 
              className="btn btn-primary" 
              onClick={handleAddClick}
              disabled={canEditMaterials ? createMaterial.isPending : createRequest.isPending}
            >
              {canEditMaterials ? t('addMaterial') : t('requestAdd')}
            </button>
          </div>
        </div>

        {/* Materials List */}
        <h4>{t('materialsList')} ({filteredMaterials.length})</h4>
        
        {isLoading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">{t('loading')}</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error.message}</div>
        ) : (
          <div className="custom-table-container"> 
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th width="5%"></th>
                    <th width="5%">{t('packetNo')}</th>
                    <th width="20%">{t('partName')}</th>
                    <th width="20%">{t('materialCode')}</th>
                    <th width="10%">{t('length')}(mm)</th>
                    <th width="10%">{t('width')}(mm)</th>
                    <th width="10%">{t('materialType')}</th>
                    <th width="5%">{t('quantity')}</th>
                    <th width="15%">{t('supplier')}</th>
                    <th width="10%">{t('updatedBy')}</th>
                    <th width="10%">{t('lastUpdated')}</th>
                    <th width="5%"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map(material => (
                    <tr 
                      key={material.id} 
                      onClick={() => handleMaterialClick(material)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div 
                          className={`status-dot ${selectedMaterial?.id === material.id ? 'active' : ''}`}
                        ></div>
                      </td>
                      <td>{material.packetNo}</td>
                      <td>{material.partName}</td>
                      <td>{material.materialCode}</td>
                      <td>{material.length}</td>
                      <td>{material.width}</td>
                      <td>{material.materialType}</td>
                      <td>{material.quantity}</td>
                      <td>{material.supplier}</td>
                      <td>{material.updatedBy}</td>
                      <td>{material.lastUpdated}</td>
                      <td>
                        <button 
                          className="btn btn-sm" 
                          onClick={(e) => handlePrint(material.id, e)}
                          title={t('generateQRCode')}
                        >
                          <i className="fas fa-print"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <tr>
                      <td colSpan="11" className="text-center py-3">{t('noRecordsFound')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Material Details Modal */}
      {showDetailsModal && selectedMaterial && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('materialDetails')}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedMaterial(null);
                    setValidationErrors({});
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {canEditMaterials ? (
                  // Admin view - Edit form
                  <form id="materialForm">
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="packetNo" className="form-label">{t('packetNo')}</label>
                        <input 
                          type="number" 
                          className={`form-control ${validationErrors.packetNo ? 'is-invalid' : ''}`}
                          id="packetNo" 
                          value={formData.packetNo}
                          onChange={handleInputChange}
                          required 
                        />
                        {validationErrors.packetNo && (
                          <div className="invalid-feedback">
                            {validationErrors.packetNo}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="partName" className="form-label">{t('partName')}</label>
                        <input 
                          type="text" 
                          className={`form-control ${validationErrors.partName ? 'is-invalid' : ''}`}
                          id="partName" 
                          value={formData.partName}
                          onChange={handleInputChange}
                          required 
                        />
                        {validationErrors.partName && (
                          <div className="invalid-feedback">
                            {validationErrors.partName}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="materialCode" className="form-label">{t('materialCode')}</label>
                        <input 
                          type="text" 
                          className={`form-control ${validationErrors.materialCode ? 'is-invalid' : ''}`}
                          id="materialCode" 
                          value={formData.materialCode}
                          onChange={handleInputChange}
                          required 
                        />
                        {validationErrors.materialCode && (
                          <div className="invalid-feedback">
                            {validationErrors.materialCode}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <label htmlFor="length" className="form-label">{t('length')}</label>
                        <input 
                          type="number" 
                          className={`form-control ${validationErrors.length ? 'is-invalid' : ''}`}
                          id="length" 
                          value={formData.length}
                          onChange={handleInputChange}
                          required 
                        />
                        {validationErrors.length && (
                          <div className="invalid-feedback">
                            {validationErrors.length}
                          </div>
                        )}
                      </div>
                      <div className="col-md-4">
                        <label htmlFor="width" className="form-label">{t('width')}</label>
                        <input 
                          type="number" 
                          className={`form-control ${validationErrors.width ? 'is-invalid' : ''}`}
                          id="width" 
                          value={formData.width}
                          onChange={handleInputChange}
                          required 
                        />
                        {validationErrors.width && (
                          <div className="invalid-feedback">
                            {validationErrors.width}
                          </div>
                        )}
                      </div>
                      <div className="col-md-4">
                        <label htmlFor="materialType" className="form-label">{t('materialType')}</label>
                        <input 
                          type="text" 
                          className={`form-control ${validationErrors.materialType ? 'is-invalid' : ''}`}
                          id="materialType" 
                          value={formData.materialType}
                          onChange={handleInputChange}
                          required 
                        />
                        {validationErrors.materialType && (
                          <div className="invalid-feedback">
                            {validationErrors.materialType}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="quantity" className="form-label">{t('quantity')}</label>
                        <input 
                          type="number" 
                          className={`form-control ${validationErrors.quantity ? 'is-invalid' : ''}`}
                          id="quantity" 
                          value={formData.quantity}
                          onChange={handleInputChange}
                          required 
                        />
                        {validationErrors.quantity && (
                          <div className="invalid-feedback">
                            {validationErrors.quantity}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="supplier" className="form-label">{t('supplier')}</label>
                        <input 
                          type="text" 
                          className={`form-control ${validationErrors.supplier ? 'is-invalid' : ''}`}
                          id="supplier" 
                          value={formData.supplier}
                          onChange={handleInputChange}
                          required 
                        />
                        {validationErrors.supplier && (
                          <div className="invalid-feedback">
                            {validationErrors.supplier}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <p><strong>{t('updatedBy')}:</strong> {selectedMaterial.updatedBy}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>{t('lastUpdated')}:</strong> {selectedMaterial.lastUpdated}</p>
                      </div>
                    </div>
                  </form>
                ) : (
                  // Regular user view - Read-only details
                  <div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <p><strong>{t('packetNo')}:</strong> {selectedMaterial.packetNo}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>{t('partName')}:</strong> {selectedMaterial.partName}</p>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-12">
                        <p><strong>{t('dimensions')}:</strong> {selectedMaterial.length} x {selectedMaterial.width} </p>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <p><strong>{t('materialType')}:</strong> {selectedMaterial.materialType}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>{t('quantity')}:</strong> {selectedMaterial.quantity}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>{t('supplier')}:</strong> {selectedMaterial.supplier}</p>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <p><strong>{t('updatedBy')}:</strong> {selectedMaterial.updatedBy}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>{t('lastUpdated')}:</strong> {selectedMaterial.lastUpdated}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedMaterial(null);
                    setValidationErrors({});
                  }}
                >
                  {t('close')}
                </button>
                
                {canEditMaterials ? (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      onClick={handleDeleteClick}
                    >
                      {t('delete')}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={() => handleSaveClick(false)}
                      disabled={updateMaterial.isPending}
                    >
                      {updateMaterial.isPending ? t('saving') : t('saveChanges')}
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-warning" 
                      onClick={handleEditClick}
                    >
                      {t('requestEdit')}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      onClick={handleDeleteClick}
                    >
                      {t('requestDelete')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('addMaterial')}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowAddModal(false);
                    setValidationErrors({});
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <form id="addMaterialForm">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="packetNo" className="form-label">{t('packetNo')}</label>
                      <input 
                        type="number" 
                        className={`form-control ${validationErrors.packetNo ? 'is-invalid' : ''}`}
                        id="packetNo" 
                        value={formData.packetNo}
                        onChange={handleInputChange}
                        required 
                      />
                      {validationErrors.packetNo && (
                        <div className="invalid-feedback">
                          {validationErrors.packetNo}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="partName" className="form-label">{t('partName')}</label>
                      <input 
                        type="text" 
                        className={`form-control ${validationErrors.partName ? 'is-invalid' : ''}`}
                        id="partName" 
                        value={formData.partName}
                        onChange={handleInputChange}
                        required 
                      />
                      {validationErrors.partName && (
                        <div className="invalid-feedback">
                          {validationErrors.partName}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="materialCode" className="form-label">{t('materialCode')}</label>
                      <input 
                        type="text" 
                        className={`form-control ${validationErrors.materialCode ? 'is-invalid' : ''}`}
                        id="materialCode" 
                        value={formData.materialCode}
                        onChange={handleInputChange}
                        required 
                      />
                      {validationErrors.materialCode && (
                        <div className="invalid-feedback">
                          {validationErrors.materialCode}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label htmlFor="length" className="form-label">{t('length')}</label>
                      <input 
                        type="number" 
                        className={`form-control ${validationErrors.length ? 'is-invalid' : ''}`}
                        id="length" 
                        value={formData.length}
                        onChange={handleInputChange}
                        required 
                      />
                      {validationErrors.length && (
                        <div className="invalid-feedback">
                          {validationErrors.length}
                        </div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="width" className="form-label">{t('width')}</label>
                      <input 
                        type="number" 
                        className={`form-control ${validationErrors.width ? 'is-invalid' : ''}`}
                        id="width" 
                        value={formData.width}
                        onChange={handleInputChange}
                        required 
                      />
                      {validationErrors.width && (
                        <div className="invalid-feedback">
                          {validationErrors.width}
                        </div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="materialType" className="form-label">{t('materialType')}</label>
                      <input 
                        type="text" 
                        className={`form-control ${validationErrors.materialType ? 'is-invalid' : ''}`}
                        id="materialType" 
                        value={formData.materialType}
                        onChange={handleInputChange}
                        required 
                      />
                      {validationErrors.materialType && (
                        <div className="invalid-feedback">
                          {validationErrors.materialType}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="quantity" className="form-label">{t('quantity')}</label>
                      <input 
                        type="number" 
                        className={`form-control ${validationErrors.quantity ? 'is-invalid' : ''}`}
                        id="quantity" 
                        value={formData.quantity}
                        onChange={handleInputChange}
                        required 
                      />
                      {validationErrors.quantity && (
                        <div className="invalid-feedback">
                          {validationErrors.quantity}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="supplier" className="form-label">{t('supplier')}</label>
                      <input 
                        type="text" 
                        className={`form-control ${validationErrors.supplier ? 'is-invalid' : ''}`}
                        id="supplier" 
                        value={formData.supplier}
                        onChange={handleInputChange}
                        required 
                      />
                      {validationErrors.supplier && (
                        <div className="invalid-feedback">
                          {validationErrors.supplier}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowAddModal(false);
                    setValidationErrors({});
                  }}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => handleSaveClick(true)}
                  disabled={createMaterial.isPending}
                >
                  {createMaterial.isPending ? t('adding') : t('addMaterial')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMaterial && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('confirmDelete')}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>{t('materialDeleteConfirm')}</p>
                <p><strong>{t('partName')}:</strong> {selectedMaterial.partName}</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleConfirmDelete}
                  disabled={deleteMaterial.isPending}
                >
                  {deleteMaterial.isPending ? t('deleting') : t('delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {t('requestDetails', { 
                    requestType: requestType === 'add' ? t('add') : 
                                 requestType === 'edit' ? t('edit') : 
                                 t('delete') 
                  })}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowRequestModal(false);
                    setValidationErrors({});
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {requestType === 'delete' ? (
                  <div>
                    <p>{t('materialDeleteConfirm')}</p>
                    <p><strong>{t('partName')}:</strong> {selectedMaterial.partName}</p>
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      {t('This request will be sent to an administrator for approval.')}
                    </div>
                  </div>
                ) : (
                  <>
                    <p>{t('Fill in the details for your')} {requestType === 'add' ? t('add') : t('edit')} {t('request')}:</p>
                    <form id="materialRequestForm">
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label htmlFor="packetNo" className="form-label">{t('packetNo')}</label>
                          <input 
                            type="number" 
                            className={`form-control ${validationErrors.packetNo ? 'is-invalid' : ''}`}
                            id="packetNo" 
                            value={formData.packetNo}
                            onChange={handleInputChange}
                            required 
                          />
                          {validationErrors.packetNo && (
                            <div className="invalid-feedback">
                              {validationErrors.packetNo}
                            </div>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="partName" className="form-label">{t('partName')}</label>
                          <input 
                            type="text" 
                            className={`form-control ${validationErrors.partName ? 'is-invalid' : ''}`}
                            id="partName" 
                            value={formData.partName}
                            onChange={handleInputChange}
                            required 
                          />
                          {validationErrors.partName && (
                            <div className="invalid-feedback">
                              {validationErrors.partName}
                            </div>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="materiaCode" className="form-label">{t('materialCode')}</label>
                          <input 
                            type="text" 
                            className={`form-control ${validationErrors.materialCode ? 'is-invalid' : ''}`}
                            id="materialCode" 
                            value={formData.materialCode}
                            onChange={handleInputChange}
                            required 
                          />
                          {validationErrors.materialCode && (
                            <div className="invalid-feedback">
                              {validationErrors.materialCode}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-3">
                          <label htmlFor="length" className="form-label">{t('length')}</label>
                          <input 
                            type="number" 
                            className={`form-control ${validationErrors.length ? 'is-invalid' : ''}`}
                            id="length" 
                            value={formData.length}
                            onChange={handleInputChange}
                            required 
                          />
                          {validationErrors.length && (
                            <div className="invalid-feedback">
                              {validationErrors.length}
                            </div>
                          )}
                        </div>
                        <div className="col-md-3">
                          <label htmlFor="width" className="form-label">{t('width')}</label>
                          <input 
                            type="number" 
                            className={`form-control ${validationErrors.width ? 'is-invalid' : ''}`}
                            id="width" 
                            value={formData.width}
                            onChange={handleInputChange}
                            required 
                          />
                          {validationErrors.width && (
                            <div className="invalid-feedback">
                              {validationErrors.width}
                            </div>
                          )}
                        </div>
                        <div className="col-md-3">
                          <label htmlFor="materialType" className="form-label">{t('materialType')}</label>
                          <input 
                            type="text" 
                            className={`form-control ${validationErrors.materialType ? 'is-invalid' : ''}`}
                            id="materialType" 
                            value={formData.materialType}
                            onChange={handleInputChange}
                            required 
                          />
                          {validationErrors.materialType && (
                            <div className="invalid-feedback">
                              {validationErrors.materialType}
                            </div>
                          )}
                        </div>
                        <div className="col-md-3">
                          <label htmlFor="quantity" className="form-label">{t('quantity')}</label>
                          <input 
                            type="number" 
                            className={`form-control ${validationErrors.quantity ? 'is-invalid' : ''}`}
                            id="quantity" 
                            value={formData.quantity}
                            onChange={handleInputChange}
                            required 
                          />
                          {validationErrors.quantity && (
                            <div className="invalid-feedback">
                              {validationErrors.quantity}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="supplier" className="form-label">{t('supplier')}</label>
                        <input 
                          type="text" 
                          className={`form-control ${validationErrors.supplier ? 'is-invalid' : ''}`}
                          id="supplier" 
                          value={formData.supplier}
                          onChange={handleInputChange}
                          required 
                        />
                        {validationErrors.supplier && (
                          <div className="invalid-feedback">
                            {validationErrors.supplier}
                          </div>
                        )}
                      </div>
                      <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        {t('This request will be sent to an administrator for approval.')}
                      </div>
                    </form>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowRequestModal(false);
                    setValidationErrors({});
                  }}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleSubmitRequest}
                  disabled={createRequest.isPending}
                >
                  {createRequest.isPending ? t('submitting') : t('submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && selectedMaterial && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {t('materialQRCode', { materialName: selectedMaterial.partName })}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowQrModal(false);
                    setSelectedMaterial(null);
                  }}
                ></button>
              </div>
              <div className="modal-body text-center">
                <p>{t('scanQRCode')}</p>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/material/${selectedMaterial.id}`)}`}
                  alt="QR Code"
                  className="img-fluid mb-3"
                  style={{ maxWidth: '200px' }}
                />
                <p className="small text-muted">
                  {`${window.location.origin}/material/${selectedMaterial.id}`}
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowQrModal(false);
                    setSelectedMaterial(null);
                  }}
                >
                  {t('close')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    // Print functionality
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                      <head>
                        <title>${t('materialQRCode', { materialName: selectedMaterial.partName })}</title>
                        <style>
                          body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
                          h2 { color: #0a4d8c; }
                          .material-info { margin: 20px 0; }
                          .qr-code { max-width: 300px; margin: 20px auto; }
                        </style>
                      </head>
                      <body>
                        <h2>${t('materialQRCode', { materialName: '' })}</h2>
                        <div class="material-info">
                          <h3>${selectedMaterial.partName}</h3>
                          <p>${t('packetNo')}: ${selectedMaterial.packetNo} | ${t('dimensions')}: ${selectedMaterial.length} x ${selectedMaterial.width} </p>
                        </div>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/material/${selectedMaterial.id}`)}" class="qr-code" />
                        <p>${window.location.origin}/material/${selectedMaterial.id}</p>
                      </body>
                      </html>
                    `);
                    printWindow.document.close();
                    setTimeout(() => {
                      printWindow.print();
                    }, 300);
                  }}
                >
                  {t('print')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for modals */}
      {(showDetailsModal || showAddModal || showDeleteModal || showQrModal || showRequestModal) && (
        <div 
          className="modal-backdrop fade show"
          onClick={() => {
            setShowDetailsModal(false);
            setShowAddModal(false);
            setShowDeleteModal(false);
            setShowQrModal(false);
            setShowRequestModal(false);
            setSelectedMaterial(null);
            setValidationErrors({});
            
            // Also close filter dropdown if open
            setShowFilterDropdown(false);
          }}
        ></div>
      )}
    </div>
  );
}

export default Materials;