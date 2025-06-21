'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import ProductForm from './ProductForm';

interface Brand {
  id: string;
  name: string;
}

interface ProductType {
  id: string;
  name: string;
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: Brand[];
  types: ProductType[];
}

export default function AddProductModal({ isOpen, onClose, brands, types }: AddProductModalProps) {
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

        <div className="fixed inset-0 overflow-y-auto">
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
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-4"
                >
                  Registrar Producto en Catálogo General
                </Dialog.Title>
                
                {/* Botón de cerrar */}
                <button
                  type="button"
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  onClick={onClose}
                >
                  <span className="sr-only">Cerrar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Formulario */}
                <div className="mt-2">
                  <ProductForm 
                    brands={brands} 
                    productTypes={types}
                    onSuccess={onClose}
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