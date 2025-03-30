// client/src/contexts/LanguageContext.js (with enhanced translations)
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
    materialAddFailed: "Failed to add material",
    materialUpdateFailed: "Failed to update material",
    materialDeleteFailed: "Failed to delete material",
    requestSubmitFailed: "Failed to submit request",
    requestProcessFailed: "Failed to process request",

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
    edit: "Edit",
    generate: "Generate",
    generateQRCode: "Generate QR Code",
    "is required": "is required",
    "This packet number already exists. Packet numbers must be unique.": "This packet number already exists. Packet numbers must be unique.",
    "Fill in the details for your": "Fill in the details for your",
    "add": "add",
    "edit": "edit",
    "request": "request",
    "This request will be sent to an administrator for approval.": "This request will be sent to an administrator for approval.",
    

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
    "Request ID": "Request ID",
    "Error loading requests": "Error loading requests",
    "requests found": "requests found",
    "No": "No",
    "Request Details": "Request Details",
    "No request data available": "No request data available",
    "Error parsing request data": "Error parsing request data",
    "Raw data type": "Raw data type",
    "First 100 chars": "First 100 chars",
    "No request selected": "No request selected",
    "Error processing request": "Error processing request",

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
    "Adding...": "Adding...",
    "Password is required for new users": "Password is required for new users",
    "You don't have permission to delete this user": "You don't have permission to delete this user",
    "User not found": "User not found",
    "Error loading user details": "Error loading user details",
    "Are you sure you want to delete this user?": "Are you sure you want to delete this user?",

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
    dimensions: "Dimensions",
    
    // Language
    language: "Language",
    english: "English",
    vietnamese: "Vietnamese",
    logout: "Logout",

    // Warehouse
    warehouseItems: "Warehouse Items",
    
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
    backToList: "Back to List",

      "Kiểm kho": "Stock Check",
      "Bắt đầu kiểm kho": "Start Stock Check",
      "Hoàn thành": "Finish",
      "Quét mã QR": "Scan QR Code",
      "Quét mã QR hoặc nhập mã nguyên vật liệu": "Scan QR code or enter material ID",
      "Quét": "Scan",
      "Đặt con trỏ vào ô nhập liệu này trước khi quét": "Place cursor in this input field before scanning",
      "Bạn không cần phải nhấp vào ô nhập liệu. Chỉ cần quét trực tiếp mã QR trên vật liệu.": "You don't need to click the input field. Just scan the QR code directly on the material.",
      "Sẵn sàng quét": "Ready to scan",
      "Sẵn sàng nhận dữ liệu từ máy quét...": "Ready to receive scanner data...",
      "Tổng kết kiểm kho": "Stock Check Summary",
      "Tổng số nguyên vật liệu": "Total Materials",
      "Đã kiểm tra": "Checked",
      "Chưa kiểm tra": "Unchecked",
      "Xem danh sách chưa kiểm tra": "View Unchecked List",
      "Kiểm tra lại": "Check Again",
      "Tìm kiếm nguyên vật liệu": "Search Materials",
      "Không tìm thấy nguyên vật liệu. Vui lòng thử lại": "Material not found. Please try again",
      "Nguyên vật liệu đã kiểm tra": "Material already checked",
      "Lỗi khi quét mã QR. Vui lòng thử lại.": "Error scanning QR code. Please try again.",
      "đã được kiểm tra": "has been checked",
      "Trạng thái": "Status",
      "Xem danh sách đã kiểm tra": "View checked list",
      "Hoàn thành kiểm kho": "Complete Warehouse Check",
"Báo cáo kiểm kho": "Warehouse Check Report",
"Thời gian kiểm kho": "Check Date/Time",
"Người kiểm kho": "Checker",
"Tổng số vị trí": "Total Slots",
"Số lượng đã kiểm tra": "Checked Count",
"Số lượng chưa kiểm tra": "Unchecked Count",
"Chi tiết các vị trí chưa kiểm tra": "Details of Unchecked Items",
"Tất cả các vị trí đã được kiểm tra": "All items have been checked",
"Báo cáo bổ sung": "Additional Report",
"Nhập các ghi chú hoặc nhận xét bổ sung...": "Enter additional notes or comments...",
"Hủy": "Cancel",
"Lưu báo cáo": "Save Report",
"Báo cáo kiểm kho đã được lưu": "Warehouse check report has been saved",


