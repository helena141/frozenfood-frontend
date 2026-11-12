'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Snowflake,
  Minus,
  Plus,
  ShoppingBag,
  AlertCircle,
  Scale,
  Box,
  Check,
  ShieldCheck,
  Truck,
  Clock,
  ChevronRight,
  ChevronDown,
  ZoomIn,
  X,
  Trash2,
  ArrowRight,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/axios';
import {
  formatRupiah,
  getErrorMessage,
  getProductStock,
  hasExplicitStock,
} from '@/lib/utils';
import { ProductCatalogResponse } from '@/types/api';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import ShopSidebar from '@/components/shop/sidebar';
import ShopFooter from '@/components/shop/footer';
import ProductCard, {
  formatGramLabel,
  extractProductPromo,
} from '@/components/shop/product-card';

const numberFormatterId = new Intl.NumberFormat('id-ID');

interface ParsedDescriptionSection {
  key: 'deskripsi' | 'keunggulan' | 'penyajian' | 'penyimpanan';
  label: string;
  rawContent: string;
  bullets: string[];
}

/**
 * Memecah teks deskripsi secara aman jika terdapat penanda bagian
 * ("Keunggulan Produk", "Cara Penyajian", "Penyimpanan", dsb.)
 * tanpa mengubah isi kalimat dan tanpa menghapus kata.
 */
function parseProductDescription(rawText: string): {
  hasMarkers: boolean;
  fullText: string;
  sections: ParsedDescriptionSection[];
} {
  const cleaned = (rawText || '').trim();
  const defaultText =
    cleaned ||
    'Produk frozen food pilihan yang disimpan pada suhu standar rantai dingin -18°C untuk menjaga kualitas rasa, tekstur, dan nutrisi hingga tiba di tangan Anda.';

  const markerRegex =
    /(?:^|\n|\r|[.!?]\s+)(?=(?:Deskripsi(?:\s+Produk)?|Keunggulan(?:\s+Produk)?|Cara\s+Penyajian|Saran\s+Penyajian|Petunjuk\s+Penyajian|Cara\s+Penyimpanan|Petunjuk\s+Penyimpanan|Penyimpanan)\s*[:\-])/i;

  if (!markerRegex.test(defaultText)) {
    return {
      hasMarkers: false,
      fullText: defaultText,
      sections: [
        {
          key: 'deskripsi',
          label: 'Deskripsi',
          rawContent: defaultText,
          bullets: [],
        },
      ],
    };
  }

  const headerPattern =
    /(Deskripsi(?:\s+Produk)?|Keunggulan(?:\s+Produk)?|Cara\s+Penyajian|Saran\s+Penyajian|Petunjuk\s+Penyajian|Cara\s+Penyimpanan|Petunjuk\s+Penyimpanan|Penyimpanan)\s*[:\-]\s*/gi;

  const matches: {
    key: ParsedDescriptionSection['key'];
    label: string;
    startIndex: number;
    contentStart: number;
  }[] = [];

  let match: RegExpExecArray | null;
  while ((match = headerPattern.exec(defaultText)) !== null) {
    const rawHeader = match[1].toLowerCase();
    let key: ParsedDescriptionSection['key'] = 'deskripsi';
    let label = 'Deskripsi';

    if (rawHeader.includes('keunggulan')) {
      key = 'keunggulan';
      label = 'Keunggulan';
    } else if (rawHeader.includes('penyajian')) {
      key = 'penyajian';
      label = 'Cara Penyajian';
    } else if (rawHeader.includes('penyimpanan')) {
      key = 'penyimpanan';
      label = 'Penyimpanan';
    }

    matches.push({
      key,
      label,
      startIndex: match.index,
      contentStart: match.index + match[0].length,
    });
  }

  if (matches.length === 0) {
    return {
      hasMarkers: false,
      fullText: defaultText,
      sections: [
        {
          key: 'deskripsi',
          label: 'Deskripsi',
          rawContent: defaultText,
          bullets: [],
        },
      ],
    };
  }

  const sections: ParsedDescriptionSection[] = [];

  // Teks pembuka sebelum penanda pertama dimasukkan sebagai Deskripsi
  const introText = defaultText.slice(0, matches[0].startIndex).trim();
  if (introText) {
    sections.push({
      key: 'deskripsi',
      label: 'Deskripsi',
      rawContent: introText,
      bullets: [],
    });
  }

  matches.forEach((m, idx) => {
    const nextStart =
      idx + 1 < matches.length
        ? matches[idx + 1].startIndex
        : defaultText.length;
    const content = defaultText.slice(m.contentStart, nextStart).trim();
    if (!content) return;

    const shouldBullet = m.key === 'keunggulan' || m.key === 'penyajian';
    const bullets = shouldBullet
      ? content
          .split(/(?:\r?\n|•|\s+-\s+|(?<=[.!?])\s+)/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    const existing = sections.find((s) => s.key === m.key);
    if (existing) {
      existing.rawContent = `${existing.rawContent}\n${content}`;
      existing.bullets = [...existing.bullets, ...bullets];
    } else {
      sections.push({
        key: m.key,
        label: m.label,
        rawContent: content,
        bullets,
      });
    }
  });

  return {
    hasMarkers: sections.length > 1,
    fullText: defaultText,
    sections,
  };
}

/**
 * Mengekstrak daftar gambar produk (mendukung produk dengan 1 atau banyak gambar).
 */
function extractProductGallery(product: ProductCatalogResponse): string[] {
  const raw = product as unknown as Record<string, unknown>;
  const list: string[] = [];

  if (product.gambar && product.gambar.trim() !== '') {
    list.push(product.gambar.trim());
  }

  const extraCandidates = [raw.galeri, raw.images, raw.fotoTambahan];
  extraCandidates.forEach((candidate) => {
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => {
        if (typeof item === 'string' && item.trim() !== '' && !list.includes(item.trim())) {
          list.push(item.trim());
        }
      });
    }
  });

  return list;
}

