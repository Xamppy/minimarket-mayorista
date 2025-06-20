'use client';

interface DesktopNavTabsProps {
  activeTab: 'catalog' | 'scanner' | 'sales';
  onTabChange: (tab: 'catalog' | 'scanner' | 'sales') => void;
}

export default function DesktopNavTabs({ activeTab, onTabChange }: DesktopNavTabsProps) {
  const handleScannerClick = () => {
    // Activar el modo escáner inmediatamente
    if (typeof window !== 'undefined' && (window as any).focusScanner) {
      (window as any).focusScanner();
    }
    onTabChange('scanner');
  };

  return (
    <div className="hidden md:block bg-white rounded-lg shadow-md p-1 mb-6">
      <div className="flex space-x-1">
        {/* Catálogo */}
        <button
          onClick={() => onTabChange('catalog')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-colors ${
            activeTab === 'catalog'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
            />
          </svg>
          <span className="font-medium">Catálogo de Productos</span>
        </button>

        {/* Escanear */}
        <button
          onClick={handleScannerClick}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-colors ${
            activeTab === 'scanner'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span className="font-medium">Escáner de Códigos</span>
        </button>

        {/* Ventas */}
        <button
          onClick={() => onTabChange('sales')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-colors ${
            activeTab === 'sales'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
            />
          </svg>
          <span className="font-medium">Ventas de Hoy</span>
        </button>
      </div>
    </div>
  );
} 