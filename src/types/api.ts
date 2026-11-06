export type TipeAkun = 'B2C' | 'B2B' | 'ADMIN';

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

export type DeliveryStatus = 'DIPROSES' | 'DALAM_PERJALANAN' | 'TERKIRIM';

export interface AuthResponse {
  idUser?: string;
  token: string;
  nama: string;
  email: string;
  tipeAkun: TipeAkun;
}

export interface ProductCatalogResponse {
  idProduk: string;
  namaProduk: string;
  deskripsiProduk: string;
  hargaEceran: number;
  kategori: string;
  totalStock: number;
}

export interface OrderItemResponse {
  idProdBatch: string;
  idProduk: string;
  namaProduk: string;
  quantity: number;
  hargaSatuanSnapshot: number;
  subtotalItem: number;
}

export interface OrderResponse {
  idOrder: string;
  idUser?: string;
  createdAt: string;
  totalTagihan: number;
  status: OrderStatus;
  tipeOrder: 'B2C' | 'B2B';
  items: OrderItemResponse[];
}

export interface DeliveryResponse {
  idDelivery: string;
  idOrder: string;
  alamatTujuan?: string;
  jarak: number;
  statusDelivery: DeliveryStatus | string;
}

export interface PaymentResponse {
  idPayment: string;
  idOrder: string;
  gatewayRef: string;
  jumlah: number;
  status: string;
}

export interface ProductBatchResponse {
  idProdBatch: string;
  productId: string;
  namaProduk?: string;
  stokAwal: number;
  stokOnline: number;
  tanggalExp: string;
  hargaOverride?: number | null;
  diskon?: number | null;
}

export interface ProdukTerlarisItem {
  idProduk: string;
  namaProduk: string;
  totalUnitTerjual: number;
  totalOmzetProduk?: number;
}

export interface ReportResponse {
  totalOmzet: number;
  jumlahPesanan: number;
  totalUnitTerjual: number;
  omzetB2C?: number;
  omzetB2B?: number;
  produkTerlaris?: ProdukTerlarisItem[];
}