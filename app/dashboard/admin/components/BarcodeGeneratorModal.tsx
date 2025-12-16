'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import BarcodeGeneratorTabs from './BarcodeGeneratorTabs';

interface BarcodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BarcodeGeneratorModal({ isOpen, onClose }: BarcodeGeneratorModalProps) {
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
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all relative">
                {/* Header del modal */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Generador de Códigos de Barras
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={onClose}
                  >
                    <span className="sr-only">Cerrar</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Contenido del modal */}
                <div className="p-6">
                  <BarcodeGeneratorTabs />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}