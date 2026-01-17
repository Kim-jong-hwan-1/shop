import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/context/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 추가
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || '오류가 발생했습니다.';

    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      toast.error('로그인이 필요합니다.');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      toast.error('권한이 없습니다.');
    } else if (error.response?.status >= 500) {
      toast.error('서버 오류가 발생했습니다.');
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  checkEmail: (email) => api.get(`/auth/check-email?email=${email}`),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  refresh: () => api.post('/auth/refresh'),
};

// User API
export const userAPI = {
  updateProfile: (data) => api.put('/users/profile', data),
  withdraw: (data) => api.delete('/users/withdraw', { data }),
  getPoints: (params) => api.get('/users/points', { params }),
  getCoupons: (status) => api.get(`/users/coupons${status ? `?status=${status}` : ''}`),
  getAddresses: () => api.get('/users/addresses'),
};

// Product API
export const productAPI = {
  getList: (params) => api.get('/products', { params }),
  getDetail: (idOrSlug) => api.get(`/products/${idOrSlug}`),
  getReviews: (id, params) => api.get(`/products/${id}/reviews`, { params }),
};

// Category API
export const categoryAPI = {
  getList: () => api.get('/categories'),
  getDetail: (idOrSlug) => api.get(`/categories/${idOrSlug}`),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addItem: (data) => api.post('/cart', data),
  updateQuantity: (id, quantity) => api.put(`/cart/${id}`, { quantity }),
  removeItem: (id) => api.delete(`/cart/${id}`),
  clearCart: () => api.delete('/cart'),
  deleteSelected: (ids) => api.post('/cart/delete-selected', { ids }),
};

// Order API
export const orderAPI = {
  getList: (params) => api.get('/orders', { params }),
  getDetail: (orderNumber) => api.get(`/orders/${orderNumber}`),
  create: (data) => api.post('/orders', data),
  cancel: (orderNumber, reason) => api.post(`/orders/${orderNumber}/cancel`, { reason }),
  confirm: (orderNumber) => api.post(`/orders/${orderNumber}/confirm`),
};

// Payment API
export const paymentAPI = {
  confirm: (data) => api.post('/payments/confirm', data),
  cancel: (data) => api.post('/payments/cancel', data),
};

// Review API
export const reviewAPI = {
  getMyReviews: (params) => api.get('/reviews/my', { params }),
  getWritable: () => api.get('/reviews/writable'),
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/reviews', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.put(`/reviews/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/reviews/${id}`),
};

// Wishlist API
export const wishlistAPI = {
  getList: (params) => api.get('/wishlist', { params }),
  add: (productId) => api.post(`/wishlist/${productId}`),
  remove: (productId) => api.delete(`/wishlist/${productId}`),
  toggle: (productId) => api.post(`/wishlist/${productId}/toggle`),
};

// Coupon API
export const couponAPI = {
  register: (code) => api.post('/coupons/register', { code }),
  getAvailable: (orderAmount) => api.get(`/coupons/available?orderAmount=${orderAmount}`),
};

// Notice API
export const noticeAPI = {
  getList: (params) => api.get('/notices', { params }),
  getDetail: (id) => api.get(`/notices/${id}`),
};

// FAQ API
export const faqAPI = {
  getList: (category) => api.get(`/faqs${category ? `?category=${category}` : ''}`),
};

// Inquiry API
export const inquiryAPI = {
  getList: (params) => api.get('/inquiries', { params }),
  getDetail: (id) => api.get(`/inquiries/${id}`),
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/inquiries', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/inquiries/${id}`),
};

// Terms API
export const termsAPI = {
  getList: () => api.get('/terms'),
  getDetail: (type) => api.get(`/terms/${type}`),
};

