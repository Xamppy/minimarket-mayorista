'use client';

import { useState } from 'react';
import { Tab } from '@headlessui/react';
import BarcodeGenerator from './BarcodeGenerator';
import BarcodeSearch from './BarcodeSearch';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function BarcodeGeneratorTabs() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const tabs = [
    {
      name: 'Generar Código',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      component: <BarcodeGenerator />
    },
    {
      name: 'Buscar Código',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      component: <BarcodeSearch />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header principal */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Códigos de Barras GS1 Chile</h1>
        <p className="mt-2 text-sm text-gray-600">
          Genera códigos de barras con formato estándar chileno (1 111111 111111) o busca códigos existentes.
        </p>
      </div>

      {/* Tabs */}
      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <Tab.List className="flex space-x-1 rounded-xl bg-indigo-900/20 p-1">
          {tabs.map((tab) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white text-indigo-700 shadow'
                    : 'text-indigo-100 hover:bg-white/[0.12] hover:text-white'
                )
              }
            >
              <div className="flex items-center justify-center space-x-2">
                {tab.icon}
                <span>{tab.name}</span>
              </div>
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-6">
          {tabs.map((tab, tabIndex) => (
            <Tab.Panel
              key={tabIndex}
              className={classNames(
                'rounded-xl bg-white p-3',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2'
              )}
            >
              {tab.component}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}