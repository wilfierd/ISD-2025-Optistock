// client/src/contexts/LanguageContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

// Create translation files for English and Vietnamese
const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    warehouse: "Warehouse",
    employees: "Employees",
    requests: "Requests",
    production: "Production",
    
    // Notifications
    notifications: "Notifications",
    markAllAsRead: "Mark all as read",
    noNotifications: "No notifications",
    viewAllNotifications: "View all notifications",
    
    // Toast messages
    loginSuccess: "Login successful",
    logoutSuccess: "Logged out successfully",
    materialAdded: "Material added successfully",
    materialUpdated: "Material updated successfully",
    materialDeleted: "Material deleted successfully",
    requestSubmitted: "Request submitted successfully",
    requestApproved: "Request approved successfully",
    requestRejected: "Request rejected successfully",
    operationSuccess: "Operation completed successfully",
    operationFailed: "Operation failed",
    validationError: "Please correct the errors",
    networkError: "Network error. Please try again",
    serverError: "Server error. Please try again later",

    // Dashboard
    totalMaterials: "Total Materials",
    suppliers: "Suppliers",
    thisWeeksOrders: "This Week's Orders",
    systemUsers: "System Users",
    materialTypesDistribution: "Material Types Distribution",
    monthlyInventoryChanges: "Monthly Inventory Changes",
    recentlyUpdatedMaterials: "Recently Updated Materials",
    viewAllMaterials: "View All Materials",
    quickActions: "Quick Actions",
    manageMaterials: "Manage Materials",
    exportInventoryReport: "Export Inventory Report",
    registerNewShipment: "Register New Shipment",
    addNewUser: "Add New User",

    // Materials
    materialsList: "Materials List",
    searchByPacketNo: "Search by Packet No",
    searchByPartName: "Search by Part Name",
    searchBySupplier: "Search by Supplier",
    searchByUpdatedBy: "Search by Updated By",
    searchBy: "Search by",
    addMaterial: "Add Material",
    requestAdd: "Request Add",
    packetNo: "Packet No",
    partName: "Part Name",
    length: "Length",
    width: "Width",
    height: "Height",
    quantity: "Quantity",
    supplier: "Supplier",
    updatedBy: "Updated By",
    lastUpdated: "Last Updated",
    materialDetails: "Material Details",
    close: "Close",
    cancel: "Cancel",
    delete: "Delete",
    saveChanges: "Save Changes",
    adding: "Adding...",
    saving: "Saving...",
    deleting: "Deleting...",
    editMaterial: "Edit Material",
    requestEdit: "Request Edit",
    requestDelete: "Request Delete",
    confirmDelete: "Confirm Delete",
    materialDeleteConfirm: "Are you sure you want to delete this material?",
    submit: "Submit",
    submitting: "Submitting...",
    requestDetails: "Request to {requestType} Material",
    materialQRCode: "Material QR Code: {materialName}",
    scanQRCode: "Scan this QR code to view material details:",
    print: "Print",

    // Requests
    materialRequests: "Material Requests",
    status: "Status",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    id: "ID",
    type: "Type",
    materialID: "Material ID",
    user: "User",
    requestDate: "Request Date",
    actions: "Actions",
    viewDetails: "View Details",
    approve: "Approve",
    reject: "Reject",
    requestInformation: "Request Information",
    requestedBy: "Requested By",
    responseDate: "Response Date",
    processedBy: "Processed By",
    adminNotes: "Admin Notes",
    requestData: "Request Data",
    processRequest: "Process This Request",
    decision: "Decision",
    notes: "Notes (Optional)",
    notesPlaceholder: "Explain your decision (will be visible to the requester)",
    approveRequest: "Approve Request",
    rejectRequest: "Reject Request",
    processing: "Processing...",

    // Users
    usersList: "Users List",
    searchByName: "Search users by name",
    addUser: "Add User",
    username: "Username",
    fullName: "Full Name",
    role: "Role",
    phone: "Phone",
    userDetails: "User Details",
    editUser: "Edit User",
    password: "Password",
    passwordEdit: "Password (Leave blank to keep current)",
    phoneNumber: "Phone Number",
    createdAt: "Created At",

    // Login
    inventoryManagement: "Inventory Management",
    loginCredentials: "Enter your credentials to access the system",
    loggingIn: "Logging in...",
    login: "Login",

    // Common
    noRecordsFound: "No records found",
    loading: "Loading...",
    error: "Error",
    retry: "Retry",
    
    // Language
    language: "Language",
    english: "English",
    vietnamese: "Vietnamese",
    logout: "Logout",

    // Warehouse
    warehouseItems: "Warehouse Items",
    dimensions: "Dimensions",
    
    // Table common terms
    noRecordsFound: "No records found",
    filter: "Filter",
    search: "Search",
    
    // Notifications
    newRequestNotification: "New {requestType} material request from {username}",
    requestProcessedNotification: "Your {requestType} material request has been {status}",
    
    // Buttons
    create: "Create",
    update: "Update",
    detail: "Detail",
    confirmAction: "Confirm",
    generate: "Generate",
    backToList: "Back to List"
  },
  vi: {
    // Navigation
    dashboard: "Tổng quan",
    warehouse: "Nhà kho",
    employees: "Nhân viên",
    requests: "Yêu cầu",
    production: "Sản xuất",
    
    // Notifications
    notifications: "Thông báo",
    markAllAsRead: "Đánh dấu tất cả đã đọc",
    noNotifications: "Không có thông báo",
    viewAllNotifications: "Xem tất cả thông báo",
    
    // Toast messages
    loginSuccess: "Đăng nhập thành công",
    logoutSuccess: "Đã đăng xuất thành công",
    materialAdded: "Đã thêm nguyên vật liệu thành công",
    materialUpdated: "Đã cập nhật nguyên vật liệu thành công",
    materialDeleted: "Đã xóa nguyên vật liệu thành công",
    requestSubmitted: "Đã gửi yêu cầu thành công",
    requestApproved: "Đã phê duyệt yêu cầu thành công",
    requestRejected: "Đã từ chối yêu cầu thành công",
    operationSuccess: "Thao tác hoàn tất thành công",
    operationFailed: "Thao tác thất bại",
    validationError: "Vui lòng sửa các lỗi",
    networkError: "Lỗi kết nối. Vui lòng thử lại",
    serverError: "Lỗi máy chủ. Vui lòng thử lại sau",

    // Dashboard
    totalMaterials: "Tổng nguyên vật liệu",
    suppliers: "Nhà cung cấp",
    thisWeeksOrders: "Đơn hàng tuần này",
    systemUsers: "Người dùng hệ thống",
    materialTypesDistribution: "Phân bố loại nguyên vật liệu",
    monthlyInventoryChanges: "Thay đổi tồn kho hàng tháng",
    recentlyUpdatedMaterials: "Nguyên vật liệu cập nhật gần đây",
    viewAllMaterials: "Xem tất cả nguyên vật liệu",
    quickActions: "Thao tác nhanh",
    manageMaterials: "Quản lý nguyên vật liệu",
    exportInventoryReport: "Xuất báo cáo tồn kho",
    registerNewShipment: "Đăng ký lô hàng mới",
    addNewUser: "Thêm người dùng mới",

    // Materials
    materialsList: "Danh sách nguyên vật liệu",
    searchByPacketNo: "Tìm theo Packet No",
    searchByPartName: "Tìm theo Part Name",
    searchBySupplier: "Tìm theo Nhà cung cấp",
    searchByUpdatedBy: "Tìm theo Người cập nhật",
    searchBy: "Tìm theo",
    addMaterial: "Thêm nguyên vật liệu",
    requestAdd: "Yêu cầu thêm",
    packetNo: "Packet No",
    partName: "Tên bộ phận",
    length: "Dài",
    width: "Rộng",
    height: "Cao",
    quantity: "Số lượng",
    supplier: "Nhà cung cấp",
    updatedBy: "Cập nhật bởi",
    lastUpdated: "Cập nhật lần cuối",
    materialDetails: "Thông tin nguyên vật liệu",
    close: "Đóng",
    cancel: "Hủy",
    delete: "Xóa",
    saveChanges: "Lưu thay đổi",
    adding: "Đang thêm...",
    saving: "Đang lưu...",
    deleting: "Đang xóa...",
    editMaterial: "Sửa nguyên vật liệu",
    requestEdit: "Yêu cầu sửa",
    requestDelete: "Yêu cầu xóa",
    confirmDelete: "Xác nhận xóa",
    materialDeleteConfirm: "Bạn có chắc chắn muốn xóa nguyên vật liệu này?",
    submit: "Gửi",
    submitting: "Đang gửi...",
    requestDetails: "Yêu cầu {requestType} nguyên vật liệu",
    materialQRCode: "Mã QR nguyên vật liệu: {materialName}",
    scanQRCode: "Quét mã QR này để xem chi tiết nguyên vật liệu:",
    print: "In",

    // Requests
    materialRequests: "Yêu cầu nguyên vật liệu",
    status: "Trạng thái",
    pending: "Đang chờ",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
    id: "ID",
    type: "Loại",
    materialID: "ID nguyên vật liệu",
    user: "Người dùng",
    requestDate: "Ngày yêu cầu",
    actions: "Hành động",
    viewDetails: "Xem chi tiết",
    approve: "Duyệt",
    reject: "Từ chối",
    requestInformation: "Thông tin yêu cầu",
    requestedBy: "Người yêu cầu",
    responseDate: "Ngày phản hồi",
    processedBy: "Xử lý bởi",
    adminNotes: "Ghi chú của quản trị viên",
    requestData: "Dữ liệu yêu cầu",
    processRequest: "Xử lý yêu cầu này",
    decision: "Quyết định",
    notes: "Ghi chú (Tùy chọn)",
    notesPlaceholder: "Giải thích quyết định của bạn (sẽ hiển thị cho người yêu cầu)",
    approveRequest: "Duyệt yêu cầu",
    rejectRequest: "Từ chối yêu cầu",
    processing: "Đang xử lý...",

    // Users
    usersList: "Số nhân viên",
    searchByName: "Tìm nhân viên theo tên",
    addUser: "Thêm người dùng",
    username: "Tên đăng nhập",
    fullName: "Họ và tên",
    role: "Chức vụ",
    phone: "SĐT",
    userDetails: "Chi tiết người dùng",
    editUser: "Sửa người dùng",
    password: "Mật khẩu",
    passwordEdit: "Mật khẩu (Để trống nếu giữ nguyên)",
    phoneNumber: "Số điện thoại",
    createdAt: "Ngày tạo",

    // Login
    inventoryManagement: "Quản lý kho",
    loginCredentials: "Nhập thông tin đăng nhập để truy cập hệ thống",
    loggingIn: "Đang đăng nhập...",
    login: "Đăng nhập",

    // Common
    noDataFound: "Không tìm thấy dữ liệu",
    loading: "Đang tải...",
    error: "Lỗi",
    retry: "Thử lại",
    
    // Language
    language: "Ngôn ngữ",
    english: "Tiếng Anh",
    vietnamese: "Tiếng Việt",
    logout: "Đăng xuất",

    // Warehouse
    warehouseItems: "Hàng trong kho",
    dimensions: "Kích thước",
    
    // Table common terms
    noRecordsFound: "Không tìm thấy bản ghi nào",
    filter: "Lọc",
    search: "Tìm kiếm",
    
    // Notifications
    newRequestNotification: "Yêu cầu {requestType} nguyên vật liệu mới từ {username}",
    requestProcessedNotification: "Yêu cầu {requestType} nguyên vật liệu của bạn đã được {status}",
    
    // Buttons
    create: "Tạo mới",
    update: "Cập nhật",
    detail: "Chi tiết",
    confirmAction: "Xác nhận",
    generate: "Tạo",
    backToList: "Quay lại danh sách"
  }
};

// Create the context
const LanguageContext = createContext();

// Create a provider component
export const LanguageProvider = ({ children }) => {
  // Get saved language from localStorage or default to English
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage || 'en';
  });

  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Toggle language function
  const toggleLanguage = () => {
    setLanguage(prevLang => prevLang === 'en' ? 'vi' : 'en');
  };

  // Function to get a translation
  const translate = (key, replacements = {}) => {
    const translation = translations[language][key] || key;
    
    // Handle replacements for dynamic content
    if (Object.keys(replacements).length > 0) {
      return Object.entries(replacements).reduce(
        (str, [key, value]) => str.replace(`{${key}}`, value),
        translation
      );
    }
    
    return translation;
  };

  // Provide the language state and functions to children
  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};