import { create } from 'zustand';
import { cartAPI } from '@/utils/api';
import toast from 'react-hot-toast';

export const useCartStore = create((set, get) => ({
  items: [],
  summary: {
    itemCount: 0,
    totalPrice: 0,
    totalDiscountedPrice: 0,
    discount: 0,
    shippingFee: 0,
    finalPrice: 0,
  },
  isLoading: false,

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const { data } = await cartAPI.getCart();
      set({
        items: data.items,
        summary: data.summary,
      });
    } catch (error) {
      console.error('Fetch cart error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, quantity = 1, optionId = null) => {
    try {
      await cartAPI.addItem({ productId, quantity, optionId });
      toast.success('장바구니에 추가되었습니다.');
      await get().fetchCart();
      return true;
    } catch (error) {
      const message = error.response?.data?.error || '장바구니 추가에 실패했습니다.';
      toast.error(message);
      return false;
    }
  },

  updateQuantity: async (itemId, quantity) => {
    try {
      await cartAPI.updateQuantity(itemId, quantity);
      await get().fetchCart();
    } catch (error) {
      const message = error.response?.data?.error || '수량 변경에 실패했습니다.';
      toast.error(message);
    }
  },

  removeItem: async (itemId) => {
    try {
      await cartAPI.removeItem(itemId);
      toast.success('상품이 삭제되었습니다.');
      await get().fetchCart();
    } catch (error) {
      toast.error('삭제에 실패했습니다.');
    }
  },

  clearCart: async () => {
    try {
      await cartAPI.clearCart();
      set({
        items: [],
        summary: {
          itemCount: 0,
          totalPrice: 0,
          totalDiscountedPrice: 0,
          discount: 0,
          shippingFee: 0,
          finalPrice: 0,
        },
      });
    } catch (error) {
      toast.error('장바구니 비우기에 실패했습니다.');
    }
  },

  deleteSelected: async (ids) => {
    try {
      await cartAPI.deleteSelected(ids);
      toast.success('선택한 상품이 삭제되었습니다.');
      await get().fetchCart();
    } catch (error) {
      toast.error('삭제에 실패했습니다.');
    }
  },

  getItemCount: () => {
    return get().items.length;
  },
}));
