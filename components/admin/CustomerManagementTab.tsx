'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Edit, 
  Ban, 
  CheckCircle2, 
  ShoppingBag,
  Search,
  X,
  Loader2,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  Eye,
  Package
} from 'lucide-react'
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useModal } from '@/contexts/ModalContext'

interface Customer {
  uid: string
  email: string
  name?: string
  displayName?: string
  status: 'active' | 'banned'
  createdAt?: Date
  lastOrderDate?: Date
  totalOrders?: number
  totalSpent?: number
  currency?: string
}

interface Order {
  id: string
  productName: string
  planName?: string
  amount: number
  status: string
  createdAt: any
  currency: string
}

export default function CustomerManagementTab() {
  const { showAlert } = useModal()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: 'active' as 'active' | 'banned'
  })

  // Load customers from orders
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const ordersSnapshot = await getDocs(collection(db, 'orders'))
        const customerMap = new Map<string, Customer>()
        
        ordersSnapshot.forEach((doc) => {
          const orderData = doc.data()
          const customerEmail = orderData.customer?.email || orderData.customerEmail || orderData.email
          const customerName = orderData.customer?.name || orderData.customerName
          const userId = orderData.userId || customerEmail || 'unknown'
          
          if (!customerEmail) return
          
          if (!customerMap.has(userId)) {
            customerMap.set(userId, {
              uid: userId,
              email: customerEmail,
              name: customerName,
              status: 'active',
              createdAt: orderData.createdAt?.toDate?.() || new Date(),
              lastOrderDate: orderData.createdAt?.toDate?.() || new Date(),
              totalOrders: 0,
              totalSpent: 0,
              currency: orderData.currency || 'IDR'
            })
          }
          
          const customer = customerMap.get(userId)!
          customer.totalOrders = (customer.totalOrders || 0) + 1
          customer.totalSpent = (customer.totalSpent || 0) + (orderData.totalAmount || orderData.amount || 0)
          
          const orderDate = orderData.createdAt?.toDate?.() || new Date()
          if (!customer.lastOrderDate || orderDate > customer.lastOrderDate) {
            customer.lastOrderDate = orderDate
          }
          if (!customer.createdAt || orderDate < customer.createdAt) {
            customer.createdAt = orderDate
          }
        })
        
        const customersList = Array.from(customerMap.values())
        setCustomers(customersList.sort((a, b) => {
          const dateA = a.lastOrderDate?.getTime() || 0
          const dateB = b.lastOrderDate?.getTime() || 0
          return dateB - dateA
        }))
      } catch (error) {
        console.error('Error loading customers:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCustomers()
  }, [])

  const handleOpenEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({
      name: customer.name || customer.displayName || '',
      email: customer.email,
      status: customer.status
    })
    setShowEditModal(true)
  }

  const handleSave = async () => {
    if (!selectedCustomer) return

    try {
      // Update all orders with this customer's email
      const ordersQuery = query(
        collection(db, 'orders'),
        where('customer.email', '==', selectedCustomer.email)
      )
      const ordersSnapshot = await getDocs(ordersQuery)
      
      const updatePromises = ordersSnapshot.docs.map(orderDoc =>
        updateDoc(doc(db, 'orders', orderDoc.id), {
          'customer.name': formData.name,
          'customer.status': formData.status,
          updatedAt: new Date()
        })
      )
      
      await Promise.all(updatePromises)

      // Update local state
      setCustomers(customers.map(customer => 
        customer.uid === selectedCustomer.uid 
          ? { ...customer, name: formData.name, status: formData.status }
          : customer
      ))

      showAlert('Customer updated successfully', 'success')
      setShowEditModal(false)
    } catch (error) {
      console.error('Error updating customer:', error)
      showAlert('Failed to update customer', 'error')
    }
  }

  const handleToggleBan = async (customer: Customer) => {
    try {
      const newStatus = customer.status === 'active' ? 'banned' : 'active'
      
      // Update all orders with this customer's email
      const ordersQuery = query(
        collection(db, 'orders'),
        where('customer.email', '==', customer.email)
      )
      const ordersSnapshot = await getDocs(ordersQuery)
      
      const updatePromises = ordersSnapshot.docs.map(orderDoc =>
        updateDoc(doc(db, 'orders', orderDoc.id), {
          'customer.status': newStatus,
          updatedAt: new Date()
        })
      )
      
      await Promise.all(updatePromises)

      // Update local state
      setCustomers(customers.map(c => 
        c.uid === customer.uid ? { ...c, status: newStatus } : c
      ))

      showAlert(`Customer ${newStatus === 'banned' ? 'banned' : 'unbanned'} successfully`, 'success')
    } catch (error) {
      console.error('Error toggling ban:', error)
      showAlert('Failed to update customer status', 'error')
    }
  }

  const handleViewOrders = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowOrdersModal(true)
    setLoadingOrders(true)

    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('customer.email', '==', customer.email),
        orderBy('createdAt', 'desc')
      )
      const ordersSnapshot = await getDocs(ordersQuery)
      
      const orders: Order[] = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        productName: doc.data().productName || 'Unknown Product',
        planName: doc.data().planName,
        amount: doc.data().totalAmount || doc.data().amount || 0,
        status: doc.data().status || 'PENDING',
        createdAt: doc.data().createdAt,
        currency: doc.data().currency || 'IDR'
      }))
      
      setCustomerOrders(orders)
    } catch (error) {
      console.error('Error loading orders:', error)
      showAlert('Failed to load orders', 'error')
    } finally {
      setLoadingOrders(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'IDR') {
      return `Rp ${Math.round(amount).toLocaleString('id-ID')}`
    }
    return `$${amount.toFixed(2)}`
  }

  const filteredCustomers = customers.filter(customer =>
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-purple-500" />
            Customer Management
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            View and manage customer accounts and order history
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search customers by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-400 text-sm font-medium">Total Customers</p>
              <p className="text-white text-2xl font-bold mt-1">{customers.length}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 text-sm font-medium">Active Customers</p>
              <p className="text-white text-2xl font-bold mt-1">
                {customers.filter(c => c.status === 'active').length}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-400 text-sm font-medium">Banned Customers</p>
              <p className="text-white text-2xl font-bold mt-1">
                {customers.filter(c => c.status === 'banned').length}
              </p>
            </div>
            <Ban className="w-8 h-8 text-red-500 opacity-50" />
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-400 text-sm font-medium">Total Orders</p>
              <p className="text-white text-2xl font-bold mt-1">
                {customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0)}
              </p>
            </div>
            <ShoppingBag className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-black/40 border border-white/10 rounded-lg p-12 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {searchQuery ? 'No customers found matching your search' : 'No customers yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.uid}
              className={`bg-black/40 border rounded-lg p-5 transition-all ${
                customer.status === 'banned'
                  ? 'border-red-500/30 opacity-60'
                  : 'border-white/10 hover:border-purple-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-bold text-lg">
                      {customer.name || customer.email.split('@')[0]}
                    </h3>
                    {customer.status === 'banned' && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-900/30 text-red-400 border border-red-500/30">
                        BANNED
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                    <Mail className="w-4 h-4" />
                    {customer.email}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <ShoppingBag className="w-3 h-3 text-blue-400" />
                        <span className="text-gray-400 text-xs">Orders</span>
                      </div>
                      <p className="text-white font-bold">{customer.totalOrders || 0}</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-3 h-3 text-green-400" />
                        <span className="text-gray-400 text-xs">Total Spent</span>
                      </div>
                      <p className="text-white font-bold text-sm">
                        {formatCurrency(customer.totalSpent || 0, customer.currency || 'IDR')}
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3 h-3 text-purple-400" />
                        <span className="text-gray-400 text-xs">Last Order</span>
                      </div>
                      <p className="text-white font-bold text-xs">
                        {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3 h-3 text-orange-400" />
                        <span className="text-gray-400 text-xs">Member Since</span>
                      </div>
                      <p className="text-white font-bold text-xs">
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleViewOrders(customer)}
                    className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all"
                    title="View Orders"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(customer)}
                    className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all"
                    title="Edit Customer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleBan(customer)}
                    className={`p-2 rounded-lg transition-all ${
                      customer.status === 'banned'
                        ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                        : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                    }`}
                    title={customer.status === 'banned' ? 'Unban Customer' : 'Ban Customer'}
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                Edit Customer
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Customer name"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'banned' })}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:opacity-90 transition-all"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Modal */}
      {showOrdersModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Order History: {selectedCustomer.name || selectedCustomer.email}
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {selectedCustomer.totalOrders} orders • {formatCurrency(selectedCustomer.totalSpent || 0, selectedCustomer.currency || 'IDR')} total
                </p>
              </div>
              <button
                onClick={() => setShowOrdersModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {loadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : customerOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No orders found
              </div>
            ) : (
              <div className="space-y-3">
                {customerOrders.map((order) => (
                  <div key={order.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-4 h-4 text-purple-400" />
                          <h4 className="text-white font-bold">{order.productName}</h4>
                        </div>
                        {order.planName && (
                          <p className="text-gray-400 text-sm ml-6">{order.planName}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        order.status === 'COMPLETED'
                          ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                          : order.status === 'PROCESSING'
                          ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                          : order.status === 'CANCELLED'
                          ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                          : 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400">
                          {order.createdAt?.toDate?.() 
                            ? new Date(order.createdAt.toDate()).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'}
                        </span>
                        <span className="text-white font-bold">
                          {formatCurrency(order.amount, order.currency)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(order.id)
                          showAlert('Order ID copied!', 'success')
                        }}
                        className="text-purple-400 hover:text-purple-300 text-xs font-mono"
                      >
                        {order.id.substring(0, 8)}...
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
