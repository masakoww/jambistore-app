'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Ban, 
  CheckCircle2, 
  Shield, 
  ShoppingBag,
  Search,
  X,
  Loader2,
  Mail,
  Calendar
} from 'lucide-react'
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useModal } from '../../contexts/ModalContext'

interface AdminPermissions {
  viewOrders?: boolean
  deliverProducts?: boolean
  deleteOrders?: boolean
  accessSettings?: boolean
  viewCustomers?: boolean
  manageAdmins?: boolean
  manageProducts?: boolean
  viewRevenue?: boolean
}

interface AdminUser {
  uid: string
  email: string
  displayName?: string
  role: 'owner' | 'admin' | 'moderator'
  status: 'active' | 'banned'
  permissions: AdminPermissions
  createdAt?: Date
  lastLogin?: Date
  ordersProcessed?: number
}

export default function AdminManagementTab() {
  const { showAlert } = useModal()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null)
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null)

  const [formData, setFormData] = useState<{
    role: 'admin' | 'moderator'
    permissions: AdminPermissions
  }>({
    role: 'admin',
    permissions: {
      viewOrders: true,
      deliverProducts: true,
      deleteOrders: false,
      accessSettings: false,
      viewCustomers: true,
      manageAdmins: false,
      manageProducts: false,
      viewRevenue: false,
    }
  })

  useEffect(() => {
    const loadAdmins = async () => {
      try {
        const adminsSnapshot = await getDocs(collection(db, 'admins'))
        const adminsList: AdminUser[] = []
        
        adminsSnapshot.forEach((doc) => {
          adminsList.push({ uid: doc.id, ...doc.data() } as AdminUser)
        })
        
        for (const admin of adminsList) {
          const ordersQuery = query(
            collection(db, 'orders'),
            where('delivery.deliveredBy', '==', admin.uid)
          )
          const ordersSnapshot = await getDocs(ordersQuery)
          admin.ordersProcessed = ordersSnapshot.size
        }

        setAdmins(adminsList.sort((a, b) => {
          // Owner first
          if (a.role === 'owner') return -1
          if (b.role === 'owner') return 1
          // Then by role
          const roleOrder = { admin: 1, moderator: 2 }
          return roleOrder[a.role] - roleOrder[b.role]
        }))
      } catch (error) {
        console.error('Error loading admins:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAdmins()
  }, [])

  const handleOpenEdit = (admin: AdminUser) => {
    if (admin.role === 'owner') {
      showAlert('Cannot edit owner permissions', 'error')
      return
    }

    setSelectedAdmin(admin)
    setFormData({
      role: admin.role as 'admin' | 'moderator',
      permissions: { ...admin.permissions }
    })
    setShowEditModal(true)
  }

  const handleSave = async () => {
    if (!selectedAdmin) return

    try {
      await updateDoc(doc(db, 'admins', selectedAdmin.uid), {
        role: formData.role,
        permissions: formData.permissions,
        updatedAt: new Date()
      })

      // Update local state
      setAdmins(admins.map(admin => 
        admin.uid === selectedAdmin.uid 
          ? { ...admin, role: formData.role, permissions: formData.permissions }
          : admin
      ))

      showAlert('Admin updated successfully', 'success')
      setShowEditModal(false)
    } catch (error) {
      console.error('Error updating admin:', error)
      showAlert('Failed to update admin', 'error')
    }
  }

  const handleToggleBan = async (admin: AdminUser) => {
    if (admin.role === 'owner') {
      showAlert('Cannot ban the owner', 'error')
      return
    }

    try {
      const newStatus = admin.status === 'active' ? 'banned' : 'active'
      
      await updateDoc(doc(db, 'admins', admin.uid), {
        status: newStatus,
        updatedAt: new Date()
      })

      // Update local state
      setAdmins(admins.map(a => 
        a.uid === admin.uid ? { ...a, status: newStatus } : a
      ))

      showAlert(`Admin ${newStatus === 'banned' ? 'banned' : 'unbanned'} successfully`, 'success')
    } catch (error) {
      console.error('Error toggling ban:', error)
      showAlert('Failed to update admin status', 'error')
    }
  }

  const handleDelete = async () => {
    if (!adminToDelete) return

    try {
      await deleteDoc(doc(db, 'admins', adminToDelete))

      setAdmins(admins.filter(a => a.uid !== adminToDelete))
      showAlert('Admin deleted successfully', 'success')
      setShowDeleteConfirm(false)
      setAdminToDelete(null)
    } catch (error) {
      console.error('Error deleting admin:', error)
      showAlert('Failed to delete admin', 'error')
    }
  }

  const filteredAdmins = admins.filter(admin =>
    admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-purple-500" />
            Admin Management
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage administrator roles, permissions, and access control
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search admins by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-400 text-sm font-medium">Total Admins</p>
              <p className="text-white text-2xl font-bold mt-1">{admins.length}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 text-sm font-medium">Active Admins</p>
              <p className="text-white text-2xl font-bold mt-1">
                {admins.filter(a => a.status === 'active').length}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-400 text-sm font-medium">Banned Admins</p>
              <p className="text-white text-2xl font-bold mt-1">
                {admins.filter(a => a.status === 'banned').length}
              </p>
            </div>
            <Ban className="w-8 h-8 text-red-500 opacity-50" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="bg-black/40 border border-white/10 rounded-lg p-12 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {searchQuery ? 'No admins found matching your search' : 'No admins yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAdmins.map((admin) => (
            <div
              key={admin.uid}
              className={`bg-black/40 border rounded-lg p-5 transition-all ${
                admin.status === 'banned'
                  ? 'border-red-500/30 opacity-60'
                  : 'border-white/10 hover:border-purple-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-bold text-lg">
                      {admin.displayName || admin.email.split('@')[0]}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      admin.role === 'owner'
                        ? 'bg-purple-900/30 text-purple-400 border border-purple-500/30'
                        : admin.role === 'admin'
                        ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                        : 'bg-green-900/30 text-green-400 border border-green-500/30'
                    }`}>
                      {admin.role.toUpperCase()}
                    </span>
                    {admin.status === 'banned' && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-900/30 text-red-400 border border-red-500/30">
                        BANNED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                    <Mail className="w-4 h-4" />
                    {admin.email}
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <ShoppingBag className="w-4 h-4" />
                      <span>{admin.ordersProcessed || 0} orders processed</span>
                    </div>
                    {admin.lastLogin && (
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>Last login: {new Date(admin.lastLogin).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {admin.permissions.viewOrders && (
                      <span className="px-2 py-1 bg-green-900/20 text-green-400 text-xs rounded border border-green-500/30">
                        📦 View Orders
                      </span>
                    )}
                    {admin.permissions.deliverProducts && (
                      <span className="px-2 py-1 bg-green-900/20 text-green-400 text-xs rounded border border-green-500/30">
                        ✅ Deliver Products
                      </span>
                    )}
                    {admin.permissions.deleteOrders && (
                      <span className="px-2 py-1 bg-red-900/20 text-red-400 text-xs rounded border border-red-500/30">
                        🗑️ Delete Orders
                      </span>
                    )}
                    {admin.permissions.accessSettings && (
                      <span className="px-2 py-1 bg-purple-900/20 text-purple-400 text-xs rounded border border-purple-500/30">
                        ⚙️ Access Settings
                      </span>
                    )}
                    {admin.permissions.viewCustomers && (
                      <span className="px-2 py-1 bg-blue-900/20 text-blue-400 text-xs rounded border border-blue-500/30">
                        👥 View Customers
                      </span>
                    )}
                    {admin.permissions.manageAdmins && (
                      <span className="px-2 py-1 bg-yellow-900/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
                        🔐 Manage Admins
                      </span>
                    )}
                    {admin.permissions.manageProducts && (
                      <span className="px-2 py-1 bg-pink-900/20 text-pink-400 text-xs rounded border border-pink-500/30">
                        📦 Manage Products
                      </span>
                    )}
                    {admin.permissions.viewRevenue && (
                      <span className="px-2 py-1 bg-orange-900/20 text-orange-400 text-xs rounded border border-orange-500/30">
                        💰 View Revenue
                      </span>
                    )}
                  </div>
                </div>

                {admin.role !== 'owner' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleOpenEdit(admin)}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all"
                      title="Edit Admin"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleBan(admin)}
                      className={`p-2 rounded-lg transition-all ${
                        admin.status === 'banned'
                          ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                          : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                      }`}
                      title={admin.status === 'banned' ? 'Unban Admin' : 'Ban Admin'}
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setAdminToDelete(admin.uid)
                        setShowDeleteConfirm(true)
                      }}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                      title="Delete Admin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                Edit Admin: {selectedAdmin.email}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 font-medium mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'moderator' })}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-3">Permissions</label>
                <div className="space-y-2">
                  {[
                    { key: 'viewOrders', label: '📦 View Orders', desc: 'Can view all orders' },
                    { key: 'deliverProducts', label: '✅ Deliver Products', desc: 'Can mark orders as delivered' },
                    { key: 'deleteOrders', label: '🗑️ Delete Orders', desc: 'Can delete orders' },
                    { key: 'accessSettings', label: '⚙️ Access Settings', desc: 'Can modify system settings' },
                    { key: 'viewCustomers', label: '👥 View Customers', desc: 'Can view customer list' },
                    { key: 'manageAdmins', label: '🔐 Manage Admins', desc: 'Can add/edit/remove admins' },
                    { key: 'manageProducts', label: '📦 Manage Products', desc: 'Can create/edit/delete products' },
                    { key: 'viewRevenue', label: '💰 View Revenue', desc: 'Can view revenue statistics' },
                  ].map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-start gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions[perm.key as keyof AdminPermissions] || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            [perm.key]: e.target.checked
                          }
                        })}
                        className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium">{perm.label}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{perm.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
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

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-red-500/30 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Delete Admin?</h3>
            <p className="text-gray-400 mb-6">
              This will permanently remove this admin account. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setAdminToDelete(null)
                }}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
