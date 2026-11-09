'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Snowflake,
  Info,
  X,
  AlertTriangle,
  Layers,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { formatRupiah, getErrorMessage, getProductStock } from '@/lib/utils';
import {
  ProductCatalogResponse,
  ProductUpsertRequest,
  ProductBatchRequest,
  ProductBatchResponse,
} from '@/types/api';
import AdminSidebar from '@/components/admin/admin-sidebar';

const productFormSchema = z.object({
  namaProduk: z.string().min(1, 'Nama produk wajib diisi'),
  kategori: z.string().min(1, 'Kategori wajib diisi'),
  deskripsiProduk: z.string().optional(),
  hargaEceran: z.coerce
    .number({ invalid_type_error: 'Harga eceran harus berupa angka' })
    .gt(0, 'Harga eceran harus lebih dari 0'),
  berat: z.coerce
    .number({ invalid_type_error: 'Berat harus berupa angka' })
    .gt(0, 'Berat produk harus lebih dari 0 gram'),
  volume: z.coerce
    .number({ invalid_type_error: 'Volume harus berupa angka' })
    .min(0, 'Volume minimal 0')
    .optional(),
  gambar: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const batchFormSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  stokAwal: z.coerce
    .number({ invalid_type_error: 'Stok awal harus berupa angka' })
    .min(1, 'Stok awal minimal 1 unit'),
  tanggalExp: z.string().min(1, 'Tanggal kedaluwarsa wajib diisi'),
  hargaOverride: z.string().optional(),
  diskon: z.string().optional(),
});

type BatchFormValues = z.infer<typeof batchFormSchema>;

