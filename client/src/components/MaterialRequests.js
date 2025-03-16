// client/src/components/MaterialRequests.js
import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useMaterialRequests, useProcessMaterialRequest } from '../hooks/useMaterialRequests';
import { toast } from 'react-toastify';

function MaterialRequests({ user }) {
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [processingData, setProcessingData] = useState({
    status: 'approved',
    adminNotes: ''
  });
  
  const { data: requests = [], isLoading, error, refetch } = useMaterialRequests(selectedStatus);
  const processRequest = useProcessMaterialRequest();
  const logoutMutation = useLogout();
  
  // Auto-refresh requests every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refetch]);
  
  // Handle viewing request details
  const handleViewRequest = (request) => {
    console.log("Selected request:", request);
    setSelectedRequest(request);
    setProcessingData({
      status: 'approved',
      adminNotes: ''
    });
    setShowViewModal(true);
  };
  
  // Handle processing a request
  const handleProcessRequest = () => {
    if (!selectedRequest) {
      toast.error("No request selected");
      return;
    }
    
    processRequest.mutate(
      { 
        id: selectedRequest.id, 
        data: processingData 
      },
      {
        onSuccess: () => {
          toast.success(`Request ${processingData.status} successfully`);
          setShowViewModal(false);
          setSelectedRequest(null);
          refetch();
        },
        onError: (error) => {
          toast.error(`Error processing request: ${error.message}`);
        }
      }
    );
  };
  
  // Handle input change for processing form
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setProcessingData(prev => ({
      ...prev,
      [id]: value
    }));
  };
  
  // Handle filter change
  const handleFilterChange = (e) => {
    setSelectedStatus(e.target.value);
  };
  
  // Format request data for display