/**
 * Mengecek apakah data produk mendukung klaim Halal.
 */
function supportsHalalBadge(product: ProductCatalogResponse): boolean {
  const raw = product as unknown as Record<string, unknown>;
  if (raw.isHalal === true || Boolean(raw.sertifikatHalal)) {
    return true;
  }
  const combined = `${product.namaProduk || ''} ${product.kategori || ''} ${
    product.deskripsiProduk || ''
  }`.toLowerCase();
  return combined.includes('halal');
}

/**
 * Mengekstrak tabel harga bertingkat B2B jika API mengirimkannya.
 */
function extractB2BTiers(
  product: ProductCatalogResponse
): { minQty: number; price: number; label?: string }[] {
  const raw = product as unknown as Record<string, unknown>;
  const tiers: { minQty: number; price: number; label?: string }[] = [];

  if (Array.isArray(raw.tierPrices)) {
    raw.tierPrices.forEach((t) => {
      if (t && typeof t === 'object') {
        const obj = t as Record<string, unknown>;
        const minQty = Number(obj.minQty ?? obj.minQuantity ?? 0);
        const price = Number(obj.price ?? obj.harga ?? 0);
        if (minQty > 0 && price > 0) {
          tiers.push({ minQty, price });
        }
      }
    });
  } else if (
    typeof raw.hargaGrosir === 'number' &&
    raw.hargaGrosir > 0 &&
    raw.hargaGrosir < product.hargaEceran
  ) {
    const minGrosir =
      typeof raw.minOrderGrosir === 'number' && raw.minOrderGrosir > 1
        ? raw.minOrderGrosir
        : 10;
    tiers.push({
      minQty: minGrosir,
      price: raw.hargaGrosir,
      label: `Beli ${minGrosir}+ lebih hemat`,
    });
  }

  return tiers;
}

