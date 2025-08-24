'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authenticatedFetch } from '../../utils/auth/server';

// Función de validación mejorada para precios mayoristas
function validateWholesalePrice(
  wholesalePrice: string | null, 
  unitPrice: string, 
  purchasePrice: string
): number | null {
  if (!wholesalePrice || wholesalePrice.trim() === '') {
    return null; // Precio mayorista es opcional
  }

  const wholesalePriceNum = parseFloat(wholesalePrice);
  const unitPriceNum = parseFloat(unitPrice);
  const purchasePriceNum = parseFloat(purchasePrice);
  
  // Validaciones básicas
  if (isNaN(wholesalePriceNum) || wholesalePriceNum <= 0) {
    throw new Error('El precio mayorista debe ser un número mayor a 0');
  }
  if (wholesalePriceNum > 999999.99) {
    throw new Error('El precio mayorista no puede exceder $999,999.99');
  }
  
  // Validaciones de lógica de negocio
  if (wholesalePriceNum >= unitPriceNum) {
    throw new Error('El precio mayorista debe ser menor al precio unitario para ofrecer un descuento');
  }
  
  // Validar que el precio mayorista no sea menor al precio de compra
  if (wholesalePriceNum <= purchasePriceNum) {
    throw new Error('El precio mayorista debe ser mayor al precio de compra para mantener rentabilidad');
  }
  
  // Validar margen mínimo (ejemplo: 5% sobre precio de compra)
  const minimumWholesalePrice = purchasePriceNum * 1.05;
  if (wholesalePriceNum < minimumWholesalePrice) {
    throw new Error(`El precio mayorista debe ser al menos $${minimumWholesalePrice.toFixed(2)} para mantener un margen mínimo del 5%`);
  }
  
  return Math.round(wholesalePriceNum * 100) / 100; // Round to 2 decimal places
}

