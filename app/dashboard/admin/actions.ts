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