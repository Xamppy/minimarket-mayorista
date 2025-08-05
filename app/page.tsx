import LoginForm from './components/auth/LoginForm';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Container principal con diseño split screen */}
      <div className="min-h-screen flex flex-col lg:flex-row">
        
        {/* Lado Izquierdo - Branding (Azul) */}
        <div className="bg-blue-600 lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
          <div className="text-center text-white max-w-md">
            {/* Logo/Ilustración Placeholder */}
            <div className="mb-8">
              <div className="mx-auto w-32 h-32 lg:w-48 lg:h-48 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-6">
                {/* Icono de Minimarket - Carrito de Compras Estilizado */}
                <svg 
                  className="w-16 h-16 lg:w-24 lg:h-24 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H19M7 13v4a2 2 0 002 2h2m8-2a2 2 0 11-4 0 2 2 0 014 0zM9 19a2 2 0 11-4 0 2 2 0 014 0z" 
                  />
                </svg>
              </div>
              
              {/* Código de Barras Decorativo */}
              <div className="flex justify-center space-x-1 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((bar) => (
                  <div 
                    key={bar}
                    className={`bg-white bg-opacity-60 ${
                      bar % 3 === 0 ? 'w-1 h-12' : bar % 2 === 0 ? 'w-0.5 h-10' : 'w-1 h-8'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Texto de Branding */}
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">
              Distribuidora Don Ale
            </h1>
            <p className="text-xl lg:text-2xl font-light mb-2 text-blue-100">
              Sistema de venta Mayorista
            </p>
            <p className="text-blue-200 text-sm lg:text-base">
              Controla tu inventario, ventas y reportes desde una sola plataforma
            </p>

                         {/* Características destacadas */}
             <div className="mt-8 space-y-3 text-left">
               <div className="flex items-center text-blue-100">
                 <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                 </svg>
                 <span className="text-sm lg:text-base">Gestión de inventario en tiempo real</span>
               </div>
               <div className="flex items-center text-blue-100">
                 <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                 </svg>
                 <span className="text-sm lg:text-base">Escáner de códigos de barras</span>
               </div>
               <div className="flex items-center text-blue-100">
                 <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                 </svg>
                 <span className="text-sm lg:text-base">Reportes y análisis detallados</span>
               </div>
             </div>
          </div>
        </div>

        {/* Lado Derecho - Formulario de Login */}
        <div className="bg-slate-50 lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Footer minimalista */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <p className="text-xs text-gray-500 text-center">
          © 2025 Distribuidora Don Ale. Sistema de venta mayorista.
        </p>
      </div>
    </div>
  );
}
