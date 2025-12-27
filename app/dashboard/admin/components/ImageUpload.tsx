'use client';

import { useState, useRef, useCallback } from 'react';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageSelect: (file: File | null, previewUrl: string | null) => void;
  disabled?: boolean;
}

export default function ImageUpload({ 
  currentImageUrl, 
  onImageSelect, 
  disabled = false 
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);
    
    // Validar tipo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Solo se permiten imágenes PNG, JPEG y WebP');
      return false;
    }

    // Validar tamaño (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('La imagen no debe superar los 5MB');
      return false;
    }

    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (!validateFile(file)) {
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string;
      setPreview(previewUrl);
      onImageSelect(file, previewUrl);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onImageSelect(null, null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-black mb-1">
        Imagen del Producto (opcional)
      </label>

      {/* Área de drag-and-drop / Preview */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
          transition-all duration-200 min-h-[160px] flex items-center justify-center
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-50' 
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-h-32 max-w-full object-contain rounded-md mx-auto"
            />
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div className="text-gray-500">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400 mb-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <p className="text-sm font-medium">
              {isDragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PNG, JPEG o WebP, máximo 5MB
            </p>
          </div>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <p className="text-red-500 text-xs">{error}</p>
      )}
    </div>
  );
}
