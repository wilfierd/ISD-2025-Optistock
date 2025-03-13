// client/src/components/Materials.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Materials({ user }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMaterials, setSelectedMaterials] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch materials on component mount
  useEffect(() => {
    fetchMaterials();
  }, []);
  
  // Fetch materials from API
  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/materials');
      if (response.data.success) {
        // Transform data to match our React component's expected format
        const transformedData = response.data.data.map(item => ({
          id: item.id,
          packetNo: parseInt(item.packet_no),
          partName: item.part_name,
          length: parseInt(item.length),
          width: parseInt(item.width),
          height: parseInt(item.height),
          quantity: parseInt(item.quantity),
          supplier: item.supplier,
          updatedBy: item.updated_by,
          lastUpdated: item.last_updated
        }));
        setMaterials(transformedData);
      } else {
        setError('Failed to fetch materials');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle checkbox selection
  const handleCheckboxChange = (id) => {
    const newSelectedMaterials = new Set(selectedMaterials);
    if (newSelectedMaterials.has(id)) {
      newSelectedMaterials.delete(id);
    } else {
      newSelectedMaterials.add(id);
    }
    setSelectedMaterials(newSelectedMaterials);
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Filter materials based on search term
  const filteredMaterials = materials.filter(material => 
    material.partName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    setModalMode('add');
    setShowModal(true);
  };

  // Toggle edit modal
  const handleEditClick = () => {
    if (selectedMaterials.size !== 1) return;
    
    const selectedId = Array.from(selectedMaterials)[0];
    const selectedMaterial = materials.find(m => m.id === selectedId);
    
    if (selectedMaterial) {
      setFormData({
        materialId: selectedMaterial.id,
        packetNo: selectedMaterial.packetNo,
        partName: selectedMaterial.partName,
        length: selectedMaterial.length,
        width: selectedMaterial.width,
        height: selectedMaterial.height,
        quantity: selectedMaterial.quantity,
        supplier: selectedMaterial.supplier
      });
      setModalMode('edit');
      setShowModal(true);
    }
  };

  // Toggle delete modal
  const handleDeleteClick = () => {
    if (selectedMaterials.size === 0) return;
    setShowDeleteModal(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle form submission
  const handleSaveClick = async () => {
    try {
      const materialData = {
        packetNo: parseInt(formData.packetNo),
        partName: formData.partName,
        length: parseInt(formData.length),
        width: parseInt(formData.width),
        height: parseInt(formData.height),
        quantity: parseInt(formData.quantity),
        supplier: formData.supplier
      };

      let response;
      if (modalMode === 'add') {
        response = await axios.post('/api/materials', materialData);
      } else {
        response = await axios.put(`/api/materials/${formData.materialId}`, materialData);
      }
      
      if (response.data.success) {
        fetchMaterials();
        setShowModal(false);
        setSelectedMaterials(new Set());
        // Show success notification (to be implemented)
      }
    } catch (err) {
      console.error('Error saving material:', err);
      // Show error notification (to be implemented)
    }
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    try {
      const selectedIds = Array.from(selectedMaterials);
      if (selectedIds.length === 1) {
        await axios.delete(`/api/materials/${selectedIds[0]}`);
      } else {
        await axios.delete('/api/materials', { data: { ids: selectedIds } });
      }
      
      fetchMaterials();
      setShowDeleteModal(false);
      setSelectedMaterials(new Set());
      // Show success notification (to be implemented)
    } catch (err) {
      console.error('Error deleting materials:', err);
      // Show error notification (to be implemented)
    }
  };

  // Handle print button
  const handlePrint = (id) => {
    const material = materials.find(m => m.id === id);
    if (!material) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
          <title>Material #${id}</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h2 { color: #0a4d8c; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
          </style>
      </head>
      <body>
          <h2>Material Details: ${material.partName}</h2>
          <table>
              <tr><th>Packet No</th><td>${material.packetNo}</td></tr>
              <tr><th>Part Name</th><td>${material.partName}</td></tr>
              <tr><th>Dimensions</th><td>${material.length} x ${material.width} x ${material.height}</td></tr>
              <tr><th>Quantity</th><td>${material.quantity}</td></tr>
              <tr><th>Supplier</th><td>${material.supplier}</td></tr>
              <tr><th>Updated By</th><td>${material.updatedBy}</td></tr>
              <tr><th>Last Updated</th><td>${material.lastUpdated}</td></tr>
          </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div>
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-dark">
        <div className="container-fluid">
          <div className="d-flex">
            <a className="navbar-brand" href="/react/dashboard">Dashboard</a>
            <a className="navbar-brand" href="/react/materials">Nhà kho</a>
            <a className="navbar-brand" href="/react/employees">Nhân viên</a>
          </div>
          <div className="d-flex align-items-center">
            <span>Hi, {user.username}</span>
            <div className="avatar">{user.username.charAt(0).toUpperCase()}</div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container-fluid mt-4">
        {/* Search and Action Buttons */}
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
            <button className="btn btn-primary btn-action" onClick={handleAddClick}>Add</button>
            <button 
              className="btn btn-primary btn-action" 
              disabled={selectedMaterials.size !== 1}
              onClick={handleEditClick}
            >
              Edit
            </button>
            <button 
              className="btn btn-primary btn-action" 
              disabled={selectedMaterials.size === 0}
              onClick={handleDeleteClick}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Materials List */}
        <h4>Danh sách nguyên vật liệu ({filteredMaterials.length})</h4>
        
        {loading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
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
                  <tr key={material.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        className="form-check-input"
                        checked={selectedMaterials.has(material.id)}
                        onChange={() => handleCheckboxChange(material.id)}
                      />
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
                        onClick={() => handlePrint(material.id)}
                      >
                        <i className="fas fa-print"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modalMode === 'add' ? 'Add New Material' : 'Edit Material'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
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
                    <div className="col-md-3">
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
                    <div className="col-md-3">
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
                    <div className="col-md-3">
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
                    <div className="col-md-3">
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
                  </div>
                  <div className="mb-3">
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
                </form>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleSaveClick}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
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
                Are you sure you want to delete the selected materials?
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
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Materials;