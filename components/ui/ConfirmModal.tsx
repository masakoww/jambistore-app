'use client'

import { AlertCircle, HelpCircle, Info } from 'lucide-react'
import Modal from './Modal'

export type ConfirmType = 'danger' | 'warning' | 'info'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  message: string
  type?: ConfirmType
  title?: string
  confirmText?: string
  cancelText?: string
}

const styles = {
  danger: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', btn: 'bg-red-500 hover:bg-red-600' },
  warning: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', btn: 'bg-yellow-500 hover:bg-yellow-600 text-black' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', btn: 'bg-blue-500 hover:bg-blue-600' }
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  message, 
  type = 'danger',
  title = 'Confirm Action',
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}: ConfirmModalProps) {
  const style = styles[type]
  const Icon = style.icon

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${style.bg}`}>
          <Icon className={`w-6 h-6 ${style.color}`} />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-300 mb-6">{message}</p>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors font-medium"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`px-4 py-2 rounded-lg transition-colors font-medium text-white ${style.btn}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