function getDefaultFutureDate(daysAhead = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

export default function AdminProductsPage() {
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] =
    useState<ProductCatalogResponse | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ProductCatalogResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // State Manajemen Batch FEFO
  const [isBatchFormOpen, setIsBatchFormOpen] = useState<boolean>(false);
  const [selectedBatchFilterProduct, setSelectedBatchFilterProduct] =
    useState<string>('');

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const {
    data: products = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ProductCatalogResponse[]>({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await api.get<ProductCatalogResponse[]>('/api/products');
      return res.data;
    },
  });

  const {
    data: batches = [],
    isLoading: isLoadingBatches,
    isError: isErrorBatches,
    error: errorBatches,
    refetch: refetchBatches,
  } = useQuery<ProductBatchResponse[]>({
    queryKey: ['admin-batches', selectedBatchFilterProduct],
    queryFn: async () => {
      const params = selectedBatchFilterProduct
        ? { productId: selectedBatchFilterProduct }
        : undefined;
      const res = await api.get<ProductBatchResponse[]>(
        '/api/inventory/batches',
        { params }
      );
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      namaProduk: '',
      kategori: '',
      deskripsiProduk: '',
      hargaEceran: 0,
      berat: 0,
      volume: 0,
      gambar: '',
      isActive: true,
    },
  });

  const {
    register: registerBatch,
    handleSubmit: handleSubmitBatch,
    reset: resetBatch,
    formState: { errors: batchErrors, isSubmitting: isSubmittingBatch },
  } = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      productId: '',
      stokAwal: 50,
      tanggalExp: getDefaultFutureDate(30),
      hargaOverride: '',
      diskon: '',
    },
  });

  const filteredProducts = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return products;
    return products.filter(
      (p) =>
        p.namaProduk.toLowerCase().includes(kw) ||
        p.idProduk.toLowerCase().includes(kw) ||
        (p.kategori && p.kategori.toLowerCase().includes(kw)) ||
        (p.deskripsiProduk && p.deskripsiProduk.toLowerCase().includes(kw))
    );
  }, [products, searchKeyword]);

  const handleOpenCreate = () => {
    setActionError(null);
    setActionSuccess(null);
    setIsBatchFormOpen(false);
    setEditingProduct(null);
    reset({
      namaProduk: '',
      kategori: 'Frozen Food',
      deskripsiProduk: '',
      hargaEceran: 25000,
      berat: 500,
      volume: 0,
      gambar: '',
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product: ProductCatalogResponse) => {
    setActionError(null);
    setActionSuccess(null);
    setIsBatchFormOpen(false);
    setEditingProduct(product);
    reset({
      namaProduk: product.namaProduk,
      kategori: product.kategori || '',
      deskripsiProduk: product.deskripsiProduk || '',
      hargaEceran: product.hargaEceran,
      berat: product.berat,
      volume: product.volume ?? 0,
      gambar: product.gambar || '',
      isActive: product.isActive ?? true,
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleOpenBatchForm = (preselectedProductId?: string) => {
    setActionError(null);
    setActionSuccess(null);
    setIsFormOpen(false);
    resetBatch({
      productId: preselectedProductId || products[0]?.idProduk || '',
      stokAwal: 50,
      tanggalExp: getDefaultFutureDate(30),
      hargaOverride: '',
      diskon: '',
    });
    setIsBatchFormOpen(true);
  };

  // Submit Create (POST /api/products) atau Update (PUT /api/products/{id})
  const onSubmitForm = async (values: ProductFormValues) => {
    setActionError(null);
    setActionSuccess(null);

    const payload: ProductUpsertRequest = {
      namaProduk: values.namaProduk.trim(),
      kategori: values.kategori.trim(),
      deskripsiProduk: values.deskripsiProduk?.trim() || undefined,
      hargaEceran: Number(values.hargaEceran),
      berat: Number(values.berat),
      volume:
        values.volume !== undefined && !Number.isNaN(Number(values.volume))
          ? Number(values.volume)
          : 0,
      gambar: values.gambar?.trim() ? values.gambar.trim() : null,
      isActive: values.isActive,
    };

    try {
      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.idProduk}`, payload);
        setActionSuccess(
          `Produk "${payload.namaProduk}" berhasil diperbarui.`
        );
      } else {
        await api.post('/api/products', payload);
        setActionSuccess(
          `Produk baru "${payload.namaProduk}" berhasil ditambahkan.`
        );
      }
      setIsFormOpen(false);
      setEditingProduct(null);
      await refetch();
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Gagal menyimpan data produk ke server.')
      );
    }
  };

  // Submit Tambah Batch FEFO (POST /api/inventory/batches)
  const onSubmitBatchForm = async (values: BatchFormValues) => {
    setActionError(null);
    setActionSuccess(null);

    const parsedOverride =
      values.hargaOverride && values.hargaOverride.trim() !== ''
        ? Number(values.hargaOverride)
        : null;
    const parsedDiskon =
      values.diskon && values.diskon.trim() !== ''
        ? Number(values.diskon)
        : null;

    const payload: ProductBatchRequest = {
      productId: values.productId,
      stokAwal: Number(values.stokAwal),
      tanggalExp: values.tanggalExp,
      hargaOverride:
        parsedOverride !== null && !Number.isNaN(parsedOverride)
          ? parsedOverride
          : null,
      diskon:
        parsedDiskon !== null && !Number.isNaN(parsedDiskon)
          ? parsedDiskon
          : null,
    };

    try {
      const res = await api.post<ProductBatchResponse>(
        '/api/inventory/batches',
        payload
      );
      setActionSuccess(
        `Batch FEFO "${res.data.idProdBatch}" (${res.data.stokAwal} unit) untuk "${res.data.namaProduk}" berhasil ditambahkan.`
      );
      setIsBatchFormOpen(false);
      await Promise.all([refetch(), refetchBatches()]);
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          'Gagal menambahkan batch stok FEFO. Pastikan tanggal kedaluwarsa berada di masa depan.'
        )
      );
    }
  };

  // Konfirmasi & Eksekusi Delete (DELETE /api/products/{id})
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    setActionSuccess(null);
    setIsDeleting(true);

    try {
      await api.delete(`/api/products/${deleteTarget.idProduk}`);
      setActionSuccess(
        `Produk "${deleteTarget.namaProduk}" berhasil dihapus.`
      );
      setDeleteTarget(null);
      await Promise.all([refetch(), refetchBatches()]);
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          'Gagal menghapus produk. Produk mungkin sudah terkait dengan pesanan atau batch stok.'
        )
      );
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="lezzat-shell">
      <AdminSidebar />

      <main className="lezzat-main">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
              MANAJEMEN KATALOG & INVENTORI FEFO
            </p>
            <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900">
              Kelola Produk & Batch Stok
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                refetch();
                refetchBatches();
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenBatchForm()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>+ Tambah Stok Batch FEFO</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#174634] hover:bg-[#113527] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          </div>
        </div>

        {/* Info Integrasi Produk & Batch FEFO */}
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl bg-[#f2efe9] border border-slate-200/80 p-3.5 text-xs text-slate-700">
          <Info className="w-4 h-4 text-[#174634] shrink-0 mt-0.5" />
          <span>
            <strong>Integrasi Penuh Master Produk & FEFO:</strong> Pengelolaan
            katalog terhubung ke <code>/api/products</code> dan manajemen stok
            per batch tanggal kedaluwarsa (<em>First Expired, First Out</em>)
            terhubung ke <code>/api/inventory/batches</code>.
          </span>
        </div>

        {/* Pesan Error / Sukses */}
        {actionError && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-red-500 hover:text-red-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div
            role="status"
            className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-[#174634]"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Panel Form Tambah Stok Batch FEFO */}
        {isBatchFormOpen && (
          <section className="mb-6 bg-white rounded-3xl p-6 border-2 border-amber-600 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Tambah Stok Batch FEFO Baru
                </h2>
                <p className="text-xs text-slate-500">
                  Stok online produk dihitung otomatis dari akumulasi batch aktif
                  yang belum kedaluwarsa (<code>POST /api/inventory/batches</code>)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchFormOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitBatch(onSubmitBatchForm)}
              noValidate
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Pilih Produk *
                  </label>
                  <select
                    {...registerBatch('productId')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:border-[#174634] focus:outline-none"
                  >
                    <option value="">-- Pilih Produk --</option>
                    {products.map((p) => (
                      <option key={p.idProduk} value={p.idProduk}>
                        [{p.idProduk}] {p.namaProduk}
                      </option>
                    ))}
                  </select>
                  {batchErrors.productId && (
                    <p className="mt-1 text-xs text-red-600">
                      {batchErrors.productId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Jumlah Stok Masuk (Unit, &ge; 1) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    {...registerBatch('stokAwal')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                  />
                  {batchErrors.stokAwal && (
                    <p className="mt-1 text-xs text-red-600">
                      {batchErrors.stokAwal.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Tanggal Kedaluwarsa (Masa Depan) *
                  </label>
                  <input
                    type="date"
                    min={getDefaultFutureDate(1)}
                    {...registerBatch('tanggalExp')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                  />
                  {batchErrors.tanggalExp && (
                    <p className="mt-1 text-xs text-red-600">
                      {batchErrors.tanggalExp.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Harga Override Khusus Batch Ini (Rp, Opsional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Kosongkan jika menggunakan harga eceran produk"
                    {...registerBatch('hargaOverride')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Diskon Clearance Batch (%, Opsional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    max={100}
                    placeholder="Contoh: 15 (untuk diskon 15%)"
                    {...registerBatch('diskon')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {isSubmittingBatch
                    ? 'Menyimpan Batch...'
                    : 'Simpan Batch Stok FEFO'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Panel Form Create / Edit Produk */}
        {isFormOpen && (
          <section className="mb-6 bg-white rounded-3xl p-6 border-2 border-[#174634] shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingProduct
                    ? `Edit Produk: ${editingProduct.namaProduk}`
                    : 'Tambah Produk Baru'}
                </h2>
                <p className="text-xs text-slate-500">
                  Lengkapi spesifikasi produk frozen food sesuai kontrak DTO
                  backend
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmitForm)}
              noValidate
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Nama Produk *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Nugget Ayam Crispy 500g"
                    {...register('namaProduk')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                  />
                  {errors.namaProduk && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.namaProduk.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Kategori *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Olahan Ayam, Dimsum, Sosis..."
                    {...register('kategori')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                  />
                  {errors.kategori && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.kategori.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Harga Eceran (Rp, &gt; 0) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register('hargaEceran')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                  />
                  {errors.hargaEceran && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.hargaEceran.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Berat (gram, &gt; 0) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register('berat')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                  />
                  {errors.berat && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.berat.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Volume (ml/cm³, &ge; 0)
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register('volume')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                  />
                  {errors.volume && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.volume.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    URL Gambar Produk (Opsional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    {...register('gambar')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                  />
                </div>

                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('isActive')}
                      className="w-4 h-4 rounded border-slate-300 text-[#174634] focus:ring-[#174634]"
                    />
                    <span>Produk Aktif (Ditampilkan di Katalog)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Deskripsi Produk (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat komposisi atau saran penyajian..."
                  {...register('deskripsiProduk')}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#174634] hover:bg-[#113527] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {isSubmitting
                    ? 'Menyimpan...'
                    : editingProduct
                      ? 'Simpan Perubahan'
                      : 'Tambah Produk'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Tabel Daftar Produk */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#f2efe9] text-[#174634] flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Daftar Katalog Produk
                </h2>
                <p className="text-xs text-slate-500">
                  Total {filteredProducts.length} produk ditampilkan
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Cari kode, nama, atau kategori..."
                className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-xs text-slate-900 focus:border-[#174634] focus:outline-none"
              />
            </div>
          </div>

          {/* 1. LOADING */}
          {isLoading && (
            <div className="space-y-3 animate-pulse py-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-14 rounded-2xl bg-slate-100" />
              ))}
            </div>
          )}

          {/* 2. ERROR */}
          {!isLoading && isError && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center my-4">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900 mb-1">
                Gagal Memuat Produk
              </p>
              <p className="text-xs text-slate-600 mb-4">
                {getErrorMessage(error, 'Tidak dapat mengambil data produk.')}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-[#174634] text-white text-xs font-semibold cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* 3. KOSONG */}
          {!isLoading && !isError && filteredProducts.length === 0 && (
            <div className="rounded-2xl bg-[#f7f6f2] p-10 text-center my-2">
              <Snowflake className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 mb-1">
                Produk tidak ditemukan
              </p>
              <p className="text-xs text-slate-500">
                Belum ada produk atau tidak ada yang cocok dengan kata kunci
                pencarian.
              </p>
            </div>
          )}

          {/* 4. TABEL DATA */}
          {!isLoading && !isError && filteredProducts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="py-3 px-4 font-semibold">Produk</th>
                    <th className="py-3 px-4 font-semibold">Kategori</th>
                    <th className="py-3 px-4 font-semibold">Harga Eceran</th>
                    <th className="py-3 px-4 font-semibold">
                      Berat & Volume
                    </th>
                    <th className="py-3 px-4 font-semibold">Stok Online</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => {
                    const stock = getProductStock(product);
                    const isActive = product.isActive ?? true;

                    return (
                      <tr
                        key={product.idProduk}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#f2efe9] overflow-hidden shrink-0 flex items-center justify-center text-[#174634]">
                              {product.gambar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={product.gambar}
                                  alt={product.namaProduk}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Snowflake className="w-4 h-4 opacity-50" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {product.idProduk}
                                </span>
                                <p className="font-bold text-slate-900">
                                  {product.namaProduk}
                                </p>
                              </div>
                              {product.deskripsiProduk && (
                                <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                                  {product.deskripsiProduk}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full bg-[#f2efe9] text-slate-800 text-[11px] font-semibold">
                            {product.kategori}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-[#174634]">
                          {formatRupiah(product.hargaEceran)}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {product.berat} g
                          {product.volume ? ` • ${product.volume} ml` : ''}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold ${
                              stock > 0 ? 'text-slate-900' : 'text-red-600'
                            }`}
                          >
                            {stock} unit
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenBatchForm(product.idProduk)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Batch</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(product)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(product)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Tabel Daftar Batch Inventori FEFO */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Daftar Batch Inventori FEFO (First Expired, First Out)
                </h2>
                <p className="text-xs text-slate-500">
                  Diurutkan otomatis berdasarkan tanggal kedaluwarsa terdekat (
                  <code>GET /api/inventory/batches</code>)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedBatchFilterProduct}
                onChange={(e) => setSelectedBatchFilterProduct(e.target.value)}
                aria-label="Filter batch berdasarkan produk"
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 bg-white focus:border-[#174634] focus:outline-none"
              >
                <option value="">Semua Produk ({batches.length} batch)</option>
                {products.map((p) => (
                  <option key={p.idProduk} value={p.idProduk}>
                    [{p.idProduk}] {p.namaProduk}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingBatches && (
            <div className="space-y-3 animate-pulse py-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-12 rounded-2xl bg-slate-100" />
              ))}
            </div>
          )}

          {!isLoadingBatches && isErrorBatches && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center my-2">
              <p className="text-xs font-bold text-red-700 mb-1">
                Gagal memuat data batch FEFO
              </p>
              <p className="text-xs text-red-600">
                {getErrorMessage(
                  errorBatches,
                  'Tidak dapat mengambil daftar batch dari server.'
                )}
              </p>
            </div>
          )}

          {!isLoadingBatches && !isErrorBatches && batches.length === 0 && (
            <div className="rounded-2xl bg-[#f7f6f2] p-8 text-center my-2">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 mb-1">
                Belum Ada Batch Stok FEFO
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Tambahkan batch stok baru agar produk memiliki stok online dan
                dapat dipesan oleh pelanggan.
              </p>
              <button
                type="button"
                onClick={() =>
                  handleOpenBatchForm(selectedBatchFilterProduct || undefined)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Batch Pertama</span>
              </button>
            </div>
          )}

          {!isLoadingBatches && !isErrorBatches && batches.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="py-3 px-4 font-semibold">Kode Batch</th>
                    <th className="py-3 px-4 font-semibold">Produk</th>
                    <th className="py-3 px-4 font-semibold">Stok Awal</th>
                    <th className="py-3 px-4 font-semibold">Sisa Stok Online</th>
                    <th className="py-3 px-4 font-semibold">
                      Tanggal Kedaluwarsa
                    </th>
                    <th className="py-3 px-4 font-semibold">
                      Harga Khusus / Diskon
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => {
                    const expDate = new Date(b.tanggalExp);
                    const now = new Date();
                    const diffDays = Math.ceil(
                      (expDate.getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    const isExpired = diffDays < 0;
                    const isNearExpiry = diffDays >= 0 && diffDays <= 30;

                    return (
                      <tr
                        key={b.idProdBatch}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {b.idProdBatch}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-900">
                            {b.namaProduk}
                          </span>
                          <span className="ml-1.5 font-mono text-[10px] text-slate-400">
                            ({b.productId})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {b.stokAwal} unit
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold ${
                              b.stokOnline > 0
                                ? 'text-[#174634]'
                                : 'text-red-600'
                            }`}
                          >
                            {b.stokOnline} unit
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">
                              {b.tanggalExp}
                            </span>
                            {isExpired ? (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                                Kedaluwarsa
                              </span>
                            ) : isNearExpiry ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                {diffDays} hari lagi
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Aman ({diffDays} hr)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {b.hargaOverride ? (
                            <span className="font-semibold text-slate-900">
                              {formatRupiah(b.hargaOverride)}
                            </span>
                          ) : (
                            <span className="text-slate-400">Harga Normal</span>
                          )}
                          {b.diskon ? (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                              Diskon {b.diskon}%
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Dialog Konfirmasi Hapus Produk */}
        {deleteTarget && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          >
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Hapus produk &ldquo;{deleteTarget.namaProduk}&rdquo;?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Tindakan ini akan memanggil{' '}
                    <code>DELETE /api/products/&#123;id&#125;</code> secara
                    permanen.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {isDeleting ? 'Menghapus...' : 'Ya, hapus produk'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
