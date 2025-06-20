'use client';

import { useState } from 'react';

interface MobileNavBarProps {
  activeTab: 'catalog' | 'scanner' | 'sales';
  onTabChange: (tab: 'catalog' | 'scanner' | 'sales') => void;
}

export default function MobileNavBar({ activeTab, onTabChange }: MobileNavBarProps) {
  const handleScannerClick = () => {
    // Activar el modo escáner inmediatamente
    if (typeof window !== 'undefined' && (window as any).focusScanner) {
      (window as any).focusScanner();
    }
    onTabChange('scanner');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden">
      <div className="grid grid-cols-3 h-16">
        {/* Catálogo */}
        <button
          onClick={() => onTabChange('catalog')}
          className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
            activeTab === 'catalog'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
            />
          </svg>
          <span className="text-xs font-medium">Catálogo</span>
        </button>

        {/* Escanear */}
        <button
          onClick={handleScannerClick}
          className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
            activeTab === 'scanner'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span className="text-xs font-medium">Escanear</span>
        </button>

        {/* Ventas */}
        <button
          onClick={() => onTabChange('sales')}
          className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
            activeTab === 'sales'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
            />
          </svg>
          <span className="text-xs font-medium">Ventas</span>
        </button>
      </div>
    </div>
  );
} 