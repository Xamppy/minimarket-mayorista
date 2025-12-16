'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import ProductTypeForm from './ProductTypeForm';

interface ProductType {
  id: string;
  name: string;
  created_at: string;
}

interface ProductTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  productType?: ProductType; // Si se pasa, es modo edición
  title?: string;
  onSuccess?: () => void; // Callback para recargar datos después del éxito
}

export default function ProductTypeModal({ isOpen, onClose, productType, title, onSuccess }: ProductTypeModalProps) {
  const isEditMode = !!productType;
  const modalTitle = title || (isEditMode ? 'Editar Tipo de Producto' : 'Crear Nuevo Tipo de Producto');
  
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess(); // Recargar datos
    }
    onClose(); // Cerrar modal
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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

        <div className="fixed inset-0 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all relative">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-4"
                >
                  {modalTitle}
                </Dialog.Title>
                
                {/* Botón de cerrar */}
                <button
                  type="button"
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={onClose}
                >
                  <span className="sr-only">Cerrar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Descripción del modal */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    {isEditMode 
                      ? 'Modifica el nombre del tipo de producto. Los productos asociados mantendrán su vinculación.'
                      : 'Crea un nuevo tipo de producto para categorizar tus productos. Podrás asociarlo con productos inmediatamente después de crearlo.'
                    }
                  </p>
                </div>

                {/* Formulario */}
                <div className="mt-2">
                  <ProductTypeForm 
                    productType={productType}
                    onSuccess={handleSuccess}
                    onCancel={onClose}
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}