"Đóng": "Close",
"In báo cáo": "Print Report",
"Báo cáo đã được in": "Report has been printed",
"Thống kê": "Statistics",
"Người quản lý kho": "Warehouse Manager",
"Tất cả nguyên vật liệu đã được kiểm tra": "All materials have been checked",
"Không có nguyên vật liệu nào được kiểm tra": "No materials have been checked",


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
    materialAddFailed: "Không thể thêm nguyên vật liệu",
    materialUpdateFailed: "Không thể cập nhật nguyên vật liệu",
    materialDeleteFailed: "Không thể xóa nguyên vật liệu",
    requestSubmitFailed: "Không thể gửi yêu cầu",
    requestProcessFailed: "Không thể xử lý yêu cầu",

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
    edit: "Sửa",
    generate: "Tạo",
    generateQRCode: "Tạo mã QR",
    "is required": "là bắt buộc",
    "This packet number already exists. Packet numbers must be unique.": "Số packet này đã tồn tại. Số packet phải là duy nhất.",
    "Fill in the details for your": "Điền thông tin cho yêu cầu",
    "add": "thêm",
    "edit": "sửa",
    "request": "của bạn",
    "This request will be sent to an administrator for approval.": "Yêu cầu này sẽ được gửi đến quản trị viên để phê duyệt.",
    
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
    "Request ID": "ID Yêu cầu",
    "Error loading requests": "Lỗi khi tải yêu cầu",
    "requests found": "yêu cầu được tìm thấy",
    "No": "Không có",
    "Request Details": "Chi tiết yêu cầu",
    "No request data available": "Không có dữ liệu yêu cầu",
    "Error parsing request data": "Lỗi phân tích dữ liệu yêu cầu",
    "Raw data type": "Loại dữ liệu thô",
    "First 100 chars": "100 ký tự đầu tiên",
    "No request selected": "Không có yêu cầu nào được chọn",
    "Error processing request": "Lỗi khi xử lý yêu cầu",

    // Users
    employeeAdded: "Đã thêm nhân viên thành công",
    employeeUpdated: "Đã cập nhật nhân viên thành công",
    employeeDeleted: "Đã xóa nhân viên thành công",
    employeeAddFailed: "Không thể thêm nhân viên",
    employeeUpdateFailed: "Không thể cập nhật nhân viên",
    employeeDeleteFailed: "Không thể xóa nhân viên",
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
    "Adding...": "Đang thêm...",
    "Password is required for new users": "Mật khẩu là bắt buộc cho người dùng mới",
    "You don't have permission to delete this user": "Bạn không có quyền xóa người dùng này",
    "User not found": "Không tìm thấy người dùng",
    "Error loading user details": "Lỗi khi tải thông tin người dùng",
    "Are you sure you want to delete this user?": "Bạn có chắc chắn muốn xóa người dùng này?",

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
    dimensions: "Kích thước",
    
    // Language
    language: "Ngôn ngữ",
    english: "Tiếng Anh",
    vietnamese: "Tiếng Việt",
    logout: "Đăng xuất",

    // Warehouse
    warehouseItems: "Hàng trong kho",
    
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
    backToList: "Quay lại danh sách",

      // Warehouse Stock Check
  "Kiểm kho": "Kiểm kho",
  "Bắt đầu kiểm kho": "Bắt đầu kiểm kho",
  "Hoàn thành": "Hoàn thành",
  "Quét mã QR": "Quét mã QR",
  "Quét mã QR hoặc nhập mã nguyên vật liệu": "Quét mã QR hoặc nhập mã nguyên vật liệu",
  "Quét": "Quét",
  "Đặt con trỏ vào ô nhập liệu này trước khi quét": "Đặt con trỏ vào ô nhập liệu này trước khi quét",
  "Bạn không cần phải nhấp vào ô nhập liệu. Chỉ cần quét trực tiếp mã QR trên vật liệu.": "Bạn không cần phải nhấp vào ô nhập liệu. Chỉ cần quét trực tiếp mã QR trên vật liệu.",
  "Sẵn sàng quét": "Sẵn sàng quét",
  "Sẵn sàng nhận dữ liệu từ máy quét...": "Sẵn sàng nhận dữ liệu từ máy quét...",
  "Tổng kết kiểm kho": "Tổng kết kiểm kho",
  "Tổng số nguyên vật liệu": "Tổng số nguyên vật liệu",
  "Đã kiểm tra": "Đã kiểm tra",
  "Chưa kiểm tra": "Chưa kiểm tra",
  "Xem danh sách chưa kiểm tra": "Xem danh sách chưa kiểm tra",
  "Kiểm tra lại": "Kiểm tra lại",
  "Tìm kiếm nguyên vật liệu": "Tìm kiếm nguyên vật liệu",
  "Không tìm thấy nguyên vật liệu. Vui lòng thử lại": "Không tìm thấy nguyên vật liệu. Vui lòng thử lại",
  "Nguyên vật liệu đã kiểm tra": "Nguyên vật liệu đã kiểm tra",
  "Lỗi khi quét mã QR. Vui lòng thử lại.": "Lỗi khi quét mã QR. Vui lòng thử lại.",
  "đã được kiểm tra": "đã được kiểm tra",
  "Trạng thái": "Trạng thái",
  "Xem danh sách đã kiểm tra": "Xem danh sách đã kiểm tra",
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