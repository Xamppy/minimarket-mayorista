'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface GeneratedBarcode {
  id: number;
  barcode: string;
  product_name: string;
  created_at: string;
}

export default function BarcodeGenerator() {
  const [productName, setProductName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBarcode, setGeneratedBarcode] = useState<GeneratedBarcode | null>(null);

  const handleGenerate = async () => {
    if (!productName.trim()) {
      toast.error('El nombre del producto es requerido');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/barcodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: productName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al generar código de barras');
      }

      const data = await response.json();
      setGeneratedBarcode(data.barcode);
      toast.success('Código de barras generado exitosamente');
      
      // Limpiar formulario
      setProductName('');
    } catch (error) {
      console.error('Error generating barcode:', error);
      toast.error(error instanceof Error ? error.message : 'Error al generar código de barras');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!generatedBarcode) return;
    
    // Crear ventana de impresión con el código de barras
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
                  font-size: 120px;
                  margin: 5px 0;
                  line-height: 1.1;
                }
            </style>
          </head>
          <body>
            <div class="barcode-container">
              <div class="barcode-visual">${generatedBarcode.barcode}</div>
              <div class="barcode-number">${generatedBarcode.barcode}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulario de generación */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4" style={{color: '#000000'}}>Generar Nuevo Código</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="productName" className="block text-sm font-medium mb-1" style={{color: '#000000'}}>
              Nombre del Producto *
            </label>
            <input
              type="text"
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              style={{color: '#000000'}}
              placeholder="Ej: Coca Cola 350ml"
              maxLength={100}
            />
          </div>



          <button
            onClick={handleGenerate}
            disabled={isGenerating || !productName.trim()}
            className="w-full text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{backgroundColor: '#4F46E5'}}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generando...
              </div>
            ) : (
              'Generar Código de Barras'
            )}
          </button>
        </div>
      </div>

      {/* Código generado */}
      {generatedBarcode && (
        <div className="bg-white border-2 rounded-lg p-6" style={{borderColor: '#4F46E5'}}>
          <h3 className="text-lg font-medium mb-4" style={{color: '#000000'}}>Código Generado</h3>
          
          <div className="text-center space-y-4">
            {/* Representación visual del código de barras */}
            <div className="bg-white border-2 border-black p-6 rounded-lg inline-block">
              <div className="mb-1" style={{fontFamily: 'var(--font-libre-barcode-39)', color: '#000000', fontSize: '120px', lineHeight: '1.1'}}>
                {generatedBarcode.barcode}
              </div>
              <div className="text-xl font-mono font-bold tracking-widest" style={{color: '#000000'}}>
                {generatedBarcode.barcode}
              </div>
            </div>
            
            <div className="flex space-x-3 justify-center">
              <button
                onClick={handlePrint}
                className="text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors flex items-center"
                style={{backgroundColor: '#4F46E5'}}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir
              </button>
              
              <button
                onClick={() => setGeneratedBarcode(null)}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Generar Otro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}