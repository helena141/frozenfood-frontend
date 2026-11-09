export type TipeAkun = 'B2C' | 'B2B' | 'ADMIN';

// === AUTH DTO ===
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nama: string;
  email: string;
  password: string;
  noTelp: string;
  alamat: string;
  tipeAkun: 'B2C' | 'B2B';
}

export interface AuthResponse {
  idUser: string;
  token: string;
  nama: string;
  email: string;
  tipeAkun: TipeAkun;
}

// === PRODUK (KATALOG & CRUD) DTO ===
export interface ProductCatalogResponse {
  idProduk: string;
  namaProduk: string;
  deskripsiProduk: string;
  kategori: string;
  hargaEceran: number;
  berat: number;
  volume: number;
  gambar: string | null;
  isActive: boolean;
  totalStock?: number;
  totalStokOnline?: number;
  createdAt?: string;
  updatedAt?: string;
}

// === INVENTORI BATCH FEFO DTO ===
export interface ProductBatchRequest {
  productId: string;
  stokAwal: number;
  tanggalExp: string;
  hargaOverride?: number | null;
  diskon?: number | null;
}

export interface ProductBatchResponse {
  idProdBatch: string;
  productId: string;
  namaProduk: string;
  stokAwal: number;
  stokOnline: number;
  tanggalExp: string;
  hargaOverride: number | null;
  diskon: number | null;
}

// === PELANGGAN (PROFIL & ADMIN CUSTOMER) DTO ===
export interface CustomerResponse {
  idUser: string;
  nama: string;
  email: string;
  noTelp: string;
  alamat: string;
  tipeAkun: TipeAkun;
  fotoProfil: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CustomerUpdateRequest {
  nama?: string;
  email?: string;
  noTelp?: string;
  alamat?: string;
  passwordBaru?: string;
}

export interface ProductUpsertRequest {
  namaProduk: string;
  deskripsiProduk?: string;
  kategori: string;
  hargaEceran: number;
  berat: number;
  volume?: number;
  gambar?: string | null;
  isActive?: boolean;
}

// === PESANAN ECERAN (B2C) DTO ===
export interface CreateRetailOrderRequest {
  idUser: string;
  items: {
    idProduk: string;
    quantity: number;
  }[];
  catatan?: string;
}

export interface OrderItemResponse {
  idOrderItem: string;
  idProduk: string;
  namaProduk: string;
  idProdBatch: string;
  quantity: number;
  hargaSatuanSnapshot: number;
  subtotalItem: number;
}

export interface OrderResponse {
  idOrder: string;
  idUser: string;
  tipeOrder: 'B2C' | 'B2B';
  status: string;
  ongkir: number;
  totalTagihan: number;
  catatan: string | null;
  items: OrderItemResponse[];
  createdAt: string | null;
}

// === PENGIRIMAN (SMART DELIVERY) DTO ===
export type StatusDeliveryType =
  | 'MENUNGGU_KONFIRMASI_ADMIN'
  | 'MENUNGGU_PICKUP'
  | 'DISIAPKAN'
  | 'DALAM_PERJALANAN'
  | 'TERKIRIM'
  | 'GAGAL_KIRIM'
  | 'DIBATALKAN';

export interface DeliveryEstimateRequest {
  latitudeTujuan: number;
  longitudeTujuan: number;
  idOrder?: string;
  items?: {
    idProduk: string;
    quantity: number;
  }[];
}

export interface DeliveryEstimateResponse {
  jarakKm: number;
  sumberJarak: 'RUTE_ASLI' | 'PERKIRAAN';
  jarakDibulatkanKm: number;
  pelaksana: 'MOTOR_TOKO' | 'PIHAK_KETIGA';
  perluKonfirmasiAdmin: boolean;
  ongkir: number;
  ongkirBersifatEstimasi: boolean;
  jadwalHariIni: boolean;
  estimasiTiba: string;
  menitPerjalanan: number;
  beratMuatanKg: number;
  volumeMuatanLiter: number;
  alasan: string[];
  peringatan: string[];
}

export interface CreateDeliveryRequest {
  idOrder: string;
  alamatTujuan: string;
  latitudeTujuan: number;
  longitudeTujuan: number;
}

export interface DeliveryResponse {
  idDelivery: string;
  idOrder: string;
  alamatTujuan: string;
  jarak: number;
  metodeDeliv: 'SAMEDAY' | 'TERJADWAL' | 'PIHAK_KETIGA';
  statusDelivery: string;
  createdAt: string;
  updatedAt: string;
  pelaksana: string;
  ongkir: number;
  sumberJarak: string | null;
  estimasiTiba: string | null;
  namaPengantar: string | null;
  alasanKeputusan: string | null;
}

export interface DeliveryListResponse {
  content: DeliveryResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AdminConfirmDeliveryRequest {
  ongkir: number;
  namaPengantar: string;
}

export interface UpdatePengantarRequest {
  namaPengantar: string;
}

// === PEMBAYARAN DTO ===
export interface CreatePaymentRequest {
  idOrder: string;
  metodePay: string;
}

export interface PaymentResponse {
  idPayment: string;
  idOrder: string;
  gatewayRef: string;
  metodePay: string;
  jumlah: number;
  status: string;
  paidAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentCallbackRequest {
  gatewayRef: string;
  status: string;
  jumlahDikonfirmasi: number;
}

// === LAPORAN (ADMIN) DTO ===
export interface ReportResponse {
  periodeMulai: string;
  periodeAkhir: string;
  totalOmzet: number;
  jumlahTransaksiLunas: number;
  rataRataTransaksi: number;
  totalOmzetB2C: number;
  totalOmzetB2B: number;
}

export interface ProdukTerlarisItem {
  idProduk: string;
  namaProduk: string;
  totalUnitTerjual: number;
  totalPenjualan: number;
}

export interface LaporanPenjualanResponse {
  periodeMulai: string;
  periodeAkhir: string;
  jumlahPesanan: number;
  totalUnitTerjual: number;
  jumlahPesananB2C: number;
  jumlahPesananB2B: number;
  unitTerjualB2C: number;
  unitTerjualB2B: number;
  produkTerlaris: ProdukTerlarisItem[];
}