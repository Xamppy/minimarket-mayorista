'use server';

import { createClient } from '../../utils/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
    // Obtener todos los sale_items con información del producto
    const { data: saleItems, error } = await supabase
      .from('sale_items')
      .select(`
        quantity_sold,
        stock_entries (
          product_id,
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

    // Agrupar por producto y sumar cantidades
    const productSales = new Map();
    
    saleItems?.forEach(item => {
      const stockEntry = item.stock_entries as any;
      const product = stockEntry?.products as any;
      if (product) {
        const productId = product.id;
        const existing = productSales.get(productId);
        
        if (existing) {
          existing.totalSold += item.quantity_sold;
        } else {
          productSales.set(productId, {
            id: productId,
            name: product.name,
            brand_name: product.brands?.name || 'Sin marca',
            type_name: product.product_types?.name || 'Sin tipo',
            totalSold: item.quantity_sold
          });
        }
      }
    });

    // Convertir a array y ordenar
    const sortedProducts = Array.from(productSales.values())
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
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        total_amount,
        created_at,
        seller_id
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error al obtener ventas recientes:', error);
      throw new Error(`Error al obtener ventas recientes: ${error.message}`);
    }

    // Obtener información de los vendedores
    const salesWithSellers = await Promise.all(
      (data || []).map(async (sale) => {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', sale.seller_id)
          .single();

        return {
          ...sale,
          seller_email: profile?.email || 'Vendedor desconocido'
        };
      })
    );

    return salesWithSellers;
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
    // Obtener marcas con conteo de productos usando MCP
    const { data, error } = await supabase
      .from('brands')
      .select(`
        id,
        name,
        created_at,
        products (count)
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al obtener marcas con uso:', error);
      throw new Error(`Error al obtener marcas: ${error.message}`);
    }

    // Transformar datos para incluir product_count
    const brandsWithUsage = (data || []).map(brand => ({
      id: brand.id,
      name: brand.name,
      created_at: brand.created_at,
      product_count: Array.isArray(brand.products) ? brand.products[0]?.count || 0 : 0
    }));

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
    // Obtener tipos de producto con conteo de productos usando MCP
    const { data, error } = await supabase
      .from('product_types')
      .select(`
        id,
        name,
        created_at,
        products (count)
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al obtener tipos de producto con uso:', error);
      throw new Error(`Error al obtener tipos de producto: ${error.message}`);
    }

    // Transformar datos para incluir product_count
    const typesWithUsage = (data || []).map(type => ({
      id: type.id,
      name: type.name,
      created_at: type.created_at,
      product_count: Array.isArray(type.products) ? type.products[0]?.count || 0 : 0
    }));

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