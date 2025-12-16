'use client';

import { useState, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { X, Upload, FileDown, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function ProductImportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null); // Resetear resultados al cambiar archivo
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error en la importación');
      }

      setResult(data);
      
      if (data.details?.created > 0) {
        // Refrescar datos de fondo si hubo cambios
        router.refresh();
      }

    } catch (error: any) {
      setResult({
        error: true,
        message: error.message || 'Error desconocido'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && handleClose()}>
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all relative">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Importación Masiva de Productos
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                  
                  {/* Paso 1: Descargar Plantilla */}
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <h4 className="text-sm font-medium text-blue-800 flex items-center mb-2">
                      <FileDown className="w-4 h-4 mr-2" />
                      Paso 1: Plantilla
                    </h4>
                    <p className="text-sm text-blue-600 mb-3">
                      Descarga el archivo CSV base para llenar tus productos correctamente.
                    </p>
                    <a 
                      href="/TEMPLATE_PRODUCTOS.csv" 
                      download
                      className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md inline-flex items-center transition-colors"
                    >
                      Descargar Plantilla CSV
                    </a>
                  </div>

                  {/* Paso 2: Subir Archivo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paso 2: Subir archivo completado
                    </label>
                    
                    {!result && (
                      <div 
                        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                          file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-indigo-400'
                        }`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            setFile(e.dataTransfer.files[0]);
                          }
                        }}
                      >
                        <div className="space-y-1 text-center">
                          {file ? (
                            <div className="text-green-600">
                              <CheckCircle className="mx-auto h-12 w-12" />
                              <p className="mt-2 text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                              >
                                Cambiar archivo
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="flex text-sm text-gray-600 justify-center">
                                <label
                                  htmlFor="file-upload"
                                  className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                                >
                                  <span>Selecciona un archivo</span>
                                  <input 
                                    id="file-upload" 
                                    name="file-upload" 
                                    type="file" 
                                    className="sr-only" 
                                    accept=".csv"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                  />
                                </label>
                                <p className="pl-1">o arrástralo aquí</p>
                              </div>
                              <p className="text-xs text-gray-500">
                                Solo archivos .csv
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resultados */}
                  {result && (
                    <div className={`rounded-md p-4 ${result.error ? 'bg-red-50' : 'bg-green-50'}`}>
                      <div className="flex">
                        <div className="flex-shrink-0">
                          {result.error ? (
                            <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
                          )}
                        </div>
                        <div className="ml-3 w-full">
                          <h3 className={`text-sm font-medium ${result.error ? 'text-red-800' : 'text-green-800'}`}>
                            {result.error ? 'Error en la importación' : 'Proceso Finalizado'}
                          </h3>
                          <div className={`mt-2 text-sm ${result.error ? 'text-red-700' : 'text-green-700'}`}>
                            {result.message}
                            
                            {/* Detalles de éxito */}
                            {result.details && !result.error && (
                              <div className="mt-2">
                                 <p><strong>Total procesados:</strong> {result.details.total}</p>
                                 <p><strong>Creados exitosamente:</strong> {result.details.created}</p>
                                 
                                 {result.details.errors && result.details.errors.length > 0 && (
                                   <div className="mt-3">
                                     <p className="font-semibold text-amber-700 mb-1">Errores parciales:</p>
                                     <ul className="list-disc pl-5 max-h-32 overflow-y-auto text-xs bg-white/50 rounded p-2">
                                       {result.details.errors.map((err: string, i: number) => (
                                         <li key={i}>{err}</li>
                                       ))}
                                     </ul>
                                   </div>
                                 )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Footer */}
                <div className="mt-6 sm:flex sm:flex-row-reverse">
                  {!result?.error && result?.details?.created > 0 ? (
                     <button
                       type="button"
                       onClick={handleClose}
                       className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                     >
                       Cerrar y Actualizar
                     </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={!file || loading}
                        onClick={handleSubmit}
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none sm:ml-3 sm:w-auto sm:text-sm ${
                          !file || loading 
                            ? 'bg-indigo-400 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          'Procesar Importación'
                        )}
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={handleClose}
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
