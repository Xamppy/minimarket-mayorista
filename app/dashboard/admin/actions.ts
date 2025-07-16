'use server';

import { createClient } from '../../utils/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtener datos del formulario
  const productId = formData.get('productId') as string;
  const quantity = formData.get('quantity') as string;
  const barcode = formData.get('barcode') as string;
  const purchasePrice = formData.get('purchasePrice') as string;
  const unitPrice = formData.get('unitPrice') as string;
  const boxPrice = formData.get('boxPrice') as string;
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

  if (!boxPrice || isNaN(parseFloat(boxPrice)) || parseFloat(boxPrice) <= 0) {
    throw new Error('El precio de venta por caja debe ser un número mayor a 0');
  }

  // Validar precio mayorista usando la función mejorada
  const parsedWholesalePrice = validateWholesalePrice(wholesalePrice, unitPrice, purchasePrice);

  try {
    // Insertar entrada de stock
    const { error } = await supabase
      .from('stock_entries')
      .insert({
        product_id: parseInt(productId),
        initial_quantity: parseInt(quantity),
        current_quantity: parseInt(quantity),
        barcode: barcode.trim(),
        purchase_price: parseFloat(purchasePrice),
        sale_price_unit: parseFloat(unitPrice),
        sale_price_box: parseFloat(boxPrice),
        sale_price_wholesale: parsedWholesalePrice,
        expiration_date: expirationDate?.trim() || null
      });

    if (error) {
      console.error('Error al insertar entrada de stock:', error);
      throw new Error(`Error al registrar el stock: ${error.message}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en addStockEntry:', error);
    throw error;
  }
}

export async function updateStockEntry(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtener datos del formulario
  const stockEntryId = formData.get('stockEntryId') as string;
  const quantity = formData.get('quantity') as string;
  const barcode = formData.get('barcode') as string;
  const purchasePrice = formData.get('purchasePrice') as string;
  const unitPrice = formData.get('unitPrice') as string;
  const boxPrice = formData.get('boxPrice') as string;
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

  if (!boxPrice || isNaN(parseFloat(boxPrice)) || parseFloat(boxPrice) <= 0) {
    throw new Error('El precio de venta por caja debe ser un número mayor a 0');
  }

  // Validar precio mayorista usando la función mejorada
  const parsedWholesalePrice = validateWholesalePrice(wholesalePrice, unitPrice, purchasePrice);

  try {
    // Actualizar entrada de stock
    const { error } = await supabase
      .from('stock_entries')
      .update({
        current_quantity: parseInt(quantity),
        barcode: barcode.trim(),
        purchase_price: parseFloat(purchasePrice),
        sale_price_unit: parseFloat(unitPrice),
        sale_price_box: parseFloat(boxPrice),
        sale_price_wholesale: parsedWholesalePrice,
        expiration_date: expirationDate?.trim() || null
      })
      .eq('id', stockEntryId);

    if (error) {
      console.error('Error al actualizar entrada de stock:', error);
      throw new Error(`Error al actualizar el lote de stock: ${error.message}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en updateStockEntry:', error);
    throw error;
  }
}

export async function deleteStockEntry(stockEntryId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  if (!stockEntryId) {
    throw new Error('El ID del lote de stock es requerido');
  }

  try {
    // Verificar que la entrada de stock existe
    const { data: stockEntry, error: fetchError } = await supabase
      .from('stock_entries')
      .select('id, current_quantity')
      .eq('id', stockEntryId)
      .single();

    if (fetchError || !stockEntry) {
      throw new Error('El lote de stock no existe');
    }

    // Eliminar entrada de stock
    const { error } = await supabase
      .from('stock_entries')
      .delete()
      .eq('id', stockEntryId);

    if (error) {
      console.error('Error al eliminar entrada de stock:', error);
      throw new Error(`Error al eliminar el lote de stock: ${error.message}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en deleteStockEntry:', error);
    throw error;
  }
}

export async function addProduct(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

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
      const { error } = await supabase
        .from('products')
        .update({
          name: name.trim(),
          brand_id: brandId,
          type_id: typeId,
          image_url: imageUrl?.trim() || null
        })
        .eq('id', productId);

      if (error) {
        console.error('Error al actualizar producto:', error);
        throw new Error(`Error al actualizar el producto: ${error.message}`);
      }
    } else {
      // Insertar producto nuevo
      const { error } = await supabase
        .from('products')
        .insert({
          name: name.trim(),
          brand_id: brandId,
          type_id: typeId,
          image_url: imageUrl?.trim() || null
        });

      if (error) {
        console.error('Error al insertar producto en catálogo:', error);
        throw new Error(`Error al registrar el producto en el catálogo: ${error.message}`);
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
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  if (!productId) {
    throw new Error('El ID del producto es requerido');
  }

  try {
    // Eliminar producto (las stock_entries se eliminan en cascada)
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Error al eliminar producto:', error);
      throw new Error(`Error al eliminar el producto: ${error.message}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en deleteProduct:', error);
    throw error;
  }
}

export async function getStockEntries(productId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data, error } = await supabase
      .from('stock_entries')
      .select('*')
      .eq('product_id', productId)
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error getting stock entries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting stock entries:', error);
    return [];
  }
}

export async function getLowStockAlerts(threshold: number = 10) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    const { data, error } = await supabase
      .from('stock_entries')
      .select(`
        id,
        current_quantity,
        barcode,
        products (
          id,
          name,
          brands (
            name
          ),
          product_types (
            name
          )
        )
      `)
      .lt('current_quantity', threshold)
      .gt('current_quantity', 0)
      .order('current_quantity', { ascending: true });

    if (error) {
      console.error('Error al obtener alertas de bajo stock:', error);
      throw new Error(`Error al obtener alertas de bajo stock: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error en getLowStockAlerts:', error);
    throw error;
  }
}

export async function getExpirationAlerts(daysAhead: number = 30) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    // Calcular fecha límite (30 días desde hoy)
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('stock_entries')
      .select(`
        id,
        current_quantity,
        expiration_date,
        barcode,
        products (
          id,
          name,
          brands (
            name
          ),
          product_types (
            name
          )
        )
      `)
      .not('expiration_date', 'is', null)
      .lte('expiration_date', futureDate.toISOString().split('T')[0])
      .gt('current_quantity', 0)
      .order('expiration_date', { ascending: true });

    if (error) {
      console.error('Error al obtener alertas de expiración:', error);
      throw new Error(`Error al obtener alertas de expiración: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error en getExpirationAlerts:', error);
    throw error;
  }
}

// FUNCIONES PARA REPORTES
export async function getSalesReport(period: 'day' | 'week' | 'month') {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
    }

    const { data, error } = await supabase
      .from('sales')
      .select('total_amount, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener reporte de ventas:', error);
      throw new Error(`Error al obtener reporte de ventas: ${error.message}`);
    }

    const totalSales = data?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
    const totalTransactions = data?.length || 0;

    return {
      totalSales,
      totalTransactions,
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  } catch (error) {
    console.error('Error en getSalesReport:', error);
    throw error;
  }
}

