import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductCatalogResponse } from '@/types/api';
import { getProductStock } from '@/lib/utils';

export interface CartItem {
  product: ProductCatalogResponse;
  qty: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: ProductCatalogResponse, qty?: number) => void;
  updateQty: (idProduk: string, qty: number) => void;
  removeItem: (idProduk: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, qty = 1) =>
        set((state) => {
          const maxStock = getProductStock(product);
          const safeAddQty = isNaN(qty) || qty < 1 ? 1 : qty;
          if (maxStock <= 0) return state;

          const existingIndex = state.items.findIndex(
            (item) => item.product.idProduk === product.idProduk
          );

          if (existingIndex > -1) {
            const updatedItems = [...state.items];
            const prevQty = isNaN(updatedItems[existingIndex].qty)
              ? 0
              : updatedItems[existingIndex].qty;
            const newQty = Math.min(prevQty + safeAddQty, maxStock);
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              product,
              qty: newQty,
            };
            return { items: updatedItems };
          }

          return {
            items: [
              ...state.items,
              { product, qty: Math.min(safeAddQty, maxStock) },
            ],
          };
        }),
      updateQty: (idProduk, qty) =>
        set((state) => {
          const safeQty = isNaN(qty) ? 1 : qty;
          if (safeQty <= 0) {
            return {
              items: state.items.filter((item) => item.product.idProduk !== idProduk),
            };
          }
          return {
            items: state.items.map((item) => {
              if (item.product.idProduk !== idProduk) return item;
              const maxStock = getProductStock(item.product);
              return { ...item, qty: Math.min(safeQty, maxStock) };
            }),
          };
        }),
      removeItem: (idProduk) =>
        set((state) => ({
          items: state.items.filter((item) => item.product.idProduk !== idProduk),
        })),
      clearCart: () => set({ items: [] }),
      getTotalItems: () =>
        get().items.reduce(
          (sum, item) => sum + (isNaN(item.qty) ? 1 : item.qty),
          0
        ),
      getSubtotal: () =>
        get().items.reduce((total, item) => {
          const safeQty = isNaN(item.qty) ? 1 : item.qty;
          const safePrice = isNaN(item.product.hargaEceran)
            ? 0
            : item.product.hargaEceran;
          return total + safePrice * safeQty;
        }, 0),
    }),
    {
      name: 'lezzat-cart-storage',
    }
  )
);