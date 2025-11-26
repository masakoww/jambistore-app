'use client'

import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'
import Modal from './Modal'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  message: string
  type?: AlertType
  title?: string
}

const icons = {
  success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }
}

export default function AlertModal({ 
  isOpen, 
  onClose, 
  message, 
  type = 'info',
  title 
}: AlertModalProps) {
  const style = icons[type]
  const Icon = style.icon

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <div className="text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${style.bg} ${style.border} border`}>
          <Icon className={`w-8 h-8 ${style.color}`} />
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">
          {title || type.charAt(0).toUpperCase() + type.slice(1)}
        </h3>
        
        <p className="text-gray-300 mb-6 leading-relaxed">
          {message}
        </p>
        
        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
        >
          OK
        </button>
      </div>
    </Modal>
  )
}
