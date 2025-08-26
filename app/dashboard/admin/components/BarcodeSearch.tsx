'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Barcode {
  id: number;
  barcode: string;
  product_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

interface SearchResponse {
  barcodes: Barcode[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function BarcodeSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedBarcode, setSelectedBarcode] = useState<Barcode | null>(null);

  const searchBarcodes = async (page = 1, search = searchTerm) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search })
      });

      const response = await fetch(`/api/barcodes/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al buscar códigos de barras');
      }

      const data: SearchResponse = await response.json();
      setBarcodes(data.barcodes);
      setCurrentPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error) {
      console.error('Error searching barcodes:', error);
      toast.error('Error al buscar códigos de barras');
      setBarcodes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    searchBarcodes(1, searchTerm);
  };

  const handlePageChange = (page: number) => {
    searchBarcodes(page, searchTerm);
  };

  const handlePrintBarcode = (barcode: Barcode) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
            <style>
              @media print {
                body { margin: 0; }
                .barcode-container { page-break-inside: avoid; }
              }
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px;
                margin: 0;
              }
              .barcode-container {
                border: 2px solid #000;
                padding: 20px;
                margin: 20px auto;
                width: fit-content;
                background: white;
              }
              .barcode-number {
                font-family: 'Courier New', monospace;
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 2px;
                margin: 10px 0;
              }
              .barcode-visual {
                  font-family: 'Libre Barcode 39', monospace;
                  font-size: 100px;
                  margin: 5px 0;
                  line-height: 1.1;
                }
            </style>
          </head>
          <body>
            <div class="barcode-container">
              <div class="barcode-visual">${barcode.barcode}</div>
              <div class="barcode-number">${barcode.barcode}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Cargar códigos iniciales
  useEffect(() => {
    searchBarcodes(1, '');
  }, []);

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Buscar Códigos de Barras</h3>
        
        <div className="flex space-x-3">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="Buscar por nombre, descripción o código de barras..."
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Buscar
          </button>
        </div>
        
        {total > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            {total} código{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Resultados */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : barcodes.length > 0 ? (
        <div className="space-y-4">
          {barcodes.map((barcode) => (
            <div key={barcode.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{barcode.product_name}</h4>
                  {barcode.description && (
                    <p className="text-sm text-gray-600 mt-1">{barcode.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {barcode.barcode}
                    </span>
                    <span className="text-xs text-gray-500">
                      Creado: {new Date(barcode.created_at).toLocaleDateString('es-CL')}
                    </span>
                    {!barcode.is_active && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setSelectedBarcode(barcode)}
                    className="bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => handlePrintBarcode(barcode)}
                    className="bg-green-600 text-white py-1 px-3 rounded text-sm hover:bg-green-700 transition-colors flex items-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimir
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 border rounded-md ${
                    page === currentPage
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No se encontraron códigos de barras</p>
          <p className="text-sm mt-1">Intenta con otros términos de búsqueda</p>
        </div>
      )}

      {/* Modal de detalle */}
      {selectedBarcode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Detalle del Código</h3>
              <button
                onClick={() => setSelectedBarcode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Producto</label>
                <p className="mt-1 text-sm text-gray-900">{selectedBarcode.product_name}</p>
              </div>
              
              {selectedBarcode.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedBarcode.description}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Código de Barras</label>
                <div className="mt-1 text-center bg-white border-2 border-black p-4 rounded inline-block mx-auto">
                  <div className="mb-1" style={{fontFamily: 'var(--font-libre-barcode-39)', color: '#000000', fontSize: '100px', lineHeight: '1.1'}}>
                    {selectedBarcode.barcode}
                  </div>
                  <div className="text-lg font-mono font-bold">{selectedBarcode.barcode}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block font-medium text-gray-700">Creado</label>
                  <p className="text-gray-900">{new Date(selectedBarcode.created_at).toLocaleDateString('es-CL')}</p>
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Estado</label>
                  <p className={selectedBarcode.is_active ? 'text-green-600' : 'text-red-600'}>
                    {selectedBarcode.is_active ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => handlePrintBarcode(selectedBarcode)}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir
                </button>
                <button
                  onClick={() => setSelectedBarcode(null)}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}