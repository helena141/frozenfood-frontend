import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductCatalogResponse } from '@/types/api';

export interface CartItem {
  product: ProductCatalogResponse;
  qty: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: ProductCatalogResponse, qty: number) => void;
  updateQty: (idProduk: string, qty: number) => void;
  removeItem: (idProduk: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, qty) =>
        set((state) => {
          if (product.totalStock <= 0 || qty <= 0) return state;
          const existingIndex = state.items.findIndex(
            (item) => item.product.idProduk === product.idProduk
          );

          if (existingIndex > -1) {
            const updatedItems = [...state.items];
            const newQty = Math.min(
              updatedItems[existingIndex].qty + qty,
              product.totalStock
            );
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
              { product, qty: Math.min(qty, product.totalStock) },
            ],
          };
        }),
      updateQty: (idProduk, qty) =>
        set((state) => {
          if (qty <= 0) {
            return {
              items: state.items.filter((item) => item.product.idProduk !== idProduk),
            };
          }
          return {
            items: state.items.map((item) =>
              item.product.idProduk === idProduk
                ? { ...item, qty: Math.min(qty, item.product.totalStock) }
                : item
            ),
          };
        }),
      removeItem: (idProduk) =>
        set((state) => ({
          items: state.items.filter((item) => item.product.idProduk !== idProduk),
        })),
      clearCart: () => set({ items: [] }),
      getTotalPrice: () =>
        get().items.reduce(
          (total, item) => total + (item.product.hargaEceran || 0) * item.qty,
          0
        ),
    }),
    {
      name: 'lezzat-cart-storage',
    }
  )
);