export async function getTopSellingProducts(limit: number = 5) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    // Obtener todos los sale_items con información detallada incluyendo wholesale pricing
    const { data: saleItems, error } = await supabase
      .from('sale_items')
      .select(`
        quantity_sold,
        price_at_sale,
        stock_entries (
          product_id,
          sale_price_unit,
          sale_price_wholesale,
          products (
            id,
            name,
            brands (
              name
            ),
            product_types (
              name
            )
          )
        )
      `);

    if (error) {
      console.error('Error al obtener productos más vendidos:', error);
      throw new Error(`Error al obtener productos más vendidos: ${error.message}`);
    }

    // Agrupar por producto y sumar cantidades con información de wholesale pricing
    const productSales = new Map();

    saleItems?.forEach(item => {
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
      .map(product => ({
        ...product,
        wholesalePercentage: product.totalSold > 0 ? (product.wholesaleSales / product.totalSold) * 100 : 0,
        avgSalePrice: product.totalSold > 0 ? product.totalRevenue / product.totalSold : 0
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, limit);

    return sortedProducts;
  } catch (error) {
    console.error('Error en getTopSellingProducts:', error);
    throw error;
  }
}

export async function getRecentSales(limit: number = 10) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    // Obtener ventas con información detallada incluyendo wholesale pricing
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        total_amount,
        created_at,
        seller_id,
        sale_items (
          id,
          quantity_sold,
          price_at_sale,
          sale_format,
          stock_entries (
            id,
            sale_price_unit,
            sale_price_wholesale,
            products (
              id,
              name,
              brands (name),
              product_types (name)
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error al obtener ventas recientes:', error);
      throw new Error(`Error al obtener ventas recientes: ${error.message}`);
    }

    // Procesar ventas con información de wholesale pricing
    const salesWithDetails = await Promise.all(
      (data || []).map(async (sale) => {
        // Obtener información del vendedor
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', sale.seller_id)
          .single();

        // Calcular estadísticas de wholesale pricing para esta venta
        let totalWholesaleItems = 0;
        let totalWholesaleSavings = 0;
        let hasWholesalePricing = false;

        const processedItems = (sale.sale_items || []).map((item: any) => {
          const stockEntry = item.stock_entries;
          const product = stockEntry?.products;
          
          // Determinar si se aplicó wholesale pricing
          const isWholesale = item.quantity_sold >= 3 && 
                             stockEntry?.sale_price_wholesale && 
                             item.price_at_sale === stockEntry.sale_price_wholesale;
          
          if (isWholesale) {
            hasWholesalePricing = true;
            totalWholesaleItems += item.quantity_sold;
            
            // Calcular ahorro (diferencia entre precio unitario y mayorista)
            const unitPrice = stockEntry.sale_price_unit || 0;
            const wholesalePrice = stockEntry.sale_price_wholesale || 0;
            const savings = (unitPrice - wholesalePrice) * item.quantity_sold;
            totalWholesaleSavings += savings;
          }

          return {
            ...item,
            product_name: product?.name || 'Producto desconocido',
            brand_name: product?.brands?.name || 'Sin marca',
            type_name: product?.product_types?.name || 'Sin tipo',
            is_wholesale: isWholesale,
            unit_price: stockEntry?.sale_price_unit || 0,
            wholesale_price: stockEntry?.sale_price_wholesale || null
          };
        });

        return {
          ...sale,
          seller_name: profile?.full_name || 'Vendedor desconocido',
          items: processedItems,
          wholesale_stats: {
            has_wholesale_pricing: hasWholesalePricing,
            total_wholesale_items: totalWholesaleItems,
            total_wholesale_savings: totalWholesaleSavings,
            total_items: (sale.sale_items || []).reduce((sum: number, item: any) => sum + item.quantity_sold, 0)
          }
        };
      })
    );

    return salesWithDetails;
  } catch (error) {
    console.error('Error en getRecentSales:', error);
    throw error;
  }
}

export async function getDailySalesStats() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    const { data, error } = await supabase.rpc('get_daily_sales_stats');

    if (error) {
      console.error('Error al obtener estadísticas diarias de ventas:', error);
      throw new Error(`Error al obtener estadísticas diarias de ventas: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error en getDailySalesStats:', error);
    throw error;
  }
}

// ============================================================================
// BRAND MANAGEMENT ACTIONS WITH MCP INTEGRATION
// ============================================================================

export async function createBrand(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar rol de administrador
  const { data: roleData, error: roleError } = await supabase
    .rpc('get_user_role', { user_id: user.id });

  if (roleError || roleData !== 'administrador') {
    throw new Error('No tienes permisos para realizar esta acción');
  }

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
    // Verificar unicidad usando MCP
    const { data: existingBrands, error: checkError } = await supabase
      .from('brands')
      .select('id, name')
      .ilike('name', name.trim());

    if (checkError) {
      console.error('Error al verificar unicidad de marca:', checkError);
      throw new Error('Error al verificar la marca existente');
    }

    if (existingBrands && existingBrands.length > 0) {
      throw new Error('Ya existe una marca con este nombre');
    }

    // Insertar nueva marca usando MCP
    const { error } = await supabase
      .from('brands')
      .insert({
        name: name.trim()
      });

    if (error) {
      console.error('Error al crear marca:', error);
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Ya existe una marca con este nombre');
      }
      throw new Error(`Error al crear la marca: ${error.message}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en createBrand:', error);
    throw error;
  }
}

export async function updateBrand(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar rol de administrador
  const { data: roleData, error: roleError } = await supabase
    .rpc('get_user_role', { user_id: user.id });

  if (roleError || roleData !== 'administrador') {
    throw new Error('No tienes permisos para realizar esta acción');
  }

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
    // Verificar que la marca existe
    const { data: existingBrand, error: fetchError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brandId)
      .single();

    if (fetchError || !existingBrand) {
      throw new Error('La marca no existe');
    }

    // Verificar unicidad (excluyendo la marca actual)
    const { data: duplicateBrands, error: checkError } = await supabase
      .from('brands')
      .select('id, name')
      .ilike('name', name.trim())
      .neq('id', brandId);

    if (checkError) {
      console.error('Error al verificar unicidad de marca:', checkError);
      throw new Error('Error al verificar la marca existente');
    }

    if (duplicateBrands && duplicateBrands.length > 0) {
      throw new Error('Ya existe otra marca con este nombre');
    }

    // Actualizar marca usando MCP
    const { error } = await supabase
      .from('brands')
      .update({
        name: name.trim()
      })
      .eq('id', brandId);

    if (error) {
      console.error('Error al actualizar marca:', error);
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Ya existe otra marca con este nombre');
      }
      throw new Error(`Error al actualizar la marca: ${error.message}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en updateBrand:', error);
    throw error;
  }
}

export async function deleteBrand(brandId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar rol de administrador
  const { data: roleData, error: roleError } = await supabase
    .rpc('get_user_role', { user_id: user.id });

  if (roleError || roleData !== 'administrador') {
    throw new Error('No tienes permisos para realizar esta acción');
  }

  if (!brandId) {
    throw new Error('El ID de la marca es requerido');
  }

  try {
    // Verificar que la marca existe
    const { data: existingBrand, error: fetchError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brandId)
      .single();

    if (fetchError || !existingBrand) {
      throw new Error('La marca no existe');
    }

    // Verificar si hay productos asociados usando MCP
    const { data: associatedProducts, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('brand_id', brandId)
      .limit(1);

    if (checkError) {
      console.error('Error al verificar productos asociados:', checkError);
      throw new Error('Error al verificar productos asociados');
    }

    if (associatedProducts && associatedProducts.length > 0) {
      throw new Error('No se puede eliminar la marca porque tiene productos asociados');
    }

    // Eliminar marca usando MCP
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', brandId);

    if (error) {
      console.error('Error al eliminar marca:', error);
      throw new Error(`Error al eliminar la marca: ${error.message}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en deleteBrand:', error);
    throw error;
  }
}

export async function getBrandsWithUsage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    // Obtener marcas básicas
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name, created_at')
      .order('name', { ascending: true });

    if (brandsError) {
      console.error('Error al obtener marcas:', brandsError);
      throw new Error(`Error al obtener marcas: ${brandsError.message}`);
    }

    // Obtener conteo de productos para cada marca
    const brandsWithUsage = await Promise.all(
      (brands || []).map(async (brand) => {
        const { count, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('brand_id', brand.id);

        if (countError) {
          console.error('Error al contar productos para marca:', countError);
        }

        return {
          id: brand.id,
          name: brand.name,
          created_at: brand.created_at,
          product_count: count || 0
        };
      })
    );

    return brandsWithUsage;
  } catch (error) {
    console.error('Error en getBrandsWithUsage:', error);
    throw error;
  }
}

// ============================================================================
// PRODUCT TYPE MANAGEMENT ACTIONS WITH MCP INTEGRATION
// ============================================================================

export async function createProductType(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar rol de administrador
  const { data: roleData, error: roleError } = await supabase
    .rpc('get_user_role', { user_id: user.id });

  if (roleError || roleData !== 'administrador') {
    throw new Error('No tienes permisos para realizar esta acción');
  }

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
    // Verificar unicidad usando MCP
    const { data: existingTypes, error: checkError } = await supabase
      .from('product_types')
      .select('id, name')
      .ilike('name', name.trim());

    if (checkError) {
      console.error('Error al verificar unicidad de tipo de producto:', checkError);
      throw new Error('Error al verificar el tipo de producto existente');
    }

    if (existingTypes && existingTypes.length > 0) {
      throw new Error('Ya existe un tipo de producto con este nombre');
    }

    // Insertar nuevo tipo de producto usando MCP
    const { error } = await supabase
      .from('product_types')
      .insert({
        name: name.trim()
      });

    if (error) {
      console.error('Error al crear tipo de producto:', error);
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Ya existe un tipo de producto con este nombre');
      }
      throw new Error(`Error al crear el tipo de producto: ${error.message}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en createProductType:', error);
    throw error;
  }
}

export async function updateProductType(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar rol de administrador
  const { data: roleData, error: roleError } = await supabase
    .rpc('get_user_role', { user_id: user.id });

  if (roleError || roleData !== 'administrador') {
    throw new Error('No tienes permisos para realizar esta acción');
  }

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
    // Verificar que el tipo de producto existe
    const { data: existingType, error: fetchError } = await supabase
      .from('product_types')
      .select('id, name')
      .eq('id', typeId)
      .single();

    if (fetchError || !existingType) {
      throw new Error('El tipo de producto no existe');
    }

    // Verificar unicidad (excluyendo el tipo actual)
    const { data: duplicateTypes, error: checkError } = await supabase
      .from('product_types')
      .select('id, name')
      .ilike('name', name.trim())
      .neq('id', typeId);

    if (checkError) {
      console.error('Error al verificar unicidad de tipo de producto:', checkError);
      throw new Error('Error al verificar el tipo de producto existente');
    }

    if (duplicateTypes && duplicateTypes.length > 0) {
      throw new Error('Ya existe otro tipo de producto con este nombre');
    }

    // Actualizar tipo de producto usando MCP
    const { error } = await supabase
      .from('product_types')
      .update({
        name: name.trim()
      })
      .eq('id', typeId);

    if (error) {
      console.error('Error al actualizar tipo de producto:', error);
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Ya existe otro tipo de producto con este nombre');
      }
      throw new Error(`Error al actualizar el tipo de producto: ${error.message}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en updateProductType:', error);
    throw error;
  }
}

export async function deleteProductType(typeId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar rol de administrador
  const { data: roleData, error: roleError } = await supabase
    .rpc('get_user_role', { user_id: user.id });

  if (roleError || roleData !== 'administrador') {
    throw new Error('No tienes permisos para realizar esta acción');
  }

  if (!typeId) {
    throw new Error('El ID del tipo de producto es requerido');
  }

  try {
    // Verificar que el tipo de producto existe
    const { data: existingType, error: fetchError } = await supabase
      .from('product_types')
      .select('id, name')
      .eq('id', typeId)
      .single();

    if (fetchError || !existingType) {
      throw new Error('El tipo de producto no existe');
    }

    // Verificar si hay productos asociados usando MCP
    const { data: associatedProducts, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('type_id', typeId)
      .limit(1);

    if (checkError) {
      console.error('Error al verificar productos asociados:', checkError);
      throw new Error('Error al verificar productos asociados');
    }

    if (associatedProducts && associatedProducts.length > 0) {
      throw new Error('No se puede eliminar el tipo de producto porque tiene productos asociados');
    }

    // Eliminar tipo de producto usando MCP
    const { error } = await supabase
      .from('product_types')
      .delete()
      .eq('id', typeId);

    if (error) {
      console.error('Error al eliminar tipo de producto:', error);
      throw new Error(`Error al eliminar el tipo de producto: ${error.message}`);
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/admin');

  } catch (error) {
    console.error('Error en deleteProductType:', error);
    throw error;
  }
}

export async function getProductTypesWithUsage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    // Obtener tipos de producto básicos
    const { data: productTypes, error: typesError } = await supabase
      .from('product_types')
      .select('id, name, created_at')
      .order('name', { ascending: true });

    if (typesError) {
      console.error('Error al obtener tipos de producto:', typesError);
      throw new Error(`Error al obtener tipos de producto: ${typesError.message}`);
    }

    // Obtener conteo de productos para cada tipo
    const typesWithUsage = await Promise.all(
      (productTypes || []).map(async (type) => {
        const { count, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('type_id', type.id);

        if (countError) {
          console.error('Error al contar productos para tipo:', countError);
        }

        return {
          id: type.id,
          name: type.name,
          created_at: type.created_at,
          product_count: count || 0
        };
      })
    );

    return typesWithUsage;
  } catch (error) {
    console.error('Error en getProductTypesWithUsage:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR PRODUCT FORMS
// ============================================================================

export async function getAllBrands() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    const { data, error } = await supabase
      .from('brands')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al obtener marcas:', error);
      throw new Error(`Error al obtener marcas: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error en getAllBrands:', error);
    throw error;
  }
}

export async function getAllProductTypes() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    const { data, error } = await supabase
      .from('product_types')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al obtener tipos de producto:', error);
      throw new Error(`Error al obtener tipos de producto: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error en getAllProductTypes:', error);
    throw error;
  }
} 
// ======
======================================================================
// FUNCIONES PARA REPORTES DE WHOLESALE PRICING
// ============================================================================

export async function getWholesalePricingStats() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  try {
    // Obtener estadísticas generales de wholesale pricing
    const { data: wholesaleStats, error: statsError } = await supabase
      .rpc('get_wholesale_pricing_stats');

    if (statsError) {
      console.error('Error al obtener estadísticas de wholesale pricing:', statsError);
      throw new Error(`Error al obtener estadísticas: ${statsError.message}`);
    }

    return wholesaleStats?.[0] || {
      total_products_with_wholesale: 0,
      total_products_without_wholesale: 0,
      avg_wholesale_discount: 0,
      total_wholesale_sales: 0,
      total_regular_sales: 0
    };
  } catch (error) {
    console.error('Error en getWholesalePricingStats:', error);
    throw error;
  }
}

export async function getWholesaleVsRegularSales(period: 'day' | 'week' | 'month' = 'month') {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  try {
    // Calcular fechas según el período
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Obtener comparación de ventas wholesale vs regulares
    const { data: salesComparison, error: comparisonError } = await supabase
      .rpc('get_wholesale_vs_regular_sales', {
        start_date: startDate.toISOString(),
        end_date: now.toISOString()
      });

    if (comparisonError) {
      console.error('Error al obtener comparación de ventas:', comparisonError);
      throw new Error(`Error al obtener comparación: ${comparisonError.message}`);
    }

    return salesComparison || [];
  } catch (error) {
    console.error('Error en getWholesaleVsRegularSales:', error);
    throw error;
  }
}

export async function getProductsWithWholesalePricing(hasWholesale: boolean = true) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  try {
    let query = supabase
      .from('stock_entries')
      .select(`
        id,
        barcode,
        sale_price_unit,
        sale_price_wholesale,
        current_quantity,
        products (
          id,
          name,
          brands (name),
          product_types (name)
        )
      `);

    if (hasWholesale) {
      query = query.not('sale_price_wholesale', 'is', null);
    } else {
      query = query.is('sale_price_wholesale', null);
    }

    const { data: products, error } = await query
      .gt('current_quantity', 0)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener productos con wholesale pricing:', error);
      throw new Error(`Error al obtener productos: ${error.message}`);
    }

    return products || [];
  } catch (error) {
    console.error('Error en getProductsWithWholesalePricing:', error);
    throw error;
  }
}