'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type AlertType = 'success' | 'error' | 'info' | 'warning';

interface ModalContextType {
  showAlert: (message: string, type?: AlertType) => void;
  hideAlert: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<{ message: string; type: AlertType; visible: boolean }>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showAlert = useCallback((message: string, type: AlertType = 'info') => {
    setAlert({ message, type, visible: true });
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      setAlert(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <ModalContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      
      {/* Toast Alert Component */}
      <div 
        className={`fixed top-4 right-4 z-[9999] transition-all duration-300 transform ${
          alert.visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-md ${
          alert.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
          alert.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
          'bg-blue-500/10 border-blue-500/20 text-blue-400'
        }`}>
          {alert.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {alert.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {alert.type === 'warning' && <AlertCircle className="w-5 h-5" />}
          {alert.type === 'info' && <Info className="w-5 h-5" />}
          
          <p className="font-medium text-sm">{alert.message}</p>
          
          <button 
            onClick={hideAlert}
            className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