export async function addStockEntry(formData: FormData) {
  // Obtener datos del formulario
  const productId = formData.get('productId') as string;
  const quantity = formData.get('quantity') as string;
  const barcode = formData.get('barcode') as string;
  const purchasePrice = formData.get('purchasePrice') as string;
  const unitPrice = formData.get('unitPrice') as string;

  const wholesalePrice = formData.get('wholesalePrice') as string;
  const expirationDate = formData.get('expirationDate') as string;

  // Validar campos requeridos
  if (!productId) {
    throw new Error('El ID del producto es requerido');
  }

  if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
    throw new Error('La cantidad debe ser un número mayor a 0');
  }

  if (!barcode?.trim()) {
    throw new Error('El código de barras es requerido');
  }

  if (!purchasePrice || isNaN(parseFloat(purchasePrice)) || parseFloat(purchasePrice) <= 0) {
    throw new Error('El precio de compra debe ser un número mayor a 0');
  }

  if (!unitPrice || isNaN(parseFloat(unitPrice)) || parseFloat(unitPrice) <= 0) {
    throw new Error('El precio de venta unitario debe ser un número mayor a 0');
  }



  // Validar precio mayorista usando la función mejorada
  const parsedWholesalePrice = validateWholesalePrice(wholesalePrice, unitPrice, purchasePrice);

  try {
    // Insertar entrada de stock usando la API de PostgreSQL
    const response = await authenticatedFetch('/api/stock-entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        initial_quantity: parseInt(quantity),
        barcode: barcode.trim(),
        purchase_price: parseFloat(purchasePrice),
        sale_price_unit: parseFloat(unitPrice),

        sale_price_wholesale: parsedWholesalePrice,
        expiration_date: expirationDate?.trim() || null
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = 'Error desconocido';
      
      if (errorData.error) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (typeof errorData.error === 'object' && errorData.error.message) {
          errorMessage = errorData.error.message;
        } else if (typeof errorData.error === 'object') {
          errorMessage = JSON.stringify(errorData.error);
        } else {
          errorMessage = String(errorData.error);
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
      
      throw new Error(`Error al registrar el stock: ${errorMessage}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en addStockEntry:', error);
    throw error;
  }
}

export async function updateStockEntry(formData: FormData) {
  // Obtener datos del formulario
  const stockEntryId = formData.get('stockEntryId') as string;
  const quantity = formData.get('quantity') as string;
  const barcode = formData.get('barcode') as string;
  const purchasePrice = formData.get('purchasePrice') as string;
  const unitPrice = formData.get('unitPrice') as string;

  const wholesalePrice = formData.get('wholesalePrice') as string;
  const expirationDate = formData.get('expirationDate') as string;

  // Validar campos requeridos
  if (!stockEntryId) {
    throw new Error('El ID del lote de stock es requerido');
  }

  if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) < 0) {
    throw new Error('La cantidad debe ser un número mayor o igual a 0');
  }

  if (!barcode?.trim()) {
    throw new Error('El código de barras es requerido');
  }

  if (!purchasePrice || isNaN(parseFloat(purchasePrice)) || parseFloat(purchasePrice) <= 0) {
    throw new Error('El precio de compra debe ser un número mayor a 0');
  }

  if (!unitPrice || isNaN(parseFloat(unitPrice)) || parseFloat(unitPrice) <= 0) {
    throw new Error('El precio de venta unitario debe ser un número mayor a 0');
  }



  // Validar precio mayorista usando la función mejorada
  const parsedWholesalePrice = validateWholesalePrice(wholesalePrice, unitPrice, purchasePrice);

  try {
    // Actualizar entrada de stock usando la API de PostgreSQL
    const response = await authenticatedFetch(`/api/stock-entries/${stockEntryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        remaining_quantity: parseInt(quantity),
        barcode: barcode.trim(),
        purchase_price: parseFloat(purchasePrice),
        sale_price_unit: parseFloat(unitPrice),

        sale_price_wholesale: parsedWholesalePrice,
        expiration_date: expirationDate?.trim() || null
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al actualizar el lote de stock: ${errorData.error || 'Error desconocido'}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en updateStockEntry:', error);
    throw error;
  }
}

export async function deleteStockEntry(stockEntryId: string) {
  if (!stockEntryId) {
    throw new Error('El ID del lote de stock es requerido');
  }

  try {
    // Eliminar el lote de stock usando la API de PostgreSQL
    const response = await authenticatedFetch(`/api/stock-entries/${stockEntryId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al eliminar el lote de stock: ${errorData.error || 'Error desconocido'}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en deleteStockEntry:', error);
    throw error;
  }
}

export async function addProduct(formData: FormData) {

  // Obtener datos del formulario
  const productId = formData.get('productId') as string;
  const name = formData.get('name') as string;
  const brandId = formData.get('brandId') as string;
  const typeId = formData.get('typeId') as string;
  const imageUrl = formData.get('imageUrl') as string;

  // Validar campos requeridos
  if (!name?.trim()) {
    throw new Error('El nombre del producto es requerido');
  }

  if (!brandId) {
    throw new Error('La marca es requerida');
  }

  if (!typeId) {
    throw new Error('El tipo de producto es requerido');
  }

  try {
    if (productId) {
      // Actualizar producto existente
      const response = await authenticatedFetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          brand_name: brandId, // Enviamos el nombre de la marca directamente
          product_type_id: typeId,
          image_url: imageUrl?.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al actualizar el producto: ${errorData.error || 'Error desconocido'}`);
      }
    } else {
      // Insertar producto nuevo
      const response = await authenticatedFetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          brand_name: brandId, // Enviamos el nombre de la marca directamente
          product_type_id: typeId,
          image_url: imageUrl?.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al registrar el producto en el catálogo: ${errorData.error || 'Error desconocido'}`);
      }
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en addProduct:', error);
    throw error;
  }
}

export async function deleteProduct(productId: string) {
  if (!productId) {
    throw new Error('El ID del producto es requerido');
  }

  try {
    // Eliminar producto (las stock_entries se eliminan en cascada)
    const response = await authenticatedFetch(`/api/products/${productId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al eliminar el producto: ${errorData.error || 'Error desconocido'}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en deleteProduct:', error);
    throw error;
  }
}

export async function getStockEntries(productId: string) {
  try {
    const response = await authenticatedFetch(`/api/stock-entries?productId=${productId}`);
    
    if (!response.ok) {
      console.error('Error getting stock entries:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error getting stock entries:', error);
    return [];
  }
}

export async function getLowStockAlerts(threshold: number = 10) {
  try {
    const response = await authenticatedFetch(`/api/stock-entries?low_stock=${threshold}`, {
      method: 'GET',
    });

    if (!response.ok) {
      let errorMessage = 'Error al obtener alertas de bajo stock';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.low_stock_products || [];
  } catch (error: any) {
    console.error('Error en getLowStockAlerts:', error);
    return [];
  }
}

export async function getExpirationAlerts(daysAhead: number = 30) {
  try {
    const response = await authenticatedFetch(`/api/stock-entries?expiration_days=${daysAhead}`, {
      method: 'GET',
    });

    if (!response.ok) {
      let errorMessage = 'Error al obtener alertas de expiración';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.expiring_products || [];
  } catch (error: any) {
    console.error('Error en getExpirationAlerts:', error);
    return [];
  }
}

// FUNCIONES PARA REPORTES
export async function getSalesReport(period: 'day' | 'week' | 'month') {
  try {
    const response = await authenticatedFetch(`/api/rpc/get_sales_report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ period })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener reporte de ventas: ${errorData.error || 'Error desconocido'}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en getSalesReport:', error);
    throw error;
  }
}

export async function getTopSellingProducts(limit: number = 5) {
  try {
    const response = await authenticatedFetch('/api/rpc/get_top_selling_products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener productos más vendidos');
    }

    const { data: saleItems } = await response.json();

    // Agrupar por producto y sumar cantidades con información de wholesale pricing
    const productSales = new Map();

    saleItems?.forEach((item: any) => {
      const stockEntry = item.stock_entries as any;
      const product = stockEntry?.products as any;
      if (product) {
        const productId = product.id;
        const existing = productSales.get(productId);

        // Determinar si esta venta usó wholesale pricing
        const isWholesale = item.quantity_sold >= 3 &&
                           stockEntry?.sale_price_wholesale &&
                           item.price_at_sale === stockEntry.sale_price_wholesale;

        if (existing) {
          existing.totalSold += item.quantity_sold;
          existing.totalRevenue += item.price_at_sale * item.quantity_sold;
          if (isWholesale) {
            existing.wholesaleSales += item.quantity_sold;
            existing.wholesaleRevenue += item.price_at_sale * item.quantity_sold;
          } else {
            existing.regularSales += item.quantity_sold;
            existing.regularRevenue += item.price_at_sale * item.quantity_sold;
          }
        } else {
          productSales.set(productId, {
            id: productId,
            name: product.name,
            brand_name: product.brands?.name || 'Sin marca',
            type_name: product.product_types?.name || 'Sin tipo',
            totalSold: item.quantity_sold,
            totalRevenue: item.price_at_sale * item.quantity_sold,
            wholesaleSales: isWholesale ? item.quantity_sold : 0,
            wholesaleRevenue: isWholesale ? item.price_at_sale * item.quantity_sold : 0,
            regularSales: isWholesale ? 0 : item.quantity_sold,
            regularRevenue: isWholesale ? 0 : item.price_at_sale * item.quantity_sold,
            hasWholesalePrice: !!stockEntry?.sale_price_wholesale,
            unitPrice: stockEntry?.sale_price_unit || 0,
            wholesalePrice: stockEntry?.sale_price_wholesale || null
          });
        }
      }
    });

    // Convertir a array, calcular porcentajes y ordenar
    const sortedProducts = Array.from(productSales.values())
      .map((product: any) => ({
        ...product,
        wholesalePercentage: product.totalSold > 0 ? (product.wholesaleSales / product.totalSold) * 100 : 0,
        avgSalePrice: product.totalSold > 0 ? product.totalRevenue / product.totalSold : 0
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, limit);

    return sortedProducts;
  } catch (error: any) {
    console.error('Error al obtener productos más vendidos:', error);
    throw new Error(`Error al obtener productos más vendidos: ${error.message}`);
  }
}

export async function getRecentSales(limit: number = 10) {
  try {
    const response = await authenticatedFetch('/api/rpc/get_recent_sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener ventas recientes');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error al obtener ventas recientes:', error);
    throw new Error(`Error al obtener ventas recientes: ${error.message}`);
  }
}

export async function searchSalesByDate(startDate: string, endDate: string, limit: number = 50) {
  try {
    const response = await authenticatedFetch('/api/rpc/search_sales_by_date', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ startDate, endDate, limit }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al buscar ventas por fecha');
    }

    const data = await response.json();
    
    // La API devuelve { result: [...] }, necesitamos acceder a result
    const salesData = data.result || data;
    
    // Asegurar que siempre retornemos un array
    return Array.isArray(salesData) ? salesData : [];
  } catch (error: any) {
    console.error('Error al buscar ventas por fecha:', error);
    // Retornar array vacío en caso de error
    return [];
  }
}

export async function getDailySalesStats() {
  try {
    const response = await authenticatedFetch('/api/rpc/get_daily_sales_stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener estadísticas diarias de ventas: ${errorData.error || 'Error desconocido'}`);
    }

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Error en getDailySalesStats:', error);
    throw error;
  }
}

// ============================================================================
// BRAND MANAGEMENT ACTIONS WITH MCP INTEGRATION
// ============================================================================

export async function createBrand(formData: FormData) {

  // Obtener datos del formulario
  const name = formData.get('name') as string;

  // Validar campos requeridos
  if (!name?.trim()) {
    throw new Error('El nombre de la marca es requerido');
  }

  if (name.trim().length < 1 || name.trim().length > 100) {
    throw new Error('El nombre de la marca debe tener entre 1 y 100 caracteres');
  }

  try {
    // Crear nueva marca usando API
    const response = await authenticatedFetch('/api/brands', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al crear la marca: ${errorData.error || 'Error desconocido'}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en createBrand:', error);
    throw error;
  }
}

export async function updateBrand(formData: FormData) {
  // Obtener datos del formulario
  const brandId = formData.get('brandId') as string;
  const name = formData.get('name') as string;

  // Validar campos requeridos
  if (!brandId) {
    throw new Error('El ID de la marca es requerido');
  }

  if (!name?.trim()) {
    throw new Error('El nombre de la marca es requerido');
  }

  if (name.trim().length < 1 || name.trim().length > 100) {
    throw new Error('El nombre de la marca debe tener entre 1 y 100 caracteres');
  }

  try {
    // Actualizar marca usando API
    const response = await authenticatedFetch(`/api/brands/${brandId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al actualizar la marca: ${errorData.error || 'Error desconocido'}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en updateBrand:', error);
    throw error;
  }
}

export async function deleteBrand(brandId: string) {
  if (!brandId) {
    throw new Error('El ID de la marca es requerido');
  }

  try {
    // Eliminar marca usando API
    const response = await authenticatedFetch(`/api/brands/${brandId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al eliminar la marca: ${errorData.error || 'Error desconocido'}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en deleteBrand:', error);
    throw error;
  }
}

export async function getBrandsWithUsage() {
  try {
    // Obtener marcas con conteo de productos usando API
    const response = await authenticatedFetch('/api/brands', {
      method: 'GET'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener marcas: ${errorData.error || 'Error desconocido'}`);
    }

    const brands = await response.json();
    return brands;
  } catch (error) {
    console.error('Error en getBrandsWithUsage:', error);
    throw error;
  }
}

// ============================================================================
// PRODUCT TYPE MANAGEMENT ACTIONS WITH MCP INTEGRATION
// ============================================================================

export async function createProductType(formData: FormData) {
  // Obtener datos del formulario
  const name = formData.get('name') as string;

  // Validar campos requeridos
  if (!name?.trim()) {
    throw new Error('El nombre del tipo de producto es requerido');
  }

  if (name.trim().length < 1 || name.trim().length > 100) {
    throw new Error('El nombre del tipo de producto debe tener entre 1 y 100 caracteres');
  }

  try {
    // Crear nuevo tipo de producto usando API
    const response = await authenticatedFetch('/api/product-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al crear el tipo de producto: ${errorData.error || 'Error desconocido'}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en createProductType:', error);
    throw error;
  }
}

export async function updateProductType(formData: FormData) {
  // Obtener datos del formulario
  const typeId = formData.get('typeId') as string;
  const name = formData.get('name') as string;

  // Validar campos requeridos
  if (!typeId) {
    throw new Error('El ID del tipo de producto es requerido');
  }

  if (!name?.trim()) {
    throw new Error('El nombre del tipo de producto es requerido');
  }

  if (name.trim().length < 1 || name.trim().length > 100) {
    throw new Error('El nombre del tipo de producto debe tener entre 1 y 100 caracteres');
  }

  try {
    // Actualizar tipo de producto usando API
    const response = await authenticatedFetch(`/api/product-types/${typeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al actualizar el tipo de producto: ${errorData.error || 'Error desconocido'}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en updateProductType:', error);
    throw error;
  }
}

export async function deleteProductType(typeId: string) {
  if (!typeId) {
    throw new Error('El ID del tipo de producto es requerido');
  }

  try {
    // Eliminar tipo de producto usando API
    const response = await authenticatedFetch(`/api/product-types/${typeId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al eliminar el tipo de producto: ${errorData.error || 'Error desconocido'}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en deleteProductType:', error);
    throw error;
  }
}

export async function getProductTypesWithUsage() {
  try {
    // Obtener tipos de producto con conteo usando API
    const response = await authenticatedFetch('/api/product-types');

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener tipos de producto: ${errorData.error || 'Error desconocido'}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en getProductTypesWithUsage:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR PRODUCT FORMS
// ============================================================================

export async function getAllBrands() {
  try {
    const response = await authenticatedFetch('/api/brands');

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener marcas: ${errorData.error || 'Error desconocido'}`);
    }

    const brands = await response.json();
    return brands.map((brand: any) => ({ id: brand.id, name: brand.name }));
  } catch (error) {
    console.error('Error en getAllBrands:', error);
    throw error;
  }
}

export async function getAllProductTypes() {
  try {
    const response = await authenticatedFetch('/api/product-types');

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener tipos de producto: ${errorData.error || 'Error desconocido'}`);
    }

    const productTypes = await response.json();
    return productTypes.map((type: any) => ({ id: type.id, name: type.name }));
  } catch (error) {
    console.error('Error en getAllProductTypes:', error);
    throw error;
  }
}