const formatRequestData = (requestData) => {
  if (!requestData) return null;
  
  try {
    // Handle the data regardless of whether it's a string or already an object
    let data;
    if (typeof requestData === 'string') {
      data = JSON.parse(requestData);
    } else if (typeof requestData === 'object') {
      data = requestData;
    } else {
      throw new Error(`Unexpected data type: ${typeof requestData}`);
    }
    
    return (
      <table className="table table-sm table-bordered">
        <tbody>
          {Object.entries(data).map(([key, value]) => (
            <tr key={key}>
              <th style={{ width: '150px' }}>{key}</th>
              <td>{value !== null && value !== undefined ? String(value) : 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } catch (error) {
    console.error("Error handling request data:", error, "Data:", requestData);
    return (
      <div className="alert alert-danger">
        <p>Error parsing request data: {error.message}</p>
        <p>Raw data type: {typeof requestData}</p>
        {typeof requestData === 'string' && <p>First 100 chars: {requestData.substring(0, 100)}</p>}
      </div>
    );
  }
};
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="container-fluid mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Material Requests</h2>
          <div className="d-flex align-items-center">
            <label htmlFor="statusFilter" className="me-2">Status:</label>
            <select 
              id="statusFilter" 
              className="form-select" 
              value={selectedStatus}
              onChange={handleFilterChange}
              style={{ width: '150px' }}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">
            <h5>Error loading requests</h5>
            <p>{error.message}</p>
            <button className="btn btn-primary" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        ) : (
          <div className="card shadow-sm">
            <div className="card-body">
              {requests.length === 0 ? (
                <div className="text-center py-5">
                  <div className="text-muted">No {selectedStatus} requests found</div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Material ID</th>
                        <th>User</th>
                        <th>Request Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map(request => (
                        <tr key={request.id}>
                          <td>{request.id}</td>
                          <td>
                            <span className={`badge bg-${
                              request.request_type === 'add' ? 'success' : 
                              request.request_type === 'edit' ? 'primary' :
                              'danger'
                            }`}>
                              {request.request_type}
                            </span>
                          </td>
                          <td>{request.material_id || 'N/A'}</td>
                          <td>{request.user_username || request.requested_by || 'Unknown'}</td>
                          <td>{new Date(request.request_date).toLocaleString()}</td>
                          <td>
                            <span className={`badge bg-${
                              request.status === 'pending' ? 'warning' : 
                              request.status === 'approved' ? 'success' :
                              'danger'
                            }`}>
                              {request.status}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn btn-sm btn-primary me-2"
                              onClick={() => handleViewRequest(request)}
                            >
                              View Details
                            </button>
                            {request.status === 'pending' && (
                              <>
                                <button 
                                  className="btn btn-sm btn-success me-2"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setProcessingData({status: 'approved', adminNotes: ''});
                                    setShowViewModal(true);
                                  }}
                                >
                                  Approve
                                </button>
                                <button 
                                  className="btn btn-sm btn-danger"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setProcessingData({status: 'rejected', adminNotes: ''});
                                    setShowViewModal(true);
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* View Request Modal */}
      {showViewModal && selectedRequest && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {selectedRequest.request_type.charAt(0).toUpperCase() + selectedRequest.request_type.slice(1)} Request Details
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="card mb-3">
                      <div className="card-header bg-light">
                        <h5 className="mb-0">Request Information</h5>
                      </div>
                      <div className="card-body">
                        <p><strong>Request ID:</strong> {selectedRequest.id}</p>
                        <p>
                          <strong>Type:</strong> 
                          <span className={`badge ms-2 bg-${
                            selectedRequest.request_type === 'add' ? 'success' : 
                            selectedRequest.request_type === 'edit' ? 'primary' :
                            'danger'
                          }`}>
                            {selectedRequest.request_type}
                          </span>
                        </p>
                        <p>
                          <strong>Status:</strong> 
                          <span className={`badge ms-2 bg-${
                            selectedRequest.status === 'pending' ? 'warning' : 
                            selectedRequest.status === 'approved' ? 'success' :
                            'danger'
                          }`}>
                            {selectedRequest.status}
                          </span>
                        </p>
                        {selectedRequest.material_id && (
                          <p><strong>Material ID:</strong> {selectedRequest.material_id}</p>
                        )}
                        <p><strong>Requested By:</strong> {selectedRequest.user_username || selectedRequest.requested_by || 'Unknown'}</p>
                        <p><strong>Request Date:</strong> {new Date(selectedRequest.request_date).toLocaleString()}</p>
                        
                        {selectedRequest.status !== 'pending' && (
                          <>
                            <p><strong>Response Date:</strong> {new Date(selectedRequest.response_date).toLocaleString()}</p>
                            <p><strong>Processed By:</strong> {selectedRequest.admin_id ? `ID: ${selectedRequest.admin_id}` : 'Unknown'}</p>
                            {selectedRequest.admin_notes && (
                              <div>
                                <strong>Admin Notes:</strong>
                                <p className="p-2 bg-light rounded">{selectedRequest.admin_notes}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header bg-light">
                        <h5 className="mb-0">Request Data</h5>
                      </div>
                      <div className="card-body">
                        {selectedRequest.request_data ? (
                          <div>
                            {formatRequestData(selectedRequest.request_data)}
                          </div>
                        ) : (
                          <p className="text-muted">No request data available</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedRequest.status === 'pending' && (
                  <div className="mt-4 border-top pt-3">
                    <h5>Process This Request</h5>
                    <div className="mb-3">
                      <label htmlFor="status" className="form-label">Decision</label>
                      <select 
                        id="status" 
                        className="form-select" 
                        value={processingData.status}
                        onChange={handleInputChange}
                      >
                        <option value="approved">Approve</option>
                        <option value="rejected">Reject</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="adminNotes" className="form-label">Notes (Optional)</label>
                      <textarea 
                        id="adminNotes" 
                        className="form-control" 
                        value={processingData.adminNotes}
                        onChange={handleInputChange}
                        rows="3"
                        placeholder="Explain your decision (will be visible to the requester)"
                      ></textarea>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
                {selectedRequest.status === 'pending' && (
                  <button 
                    type="button" 
                    className={`btn btn-${processingData.status === 'approved' ? 'success' : 'danger'}`} 
                    onClick={handleProcessRequest}
                    disabled={processRequest.isPending}
                  >
                    {processRequest.isPending ? 'Processing...' : 
                      processingData.status === 'approved' ? 'Approve Request' : 'Reject Request'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for modals */}
      {showViewModal && (
        <div 
          className="modal-backdrop fade show"
          onClick={() => setShowViewModal(false)}
        ></div>
      )}
    </div>
  );
}

export default MaterialRequests;