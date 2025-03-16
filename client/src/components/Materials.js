// client/src/components/Materials.js
import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { 
  useMaterials, 
  useCreateMaterial, 
  useUpdateMaterial, 
  useDeleteMaterial
} from '../hooks/useMaterials';

function Materials({ user }) {
  // State for search and selected material
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  
  // QR code state
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrCodeMaterialUrl, setQrCodeMaterialUrl] = useState('');
  
  // Form state for add/edit modal
  const [formData, setFormData] = useState({
    materialId: '',
    packetNo: '',
    partName: '',
    length: '',
    width: '',
    height: '',
    quantity: '',
    supplier: ''
  });

  // React Query hooks
  const { data: materials = [], isLoading, error } = useMaterials();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const logoutMutation = useLogout();

  // Filter materials based on search term
  const filteredMaterials = useMemo(() => {
    return materials.filter(material => 
      material.partName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm]);

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle material row click
  const handleMaterialClick = (material) => {
    setSelectedMaterial(material);
    setFormData({
      materialId: material.id,
      packetNo: material.packetNo,
      partName: material.partName,
      length: material.length,
      width: material.width,
      height: material.height,
      quantity: material.quantity,
      supplier: material.supplier
    });
    setShowDetailsModal(true);
  };

  // Toggle add modal
  const handleAddClick = () => {
    setFormData({
      materialId: '',
      packetNo: '',
      partName: '',
      length: '',
      width: '',
      height: '',
      quantity: '',
      supplier: ''
    });
    setShowAddModal(true);
  };

  // Handle delete button click in details modal
  const handleDeleteClick = () => {
    setShowDetailsModal(false);
    setShowDeleteModal(true);
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
    
    setQrCodeUrl(qrCodeUrl);
    setQrCodeMaterialUrl(materialUrl);
    setShowQrModal(true);
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
  };

  // Handle save (create or update)
  const handleSaveClick = (isNewMaterial = false) => {
    const materialData = {
      packetNo: parseInt(formData.packetNo),
      partName: formData.partName,
      length: parseInt(formData.length),
      width: parseInt(formData.width),
      height: parseInt(formData.height),
      quantity: parseInt(formData.quantity),
      supplier: formData.supplier
    };

    if (isNewMaterial) {
      createMaterial.mutate(materialData, {
        onSuccess: () => {
          setShowAddModal(false);
          setSelectedMaterial(null);
        }
      });
    } else {
      updateMaterial.mutate({ 
        id: formData.materialId, 
        data: materialData 
      }, {
        onSuccess: () => {
          setShowDetailsModal(false);
          setSelectedMaterial(null);
        }
      });
    }
  };

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    if (selectedMaterial) {
      deleteMaterial.mutate(selectedMaterial.id, {
        onSuccess: () => {
          setShowDeleteModal(false);
          setSelectedMaterial(null);
        }
      });
    }
  };

  // Close all modals and clear selection
  const closeAllModals = () => {
    setShowDetailsModal(false);
    setShowAddModal(false);
    setShowDeleteModal(false);
    setShowQrModal(false);
    setSelectedMaterial(null);
  };

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="container-fluid mt-4">
        {/* Search and Add Button */}
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="search-container">
              <span className="search-icon"><i className="fas fa-search"></i></span>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Tìm sản phẩm theo tên"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
          <div className="col-md-6 text-end">
            <button 
              className="btn btn-primary" 
              onClick={handleAddClick}
              disabled={createMaterial.isPending}
            >
              {createMaterial.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>

        {/* Materials List */}
        <h4>Danh sách nguyên vật liệu ({filteredMaterials.length})</h4>
        
        {isLoading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error.message}</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th width="5%"></th>
                  <th width="5%">Packet No</th>
                  <th width="20%">Part Name</th>
                  <th width="10%">Dài</th>
                  <th width="10%">Rộng</th>
                  <th width="10%">Cao</th>
                  <th width="5%">Quantity</th>
                  <th width="15%">Supplier</th>
                  <th width="10%">Updated by</th>
                  <th width="10%">Last Updated</th>
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
                    <td>{material.length}</td>
                    <td>{material.width}</td>
                    <td>{material.height}</td>
                    <td>{material.quantity}</td>
                    <td>{material.supplier}</td>
                    <td>{material.updatedBy}</td>
                    <td>{material.lastUpdated}</td>
                    <td>
                      <button 
                        className="btn btn-sm" 
                        onClick={(e) => handlePrint(material.id, e)}
                        title="Generate QR Code"
                      >
                        <i className="fas fa-print"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMaterials.length === 0 && (
                  <tr>
                    <td colSpan="11" className="text-center py-3">No materials found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Material Details Modal */}
      {showDetailsModal && selectedMaterial && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Thông tin nguyên vật liệu</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedMaterial(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {user.role === 'admin' ? (
                  // Admin view - Edit form
                  <form id="materialForm">
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="packetNo" className="form-label">Packet No</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          id="packetNo" 
                          value={formData.packetNo}
                          onChange={handleInputChange}
                          required 
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="partName" className="form-label">Part Name</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="partName" 
                          value={formData.partName}
                          onChange={handleInputChange}
                          required 
                        />
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <label htmlFor="length" className="form-label">Dài</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          id="length" 
                          value={formData.length}
                          onChange={handleInputChange}
                          required 
                        />
                      </div>
                      <div className="col-md-4">
                        <label htmlFor="width" className="form-label">Rộng</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          id="width" 
                          value={formData.width}
                          onChange={handleInputChange}
                          required 
                        />
                      </div>
                      <div className="col-md-4">
                        <label htmlFor="height" className="form-label">Cao</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          id="height" 
                          value={formData.height}
                          onChange={handleInputChange}
                          required 
                        />
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="quantity" className="form-label">Quantity</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          id="quantity" 
                          value={formData.quantity}
                          onChange={handleInputChange}
                          required 
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="supplier" className="form-label">Supplier</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="supplier" 
                          value={formData.supplier}
                          onChange={handleInputChange}
                          required 
                        />
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <p><strong>Updated By:</strong> {selectedMaterial.updatedBy}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Last Updated:</strong> {selectedMaterial.lastUpdated}</p>
                      </div>
                    </div>
                  </form>
                ) : (
                  // Regular user view - Read-only details
                  <div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <p><strong>Packet No:</strong> {selectedMaterial.packetNo}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Part Name:</strong> {selectedMaterial.partName}</p>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-12">
                        <p><strong>Dimensions:</strong> {selectedMaterial.length} x {selectedMaterial.width} x {selectedMaterial.height}</p>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <p><strong>Quantity:</strong> {selectedMaterial.quantity}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Supplier:</strong> {selectedMaterial.supplier}</p>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <p><strong>Updated By:</strong> {selectedMaterial.updatedBy}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Last Updated:</strong> {selectedMaterial.lastUpdated}</p>
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
                  }}
                >
                  Close
                </button>
                
                {user.role === 'admin' && (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      onClick={handleDeleteClick}
                    >
                      Delete
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={() => handleSaveClick(false)}
                      disabled={updateMaterial.isPending}
                    >
                      {updateMaterial.isPending ? 'Saving...' : 'Save Changes'}
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
                <h5 className="modal-title">Add New Material</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form id="addMaterialForm">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="packetNo" className="form-label">Packet No</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="packetNo" 
                        value={formData.packetNo}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="partName" className="form-label">Part Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="partName" 
                        value={formData.partName}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label htmlFor="length" className="form-label">Dài</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="length" 
                        value={formData.length}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="width" className="form-label">Rộng</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="width" 
                        value={formData.width}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="height" className="form-label">Cao</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="height" 
                        value={formData.height}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="quantity" className="form-label">Quantity</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="quantity" 
                        value={formData.quantity}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="supplier" className="form-label">Supplier</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="supplier" 
                        value={formData.supplier}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => handleSaveClick(true)}
                  disabled={createMaterial.isPending}
                >
                  {createMaterial.isPending ? 'Adding...' : 'Add Material'}
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
                <h5 className="modal-title">Confirm Delete</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete "{selectedMaterial.partName}"?</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleConfirmDelete}
                  disabled={deleteMaterial.isPending}
                >
                  {deleteMaterial.isPending ? 'Deleting...' : 'Delete'}
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
                <h5 className="modal-title">Material QR Code: {selectedMaterial.partName}</h5>
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
                <p>Scan this QR code to view material details:</p>
                <img 
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="img-fluid mb-3"
                  style={{ maxWidth: '200px' }}
                />
                <p className="small text-muted">
                  {qrCodeMaterialUrl}
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
                  Close
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
                        <title>Material QR Code: ${selectedMaterial.partName}</title>
                        <style>
                          body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
                          h2 { color: #0a4d8c; }
                          .material-info { margin: 20px 0; }
                          .qr-code { max-width: 300px; margin: 20px auto; }
                        </style>
                      </head>
                      <body>
                        <h2>Material QR Code</h2>
                        <div class="material-info">
                          <h3>${selectedMaterial.partName}</h3>
                          <p>Packet: ${selectedMaterial.packetNo} | Dimensions: ${selectedMaterial.length} x ${selectedMaterial.width} x ${selectedMaterial.height}</p>
                        </div>
                        <img src="${qrCodeUrl}" class="qr-code" />
                        <p>${qrCodeMaterialUrl}</p>
                      </body>
                      </html>
                    `);
                    printWindow.document.close();
                    setTimeout(() => {
                      printWindow.print();
                    }, 300);
                  }}
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for modals */}
      {(showDetailsModal || showAddModal || showDeleteModal || showQrModal) && (
        <div 
          className="modal-backdrop fade show" 
          onClick={closeAllModals}
        ></div>
      )}
    </div>
  );
}

export default Materials;