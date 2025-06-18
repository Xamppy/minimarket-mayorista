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
      className={`w-full mt-3 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
        product.total_stock > 0
          ? 'bg-green-600 hover:bg-green-700 text-white'
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
      }`}
    >
      {product.total_stock > 0 ? 'Vender' : 'Sin Stock'}
    </button>
  );
} 