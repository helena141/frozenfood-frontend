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
  Bell,
  Tag,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { formatRupiah, getErrorMessage, getProductStock } from '@/lib/utils';
import {
  ProductCatalogResponse,
  ProductUpsertRequest,
  ProductBatchRequest,
  ProductBatchUpdateRequest,
  ProductBatchResponse,
  ExpiryAlertResponse,
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
    .min(0, 'Stok awal minimal 0 unit'),
  stokOnline: z.coerce
    .number({ invalid_type_error: 'Stok online harus berupa angka' })
    .min(0, 'Stok online minimal 0 unit')
    .optional(),
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

function toGramInput(rawBerat: number | undefined | null): number {
  const val = Number(rawBerat || 0);
  if (val <= 0) return 500;
  return val <= 50 ? Math.round(val * 1000) : Math.round(val);
}

function toKgPayload(gramInput: number): number {
  const val = Number(gramInput || 0);
  return Number((val / 1000).toFixed(4));
}

function formatWeightDisplay(rawBerat: number | undefined | null): string {
  const grams = toGramInput(rawBerat);
  return `${grams.toLocaleString('id-ID')} g`;
}

export default function AdminProductsPage() {
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] =
    useState<ProductCatalogResponse | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ProductCatalogResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [isBatchFormOpen, setIsBatchFormOpen] = useState<boolean>(false);
  const [editingBatch, setEditingBatch] =
    useState<ProductBatchResponse | null>(null);
  const [deleteBatchTarget, setDeleteBatchTarget] =
    useState<ProductBatchResponse | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState<boolean>(false);
  const [selectedBatchFilterProduct, setSelectedBatchFilterProduct] =
    useState<string>('');

  const [showResolvedAlerts, setShowResolvedAlerts] = useState<boolean>(false);
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);

  const [tieringTargetProduct, setTieringTargetProduct] =
    useState<ProductCatalogResponse | null>(null);
  const [tierMinQty, setTierMinQty] = useState<string>('10');
  const [tierMaxQty, setTierMaxQty] = useState<string>('49');
  const [tierHargaUnit, setTierHargaUnit] = useState<string>('');
  const [isSavingTier, setIsSavingTier] = useState<boolean>(false);

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
    data: expiryAlerts = [],
    isLoading: isLoadingAlerts,
    refetch: refetchAlerts,
  } = useQuery<ExpiryAlertResponse[]>({
    queryKey: ['admin-expiry-alerts', showResolvedAlerts],
    queryFn: async () => {
      const res = await api.get<ExpiryAlertResponse[]>(
        '/api/inventory/alerts',
        {
          params: { unresolvedOnly: !showResolvedAlerts },
        }
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
      berat: 500,
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
      tanggalExp: '',
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
      berat: toGramInput(product.berat),
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
    setEditingBatch(null);
    resetBatch({
      productId: preselectedProductId || products[0]?.idProduk || '',
      stokAwal: 50,
      stokOnline: 50,
      tanggalExp: '',
      hargaOverride: '',
      diskon: '',
    });
    setIsBatchFormOpen(true);
  };

  const handleOpenEditBatch = (batch: ProductBatchResponse) => {
    setActionError(null);
    setActionSuccess(null);
    setIsFormOpen(false);
    setEditingBatch(batch);
    resetBatch({
      productId: batch.productId,
      stokAwal: batch.stokAwal,
      stokOnline: batch.stokOnline,
      tanggalExp: batch.tanggalExp,
      hargaOverride:
        batch.hargaOverride !== null && batch.hargaOverride !== undefined
          ? String(batch.hargaOverride)
          : '',
      diskon:
        batch.diskon !== null && batch.diskon !== undefined
          ? String(batch.diskon)
          : '',
    });
    setIsBatchFormOpen(true);
  };

  const handleCloseBatchForm = () => {
    setIsBatchFormOpen(false);
    setEditingBatch(null);
  };

  const onSubmitForm = async (values: ProductFormValues) => {
    setActionError(null);
    setActionSuccess(null);

    const payload: ProductUpsertRequest = {
      namaProduk: values.namaProduk.trim(),
      kategori: values.kategori.trim(),
      deskripsiProduk: values.deskripsiProduk?.trim() || undefined,
      hargaEceran: Number(values.hargaEceran),
      berat: toKgPayload(Number(values.berat)),
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

    try {
      if (editingBatch) {
        const updatePayload: ProductBatchUpdateRequest = {
          stokAwal: Number(values.stokAwal),
          stokOnline:
            values.stokOnline !== undefined &&
            !Number.isNaN(Number(values.stokOnline))
              ? Number(values.stokOnline)
              : Number(values.stokAwal),
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
        const res = await api.put<ProductBatchResponse>(
          `/api/inventory/batches/${editingBatch.idProdBatch}`,
          updatePayload
        );
        setActionSuccess(
          `Batch FEFO "${res.data.idProdBatch}" untuk "${res.data.namaProduk}" berhasil diperbarui.`
        );
      } else {
        if (Number(values.stokAwal) < 1) {
          setActionError('Stok awal batch baru minimal 1 unit.');
          return;
        }
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
        const res = await api.post<ProductBatchResponse>(
          '/api/inventory/batches',
          payload
        );
        setActionSuccess(
          `Batch FEFO "${res.data.idProdBatch}" (${res.data.stokAwal} unit) untuk "${res.data.namaProduk}" berhasil ditambahkan.`
        );
      }
      setIsBatchFormOpen(false);
      setEditingBatch(null);
      await Promise.all([refetch(), refetchBatches(), refetchAlerts()]);
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          editingBatch
            ? 'Gagal memperbarui data batch FEFO.'
            : 'Gagal menambahkan batch stok FEFO. Pastikan tanggal kedaluwarsa berada di masa depan.'
        )
      );
    }
  };

  const handleConfirmDeleteBatch = async () => {
    if (!deleteBatchTarget) return;
    setActionError(null);
    setActionSuccess(null);
    setIsDeletingBatch(true);

    try {
      await api.delete(
        `/api/inventory/batches/${deleteBatchTarget.idProdBatch}`
      );
      setActionSuccess(
        `Batch "${deleteBatchTarget.idProdBatch}" (${deleteBatchTarget.namaProduk}) berhasil dihapus.`
      );
      setDeleteBatchTarget(null);
      await Promise.all([refetch(), refetchBatches(), refetchAlerts()]);
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Gagal menghapus batch stok FEFO.')
      );
      setDeleteBatchTarget(null);
    } finally {
      setIsDeletingBatch(false);
    }
  };

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

  const handleResolveAlert = async (alertItem: ExpiryAlertResponse) => {
    setActionError(null);
    setActionSuccess(null);
    setResolvingAlertId(alertItem.idAlert);
    try {
      await api.patch(`/api/inventory/alerts/${alertItem.idAlert}/resolve`);
      setActionSuccess(
        `Peringatan kedaluwarsa untuk batch "${alertItem.idProdBatch}" telah ditandai selesai.`
      );
      await refetchAlerts();
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Gagal menandai peringatan kedaluwarsa selesai.')
      );
    } finally {
      setResolvingAlertId(null);
    }
  };

  const handleEditBatchFromAlert = (alertItem: ExpiryAlertResponse) => {
    const matchedBatch = batches.find(
      (b) => b.idProdBatch === alertItem.idProdBatch
    );
    if (matchedBatch) {
      handleOpenEditBatch(matchedBatch);
    } else {
      handleOpenEditBatch({
        idProdBatch: alertItem.idProdBatch,
        productId: alertItem.idProduk,
        namaProduk: alertItem.namaProduk,
        stokAwal: alertItem.stokOnline,
        stokOnline: alertItem.stokOnline,
        tanggalExp: alertItem.tanggalExp,
        hargaOverride: alertItem.hargaOverride,
        diskon: alertItem.diskon,
      });
    }
  };

  const handleOpenTieringModal = (product: ProductCatalogResponse) => {
    setActionError(null);
    setActionSuccess(null);
    setTieringTargetProduct(product);
    setTierMinQty('10');
    setTierMaxQty('49');
    setTierHargaUnit(
      String(Math.round((product.hargaEceran || 25000) * 0.9))
    );
  };

  const handleAddTieringRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tieringTargetProduct) return;
    setActionError(null);
    setActionSuccess(null);
    setIsSavingTier(true);
    try {
      const res = await api.post<ProductCatalogResponse>(
        `/api/products/${tieringTargetProduct.idProduk}/tiering`,
        {
          minQty: Number(tierMinQty),
          maxQty: Number(tierMaxQty),
          hargaPerUnit: Number(tierHargaUnit),
        }
      );
      setTieringTargetProduct(res.data);
      setActionSuccess(
        `Aturan harga grosir (Tiering) untuk "${tieringTargetProduct.namaProduk}" berhasil ditambahkan.`
      );
      await refetch();
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Gagal menambahkan aturan Tiering Price.')
      );
    } finally {
      setIsSavingTier(false);
    }
  };

  const handleDeleteTieringRule = async (idTiering: string) => {
    if (!tieringTargetProduct) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.delete(`/api/products/tiering/${idTiering}`);
      const updatedRes = await api.get<ProductCatalogResponse>(
        `/api/products/${tieringTargetProduct.idProduk}`
      );
      setTieringTargetProduct(updatedRes.data);
      setActionSuccess('Aturan Tiering Price berhasil dihapus.');
      await refetch();
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Gagal menghapus aturan Tiering Price.')
      );
    }
  };

  return (
    <div className="lezzat-shell">
      <AdminSidebar />

      <main className="lezzat-main">
        {/* Page Header Froznfood 2.0 SaaS */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#4737FF] uppercase">
              FROZNFOOD 2.0 • INVENTORY & CATALOG
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#171725] mt-1">
              Kelola Produk & Batch Stok FEFO
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                refetch();
                refetchBatches();
                refetchAlerts();
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E8F0] hover:bg-[#F1F3F8] text-[#171725] text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#5E5E6A]" />
              <span>Muat Ulang</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenBatchForm()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F75C03] hover:bg-[#D94800] text-white text-xs font-bold shadow-sm shadow-[#F75C03]/25 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>+ Tambah Batch FEFO</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-bold shadow-sm shadow-[#4737FF]/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl bg-[#E7EFFF] border border-[#D1CDFF] p-3.5 text-xs text-[#171725]">
          <Info className="w-4 h-4 text-[#4737FF] shrink-0 mt-0.5" />
          <span>
            <strong>Integrasi Master Produk, FEFO Deals & Expiry Alert:</strong>{' '}
            Batch kedaluwarsa <strong>≤ 30 hari</strong> otomatis masuk{' '}
            <strong>FEFO Flash Deal (-20%)</strong> dan batch{' '}
            <strong>≤ 7 hari</strong> otomatis masuk{' '}
            <strong>Clearance (-50%)</strong>. Anda tetap dapat mengatur harga
            override / diskon tiap batch maupun aturan harga grosir (Tiering).
          </span>
        </div>

        {/* Panel Notifikasi Expiry Alert (GET /api/inventory/alerts) */}
        <section className="mb-6 ff-card p-5 bg-white border border-[#F75C03]/35">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-[#E6E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F75C03]/15 text-[#F75C03] flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-base font-extrabold text-[#171725]">
                    Peringatan Kedaluwarsa & Otomasi Flash Deals (Expiry Alert)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F75C03] text-white text-[10px] font-extrabold">
                    {expiryAlerts.filter((a) => !a.isResolved).length} Aktif
                  </span>
                </div>
                <p className="text-xs text-[#77788A]">
                  Dipindai otomatis oleh <code>ExpiryAlertScheduler</code> (H-30
                  FEFO Deal 20% &amp; H-7 Clearance 50% •{' '}
                  <code>GET /api/inventory/alerts</code>)
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#5E5E6A] cursor-pointer self-start sm:self-center">
              <input
                type="checkbox"
                checked={showResolvedAlerts}
                onChange={(e) => setShowResolvedAlerts(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[#4737FF]"
              />
              <span>Tampilkan yang sudah selesai</span>
            </label>
          </div>

          {isLoadingAlerts ? (
            <div className="h-16 rounded-2xl bg-[#F1F3F8] animate-pulse" />
          ) : expiryAlerts.length === 0 ? (
            <div className="rounded-2xl bg-[#159A68]/10 border border-[#159A68]/25 p-4 flex items-center gap-3 text-xs text-[#159A68]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-semibold">
                Tidak ada peringatan kedaluwarsa yang belum ditangani saat ini.
                Semua stok batch dalam kondisi terpantau.
              </span>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {expiryAlerts.map((alertItem) => {
                const isClearanceAlert = alertItem.pesan
                  .toUpperCase()
                  .includes('CLEARANCE');
                return (
                  <div
                    key={alertItem.idAlert}
                    className={`rounded-2xl p-3.5 border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                      alertItem.isResolved
                        ? 'bg-[#F8FAFF] border-[#E6E8F0] opacity-70'
                        : isClearanceAlert
                          ? 'bg-[#E5484D]/5 border-[#E5484D]/30'
                          : 'bg-[#F75C03]/5 border-[#F75C03]/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            isClearanceAlert
                              ? 'bg-[#E5484D] text-white'
                              : 'bg-[#F75C03] text-white'
                          }`}
                        >
                          {isClearanceAlert
                            ? 'CLEARANCE H-7 (50%)'
                            : 'DARURAT H-30 (FEFO DEAL)'}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#171725]">
                          Batch: {alertItem.idProdBatch}
                        </span>
                        <span className="text-xs text-[#5E5E6A]">
                          • Stok Online:{' '}
                          <strong className="text-[#171725]">
                            {alertItem.stokOnline} unit
                          </strong>
                        </span>
                        <span className="text-xs text-[#5E5E6A]">
                          • Exp:{' '}
                          <strong className="text-[#E5484D]">
                            {alertItem.tanggalExp}
                          </strong>
                        </span>
                        {alertItem.diskon != null && alertItem.diskon > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#159A68]/15 text-[#159A68] text-[10px] font-extrabold">
                            Diskon Aktif: {alertItem.diskon}%
                          </span>
                        )}
                        {alertItem.hargaOverride != null &&
                          alertItem.hargaOverride > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-[#4737FF]/15 text-[#4737FF] text-[10px] font-extrabold">
                              Override: {formatRupiah(alertItem.hargaOverride)}
                            </span>
                          )}
                      </div>
                      <p className="text-xs font-semibold text-[#171725]">
                        {alertItem.pesan}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditBatchFromAlert(alertItem)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#4737FF]/30 bg-white hover:bg-[#E7EFFF] text-[#4737FF] text-[11px] font-bold cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Atur Harga / Diskon Batch</span>
                      </button>

                      {!alertItem.isResolved ? (
                        <button
                          type="button"
                          disabled={resolvingAlertId === alertItem.idAlert}
                          onClick={() => handleResolveAlert(alertItem)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#159A68] hover:opacity-90 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            {resolvingAlertId === alertItem.idAlert
                              ? 'Menyimpan...'
                              : 'Tandai Selesai'}
                          </span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-[#159A68]/15 text-[#159A68] text-[10px] font-extrabold">
                          Selesai Ditangani
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Alert Error / Sukses */}
        {actionError && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-[#E5484D]/30 bg-[#E5484D]/10 p-4 text-xs text-[#E5484D]"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-[#E5484D] hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div
            role="status"
            className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-[#159A68]/30 bg-[#159A68]/10 p-4 text-xs text-[#159A68]"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-[#159A68] hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form Tambah / Edit Batch FEFO */}
        {isBatchFormOpen && (
          <section className="mb-6 ff-card p-6 border-2 border-[#F75C03] bg-white">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E6E8F0]">
              <div>
                <h2 className="font-heading text-base font-extrabold text-[#171725]">
                  {editingBatch
                    ? `Edit Batch FEFO: ${editingBatch.idProdBatch}`
                    : 'Tambah Stok Batch FEFO Baru'}
                </h2>
                <p className="text-xs text-[#77788A]">
                  {editingBatch ? (
                    <>
                      Perbarui stok fisik awal, sisa stok online, tanggal
                      kedaluwarsa, harga override, atau diskon batch (
                      <code>
                        PUT /api/inventory/batches/{editingBatch.idProdBatch}
                      </code>
                      )
                    </>
                  ) : (
                    <>
                      Stok online produk dihitung otomatis dari akumulasi batch
                      aktif yang belum kedaluwarsa (
                      <code>POST /api/inventory/batches</code>)
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseBatchForm}
                className="text-[#77788A] hover:text-[#171725] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitBatch(onSubmitBatchForm)}
              noValidate
              className="space-y-4"
            >
              <div
                className={`grid grid-cols-1 ${
                  editingBatch ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
                } gap-4`}
              >
                <div>
                  <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                    Pilih Produk *
                  </label>
                  <select
                    {...registerBatch('productId')}
                    disabled={Boolean(editingBatch)}
                    className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] bg-white disabled:bg-[#F1F3F8] disabled:text-[#77788A] focus:border-[#4737FF] focus:outline-none"
                  >
                    <option value="">-- Pilih Produk --</option>
                    {products.map((p) => (
                      <option key={p.idProduk} value={p.idProduk}>
                        [{p.idProduk}] {p.namaProduk}
                      </option>
                    ))}
                  </select>
                  {batchErrors.productId && (
                    <p className="mt-1 text-xs text-[#E5484D]">
                      {batchErrors.productId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                    {editingBatch
                      ? 'Stok Awal (Unit) *'
                      : 'Jumlah Stok Masuk (Unit, ≥ 1) *'}
                  </label>
                  <input
                    type="number"
                    min={editingBatch ? 0 : 1}
                    {...registerBatch('stokAwal')}
                    className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                  />
                  {batchErrors.stokAwal && (
                    <p className="mt-1 text-xs text-[#E5484D]">
                      {batchErrors.stokAwal.message}
                    </p>
                  )}
                </div>

                {editingBatch && (
                  <div>
                    <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                      Sisa Stok Online (Unit) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      {...registerBatch('stokOnline')}
                      className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                    />
                    {batchErrors.stokOnline && (
                      <p className="mt-1 text-xs text-[#E5484D]">
                        {batchErrors.stokOnline.message}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                    Tanggal Kedaluwarsa *
                  </label>
                  <input
                    type="date"
                    min={editingBatch ? undefined : getDefaultFutureDate(1)}
                    {...registerBatch('tanggalExp')}
                    className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                  />
                  {batchErrors.tanggalExp && (
                    <p className="mt-1 text-xs text-[#E5484D]">
                      {batchErrors.tanggalExp.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                    Harga Override Khusus Batch Ini (Rp, Opsional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Kosongkan jika menggunakan harga eceran produk"
                    {...registerBatch('hargaOverride')}
                    className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                    Diskon Clearance Batch (%, Opsional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    max={100}
                    placeholder="Contoh: 15 (untuk diskon 15%)"
                    {...registerBatch('diskon')}
                    className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCloseBatchForm}
                  className="px-4 py-2.5 rounded-xl border border-[#E6E8F0] bg-white hover:bg-[#F1F3F8] text-[#171725] text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="px-5 py-2.5 rounded-xl bg-[#F75C03] hover:bg-[#D94800] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {isSubmittingBatch
                    ? 'Menyimpan Batch...'
                    : editingBatch
                      ? 'Simpan Perubahan Batch'
                      : 'Simpan Batch Stok FEFO'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Form Tambah / Edit Produk */}
        {isFormOpen && (
          <section className="mb-6 ff-card p-6 border-2 border-[#4737FF] bg-white">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E6E8F0]">
              <div>
                <h2 className="font-heading text-base font-extrabold text-[#171725]">
                  {editingProduct
                    ? `Edit Produk: ${editingProduct.namaProduk}`
                    : 'Tambah Produk Baru'}
                </h2>
                <p className="text-xs text-[#77788A]">
                  Lengkapi spesifikasi produk frozen food sesuai kontrak DTO
                  backend
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                className="text-[#77788A] hover:text-[#171725] cursor-pointer"
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
                  <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                    Nama Produk *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Nugget Ayam Crispy 500g"
                    {...register('namaProduk')}
                    className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                  />
                  {errors.namaProduk && (
                    <p className="mt-1 text-xs text-[#E5484D]">
                      {errors.namaProduk.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                    Kategori *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Olahan Ayam, Dimsum, Sosis..."
                    {...register('kategori')}
                    className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                  />
                  {errors.kategori && (
                    <p className="mt-1 text-xs text-[#E5484D]">
                      {errors.kategori.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                    Harga Eceran (Rp, &gt; 0) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register('hargaEceran')}
                    className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                  />
                  {errors.hargaEceran && (
                    <p className="mt-1 text-xs text-[#E5484D]">
                      {errors.hargaEceran.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                    Berat (gram, &gt; 0) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Contoh: 500 (untuk 500g)"
                    {...register('berat')}
                    className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                  />
                  {errors.berat && (
                    <p className="mt-1 text-xs text-[#E5484D]">
                      {errors.berat.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                    Volume (ml/cm³, &ge; 0)
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register('volume')}
                    className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                  />
                  {errors.volume && (
                    <p className="mt-1 text-xs text-[#E5484D]">
                      {errors.volume.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                    URL Gambar Produk (Opsional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    {...register('gambar')}
                    className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                  />
                </div>

                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-[#171725] cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('isActive')}
                      className="w-4 h-4 rounded accent-[#4737FF]"
                    />
                    <span>Produk Aktif (Ditampilkan di Katalog)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                  Deskripsi Produk (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat komposisi atau saran penyajian..."
                  {...register('deskripsiProduk')}
                  className="w-full rounded-xl border border-[#E6E8F0] px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2.5 rounded-xl border border-[#E6E8F0] bg-white hover:bg-[#F1F3F8] text-[#171725] text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
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

        {/* Tabel Daftar Katalog Produk */}
        <section className="ff-card p-6 bg-white mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-[#E6E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-base font-extrabold text-[#171725]">
                  Daftar Katalog Produk
                </h2>
                <p className="text-xs text-[#77788A]">
                  Total {filteredProducts.length} produk ditampilkan
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#77788A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Cari kode, nama, atau kategori..."
                className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-3.5 py-2 text-xs text-[#171725] focus:border-[#4737FF] focus:outline-none"
              />
            </div>
          </div>

          {isLoading && (
            <div className="space-y-3 animate-pulse py-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-14 rounded-2xl bg-[#F1F3F8]" />
              ))}
            </div>
          )}

          {!isLoading && isError && (
            <div className="rounded-2xl bg-[#E5484D]/10 border border-[#E5484D]/30 p-8 text-center my-4">
              <AlertCircle className="w-8 h-8 text-[#E5484D] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#171725] mb-1">
                Gagal Memuat Produk
              </p>
              <p className="text-xs text-[#5E5E6A] mb-4">
                {getErrorMessage(error, 'Tidak dapat mengambil data produk.')}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-[#4737FF] text-white text-xs font-bold cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {!isLoading && !isError && filteredProducts.length === 0 && (
            <div className="rounded-2xl bg-[#F8FAFF] p-10 text-center my-2">
              <Snowflake className="w-10 h-10 text-[#ACA5FF] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#171725] mb-1">
                Produk tidak ditemukan
              </p>
              <p className="text-xs text-[#77788A]">
                Belum ada produk atau tidak ada yang cocok dengan kata kunci
                pencarian.
              </p>
            </div>
          )}

          {!isLoading && !isError && filteredProducts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E6E8F0] text-[#77788A] uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 font-bold">Produk</th>
                    <th className="py-3.5 px-4 font-bold">Kategori</th>
                    <th className="py-3.5 px-4 font-bold">Harga Eceran</th>
                    <th className="py-3.5 px-4 font-bold">Berat & Volume</th>
                    <th className="py-3.5 px-4 font-bold">Stok Online</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E8F0]">
                  {filteredProducts.map((product) => {
                    const stock = getProductStock(product);
                    const isActive = product.isActive ?? true;

                    return (
                      <tr
                        key={product.idProduk}
                        className="hover:bg-[#F8FAFF] transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-[#E7EFFF] overflow-hidden shrink-0 flex items-center justify-center text-[#4737FF]">
                              {product.gambar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={product.gambar}
                                  alt={product.namaProduk}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Snowflake className="w-4 h-4 opacity-60" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F1F3F8] text-[#5E5E6A]">
                                  {product.idProduk}
                                </span>
                                <p className="font-bold text-[#171725]">
                                  {product.namaProduk}
                                </p>
                              </div>
                              {product.deskripsiProduk && (
                                <p className="text-[11px] text-[#77788A] line-clamp-1 max-w-xs mt-0.5">
                                  {product.deskripsiProduk}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-[#E7EFFF] text-[#4737FF] text-[11px] font-bold">
                            {product.kategori}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-[#4737FF]">
                            {formatRupiah(product.hargaEceran)}
                          </div>
                          {product.isClearance && product.hargaClearance && (
                            <div className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F75C03]/15 text-[#D93800] text-[10px] font-extrabold">
                              <span>
                                Deal: {formatRupiah(product.hargaClearance)} (-
                                {product.diskonPersen}%)
                              </span>
                            </div>
                          )}
                          {product.tieringPrices &&
                            product.tieringPrices.length > 0 && (
                              <div className="mt-0.5 text-[10px] font-bold text-[#159A68]">
                                {product.tieringPrices.length} Aturan Grosir
                                (Tiering)
                              </div>
                            )}
                        </td>

                        <td className="py-3.5 px-4 text-[#5E5E6A] font-medium">
                          {formatWeightDisplay(product.berat)}
                          {product.volume ? ` • ${product.volume} ml` : ''}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold ${
                              stock > 0 ? 'text-[#159A68]' : 'text-[#E5484D]'
                            }`}
                          >
                            {stock} unit
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              isActive
                                ? 'bg-[#159A68]/15 text-[#159A68]'
                                : 'bg-[#F1F3F8] text-[#77788A]'
                            }`}
                          >
                            {isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenTieringModal(product)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#4737FF]/30 bg-[#E7EFFF] hover:bg-[#D1CDFF] text-[#4737FF] text-[11px] font-bold cursor-pointer"
                            >
                              <Tag className="w-3 h-3" />
                              <span>Tiering</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenBatchForm(product.idProduk)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#F75C03]/30 bg-[#F75C03]/10 hover:bg-[#F75C03]/20 text-[#F75C03] text-[11px] font-bold cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Batch</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(product)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E6E8F0] bg-white hover:border-[#4737FF] text-[#171725] text-[11px] font-semibold cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(product)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E5484D]/30 bg-[#E5484D]/10 hover:bg-[#E5484D]/20 text-[#E5484D] text-[11px] font-semibold cursor-pointer"
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
        <section className="ff-card p-6 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-[#E6E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F75C03]/15 text-[#F75C03] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-base font-extrabold text-[#171725]">
                  Daftar Batch Inventori FEFO (First Expired, First Out)
                </h2>
                <p className="text-xs text-[#77788A]">
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
                className="rounded-xl border border-[#E6E8F0] px-3.5 py-2 text-xs text-[#171725] bg-[#F8FAFF] focus:bg-white focus:border-[#4737FF] focus:outline-none"
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
                <div key={n} className="h-12 rounded-2xl bg-[#F1F3F8]" />
              ))}
            </div>
          )}

          {!isLoadingBatches && isErrorBatches && (
            <div className="rounded-2xl bg-[#E5484D]/10 border border-[#E5484D]/30 p-6 text-center my-2">
              <p className="text-xs font-bold text-[#E5484D] mb-1">
                Gagal memuat data batch FEFO
              </p>
              <p className="text-xs text-[#5E5E6A]">
                {getErrorMessage(
                  errorBatches,
                  'Tidak dapat mengambil daftar batch dari server.'
                )}
              </p>
            </div>
          )}

          {!isLoadingBatches && !isErrorBatches && batches.length === 0 && (
            <div className="rounded-2xl bg-[#F8FAFF] p-8 text-center my-2">
              <Calendar className="w-8 h-8 text-[#ACA5FF] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#171725] mb-1">
                Belum Ada Batch Stok FEFO
              </p>
              <p className="text-xs text-[#77788A] mb-4">
                Tambahkan batch stok baru agar produk memiliki stok online dan
                dapat dipesan oleh pelanggan.
              </p>
              <button
                type="button"
                onClick={() =>
                  handleOpenBatchForm(selectedBatchFilterProduct || undefined)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F75C03] text-white text-xs font-bold hover:bg-[#D94800] cursor-pointer"
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
                  <tr className="border-b border-[#E6E8F0] text-[#77788A] uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 font-bold">Kode Batch</th>
                    <th className="py-3.5 px-4 font-bold">Produk</th>
                    <th className="py-3.5 px-4 font-bold">Stok Awal</th>
                    <th className="py-3.5 px-4 font-bold">Sisa Stok Online</th>
                    <th className="py-3.5 px-4 font-bold">
                      Tanggal Kedaluwarsa
                    </th>
                    <th className="py-3.5 px-4 font-bold">
                      Harga Khusus / Diskon
                    </th>
                    <th className="py-3.5 px-4 font-bold text-right">
                      Aksi Batch
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E8F0]">
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
                        className="hover:bg-[#F8FAFF] transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[#171725]">
                          {b.idProdBatch}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#171725]">
                            {b.namaProduk}
                          </span>
                          <span className="ml-1.5 font-mono text-[10px] text-[#77788A]">
                            ({b.productId})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#5E5E6A]">
                          {b.stokAwal} unit
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold ${
                              b.stokOnline > 0
                                ? 'text-[#159A68]'
                                : 'text-[#E5484D]'
                            }`}
                          >
                            {b.stokOnline} unit
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#171725]">
                              {b.tanggalExp}
                            </span>
                            {isExpired ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#E5484D]/15 text-[#E5484D] text-[10px] font-extrabold">
                                Kedaluwarsa
                              </span>
                            ) : isNearExpiry ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#D97706]/15 text-[#D97706] text-[10px] font-extrabold">
                                Prioritas FEFO ({diffDays} hr)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-[#159A68]/15 text-[#159A68] text-[10px] font-extrabold">
                                Aman ({diffDays} hr)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#5E5E6A]">
                          {b.hargaOverride ? (
                            <span className="font-bold text-[#4737FF]">
                              {formatRupiah(b.hargaOverride)}
                            </span>
                          ) : (
                            <span className="text-[#77788A]">Harga Normal</span>
                          )}
                          {b.diskon ? (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-[#F75C03]/15 text-[#F75C03] text-[10px] font-extrabold">
                              Diskon {b.diskon}%
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditBatch(b)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E6E8F0] bg-white hover:border-[#4737FF] text-[#171725] text-[11px] font-semibold cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteBatchTarget(b)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E5484D]/30 bg-[#E5484D]/10 hover:bg-[#E5484D]/20 text-[#E5484D] text-[11px] font-semibold cursor-pointer"
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

        {/* Modal Konfirmasi Hapus Batch */}
        {deleteBatchTarget && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#101018]/60 backdrop-blur-xs p-4"
          >
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E6E8F0] shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E5484D]/10 text-[#E5484D] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-extrabold text-[#171725]">
                    Hapus batch &ldquo;{deleteBatchTarget.idProdBatch}&rdquo;?
                  </h3>
                  <p className="text-xs text-[#77788A] mt-1">
                    Produk: <strong>{deleteBatchTarget.namaProduk}</strong> (Sisa
                    stok online: {deleteBatchTarget.stokOnline} unit). Batch ini
                    akan dihapus dari inventori aktif FEFO.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeletingBatch}
                  onClick={() => setDeleteBatchTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#E6E8F0] bg-white hover:bg-[#F1F3F8] text-[#171725] text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingBatch}
                  onClick={handleConfirmDeleteBatch}
                  className="px-4 py-2.5 rounded-xl bg-[#E5484D] hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {isDeletingBatch ? 'Menghapus...' : 'Ya, hapus batch'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Hapus Produk */}
        {deleteTarget && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#101018]/60 backdrop-blur-xs p-4"
          >
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E6E8F0] shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E5484D]/10 text-[#E5484D] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-extrabold text-[#171725]">
                    Hapus produk &ldquo;{deleteTarget.namaProduk}&rdquo;?
                  </h3>
                  <p className="text-xs text-[#77788A] mt-1">
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
                  className="px-4 py-2.5 rounded-xl border border-[#E6E8F0] bg-white hover:bg-[#F1F3F8] text-[#171725] text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2.5 rounded-xl bg-[#E5484D] hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {isDeleting ? 'Menghapus...' : 'Ya, hapus produk'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Kelola Harga Grosir Bertingkat (TieringPrice) */}
        {tieringTargetProduct && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#101018]/60 backdrop-blur-xs p-4"
          >
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-[#E6E8F0] shadow-xl space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E6E8F0]">
                <div>
                  <h3 className="font-heading text-base font-extrabold text-[#171725]">
                    Kelola Harga Grosir (Tiering):{' '}
                    {tieringTargetProduct.namaProduk}
                  </h3>
                  <p className="text-xs text-[#77788A] mt-0.5">
                    Harga Eceran Normal:{' '}
                    <strong>
                      {formatRupiah(tieringTargetProduct.hargaEceran)}
                    </strong>{' '}
                    • Berlaku otomatis di Keranjang, Checkout &amp; Nota PDF
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTieringTargetProduct(null)}
                  className="text-[#77788A] hover:text-[#171725] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-[#171725]">
                  Daftar Aturan Tiering Aktif:
                </p>
                {!tieringTargetProduct.tieringPrices ||
                tieringTargetProduct.tieringPrices.length === 0 ? (
                  <p className="text-xs text-[#77788A] bg-[#F8FAFF] rounded-xl p-3 border border-[#E6E8F0]">
                    Belum ada aturan harga grosir untuk produk ini.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {tieringTargetProduct.tieringPrices.map((tier) => (
                      <div
                        key={tier.idTiering}
                        className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#F8FAFF] border border-[#E6E8F0] text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#171725]">
                            Pembelian {tier.minQty} – {tier.maxQty} unit
                          </span>
                          <span className="ml-2 font-extrabold text-[#4737FF]">
                            → {formatRupiah(tier.hargaPerUnit)} / unit
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTieringRule(tier.idTiering)}
                          className="text-[#E5484D] hover:underline font-bold cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleAddTieringRule}
                className="pt-3 border-t border-[#E6E8F0] space-y-3"
              >
                <p className="text-xs font-bold text-[#171725]">
                  Tambah Rentang Kuantitas Baru:
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5E5E6A] mb-1">
                      Min. Qty *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={tierMinQty}
                      onChange={(e) => setTierMinQty(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E8F0] px-3 py-2 text-xs text-[#171725]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5E5E6A] mb-1">
                      Maks. Qty *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={tierMaxQty}
                      onChange={(e) => setTierMaxQty(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E8F0] px-3 py-2 text-xs text-[#171725]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5E5E6A] mb-1">
                      Harga / Unit (Rp) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={tierHargaUnit}
                      onChange={(e) => setTierHargaUnit(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E8F0] px-3 py-2 text-xs text-[#171725]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTieringTargetProduct(null)}
                    className="px-4 py-2 rounded-xl border border-[#E6E8F0] text-xs font-semibold text-[#171725] cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingTier}
                    className="px-4 py-2 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                  >
                    {isSavingTier ? 'Menyimpan...' : '+ Tambah Aturan Tiering'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}