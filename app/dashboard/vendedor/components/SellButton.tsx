'use client';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  total_stock: number;
  image_url: string | null;
}

interface SellButtonProps {
  product: Product;
  onSell: (product: Product) => void;
}

export default function SellButton({ product, onSell }: SellButtonProps) {
  const handleClick = () => {
    if (product.total_stock > 0) {
      onSell(product);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={product.total_stock <= 0}
      className={`w-full mt-2 md:mt-3 py-3 md:py-2 px-4 md:px-3 rounded-md text-sm md:text-sm font-medium transition-colors min-h-[44px] md:min-h-[auto] ${
        product.total_stock > 0
          ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
      }`}
    >
      {product.total_stock > 0 ? 'Vender' : 'Sin Stock'}
    </button>
  );
} 