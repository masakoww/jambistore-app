'use client'

import { useState, useEffect } from 'react'
import { X, Plus, AlertCircle, DollarSign } from 'lucide-react'
import { Product } from '@/types/product'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useModal } from '@/contexts/ModalContext'

interface ManualOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currency: 'IDR' | 'USD'
}

export default function ManualOrderModal({ isOpen, onClose, onSuccess, currency }: ManualOrderModalProps) {
  const { showAlert } = useModal()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    productSlug: '',
    customerEmail: '',
    capitalCost: 0,
    sellingPrice: 0,
    notes: '',
  })

  // Load products
  useEffect(() => {
    if (!isOpen) return

    const q = query(collection(db, 'products'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsList: Product[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        if (data.status === 'ACTIVE') {
          productsList.push({ id: doc.id, ...data } as Product)
        }
      })
      setProducts(productsList)
    })

    return () => unsubscribe()
  }, [isOpen])

  // Auto-fill pricing when product is selected
  useEffect(() => {
    if (formData.productSlug) {
      const selectedProduct = products.find(p => p.slug === formData.productSlug)
      if (selectedProduct) {
        const capitalCost = selectedProduct.capitalCost || 0
        const sellingPrice = currency === 'IDR' 
          ? (selectedProduct.price?.IDR || 0)
          : (selectedProduct.price?.USD || 0)
        
        setFormData(prev => ({
          ...prev,
          capitalCost,
          sellingPrice,
        }))
      }
    }
  }, [formData.productSlug, products, currency])

  const profit = formData.sellingPrice - formData.capitalCost
  const marginPercent = formData.capitalCost > 0 
    ? ((profit / formData.capitalCost) * 100).toFixed(1)
    : '0'

  const handleSubmit = async () => {
    if (!formData.productSlug || !formData.customerEmail) {
      showAlert('Produk dan Email Pembeli harus diisi', 'error')
      return
    }

    if (formData.sellingPrice < 0 || formData.capitalCost < 0) {
      showAlert('Harga dan Modal tidak boleh negatif', 'error')
      return
    }

    setLoading(true)

    try {
      const selectedProduct = products.find(p => p.slug === formData.productSlug)
      
      const response = await fetch('/api/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug: formData.productSlug,
          productName: selectedProduct?.title || 'Unknown',
          customerEmail: formData.customerEmail,
          capitalCost: formData.capitalCost,
          sellingPrice: formData.sellingPrice,
          currency,
          notes: formData.notes,
        }),
      })

      const data = await response.json()

      if (data.ok) {
        showAlert('Order manual berhasil dibuat!', 'success')
        setFormData({
          productSlug: '',
          customerEmail: '',
          capitalCost: 0,
          sellingPrice: 0,
          notes: '',
        })
        onSuccess()
        onClose()
      } else {
        showAlert('Gagal: ' + data.message, 'error')
      }
    } catch (error) {
      console.error('Error creating manual order:', error)
      showAlert('Terjadi kesalahan saat membuat order', 'error')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (amount: number, curr: 'IDR' | 'USD'): string => {
    if (curr === 'IDR') {
      return `Rp ${Math.round(amount).toLocaleString('id-ID')}`
    }
    return `$${amount.toFixed(2)}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl w-full max-w-2xl">
        <div className="border-b border-white/10 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Buat Order Manual</h3>
              <p className="text-gray-400 text-sm">Tambahkan order langsung tanpa pembayaran otomatis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Selection */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">
              Produk <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.productSlug}
              onChange={(e) => setFormData({ ...formData, productSlug: e.target.value })}
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">-- Pilih Produk --</option>
              {products.map((product) => (
                <option key={product.slug} value={product.slug}>
                  {product.title} ({formatPrice(currency === 'IDR' ? (product.price?.IDR || 0) : (product.price?.USD || 0), currency)})
                </option>
              ))}
            </select>
          </div>

          {/* Customer Email */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">
              Email Pembeli <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              placeholder="customer@example.com"
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 font-medium mb-2">
                Modal (COGS) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step={currency === 'USD' ? '0.01' : '1'}
                value={formData.capitalCost}
                onChange={(e) => setFormData({ ...formData, capitalCost: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-orange-400 text-sm mt-1 font-medium">
                {formatPrice(formData.capitalCost, currency)}
              </p>
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-2">
                Harga Jual <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step={currency === 'USD' ? '0.01' : '1'}
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-green-400 text-sm mt-1 font-medium">
                {formatPrice(formData.sellingPrice, currency)}
              </p>
            </div>
          </div>

          {/* Profit Display */}
          <div className={`p-4 rounded-lg border ${profit >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className={`w-5 h-5 ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-gray-300 font-medium">Keuntungan:</span>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPrice(profit, currency)}
                </p>
                <p className={`text-sm ${profit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  Margin: {marginPercent}%
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">
              Catatan (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Tambahkan catatan untuk order ini..."
              rows={3}
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              {loading ? 'Membuat...' : 'Buat Order'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
