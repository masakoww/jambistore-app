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
import { db, useAuth } from '@/lib/firebase'
import { useModal } from '../../contexts/ModalContext'

interface AdminPermissions {
  viewOverview?: boolean
  viewOrders?: boolean
  deliverProducts?: boolean
  deleteOrders?: boolean
  accessSettings?: boolean
  viewCustomers?: boolean
  manageAdmins?: boolean
  manageProducts?: boolean
  manageCategories?: boolean
  viewReviews?: boolean
  viewRevenue?: boolean
}

interface AdminUser {
  uid: string
  email: string
  displayName?: string
  role: 'owner' | 'developer' | 'admin'
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
    role: 'admin'
    permissions: AdminPermissions
  }>({
    role: 'admin',
    permissions: {
      viewOverview: true,
      viewOrders: true,
      deliverProducts: true,
      deleteOrders: false,
      accessSettings: false,
      viewCustomers: true,
      manageAdmins: false,
      manageProducts: false,
      manageCategories: false,
      viewReviews: true,
      viewRevenue: false,
    }
  })

  // Owner/Developer role setter (uses server endpoint)
  const { user } = useAuth()
  const [isOwner, setIsOwner] = useState(false)
  const [isDeveloper, setIsDeveloper] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [targetUid, setTargetUid] = useState('')
  const [roleToSet, setRoleToSet] = useState<'admin' | 'developer' | 'owner'>('admin')
  const [settingRole, setSettingRole] = useState(false)
  const [roleMessage, setRoleMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [resolvedUser, setResolvedUser] = useState<{ uid: string; email?: string; displayName?: string } | null>(null)

  useEffect(() => {
    const loadRole = async () => {
      try {
        if (!user) return
        const token = await user.getIdToken()
        const res = await fetch('/api/admin/roles', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setCurrentUserRole(data.role || '')
        setIsOwner(data.ok && data.role === 'owner')
        setIsDeveloper(data.ok && data.role === 'developer')
      } catch (err) {
        console.error('Error checking role:', err)
      }
    }

    loadRole()

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
          // Owner first, then developer, then admin
          if (a.role === 'owner') return -1
          if (b.role === 'owner') return 1
          if (a.role === 'developer') return -1
          if (b.role === 'developer') return 1
          // Then by role
          const roleOrder: Record<string, number> = { admin: 1 }
          return (roleOrder[a.role] || 2) - (roleOrder[b.role] || 2)
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
    // Owner cannot be edited by anyone
    if (admin.role === 'owner') {
      showAlert('Cannot edit owner permissions', 'error')
      return
    }
    // Developer can only be edited by owner
    if (admin.role === 'developer' && !isOwner) {
      showAlert('Only owner can edit developer permissions', 'error')
      return
    }

    setSelectedAdmin(admin)
    setFormData({
      role: 'admin',
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

      // Reload admins list to get fresh data
      setLoading(true)
      try {
        const adminsSnapshot = await getDocs(collection(db, 'admins'))
        const adminsList: AdminUser[] = []
        adminsSnapshot.forEach((d) => {
          const data = d.data()
          adminsList.push({
            uid: d.id,
            email: data.email || '',
            displayName: data.displayName,
            role: data.role || 'admin',
            status: data.status || 'active',
            permissions: data.permissions || {},
            createdAt: data.createdAt,
            lastLogin: data.lastLogin,
            ordersProcessed: data.ordersProcessed
          } as AdminUser)
        })
        
        // Sort: owner first, then developer, then admin
        adminsList.sort((a, b) => {
          if (a.role === 'owner') return -1
          if (b.role === 'owner') return 1
          if (a.role === 'developer') return -1
          if (b.role === 'developer') return 1
          const roleOrder: Record<string, number> = { admin: 1 }
          return (roleOrder[a.role] || 2) - (roleOrder[b.role] || 2)
        })
        
        setAdmins(adminsList)
      } catch (e) {
        console.error('Error refreshing admins:', e)
      } finally {
        setLoading(false)
      }

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
    if (admin.role === 'developer' && !isOwner) {
      showAlert('Only owner can ban developers', 'error')
      return
    }

    try {
      const newStatus = admin.status === 'active' ? 'banned' : 'active'
      
      await updateDoc(doc(db, 'admins', admin.uid), {
        status: newStatus,
        updatedAt: new Date()
      })

      // Reload admins list to refresh stats
      setLoading(true)
      try {
        const adminsSnapshot = await getDocs(collection(db, 'admins'))
        const adminsList: AdminUser[] = []
        adminsSnapshot.forEach((d) => {
          const data = d.data()
          adminsList.push({
            uid: d.id,
            email: data.email || '',
            displayName: data.displayName,
            role: data.role || 'admin',
            status: data.status || 'active',
            permissions: data.permissions || {},
            createdAt: data.createdAt,
            lastLogin: data.lastLogin,
            ordersProcessed: data.ordersProcessed
          } as AdminUser)
        })
        
        adminsList.sort((a, b) => {
          if (a.role === 'owner') return -1
          if (b.role === 'owner') return 1
          if (a.role === 'developer') return -1
          if (b.role === 'developer') return 1
          const roleOrder: Record<string, number> = { admin: 1 }
          return (roleOrder[a.role] || 2) - (roleOrder[b.role] || 2)
        })
        
        setAdmins(adminsList)
      } catch (e) {
        console.error('Error refreshing admins:', e)
      } finally {
        setLoading(false)
      }

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

      {(isOwner || isDeveloper) && (
        <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-lg p-6 mt-4">
          <h3 className="text-lg font-bold text-white mb-2">Set Admin Role {isOwner ? '(Owner)' : '(Developer)'}</h3>
          <p className="text-gray-400 text-sm mb-4">
            Enter a registered user's UID and choose a role. 
            {isDeveloper && !isOwner && ' Note: As developer, you cannot modify owner roles.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Target UID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetUid}
                  onChange={(e) => { setTargetUid(e.target.value); setResolvedUser(null) }}
                  placeholder="User UID (e.g. XyZ123...) or leave empty to lookup"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
                <button
                  onClick={async () => {
                    if (!user) {
                      setRoleMessage({ type: 'error', text: 'Sign in to lookup' })
                      setTimeout(() => setRoleMessage(null), 3000)
                      return
                    }
                    const email = window.prompt('Lookup by email:')
                    if (!email) return
                    try {
                      const token = await user.getIdToken()
                      const res = await fetch(`/api/admin/users/lookup?email=${encodeURIComponent(email)}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      })
                      const data = await res.json()
                      if (data.ok) {
                        setTargetUid(data.uid)
                        setResolvedUser({ uid: data.uid, email: data.email, displayName: data.displayName })
                        setRoleMessage({ type: 'success', text: `Found user: ${data.displayName || data.email}` })
                      } else {
                        setRoleMessage({ type: 'error', text: data.error || 'User not found' })
                      }
                    } catch (err: any) {
                      setRoleMessage({ type: 'error', text: err.message || 'Lookup failed' })
                    } finally {
                      setTimeout(() => setRoleMessage(null), 3000)
                    }
                  }}
                  className="px-3 py-2 bg-white/6 rounded-lg text-white/80 border border-white/10 hover:bg-white/10"
                >
                  Find by email
                </button>
              </div>
              {resolvedUser && (
                <p className="text-sm text-gray-300 mt-2">Resolved: {resolvedUser.displayName || resolvedUser.email} ({resolvedUser.uid})</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
              <select
                value={roleToSet}
                onChange={(e) => setRoleToSet(e.target.value as 'admin' | 'developer' | 'owner')}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              >
                <option value="admin">Admin (customizable permissions)</option>
                <option value="developer">Developer (full access)</option>
                {isOwner && <option value="owner">Owner (transfer ownership)</option>}
              </select>
            </div>

            <div>
              <button
                onClick={async () => {
                  if (!user) {
                    setRoleMessage({ type: 'error', text: 'You must be signed in as owner' })
                    setTimeout(() => setRoleMessage(null), 4000)
                    return
                  }
                  if (!targetUid) {
                    setRoleMessage({ type: 'error', text: 'Target UID is required' })
                    setTimeout(() => setRoleMessage(null), 4000)
                    return
                  }

                  setSettingRole(true)
                  setRoleMessage(null)
                  try {
                    const token = await user.getIdToken()
                    const res = await fetch('/api/admin/roles', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ targetUid, role: roleToSet })
                    })
                    const data = await res.json()
                    if (data.ok) {
                      setRoleMessage({ type: 'success', text: data.message || 'Role updated' })
                      setTargetUid('')
                      // refresh local admins list
                      setLoading(true)
                      try {
                        const adminsSnapshot = await getDocs(collection(db, 'admins'))
                        const adminsList: AdminUser[] = []
                        adminsSnapshot.forEach((d) => adminsList.push({ uid: d.id, ...(d.data() as any) } as AdminUser))
                        setAdmins(adminsList)
                      } catch (e) {
                        console.error('Error refreshing admins:', e)
                      } finally {
                        setLoading(false)
                      }
                    } else {
                      setRoleMessage({ type: 'error', text: data.error || data.message || 'Failed to set role' })
                    }
                  } catch (err: any) {
                    setRoleMessage({ type: 'error', text: err.message || 'Request failed' })
                  } finally {
                    setSettingRole(false)
                    setTimeout(() => setRoleMessage(null), 4000)
                  }
                }}
                disabled={settingRole}
                className="w-full py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:opacity-95 transition-all disabled:opacity-50"
              >
                {settingRole ? 'Setting...' : 'Set Role'}
              </button>
            </div>
          </div>

          {roleMessage && (
            <div className={`mt-3 p-3 rounded-lg ${roleMessage.type === 'success' ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'}`}>
              {roleMessage.text}
            </div>
          )}
        </div>
      )}

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
                        : admin.role === 'developer'
                        ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
                        : 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
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
                    {/* Show "Full Access" badge for owner and developer */}
                    {(admin.role === 'owner' || admin.role === 'developer') ? (
                      <span className="px-2 py-1 bg-gradient-to-r from-purple-900/30 to-pink-900/30 text-purple-400 text-xs rounded border border-purple-500/30">
                        ⭐ Full Access
                      </span>
                    ) : (
                      <>
                        {admin.permissions.viewOverview && (
                          <span className="px-2 py-1 bg-cyan-900/20 text-cyan-400 text-xs rounded border border-cyan-500/30">
                            📊 Overview
                          </span>
                        )}
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
                        {admin.permissions.manageProducts && (
                          <span className="px-2 py-1 bg-pink-900/20 text-pink-400 text-xs rounded border border-pink-500/30">
                            📦 Products
                          </span>
                        )}
                        {admin.permissions.manageCategories && (
                          <span className="px-2 py-1 bg-indigo-900/20 text-indigo-400 text-xs rounded border border-indigo-500/30">
                            🏷️ Categories
                          </span>
                        )}
                        {admin.permissions.viewCustomers && (
                          <span className="px-2 py-1 bg-blue-900/20 text-blue-400 text-xs rounded border border-blue-500/30">
                            👥 Customers
                          </span>
                        )}
                        {admin.permissions.manageAdmins && (
                          <span className="px-2 py-1 bg-yellow-900/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
                            🔐 Admins
                          </span>
                        )}
                        {admin.permissions.viewReviews && (
                          <span className="px-2 py-1 bg-amber-900/20 text-amber-400 text-xs rounded border border-amber-500/30">
                            ⭐ Reviews
                          </span>
                        )}
                        {admin.permissions.accessSettings && (
                          <span className="px-2 py-1 bg-purple-900/20 text-purple-400 text-xs rounded border border-purple-500/30">
                            ⚙️ Settings
                          </span>
                        )}
                        {admin.permissions.viewRevenue && (
                          <span className="px-2 py-1 bg-orange-900/20 text-orange-400 text-xs rounded border border-orange-500/30">
                            💰 Revenue
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Action buttons - show based on current user's permission */}
                {admin.role !== 'owner' && (isOwner || (isDeveloper && admin.role !== 'developer')) && (
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
                <p className="text-sm text-gray-500 mb-2">Admin role with customizable permissions below</p>
                <div className="px-4 py-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-blue-400 font-medium">
                  ADMIN
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-3">Permissions</label>
                <p className="text-sm text-gray-500 mb-3">Enable/disable dashboard sections for this admin</p>
                <div className="space-y-2">
                  {[
                    { key: 'viewOverview', label: '📊 Overview Dashboard', desc: 'Can view the overview/statistics dashboard' },
                    { key: 'viewOrders', label: '📦 View Orders', desc: 'Can view the orders section' },
                    { key: 'deliverProducts', label: '✅ Deliver Products', desc: 'Can mark orders as delivered' },
                    { key: 'deleteOrders', label: '🗑️ Delete Orders', desc: 'Can delete orders' },
                    { key: 'manageProducts', label: '📦 Manage Products', desc: 'Can access products section' },
                    { key: 'manageCategories', label: '🏷️ Manage Categories', desc: 'Can access categories section' },
                    { key: 'viewCustomers', label: '👥 View Customers', desc: 'Can access customers section' },
                    { key: 'manageAdmins', label: '🔐 Manage Admins', desc: 'Can access admins section' },
                    { key: 'viewReviews', label: '⭐ View Reviews', desc: 'Can access reviews section' },
                    { key: 'accessSettings', label: '⚙️ Access Settings', desc: 'Can access settings section' },
                    { key: 'viewRevenue', label: '💰 View Revenue', desc: 'Can view revenue statistics in overview' },
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
