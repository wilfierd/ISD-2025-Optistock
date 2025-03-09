// public/js/materials.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const materialsTable = document.getElementById('materialsTable');
    const addBtn = document.getElementById('addBtn');
    const editBtn = document.getElementById('editBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const saveBtn = document.getElementById('saveBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const searchInput = document.getElementById('searchInput');
    
    // Bootstrap Modals
    const materialModal = new bootstrap.Modal(document.getElementById('materialModal'));
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    
    // Initialize the page
    initPage();

    // Materials data (initially loaded from the server-rendered page)
    let materials = Array.from(document.querySelectorAll('.select-item')).map(checkbox => {
        const row = checkbox.closest('tr');
        const cells = row.querySelectorAll('td');
        return {
            id: parseInt(checkbox.getAttribute('data-id')),
            packetNo: parseInt(cells[1].textContent),
            partName: cells[2].textContent,
            length: parseInt(cells[3].textContent),
            width: parseInt(cells[4].textContent),
            height: parseInt(cells[5].textContent),
            quantity: parseInt(cells[6].textContent),
            supplier: cells[7].textContent,
            updatedBy: cells[8].textContent,
            lastUpdated: cells[9].textContent,
            selected: false
        };
    });

    // Function to initialize the page
    function initPage() {
        addCheckboxListeners();
        addPrintButtonListeners();
        updateButtonStates();
    }

    // Add event listeners to checkboxes
    function addCheckboxListeners() {
        document.querySelectorAll('.select-item').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const id = parseInt(this.getAttribute('data-id'));
                const material = materials.find(m => m.id === id);
                if (material) {
                    material.selected = this.checked;
                }
                updateButtonStates();
            });
        });
    }

    // Add event listeners to print buttons
    function addPrintButtonListeners() {
        document.querySelectorAll('.print-btn').forEach(button => {
            button.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                printMaterial(id);
            });
        });
    }

    // Function to print material (example implementation)
    function printMaterial(id) {
        const material = materials.find(m => m.id === id);
        if (material) {
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
        }
    }

    // Function to update button states based on selection
    function updateButtonStates() {
        const selectedCount = materials.filter(m => m.selected).length;
        editBtn.disabled = selectedCount !== 1;
        deleteBtn.disabled = selectedCount === 0;
    }

    // Function to render materials table
    function renderTable(data = materials) {
        const tbody = materialsTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        data.forEach(material => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="select-item" data-id="${material.id}" ${material.selected ? 'checked' : ''}>
                </td>
                <td>${material.packetNo}</td>
                <td>${material.partName}</td>
                <td>${material.length}</td>
                <td>${material.width}</td>
                <td>${material.height}</td>
                <td>${material.quantity}</td>
                <td>${material.supplier}</td>
                <td>${material.updatedBy}</td>
                <td>${material.lastUpdated}</td>
                <td>
                    <button class="btn btn-sm print-btn" data-id="${material.id}">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners after rendering
        addCheckboxListeners();
        addPrintButtonListeners();
        updateButtonStates();
        
        // Update materials count in heading
        document.querySelector('h4').textContent = `Danh sách nguyên vật liệu (${data.length})`;
    }

    // Function to show notifications
    function showNotification(message, type = 'success') {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        notificationDiv.setAttribute('role', 'alert');
        notificationDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(notificationDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notificationDiv.remove();
        }, 5000);
    }

    // Function to add material to the server
    async function addMaterialToServer(materialData) {
        try {
            const response = await fetch('/api/materials', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(materialData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Refresh materials from server
                fetchMaterials();
                materialModal.hide();
                showNotification('Material added successfully');
            } else {
                showNotification(result.error || 'Failed to add material', 'danger');
            }
        } catch (error) {
            console.error('Error adding material:', error);
            showNotification('Failed to connect to server', 'danger');
        }
    }
    
    // Event handler for save button
    saveBtn.addEventListener('click', function() {
        const form = document.getElementById('materialForm');
        if (form.checkValidity()) {
            const id = document.getElementById('materialId').value;
            const materialData = {
                packetNo: parseInt(document.getElementById('packetNo').value),
                partName: document.getElementById('partName').value,
                length: parseInt(document.getElementById('length').value),
                width: parseInt(document.getElementById('width').value),
                height: parseInt(document.getElementById('height').value),
                quantity: parseInt(document.getElementById('quantity').value),
                supplier: document.getElementById('supplier').value
            };

            if (id) {
                // Update existing material
                updateMaterialOnServer(id, materialData);
            } else {
                // Add new material
                addMaterialToServer(materialData);
            }
        } else {
            form.reportValidity();
        }
    });

    // Function to update material on the server
    async function updateMaterialOnServer(id, materialData) {
        try {
            const response = await fetch(`/api/materials/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(materialData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Refresh materials from server
                fetchMaterials();
                materialModal.hide();
                showNotification('Material updated successfully');
            } else {
                showNotification(result.error || 'Failed to update material', 'danger');
            }
        } catch (error) {
            console.error('Error updating material:', error);
            showNotification('Failed to connect to server', 'danger');
        }
    }

    // Function to delete materials from the server
    async function deleteMaterialsFromServer(ids) {
        try {
            // For single delete
            if (ids.length === 1) {
                const response = await fetch(`/api/materials/${ids[0]}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    fetchMaterials();
                    deleteModal.hide();
                    showNotification('Material deleted successfully');
                } else {
                    showNotification(result.error || 'Failed to delete material', 'danger');
                }
            } 
            // For batch delete
            else if (ids.length > 1) {
                const response = await fetch('/api/materials', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ids })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    fetchMaterials();
                    deleteModal.hide();
                    showNotification('Materials deleted successfully');
                } else {
                    showNotification(result.error || 'Failed to delete materials', 'danger');
                }
            }
        } catch (error) {
            console.error('Error deleting materials:', error);
            showNotification('Failed to connect to server', 'danger');
        }
    }

    // Function to fetch materials from the server
    async function fetchMaterials() {
        try {
            const response = await fetch('/api/materials');
            const result = await response.json();
            
            if (result.success) {
                materials = result.data.map(item => ({
                    id: item.id,
                    packetNo: parseInt(item.packet_no),
                    partName: item.part_name,
                    length: parseInt(item.length),
                    width: parseInt(item.width),
                    height: parseInt(item.height),
                    quantity: parseInt(item.quantity),
                    supplier: item.supplier,
                    updatedBy: item.updated_by,
                    lastUpdated: item.last_updated,
                    selected: false
                }));
                
                renderTable();
            } else {
                showNotification('Error fetching materials', 'danger');
            }
        } catch (error) {
            console.error('Error fetching materials:', error);
            showNotification('Failed to connect to server', 'danger');
        }
    }

    // Event Listeners
    addBtn.addEventListener('click', function() {
        document.getElementById('modalTitle').textContent = 'Add New Material';
        document.getElementById('materialForm').reset();
        document.getElementById('materialId').value = '';
        materialModal.show();
    });

    editBtn.addEventListener('click', function() {
        const selectedMaterial = materials.find(m => m.selected);
        if (selectedMaterial) {
            document.getElementById('modalTitle').textContent = 'Edit Material';
            document.getElementById('materialId').value = selectedMaterial.id;
            document.getElementById('packetNo').value = selectedMaterial.packetNo;
            document.getElementById('partName').value = selectedMaterial.partName;
            document.getElementById('length').value = selectedMaterial.length;
            document.getElementById('width').value = selectedMaterial.width;
            document.getElementById('height').value = selectedMaterial.height;
            document.getElementById('quantity').value = selectedMaterial.quantity;
            document.getElementById('supplier').value = selectedMaterial.supplier;
            materialModal.show();
        }
    });

    deleteBtn.addEventListener('click', function() {
        const selectedCount = materials.filter(m => m.selected).length;
        if (selectedCount > 0) {
            deleteModal.show();
        }
    });

    confirmDeleteBtn.addEventListener('click', function() {
        const selectedIds = materials.filter(m => m.selected).map(m => m.id);
        deleteMaterialsFromServer(selectedIds);
    });

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredData = materials.filter(material => 
            material.partName.toLowerCase().includes(searchTerm)
        );
        renderTable(filteredData);
    });
});