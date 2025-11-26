'use client'

import { useState, useEffect } from 'react'
import { Folder, Plus, Edit, Trash2, Save, X, AlertCircle } from 'lucide-react'
import { useModal } from '@/contexts/ModalContext'

interface Category {
  id?: string
  name: string
  slug: string
  description?: string
  icon?: string
  order?: number
  createdAt?: Date
  updatedAt?: Date
}

export default function CategoriesTab() {
  const { showAlert } = useModal()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
  })

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()
        
        if (data.ok) {
          setCategories(data.categories || [])
        } else {
          console.error('Failed to load categories:', data.message)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCategories()
  }, [])

  const handleOpenCreate = () => {
    setModalMode('create')
    setSelectedCategory(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: '',
    })
    setShowModal(true)
  }

  const handleOpenEdit = (category: Category) => {
    setModalMode('edit')
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      showAlert('Name and Slug are required', 'error')
      return
    }

    try {
      if (modalMode === 'create') {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
            description: formData.description,
          }),
        })

        const data = await response.json()
        if (data.ok) {
          showAlert('Category created successfully', 'success')
          // Reload categories
          const categoriesResponse = await fetch('/api/categories')
          const categoriesData = await categoriesResponse.json()
          if (categoriesData.ok) {
            setCategories(categoriesData.categories || [])
          }
        } else {
          showAlert(data.message, 'error')
          return
        }
      } else if (selectedCategory?.id) {
        const response = await fetch(`/api/categories/${selectedCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
            description: formData.description,
          }),
        })

        const data = await response.json()
        if (data.ok) {
          showAlert('Category updated successfully', 'success')
          // Reload categories
          const categoriesResponse = await fetch('/api/categories')
          const categoriesData = await categoriesResponse.json()
          if (categoriesData.ok) {
            setCategories(categoriesData.categories || [])
          }
        } else {
          showAlert(data.message, 'error')
          return
        }
      }

      setShowModal(false)
    } catch (error) {
      console.error('Error saving category:', error)
      showAlert('Failed to save category', 'error')
    }
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return

    try {
      const response = await fetch(`/api/categories/${categoryToDelete}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.ok) {
        showAlert('Category deleted successfully', 'success')
        // Reload categories
        const categoriesResponse = await fetch('/api/categories')
        const categoriesData = await categoriesResponse.json()
        if (categoriesData.ok) {
          setCategories(categoriesData.categories || [])
        }
      } else {
        showAlert(data.message, 'error')
      }

      setShowDeleteConfirm(false)
      setCategoryToDelete(null)
    } catch (error) {
      console.error('Error deleting category:', error)
      showAlert('Failed to delete category', 'error')
    }
  }

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData({ 
      ...formData, 
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Folder className="w-7 h-7 text-purple-400" />
            Categories Management
          </h2>
          <p className="text-gray-400 mt-1">Organize your products into categories</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      {/* Categories List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="text-gray-400 mt-4">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
          <Folder className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No categories yet</p>
          <p className="text-gray-500 text-sm mt-2">Click "Add Category" to create your first category</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Slug</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Description</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Icon</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{category.name}</td>
                  <td className="px-6 py-4 text-gray-400 font-mono text-sm">{category.slug}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{category.description || '-'}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{category.icon || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleOpenEdit(category)}
                        className="p-2 hover:bg-purple-500/10 rounded-lg transition-colors"
                        title="Edit Category"
                      >
                        <Edit className="w-4 h-4 text-purple-400" />
                      </button>
                      <button
                        onClick={() => {
                          setCategoryToDelete(category.id!)
                          setShowDeleteConfirm(true)
                        }}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Category"
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
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl w-full max-w-2xl">
            <div className="border-b border-white/10 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">
                {modalMode === 'create' ? 'Create Category' : 'Edit Category'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Game Cheats, VPN Services, Accounts"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">Slug * (URL-friendly)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                  placeholder="e.g., game-cheats, vpn-services"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-generated from name, but you can customize it</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this category..."
                  rows={3}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">Icon (Emoji or Text)</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g., 🎮, 🔒, 📱"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-lg transition-all"
                >
                  <Save className="w-5 h-5" />
                  Save Category
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
                >
                  Cancel
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
              <h3 className="text-xl font-bold text-white">Delete Category</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this category? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg font-medium transition-all"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setCategoryToDelete(null)
                }}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg font-medium hover:bg-white/10 transition-all"
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