// Ddcare API
export const ddcareAPI = {
  getStatus: () => api.get('/ddcare/status'),
  apply: (data) => {
    const formData = new FormData();
    formData.append('ddcareType', data.ddcareType);
    if (data.document) {
      formData.append('document', data.document);
    }
    return api.post('/ddcare/apply', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getApplications: () => api.get('/ddcare/applications'),
  getTypes: () => api.get('/ddcare/types'),
};

// Seller API
export const sellerAPI = {
  // 대시보드
  getDashboard: () => api.get('/seller/dashboard'),

  // 상품 관리
  getProducts: (params) => api.get('/seller/products', { params }),
  getProduct: (id) => api.get(`/seller/products/${id}`),
  createProduct: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'images' && data.images) {
        data.images.forEach(image => {
          formData.append('images', image);
        });
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/seller/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  updateProduct: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'images' && data.images) {
        data.images.forEach(image => {
          formData.append('images', image);
        });
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.put(`/seller/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteProduct: (id) => api.delete(`/seller/products/${id}`),
  deleteProductImage: (productId, imageId) => api.delete(`/seller/products/${productId}/images/${imageId}`),
  setPrimaryImage: (productId, imageId) => api.put(`/seller/products/${productId}/images/${imageId}/primary`),

  // 주문 관리
  getOrders: (params) => api.get('/seller/orders', { params }),
  getOrder: (orderNumber) => api.get(`/seller/orders/${orderNumber}`),
  shipOrder: (orderNumber, data) => api.put(`/seller/orders/${orderNumber}/ship`, data),
  updateOrderStatus: (orderNumber, data) => api.put(`/seller/orders/${orderNumber}/status`, data),

  // 판매 통계
  getSalesStats: (params) => api.get('/seller/stats/sales', { params }),
  getProductStats: (params) => api.get('/seller/stats/products', { params }),

  // 정산 관리
  getSettlements: (params) => api.get('/seller/settlements', { params }),
  getSettlementDetail: (id) => api.get(`/seller/settlements/${id}`),
  getSettlementSummary: () => api.get('/seller/settlement-summary'),

  // 반품/교환 관리
  getReturns: (params) => api.get('/seller/returns', { params }),
  getReturnDetail: (id) => api.get(`/seller/returns/${id}`),
  approveReturn: (id, data) => api.put(`/seller/returns/${id}/approve`, data),
  rejectReturn: (id, data) => api.put(`/seller/returns/${id}/reject`, data),
  completeReturn: (id) => api.put(`/seller/returns/${id}/complete`),

  // 정산 계좌 관리
  getBankAccount: () => api.get('/seller/bank-account'),
  updateBankAccount: (data) => api.put('/seller/bank-account', data),
};

// Admin API (자사몰 관리자용)
export const adminAPI = {
  // 대시보드
  getDashboard: () => api.get('/admin/dashboard'),

  // 상품 관리
  getProducts: (params) => api.get('/admin/products', { params }),
  getProduct: (id) => api.get(`/admin/products/${id}`),
  createProduct: (data) => api.post('/admin/products', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  deleteProductImage: (productId, imageId) => api.delete(`/admin/products/${productId}/images/${imageId}`),

  // 주문 관리
  getOrders: (params) => api.get('/admin/orders', { params }),
  getOrder: (orderNumber) => api.get(`/admin/orders/${orderNumber}`),
  shipOrder: (orderNumber, data) => api.put(`/admin/orders/${orderNumber}/ship`, data),
  updateOrderStatus: (orderNumber, data) => api.put(`/admin/orders/${orderNumber}/status`, data),

  // 카테고리 관리
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),

  // 고객 관리
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),

  // 든든케어 관리
  getDdcareApplications: (params) => api.get('/admin/ddcare', { params }),
  approveDdcare: (id) => api.put(`/admin/ddcare/${id}/approve`),
  rejectDdcare: (id, data) => api.put(`/admin/ddcare/${id}/reject`, data),

  // 통계
  getSalesStats: (params) => api.get('/admin/stats/sales', { params }),
  getTopProducts: (params) => api.get('/admin/stats/top-products', { params }),
};
