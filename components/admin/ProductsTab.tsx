'use client'

import { useState, useEffect, useRef } from 'react'
import { Package, Plus, Edit, Trash2, Save, X, Upload, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { Product } from '@/types/product'
import { collection, query, onSnapshot, deleteDoc, doc, addDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage'
import { db } from '@/lib/firebase'
import { useModal } from '@/contexts/ModalContext'

const storage = getStorage()

interface ProductsTabProps {
  currency: 'IDR' | 'USD'
}

export default function ProductsTab({ currency }: ProductsTabProps) {
  const { showAlert } = useModal()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: '',
    categoryId: '',
    categoryName: '',
    descriptionId: '',
    descriptionEn: '',
    estimation: '',
    capitalCostIDR: 0,
    capitalCostUSD: 0,
    gatewayIDR: 'pakasir',
    gatewayUSD: 'paypal',
    deliveryType: 'PRELOADED' as 'PRELOADED' | 'API' | 'MANUAL',
    heroImageUrl: '',
    heroGifUrl: '',
  })

  // File upload state
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
  const [heroGifFile, setHeroGifFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingGif, setUploadingGif] = useState(false)
  const heroImageInputRef = useRef<HTMLInputElement>(null)
  const heroGifInputRef = useRef<HTMLInputElement>(null)

  // Plans state
  const [plans, setPlans] = useState<Array<{
    name: string
    price: number
    period: string
    currency: 'IDR' | 'USD'
  }>>([])

  // Categories state
  const [categories, setCategories] = useState<Array<{ id: string, name: string, slug: string }>>([])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()

      if (data.ok) {
        const list = (data.categories || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        }))
        setCategories(list)
      } else {
        console.error('Error loading categories:', data.message)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  // Load products from Firestore
  useEffect(() => {
    const q = query(collection(db, 'products'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsList: Product[] = []
      snapshot.forEach((doc) => {
        productsList.push({ id: doc.id, ...doc.data() } as Product)
      })
      setProducts(productsList)
      setLoading(false)
    }, (error) => {
      console.error('Error loading products:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Load categories (server-side via API using Admin SDK)
  useEffect(() => {
    loadCategories()
  }, [])


  // Capital cost is kept for profit calculation after order completion


  const handleFileUpload = async (file: File, type: 'image' | 'gif'): Promise<string> => {
    const storageRef = ref(storage, `products/${formData.slug || Date.now()}-${type}-${file.name}`)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    return url
  }

  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        showAlert('Please select an image file', 'error')
        return
      }
      setHeroImageFile(file)
    }
  }

  const handleHeroGifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        showAlert('Please select an image/GIF file', 'error')
        return
      }
      setHeroGifFile(file)
    }
  }

  const uploadHeroImage = async () => {
    if (!heroImageFile) return
    setUploadingImage(true)
    try {
      const url = await handleFileUpload(heroImageFile, 'image')
      setFormData({ ...formData, heroImageUrl: url })
      setHeroImageFile(null)
      showAlert('Hero image uploaded successfully!', 'success')
    } catch (error) {
      console.error('Error uploading hero image:', error)
      showAlert('Failed to upload hero image', 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  const uploadHeroGif = async () => {
    if (!heroGifFile) return
    setUploadingGif(true)
    try {
      const url = await handleFileUpload(heroGifFile, 'gif')
      setFormData({ ...formData, heroGifUrl: url })
      setHeroGifFile(null)
      showAlert('Hero GIF uploaded successfully!', 'success')
    } catch (error) {
      console.error('Error uploading hero GIF:', error)
      showAlert('Failed to upload hero GIF', 'error')
    } finally {
      setUploadingGif(false)
    }
  }

  const handleOpenCreate = () => {
    setModalMode('create')
    setSelectedProduct(null)
    setFormData({
      title: '',
      slug: '',
      category: '',
      categoryId: '',
      categoryName: '',
      descriptionId: '',
      descriptionEn: '',
      estimation: '',
      capitalCostIDR: 0,
      capitalCostUSD: 0,
      gatewayIDR: 'pakasir',
      gatewayUSD: 'paypal',
      deliveryType: 'PRELOADED',
      heroImageUrl: '',
      heroGifUrl: '',
    })
    setPlans([])
    setHeroImageFile(null)
    setHeroGifFile(null)
    loadCategories()
    setShowModal(true)
  }

  const handleOpenEdit = (product: Product) => {
    const matchedCategory = categories.find(cat => cat.slug === (product.category || '')) || null

    setModalMode('edit')
    setSelectedProduct(product)
    setFormData({
      title: product.title,
      slug: product.slug,
      category: matchedCategory?.slug || product.category || '',
      categoryId: (product as any).categoryId || matchedCategory?.id || '',
      categoryName: (product as any).categoryName || matchedCategory?.name || '',
      descriptionId: product.descriptionLocalized?.id || product.description || '',
      descriptionEn: product.descriptionLocalized?.en || product.description || '',
      estimation: product.estimation || '',
      capitalCostIDR: product.capitalCost || 0,
      capitalCostUSD: product.price?.USD ? Math.round(product.capitalCost! * 100 / 16500) / 100 : 0,
      gatewayIDR: typeof product.gateway === 'object' ? product.gateway.IDR || 'pakasir' : product.gateway || 'pakasir',
      gatewayUSD: typeof product.gateway === 'object' ? product.gateway.USD || 'paypal' : 'paypal',
      deliveryType: product.delivery?.type.toUpperCase() as 'PRELOADED' | 'API' | 'MANUAL' || 'PRELOADED',
      heroImageUrl: product.heroImageUrl || '',
      heroGifUrl: product.heroGifUrl || '',
    })
    // Load existing plans
    setPlans(product.plans?.map(plan => ({
      name: plan.name,
      price: plan.priceNumber,
      period: plan.period || '',
      currency: (plan.currency === 'USD' ? 'USD' : 'IDR') as 'IDR' | 'USD'
    })) || [])
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.title || !formData.slug) {
      showAlert('Nama Produk dan Slug harus diisi', 'error')
      return
    }

    if (plans.length === 0) {
      showAlert('Minimal 1 plan harus ditambahkan. Produk tanpa plan tidak akan muncul di halaman /products.', 'error')
      return
    }

    try {
      // derive product price per currency from plans (fallback to 0 if none)
      const priceIDR = plans
        .filter(p => p.currency === 'IDR')
        .reduce((max, p) => Math.max(max, p.price), 0)
      const priceUSD = plans
        .filter(p => p.currency === 'USD')
        .reduce((max, p) => Math.max(max, p.price), 0)

      const productData: any = {
        title: formData.title,
        slug: formData.slug,
        category: formData.category,
        categoryId: formData.categoryId || null,
        categoryName: formData.categoryName || '',
        estimation: formData.estimation,
        descriptionLocalized: {
          id: formData.descriptionId,
          en: formData.descriptionEn,
        },
        capitalCost: formData.capitalCostIDR,
        price: {
          IDR: priceIDR,
          USD: priceUSD,
        },
        gateway: {
          IDR: formData.gatewayIDR,
          USD: formData.gatewayUSD,
        },
        delivery: {
          type: formData.deliveryType.toLowerCase(),
          instructions: 'Produk akan dikirim setelah pembayaran dikonfirmasi',
        },
        heroImageUrl: formData.heroImageUrl,
        heroGifUrl: formData.heroGifUrl,
        status: 'ACTIVE',
        plans: plans.map(plan => ({
          name: plan.name,
          priceNumber: plan.price,
          priceString: plan.currency === 'IDR' 
            ? `Rp ${Math.round(plan.price).toLocaleString('id-ID')}`
            : `$${plan.price.toFixed(2)}`,
          period: plan.period,
          currency: plan.currency
        })),
        features: [],
        meta: {
          updatedAt: new Date(),
        },
      }

      if (modalMode === 'create') {
        productData.meta.createdAt = new Date()
        await addDoc(collection(db, 'products'), productData)
        showAlert('Produk berhasil ditambahkan', 'success')
      } else if (selectedProduct?.id) {
        await updateDoc(doc(db, 'products', selectedProduct.id), productData)
        showAlert('Produk berhasil diperbarui', 'success')
      }

      setShowModal(false)
    } catch (error) {
      console.error('Error saving product:', error)
      showAlert('Gagal menyimpan produk', 'error')
    }
  }

  const handleDelete = async () => {
    if (!productToDelete) return

    try {
      await deleteDoc(doc(db, 'products', productToDelete))
      showAlert('Produk berhasil dihapus', 'success')
      setShowDeleteConfirm(false)
      setProductToDelete(null)
    } catch (error) {
      console.error('Error deleting product:', error)
      showAlert('Gagal menghapus produk', 'error')
    }
  }

  const formatPrice = (amount: number, curr: 'IDR' | 'USD'): string => {
    if (curr === 'IDR') {
      return `Rp ${Math.round(amount).toLocaleString('id-ID')}`
    }
    return `$${amount.toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">Memuat produk...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white">Kelola Produk</h3>
          <p className="text-gray-400 text-sm">Total: {products.length} produk</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Tambah Produk
        </button>
      </div>

      {/* Products Table */}
      {products.length === 0 ? (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Belum ada produk</p>
          <p className="text-gray-600 text-sm mt-2">
            Klik tombol "Tambah Produk" untuk memulai
          </p>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Image</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Nama Produk</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Kategori</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Plans</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Modal</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Harga Jual</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Gateway</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Tipe Pengiriman</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="px-6 py-4">
                      {product.heroImageUrl ? (
                        <img 
                          src={product.heroImageUrl} 
                          alt={product.title}
                          className="w-16 h-16 object-cover rounded-lg border border-white/10"
                          onError={(e) => {
                            e.currentTarget.src = '/img/placeholder-product.png';
                            e.currentTarget.onerror = null;
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-600" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{product.title}</div>
                      <div className="text-gray-400 text-xs">{product.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{product.category || '-'}</td>
                    <td className="px-6 py-4">
                      {product.plans && product.plans.length > 0 ? (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
                          {product.plans.length} plan{product.plans.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full">
                          No plans
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-orange-400 font-medium">
                      {formatPrice(product.capitalCost || 0, currency)}
                    </td>
                    <td className="px-6 py-4 text-green-400 font-bold">
                      {formatPrice(currency === 'IDR' ? (product.price?.IDR || 0) : (product.price?.USD || 0), currency)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-full uppercase">
                        {typeof product.gateway === 'object' 
                          ? (currency === 'IDR' ? product.gateway.IDR : product.gateway.USD)
                          : product.gateway || 'pakasir'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full uppercase">
                        {product.delivery?.type || 'manual'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="p-2 hover:bg-purple-500/10 rounded-lg transition-colors"
                          title="Edit Produk"
                        >
                          <Edit className="w-4 h-4 text-purple-400" />
                        </button>
                        <button
                          onClick={() => {
                            setProductToDelete(product.id!)
                            setShowDeleteConfirm(true)
                          }}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0a0a0a] border-b border-white/10 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">
                {modalMode === 'create' ? 'Tambah Produk Baru' : 'Edit Produk'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-medium mb-2">
                    Nama Produk <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value })
                      if (modalMode === 'create') {
                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                        setFormData(prev => ({ ...prev, slug }))
                      }
                    }}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-2">
                    Slug <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-2">Kategori / Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => {
                    const selected = categories.find((cat) => cat.id === e.target.value)
                    setFormData({
                      ...formData,
                      categoryId: selected?.id || '',
                      categoryName: selected?.name || '',
                      category: selected?.slug || '',
                    })
                  }}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Pilih Kategori / Select Category --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {categories.length === 0 ? (
                    <span className="text-yellow-400">⚠️ Belum ada kategori. Buat kategori di tab Categories. / No categories yet. Create categories in the Categories tab.</span>
                  ) : (
                    'Kategori membantu user memfilter produk / Categories help users filter products'
                  )}
                </p>
              </div>

              {/* Pricing */}
              <div className="border-t border-white/10 pt-6">
                <h4 className="text-lg font-bold text-white mb-4">Harga & Modal</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h5 className="text-sm font-semibold text-gray-400">IDR (Rupiah)</h5>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">Modal (COGS)</label>
                      <input
                        type="number"
                        value={formData.capitalCostIDR}
                        onChange={(e) => setFormData({ ...formData, capitalCostIDR: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="Contoh: 50000"
                      />
                      <p className="text-xs text-gray-500 mt-1">Harga modal/beli produk (untuk perhitungan profit)</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-sm font-semibold text-gray-400">USD (Dollar)</h5>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">Modal (COGS)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.capitalCostUSD}
                        onChange={(e) => setFormData({ ...formData, capitalCostUSD: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="Contoh: 5.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">Capital cost in USD (for profit calculation)</p>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-400 text-sm font-semibold mb-1">💡 Harga Jual</p>
                  <p className="text-gray-300 text-xs">
                    Harga jual produk diatur di bagian <strong>Plans Management</strong> di bawah. 
                    Anda bisa menambahkan berbagai pilihan harga (Weekly, Monthly, Lifetime, dll).
                  </p>
                </div>
              </div>

              {/* Plans Management */}
              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-white">Paket Harga (Plans)</h4>
                  <button
                    type="button"
                    onClick={() => setPlans([...plans, { name: '', price: 0, period: '', currency: 'IDR' }])}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-semibold rounded-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Plan
                  </button>
                </div>
                
                {plans.length === 0 ? (
                  <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ Produk tanpa plan tidak akan muncul di halaman /products
                    </p>
                    <p className="text-yellow-300/70 text-xs mt-1">
                      Tambahkan minimal 1 plan agar produk dapat ditampilkan
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plans.map((plan, index) => (
                      <div key={index} className="p-4 bg-black/30 border border-white/10 rounded-lg">
                        <div className="grid grid-cols-5 gap-3">
                          <div className="col-span-2">
                            <label className="block text-gray-400 text-xs mb-1">Nama Plan</label>
                            <input
                              type="text"
                              value={plan.name}
                              onChange={(e) => {
                                const newPlans = [...plans]
                                newPlans[index].name = e.target.value
                                setPlans(newPlans)
                              }}
                              placeholder="1 Month, 1 Year, dll"
                              className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-400 text-xs mb-1">Harga</label>
                            <input
                              type="number"
                              step="0.01"
                              value={plan.price}
                              onChange={(e) => {
                                const newPlans = [...plans]
                                newPlans[index].price = parseFloat(e.target.value) || 0
                                setPlans(newPlans)
                              }}
                              className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-400 text-xs mb-1">Periode</label>
                            <input
                              type="text"
                              value={plan.period}
                              onChange={(e) => {
                                const newPlans = [...plans]
                                newPlans[index].period = e.target.value
                                setPlans(newPlans)
                              }}
                              placeholder="/month"
                              className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <select
                              value={plan.currency}
                              onChange={(e) => {
                                const newPlans = [...plans]
                                newPlans[index].currency = e.target.value as 'IDR' | 'USD'
                                setPlans(newPlans)
                              }}
                              className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            >
                              <option value="IDR">IDR</option>
                              <option value="USD">USD</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setPlans(plans.filter((_, i) => i !== index))}
                              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Hapus Plan"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Preview: {plan.currency === 'IDR' 
                            ? `Rp ${Math.round(plan.price).toLocaleString('id-ID')}`
                            : `$${plan.price.toFixed(2)}`} {plan.period}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gateway & Delivery */}
              <div className="border-t border-white/10 pt-6">
                <h4 className="text-lg font-bold text-white mb-4">Gateway & Pengiriman</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Gateway IDR</label>
                    <select
                      value={formData.gatewayIDR}
                      onChange={(e) => setFormData({ ...formData, gatewayIDR: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="pakasir">Pakasir</option>
                      <option value="ipaymu">iPaymu</option>
                      <option value="tokopay">Tokopay</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Gateway USD</label>
                    <select
                      value={formData.gatewayUSD}
                      onChange={(e) => setFormData({ ...formData, gatewayUSD: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="paypal">PayPal</option>
                      <option value="stripe">Stripe</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Tipe Pengiriman</label>
                    <select
                      value={formData.deliveryType}
                      onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value as any })}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="PRELOADED">Preloaded</option>
                      <option value="API">API</option>
                      <option value="MANUAL">Manual</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="border-t border-white/10 pt-6">
                <h4 className="text-lg font-bold text-white mb-4">Deskripsi</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Deskripsi (Bahasa Indonesia)</label>
                    <textarea
                      value={formData.descriptionId}
                      onChange={(e) => setFormData({ ...formData, descriptionId: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Deskripsi (English)</label>
                    <textarea
                      value={formData.descriptionEn}
                      onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Estimation */}
              <div className="border-t border-white/10 pt-6">
                <h4 className="text-lg font-bold text-white mb-4">Estimation</h4>
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Delivery Time Estimation</label>
                  <input
                    type="text"
                    value={formData.estimation}
                    onChange={(e) => setFormData({ ...formData, estimation: e.target.value })}
                    placeholder="e.g., 10 Minutes, 1-2 Hours, Instant"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Estimated delivery time shown to customers</p>
                </div>
              </div>

              {/* Image Uploads */}
              <div className="border-t border-white/10 pt-6 space-y-6">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Product Images
                </h4>

                {/* Hero Image */}
                <div className="space-y-3">
                  <label className="block text-gray-300 font-medium">Hero Image (Static)</label>
                  <p className="text-xs text-gray-500">Main product image (PNG, JPG, WEBP)</p>
                  
                  {/* URL Input */}
                  <input
                    type="text"
                    value={formData.heroImageUrl}
                    onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })}
                    placeholder="Or paste image URL..."
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />

                  {/* File Upload */}
                  <div className="flex gap-3">
                    <input
                      ref={heroImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleHeroImageChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => heroImageInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      {heroImageFile ? heroImageFile.name : 'Choose File'}
                    </button>
                    {heroImageFile && (
                      <button
                        type="button"
                        onClick={uploadHeroImage}
                        disabled={uploadingImage}
                        className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg font-medium transition-all disabled:opacity-50"
                      >
                        {uploadingImage ? 'Uploading...' : 'Upload'}
                      </button>
                    )}
                  </div>

                  {/* Preview */}
                  {formData.heroImageUrl && (
                    <div className="relative w-full h-48 bg-black/50 rounded-lg overflow-hidden border border-white/10">
                      <img src={formData.heroImageUrl} alt="Hero Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Hero GIF */}
                <div className="space-y-3">
                  <label className="block text-gray-300 font-medium">Hero GIF (Animated)</label>
                  <p className="text-xs text-gray-500">Animated product preview (GIF, WEBP)</p>
                  
                  {/* URL Input */}
                  <input
                    type="text"
                    value={formData.heroGifUrl}
                    onChange={(e) => setFormData({ ...formData, heroGifUrl: e.target.value })}
                    placeholder="Or paste GIF URL..."
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />

                  {/* File Upload */}
                  <div className="flex gap-3">
                    <input
                      ref={heroGifInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleHeroGifChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => heroGifInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      {heroGifFile ? heroGifFile.name : 'Choose File'}
                    </button>
                    {heroGifFile && (
                      <button
                        type="button"
                        onClick={uploadHeroGif}
                        disabled={uploadingGif}
                        className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg font-medium transition-all disabled:opacity-50"
                      >
                        {uploadingGif ? 'Uploading...' : 'Upload'}
                      </button>
                    )}
                  </div>

                  {/* Preview */}
                  {formData.heroGifUrl && (
                    <div className="relative w-full h-48 bg-black/50 rounded-lg overflow-hidden border border-white/10">
                      <img src={formData.heroGifUrl} alt="GIF Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-white/10">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-lg transition-all"
                >
                  <Save className="w-5 h-5" />
                  Simpan
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Hapus Produk</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-lg transition-all"
              >
                Ya, Hapus
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setProductToDelete(null)
                }}
                className="px-6 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