function ProductDetailContent() {
  const params = useParams<{ id: string }>();
  const productId = params?.id || '';

  const user = useAuthStore((state) => state.user);
  const {
    items: cartItems,
    addItem,
    updateQty,
    removeItem,
    getTotalItems,
    getSubtotal,
  } = useCartStore();

  const [mounted, setMounted] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [toastProduct, setToastProduct] = useState<string | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [activeTabKey, setActiveTabKey] =
    useState<ParsedDescriptionSection['key']>('deskripsi');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state ketika berpindah produk
  useEffect(() => {
    setQty(1);
    setSelectedImageIdx(0);
    setIsSummaryExpanded(false);
    setActiveTabKey('deskripsi');
  }, [productId]);

  // Tutup lightbox atau drawer dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        setIsCartDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Query detail produk
  const {
    data: product,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ProductCatalogResponse>({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await api.get<ProductCatalogResponse>(
        `/api/products/${productId}`
      );
      return response.data;
    },
    enabled: Boolean(productId),
    retry: 1,
  });

  // Query daftar katalog produk (menggunakan endpoint & queryKey yang sudah ada)
  const { data: catalogProducts = [], isLoading: isLoadingCatalog } = useQuery<
    ProductCatalogResponse[]
  >({
    queryKey: ['catalog-products'],
    queryFn: async () => {
      const res = await api.get<ProductCatalogResponse[]>('/api/products');
      return res.data;
    },
  });

  // Perbarui judul halaman & meta description secara dinamis
  useEffect(() => {
    if (!product) return;
    document.title = `${product.namaProduk} • Lezzat Frozen Food`;

    const summaryDesc = (
      product.deskripsiProduk ||
      `Beli ${product.namaProduk} segar dengan jaminan rantai dingin -18°C di Lezzat Frozen Food.`
    ).slice(0, 155);

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', summaryDesc);
  }, [product]);

  const explicitStock = product ? hasExplicitStock(product) : false;
  const safeStock = product ? getProductStock(product) : 0;
  const isOutOfStock =
    !product ||
    product.isActive === false ||
    (explicitStock && safeStock <= 0) ||
    safeStock <= 0;
  const isLowStock = !isOutOfStock && explicitStock && safeStock <= 10;

  const galleryImages = useMemo(
    () => (product ? extractProductGallery(product) : []),
    [product]
  );
  const activeImageUrl = galleryImages[selectedImageIdx] || galleryImages[0] || null;

  const { discountPercent, originalPrice } = useMemo(
    () =>
      product
        ? extractProductPromo(product)
        : { discountPercent: 0, originalPrice: null },
    [product]
  );

  const showHalalChip = useMemo(
    () => (product ? supportsHalalBadge(product) : false),
    [product]
  );

  const b2bTiers = useMemo(
    () =>
      product && user?.tipeAkun === 'B2B' ? extractB2BTiers(product) : [],
    [product, user?.tipeAkun]
  );

  const parsedDescription = useMemo(
    () => parseProductDescription(product?.deskripsiProduk || ''),
    [product?.deskripsiProduk]
  );

  // Pastikan activeTabKey selalu valid
  useEffect(() => {
    if (
      parsedDescription.sections.length > 0 &&
      !parsedDescription.sections.some((s) => s.key === activeTabKey)
    ) {
      setActiveTabKey(parsedDescription.sections[0].key);
    }
  }, [parsedDescription.sections, activeTabKey]);

  // 4. Filter "Produk Serupa" (Satu kategori, bukan produk yang sedang dibuka, urutkan promo/FEFO & stok tersedia dulu, habis di akhir, maks 8)
  const similarProducts = useMemo(() => {
    if (!product) return [];
    const currentCategory = (product.kategori || '').trim().toLowerCase();
    if (!currentCategory) return [];

    const sameCategory = catalogProducts.filter(
      (p) =>
        p.isActive !== false &&
        p.idProduk !== product.idProduk &&
        (p.kategori || '').trim().toLowerCase() === currentCategory
    );

    return sameCategory
      .sort((a, b) => {
        const stockA = getProductStock(a);
        const stockB = getProductStock(b);
        const availA = stockA > 0 ? 1 : 0;
        const availB = stockB > 0 ? 1 : 0;
        if (availA !== availB) return availB - availA;

        // Produk dengan diskon atau batch FEFO stok terbatas diutamakan
        const promoA =
          extractProductPromo(a).discountPercent > 0 ||
          (stockA > 0 && stockA <= 10)
            ? 1
            : 0;
        const promoB =
          extractProductPromo(b).discountPercent > 0 ||
          (stockB > 0 && stockB <= 10)
            ? 1
            : 0;
        if (promoA !== promoB) return promoB - promoA;

        return stockA - stockB;
      })
      .slice(0, 8);
  }, [catalogProducts, product]);

  // 5. Filter "Produk Lainnya" (Kategori lain, tanpa duplikasi dengan Produk Serupa & tanpa produk yang sedang dibuka, maks 8)
  const otherProducts = useMemo(() => {
    if (!product) return [];
    const similarIds = new Set(similarProducts.map((p) => p.idProduk));

    const candidates = catalogProducts.filter(
      (p) =>
        p.isActive !== false &&
        p.idProduk !== product.idProduk &&
        !similarIds.has(p.idProduk)
    );

    return candidates
      .sort((a, b) => {
        const availA = getProductStock(a) > 0 ? 1 : 0;
        const availB = getProductStock(b) > 0 ? 1 : 0;
        if (availA !== availB) return availB - availA;
        return 0;
      })
      .slice(0, 8);
  }, [catalogProducts, product, similarProducts]);

  const triggerAddedToast = (productName: string) => {
    setToastProduct(productName);
  };

  useEffect(() => {
    if (!toastProduct) return;
    const timer = setTimeout(() => setToastProduct(null), 4000);
    return () => clearTimeout(timer);
  }, [toastProduct]);

  const handleAddMainProduct = () => {
    if (!product || isOutOfStock) return;
    addItem(product, qty);
    triggerAddedToast(product.namaProduk);
  };

  const totalCartItems = mounted ? getTotalItems() : 0;
  const cartSubtotal = mounted ? getSubtotal() : 0;
  const displayCartItems = mounted ? cartItems : [];

  const hasValidVolume = Boolean(product?.volume && Number(product.volume) > 0);
  const currentSubtotal = product ? product.hargaEceran * qty : 0;

  return (
    <div className="lezzat-shell">
      <ShopSidebar />

      <main className="lezzat-main pb-28 md:pb-12">
        <div className="max-w-[1200px] mx-auto space-y-6">
          {/* Topbar: Breadcrumb + Tombol Keranjang yang Membuka Drawer */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 min-w-0"
            >
              <Link
                href="/"
                className="font-semibold text-slate-600 hover:text-[#4737FF] transition-colors focus-visible:outline-2 focus-visible:outline-[#4737FF] rounded"
              >
                Beranda
              </Link>

              {product?.kategori && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <Link
                    href={`/?kategori=${encodeURIComponent(
                      product.kategori
                    )}#katalog-produk`}
                    className="font-semibold text-slate-600 hover:text-[#4737FF] transition-colors truncate max-w-[160px] focus-visible:outline-2 focus-visible:outline-[#4737FF] rounded"
                  >
                    {product.kategori}
                  </Link>
                </>
              )}

              {product?.namaProduk && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <Link
                    href={`/products/${product.idProduk}`}
                    aria-current="page"
                    className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-[300px] focus-visible:outline-2 focus-visible:outline-[#4737FF] rounded"
                  >
                    {product.namaProduk}
                  </Link>
                </>
              )}
            </nav>

            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              aria-label={`Buka keranjang belanja (${totalCartItems} item)`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4737FF]"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Keranjang</span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#F75C03] text-white text-[10px] font-extrabold">
                {totalCartItems}
              </span>
            </button>
          </div>

          {/* Skeleton Loading Hero */}
          {isLoading && (
            <section
              aria-busy="true"
              aria-label="Memuat detail produk"
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 animate-pulse"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                <div className="lg:col-span-5">
                  <div className="aspect-square w-full rounded-2xl bg-slate-100" />
                </div>
                <div className="lg:col-span-7 space-y-4">
                  <div className="h-6 w-28 rounded-lg bg-slate-100" />
                  <div className="h-9 w-4/5 rounded-lg bg-slate-100" />
                  <div className="h-8 w-40 rounded-lg bg-slate-100" />
                  <div className="flex gap-2">
                    <div className="h-7 w-32 rounded-lg bg-slate-100" />
                    <div className="h-7 w-36 rounded-lg bg-slate-100" />
                  </div>
                  <div className="h-20 w-full rounded-xl bg-slate-100" />
                  <div className="h-16 w-full rounded-xl bg-slate-100" />
                  <div className="h-12 w-full rounded-xl bg-slate-100" />
                </div>
              </div>
            </section>
          )}

          {/* Error State & Produk Tidak Ditemukan */}
          {!isLoading && (isError || !product) && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-md mx-auto my-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-[#F75C03]" />
              </div>
              <div className="space-y-1">
                <h1 className="font-heading text-lg font-extrabold text-slate-800">
                  Produk Tidak Ditemukan
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {getErrorMessage(
                    error,
                    'Maaf, produk yang Anda cari sedang tidak tersedia atau gagal dimuat.'
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba lagi</span>
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-bold transition-colors"
                >
                  <span>Kembali ke Katalog</span>
                </Link>
              </div>
            </section>
          )}

          {/* Konten Utama Produk */}
          {!isLoading && !isError && product && (
            <>
              {/* Hero Produk Dua Kolom (Galeri ±45% / 5 kol, Info ±55% / 7 kol, gap 32-40px) */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                  {/* Kolom Kiri: Galeri Foto (Sticky di Desktop) */}
                  <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-3">
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center group">
                      {activeImageUrl ? (
                        <button
                          type="button"
                          onClick={() => setIsLightboxOpen(true)}
                          aria-label={`Perbesar foto ${product.namaProduk}`}
                          className="w-full h-full relative block cursor-zoom-in focus-visible:outline-2 focus-visible:outline-[#4737FF]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeImageUrl}
                            alt={product.namaProduk}
                            className="w-full h-full object-cover motion-safe:group-hover:scale-[1.03] transition-transform duration-300"
                          />
                          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/90 backdrop-blur-xs text-slate-700 text-[11px] font-semibold shadow-2xs opacity-90 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="w-3.5 h-3.5 text-[#4737FF]" />
                            <span>Perbesar</span>
                          </span>
                        </button>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#4737FF]/45 p-6 text-center">
                          <Snowflake className="w-16 h-16 mb-2" />
                          <span className="text-xs font-semibold text-slate-400">
                            {product.kategori || 'Lezzat Frozen Food'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Galeri jika produk memiliki lebih dari 1 gambar */}
                    {galleryImages.length > 1 && (
                      <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                        {galleryImages.map((imgUrl, idx) => {
                          const isSelected = idx === selectedImageIdx;
                          return (
                            <button
                              key={imgUrl}
                              type="button"
                              onClick={() => setSelectedImageIdx(idx)}
                              aria-label={`Pilih gambar ${idx + 1} untuk ${product.namaProduk}`}
                              className={`w-16 h-16 rounded-xl overflow-hidden border shrink-0 cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-[#4737FF] ${
                                isSelected
                                  ? 'border-[#4737FF] ring-2 ring-[#4737FF]/20'
                                  : 'border-slate-200 opacity-70 hover:opacity-100'
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imgUrl}
                                alt={`${product.namaProduk} - gambar ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Kolom Kanan: Informasi Produk, Kepercayaan, Spesifikasi & Pembelian */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* Chip Kategori & Nama Produk */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/?kategori=${encodeURIComponent(
                            product.kategori || ''
                          )}#katalog-produk`}
                          className="inline-block px-2.5 py-1 rounded-lg bg-[#4737FF]/10 text-[#4737FF] text-xs font-bold hover:bg-[#4737FF]/15 transition-colors"
                        >
                          {product.kategori || 'Frozen Food'}
                        </Link>

                        {discountPercent > 0 && (
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-[#F75C03] text-white text-xs font-extrabold">
                            Promo -{discountPercent}%
                          </span>
                        )}
                      </div>

                      <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-800 line-clamp-2 leading-tight">
                        {product.namaProduk}
                      </h1>
                    </div>

                    {/* Harga Utama & Deretan Chip Kepercayaan */}
                    <div className="space-y-3 pb-4 border-b border-slate-100">
                      <div className="flex items-baseline flex-wrap gap-2.5">
                        <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#4737FF]">
                          {formatRupiah(product.hargaEceran)}
                        </span>
                        {originalPrice && (
                          <span className="text-sm text-slate-400 line-through font-semibold">
                            {formatRupiah(originalPrice)}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium">
                          / {formatGramLabel(product.berat)}
                        </span>
                      </div>

                      {/* Baris Chip Kepercayaan (Maks 4, satu baris, boleh wrap) */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-[#159A68] text-xs font-bold">
                          <Snowflake className="w-3.5 h-3.5 shrink-0" />
                          <span>-18°C Cold Chain</span>
                        </span>

                        {showHalalChip && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-[#159A68] text-xs font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>100% Halal</span>
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                          <Truck className="w-3.5 h-3.5 text-[#4737FF] shrink-0" />
                          <span>Gratis ongkir ≤ 5 km</span>
                        </span>

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5 text-[#4737FF] shrink-0" />
                          <span>Same day sebelum 15.00 WIB</span>
                        </span>
                      </div>
                    </div>

                    {/* Ringkasan Deskripsi 3-4 Baris + Baca Selengkapnya */}
                    <div className="space-y-1.5">
                      <p
                        className={`text-sm sm:text-base text-slate-600 leading-relaxed max-w-[65ch] ${
                          isSummaryExpanded ? '' : 'line-clamp-3'
                        }`}
                      >
                        {parsedDescription.sections[0]?.rawContent ||
                          parsedDescription.fullText}
                      </p>
                      {parsedDescription.fullText.length > 160 && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setIsSummaryExpanded((prev) => !prev)
                            }
                            className="text-xs font-bold text-[#4737FF] hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4737FF] rounded"
                          >
                            {isSummaryExpanded
                              ? 'Ringkas tampilan'
                              : 'Baca selengkapnya'}
                          </button>
                          <a
                            href="#informasi-produk"
                            className="text-xs font-semibold text-slate-500 hover:text-[#4737FF]"
                          >
                            Lihat detail lengkap ↓
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Grid Spesifikasi (Volume 0 ml otomatis disembunyikan) */}
                    <div
                      className={`grid gap-3 p-3.5 rounded-xl bg-slate-50 text-xs ${
                        hasValidVolume
                          ? 'grid-cols-2 sm:grid-cols-3'
                          : 'grid-cols-2'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Scale className="w-3.5 h-3.5 text-[#4737FF]" />
                          <span>Berat Bersih</span>
                        </span>
                        <span className="font-bold text-slate-800 block text-sm">
                          {formatGramLabel(product.berat)}
                        </span>
                      </div>

                      {hasValidVolume && (
                        <div className="space-y-0.5">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Box className="w-3.5 h-3.5 text-[#4737FF]" />
                            <span>Volume</span>
                          </span>
                          <span className="font-bold text-slate-800 block text-sm">
                            {numberFormatterId.format(Number(product.volume))}{' '}
                            ml
                          </span>
                        </div>
                      )}

                      <div className="space-y-0.5">
                        <span className="text-slate-500 block">
                          Status Ketersediaan
                        </span>
                        {isOutOfStock ? (
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs">
                            Stok habis
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-[#F75C03] text-white font-bold text-xs">
                            Stok terbatas ({numberFormatterId.format(safeStock)}{' '}
                            unit)
                          </span>
                        ) : explicitStock ? (
                          <span className="font-bold text-[#159A68] block text-sm">
                            Tersedia ({numberFormatterId.format(safeStock)}{' '}
                            unit)
                          </span>
                        ) : (
                          <span className="font-bold text-[#159A68] block text-sm">
                            Tersedia & Siap Kirim
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tabel Harga Bertingkat B2B (Hanya muncul jika user B2B dan datanya tersedia) */}
                    {b2bTiers.length > 0 && (
                      <div className="rounded-xl bg-[#4737FF]/5 p-3.5 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#4737FF]">
                          <Layers className="w-4 h-4" />
                          <span>Harga Khusus Mitra B2B</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {b2bTiers.map((tier) => (
                            <div
                              key={tier.minQty}
                              className="bg-white rounded-lg px-3 py-2 flex items-center justify-between"
                            >
                              <span className="font-semibold text-slate-700">
                                {tier.label || `Min. ${tier.minQty} unit`}
                              </span>
                              <span className="font-extrabold text-[#4737FF]">
                                {formatRupiah(tier.price)} / unit
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Kotak Informasi Pengiriman */}
                    <div className="rounded-xl bg-slate-50 p-3.5 flex items-start gap-3 text-xs">
                      <div className="w-9 h-9 rounded-lg bg-[#4737FF]/10 text-[#4737FF] flex items-center justify-center shrink-0 mt-0.5">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 text-slate-600 leading-relaxed">
                        <p className="font-bold text-slate-800">
                          Estimasi tiba: hari ini jika dipesan sebelum 15.00 WIB
                        </p>
                        <p>
                          Gratis ongkir untuk jarak ≤ 5 km dengan kurir motor
                          toko berinsulasi (jam operasional 09.00–21.00 WIB).
                          Mendukung pengiriman hingga radius 50 km.
                        </p>
                      </div>
                    </div>

                    {/* Area Beli (Stepper + Tombol Utama 48px + Subtotal) */}
                    <div className="pt-2 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-600">
                          Atur jumlah pembelian:
                        </span>
                        <span className="font-bold text-slate-800">
                          Subtotal:{' '}
                          <strong className="text-sm font-extrabold text-[#4737FF]">
                            {formatRupiah(currentSubtotal)}
                          </strong>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Stepper Jumlah (Tinggi 48px / h-12) */}
                        <div className="inline-flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 h-12 min-w-[132px]">
                          <button
                            type="button"
                            disabled={isOutOfStock || qty <= 1}
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                            aria-label="Kurangi jumlah"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 hover:text-[#4737FF] hover:bg-white disabled:opacity-35 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4737FF]"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span
                            aria-live="polite"
                            className="text-sm font-extrabold text-slate-800 min-w-[28px] text-center"
                          >
                            {numberFormatterId.format(qty)}
                          </span>
                          <button
                            type="button"
                            disabled={isOutOfStock || qty >= safeStock}
                            onClick={() =>
                              setQty((q) => Math.min(safeStock, q + 1))
                            }
                            aria-label="Tambah jumlah"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 hover:text-[#4737FF] hover:bg-white disabled:opacity-35 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4737FF]"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Tombol Utama Tambah ke Keranjang (Tinggi 48px / h-12) */}
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={handleAddMainProduct}
                          className={`flex-1 min-w-[200px] h-12 inline-flex items-center justify-center gap-2 rounded-xl font-extrabold px-6 text-sm transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4737FF] ${
                            isOutOfStock
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-[#F75C03] hover:bg-[#D94800] text-white shadow-sm'
                          }`}
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>
                            {isOutOfStock
                              ? 'Stok Habis'
                              : 'Tambah ke Keranjang'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Bagian Deskripsi Terstruktur (Tab di Desktop, Accordion di Mobile) */}
              <section
                id="informasi-produk"
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <h2 className="font-heading text-base sm:text-lg font-extrabold text-slate-800">
                    Informasi Lengkap Produk
                  </h2>

                  {/* Navigasi Tab apabila teks memiliki penanda bagian */}
                  {parsedDescription.hasMarkers && (
                    <div
                      role="tablist"
                      aria-label="Bagian informasi produk"
                      className="hidden sm:flex items-center gap-1.5"
                    >
                      {parsedDescription.sections.map((sec) => {
                        const isActive = activeTabKey === sec.key;
                        return (
                          <button
                            key={sec.key}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveTabKey(sec.key)}
                            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4737FF] ${
                              isActive
                                ? 'bg-[#4737FF] text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {sec.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Isi Jika Tidak Ada Penanda: Tampilkan Seluruh Teks Apa Adanya sebagai Satu Paragraf */}
                {!parsedDescription.hasMarkers ? (
                  <div className="max-w-[65ch] text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                    {parsedDescription.fullText}
                  </div>
                ) : (
                  <>
                    {/* Tampilan Panel Tab untuk Layar Tablet & Desktop */}
                    <div className="hidden sm:block">
                      {parsedDescription.sections.map((sec) => {
                        if (sec.key !== activeTabKey) return null;
                        return (
                          <div
                            key={sec.key}
                            role="tabpanel"
                            className="max-w-[65ch] text-sm sm:text-base text-slate-700 leading-relaxed space-y-2.5"
                          >
                            {sec.bullets.length > 1 ? (
                              <ul className="list-disc pl-5 space-y-2">
                                {sec.bullets.map((item, idx) => (
                                  <li key={idx} className="leading-relaxed">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="whitespace-pre-line leading-relaxed">
                                {sec.rawContent}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Tampilan Accordion untuk Layar Mobile */}
                    <div className="sm:hidden divide-y divide-slate-100">
                      {parsedDescription.sections.map((sec) => {
                        const isOpen = activeTabKey === sec.key;
                        return (
                          <div key={sec.key} className="py-2.5 first:pt-0 last:pb-0">
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              onClick={() => setActiveTabKey(sec.key)}
                              className="w-full flex items-center justify-between py-2 text-left font-heading text-sm font-bold text-slate-800 cursor-pointer"
                            >
                              <span>{sec.label}</span>
                              <ChevronDown
                                className={`w-4 h-4 text-slate-500 transition-transform ${
                                  isOpen ? 'rotate-180 text-[#4737FF]' : ''
                                }`}
                              />
                            </button>
                            {isOpen && (
                              <div className="pt-2 pb-1 max-w-[65ch] text-sm text-slate-700 leading-relaxed">
                                {sec.bullets.length > 1 ? (
                                  <ul className="list-disc pl-5 space-y-1.5">
                                    {sec.bullets.map((item, idx) => (
                                      <li key={idx}>{item}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="whitespace-pre-line">
                                    {sec.rawContent}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>

              {/* Skeleton Rekomendasi saat daftar katalog sedang dimuat */}
              {isLoadingCatalog && (
                <section
                  aria-busy="true"
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-pulse"
                >
                  <div className="h-6 w-56 rounded-lg bg-slate-100" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="h-64 rounded-xl bg-slate-100"
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 4. SECTION "PRODUK SERUPA" */}
              {!isLoadingCatalog && similarProducts.length > 0 && (
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-base sm:text-lg font-extrabold text-slate-800">
                        Produk Serupa di {product.kategori || 'Kategori Ini'}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Pilihan sejenis yang siap dikirim dengan standar rantai
                        dingin -18°C
                      </p>
                    </div>

                    <Link
                      href={`/?kategori=${encodeURIComponent(
                        product.kategori || ''
                      )}#katalog-produk`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#4737FF] hover:underline shrink-0"
                    >
                      <span>Lihat semua</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Mobile: Horizontal Scroll-Snap | Tablet & Desktop: Auto-fill Grid min 190px, maks 4 kolom */}
                  <div className="flex sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] lg:grid-cols-4 gap-3.5 sm:gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-2 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
                    {similarProducts.map((item) => (
                      <div
                        key={item.idProduk}
                        className="min-w-[200px] max-w-[230px] sm:min-w-0 sm:max-w-none shrink-0 snap-start"
                      >
                        <ProductCard
                          product={item}
                          onAddedToCart={(p) => triggerAddedToast(p.namaProduk)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 5. SECTION "PRODUK LAINNYA" */}
              {!isLoadingCatalog && otherProducts.length > 0 && (
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-base sm:text-lg font-extrabold text-slate-800">
                        Produk Lainnya
                      </h2>
                      <p className="text-xs text-slate-500">
                        Jelajahi produk frozen food pilihan dari kategori
                        lainnya
                      </p>
                    </div>

                    <Link
                      href="/#katalog-produk"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#4737FF] hover:underline shrink-0"
                    >
                      <span>Lihat semua produk</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="flex sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] lg:grid-cols-4 gap-3.5 sm:gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-2 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
                    {otherProducts.map((item) => (
                      <div
                        key={item.idProduk}
                        className="min-w-[200px] max-w-[230px] sm:min-w-0 sm:max-w-none shrink-0 snap-start"
                      >
                        <ProductCard
                          product={item}
                          onAddedToCart={(p) => triggerAddedToast(p.namaProduk)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Fallback jika Produk Serupa & Produk Lainnya sama-sama kosong */}
              {!isLoadingCatalog &&
                similarProducts.length === 0 &&
                otherProducts.length === 0 && (
                  <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-sm font-bold text-slate-800">
                        Ingin melihat produk lainnya?
                      </h2>
                      <p className="text-xs text-slate-500">
                        Temukan lebih banyak pilihan produk beku berkualitas di
                        halaman utama kami.
                      </p>
                    </div>
                    <Link
                      href="/#katalog-produk"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-bold transition-colors"
                    >
                      <span>Lihat katalog lengkap</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </section>
                )}
            </>
          )}

          <ShopFooter />
        </div>
      </main>

      {/* Sticky Bottom Bar untuk Layar Mobile (Safe-area padding) */}
      {!isLoading && !isError && product && (
        <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t border-slate-200 px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-medium block leading-none">
                Subtotal ({numberFormatterId.format(qty)} item)
              </span>
              <span className="font-heading text-base font-extrabold text-[#4737FF] block truncate mt-0.5">
                {formatRupiah(currentSubtotal)}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-1.5 h-10">
                <button
                  type="button"
                  disabled={isOutOfStock || qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Kurangi jumlah"
                  className="w-7 h-7 flex items-center justify-center text-slate-700 disabled:opacity-35"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-extrabold text-slate-800 min-w-[22px] text-center">
                  {numberFormatterId.format(qty)}
                </span>
                <button
                  type="button"
                  disabled={isOutOfStock || qty >= safeStock}
                  onClick={() => setQty((q) => Math.min(safeStock, q + 1))}
                  aria-label="Tambah jumlah"
                  className="w-7 h-7 flex items-center justify-center text-slate-700 disabled:opacity-35"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleAddMainProduct}
                className={`h-10 inline-flex items-center justify-center gap-1.5 rounded-lg font-extrabold px-4 text-xs transition-colors ${
                  isOutOfStock
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-[#F75C03] hover:bg-[#D94800] text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{isOutOfStock ? 'Habis' : '+ Keranjang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast "Ditambahkan ke keranjang" dengan tautan "Lihat keranjang" */}
      {toastProduct && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm rounded-xl bg-white border border-slate-200 shadow-lg p-3.5 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#159A68] flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">
                Ditambahkan ke keranjang
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {toastProduct}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setToastProduct(null);
              setIsCartDrawerOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#4737FF]/10 hover:bg-[#4737FF] text-[#4737FF] hover:text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            Lihat keranjang
          </button>
        </div>
      )}

      {/* Drawer Keranjang (Menggantikan Panel Keranjang Permanen) */}
      {isCartDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keranjang Belanja Anda"
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-xs"
        >
          <div
            onClick={() => setIsCartDrawerOpen(false)}
            className="flex-1"
          />
          <aside className="w-full max-w-sm bg-white h-full shadow-xl border-l border-slate-200 p-5 flex flex-col justify-between">
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#4737FF]/10 text-[#4737FF] flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-heading text-sm font-extrabold text-slate-800">
                      Keranjang Anda
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {numberFormatterId.format(totalCartItems)} item dipilih
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCartDrawerOpen(false)}
                  aria-label="Tutup keranjang"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {displayCartItems.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    Keranjang Anda masih kosong
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Tambahkan produk pilihan Anda untuk mulai berbelanja.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayCartItems.map(({ product: itemProd, qty: itemQty }) => {
                    const safeItemQty =
                      Number.isNaN(itemQty) || itemQty < 1 ? 1 : itemQty;
                    const maxItemStock = Math.max(
                      getProductStock(itemProd),
                      safeItemQty
                    );

                    return (
                      <div
                        key={itemProd.idProduk}
                        className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <div className="w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center border border-slate-100">
                          {itemProd.gambar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={itemProd.gambar}
                              alt={itemProd.namaProduk}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Snowflake className="w-4 h-4 text-[#4737FF]/40" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {itemProd.namaProduk}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeItem(itemProd.idProduk)}
                              aria-label={`Hapus ${itemProd.namaProduk}`}
                              className="text-slate-400 hover:text-red-500 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-xs font-extrabold text-[#4737FF] mt-0.5 mb-2">
                            {formatRupiah(itemProd.hargaEceran)}
                          </p>

                          <div className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-2 py-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateQty(itemProd.idProduk, safeItemQty - 1)
                              }
                              aria-label="Kurangi jumlah"
                              className="text-slate-600 hover:text-[#4737FF] cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-slate-800 min-w-[16px] text-center">
                              {numberFormatterId.format(safeItemQty)}
                            </span>
                            <button
                              type="button"
                              disabled={safeItemQty >= maxItemStock}
                              onClick={() =>
                                updateQty(itemProd.idProduk, safeItemQty + 1)
                              }
                              aria-label="Tambah jumlah"
                              className="text-slate-600 hover:text-[#4737FF] disabled:opacity-30 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Pengiriman</span>
                  <span className="font-bold text-[#159A68]">
                    Gratis ≤ 5 km
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-800 pt-2 border-t border-slate-100">
                  <span>Subtotal</span>
                  <span className="text-[#4737FF]">
                    {formatRupiah(cartSubtotal)}
                  </span>
                </div>
              </div>

              <Link
                href={displayCartItems.length > 0 ? '/checkout' : '#'}
                aria-disabled={displayCartItems.length === 0}
                onClick={() => setIsCartDrawerOpen(false)}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-extrabold transition-colors ${
                  displayCartItems.length > 0
                    ? 'bg-[#F75C03] hover:bg-[#D94800] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-400 pointer-events-none'
                }`}
              >
                <span>Lanjut ke Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Lightbox Sederhana untuk Zoom Gambar */}
      {isLightboxOpen && activeImageUrl && product && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau gambar ${product.namaProduk}`}
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-white rounded-2xl p-3 shadow-2xl border border-slate-200"
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Tutup pratinjau gambar"
              className="absolute top-5 right-5 z-10 w-9 h-9 rounded-lg bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center shadow-sm cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImageUrl}
                alt={product.namaProduk}
                className="w-full h-full object-contain"
              />
            </div>

            <p className="text-center text-xs font-bold text-slate-700 mt-2.5">
              {product.namaProduk}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="lezzat-shell">
          <ShopSidebar />
          <main className="lezzat-main">
            <div className="max-w-[1200px] mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 animate-pulse h-96" />
            </div>
          </main>
        </div>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}