import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 든든케어 할인율 (30%)
export const DDCARE_DISCOUNT_RATE = 0.30;

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      ddcareStatus: null,

      setAuth: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
          ddcareStatus: user?.ddcare_status || null,
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
          ddcareStatus: userData.ddcare_status || state.ddcareStatus,
        }));
      },

      updateDdcareStatus: (status) => {
        set((state) => ({
          ddcareStatus: status,
          user: { ...state.user, ddcare_status: status },
        }));
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          ddcareStatus: null,
        });
      },

      isAdmin: () => {
        return get().user?.role === 'admin';
      },

      // 승인된 판매자 여부
      isSeller: () => {
        return get().user?.seller_status === 'approved';
      },

      // 판매자 승인 대기 중 여부
      isSellerPending: () => {
        return get().user?.seller_status === 'pending';
      },

      // 판매자 거절 여부
      isSellerRejected: () => {
        return get().user?.seller_status === 'rejected';
      },

      // 판매자 신청 여부 (상태가 있으면 신청한 것)
      hasSellerApplication: () => {
        return get().user?.seller_status != null;
      },

      isDdcareMember: () => {
        const state = get();
        if (state.ddcareStatus !== 'approved') return false;

        // 만료 여부 확인
        const expiresAt = state.user?.ddcare_expires_at;
        if (expiresAt) {
          return new Date(expiresAt) > new Date();
        }
        return false;
      },

      getDdcareDiscountRate: () => {
        return get().isDdcareMember() ? DDCARE_DISCOUNT_RATE : 0;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        ddcareStatus: state.ddcareStatus,
      }),
    }
  )
);
