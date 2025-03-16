// client/src/components/MyRequests.js
import React, { useState } from 'react';
import { useMyMaterialRequests } from '../hooks/useMaterialRequests';

function MyRequests() {
  const { data: requests = [], isLoading, error } = useMyMaterialRequests();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  
  // Handle viewing request details
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowViewModal(true);
  };
  
  // Format request data for display
  const formatRequestData = (requestData) => {
    try {
      const data = JSON.parse(requestData);
      return (
        <table className="table table-sm">
          <tbody>
            {Object.entries(data).map(([key, value]) => (
              <tr key={key}>
                <th style={{ width: '150px' }}>{key}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } catch (error) {
      return <p className="text-danger">Error parsing request data</p>;
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">My Material Requests</h5>
      </div>
      <div className="card-body">
        {isLoading ? (
          <div className="text-center my-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error.message}</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-muted">You haven't made any requests yet</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
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
                        className="btn btn-sm btn-primary"
                        onClick={() => handleViewRequest(request)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    <p><strong>Request ID:</strong> {selectedRequest.id}</p>
                    <p><strong>Type:</strong> {selectedRequest.request_type}</p>
                    <p><strong>Status:</strong> 
                      <span className={`ms-2 badge bg-${
                        selectedRequest.status === 'pending' ? 'warning' : 
                        selectedRequest.status === 'approved' ? 'success' :
                        'danger'
                      }`}>
                        {selectedRequest.status}
                      </span>
                    </p>
                    <p><strong>Request Date:</strong> {new Date(selectedRequest.request_date).toLocaleString()}</p>
                    
                    {selectedRequest.status !== 'pending' && (
                      <>
                        <p><strong>Response Date:</strong> {new Date(selectedRequest.response_date).toLocaleString()}</p>
                        {selectedRequest.admin_notes && (
                          <div className="mt-3">
                            <h6>Admin Notes:</h6>
                            <div className="alert alert-secondary">
                              {selectedRequest.admin_notes}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="col-md-6">
                    {selectedRequest.material_id && (
                      <p><strong>Material ID:</strong> {selectedRequest.material_id}</p>
                    )}
                    {selectedRequest.request_data && (
                      <div className="mt-3">
                        <h6>Request Data:</h6>
                        {formatRequestData(selectedRequest.request_data)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyRequests;