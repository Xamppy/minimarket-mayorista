/**
 * Sistema de Gestión de Ventas Reutilizable
 * 
 * Función completamente nueva y modular para gestionar ventas en cualquier carrito de compras.
 * Incluye descuento automático de stock FIFO, generación automática de tickets y validaciones completas.
 * 
 * Características:
 * - Descuento automático de stock con principio FIFO
 * - Generación automática de tickets
 * - Validación completa de datos
 * - Modular y reutilizable
 * - Manejo robusto de errores
 * - Soporte para múltiples formatos de venta
 */

import { Client } from 'pg';

// ===== INTERFACES Y TIPOS =====

export interface CartItem {
  productId: string;
  quantity: number;
  saleFormat: 'unitario' | 'display' | 'pallet';
  specificPrice?: number;
  stockEntryId?: string; // Para ventas específicas de stock
}

export interface SaleResult {
  success: boolean;
  saleId?: string;
  ticketUrl?: string;
  totalAmount?: number;
  error?: {
    message: string;
    details?: string | string[];
    status: number;
  };
  stockUpdates?: StockUpdate[];
  itemsProcessed?: ProcessedItem[];
  ticketData?: TicketData;
}

export interface TicketData {
  id: string;
  seller_id: string;
  seller_email: string;
  total_amount: number;
  created_at: string;
  formattedDate: string;
  formattedTime: string;
  itemCount: number;
  totalSavings: number;
  sale_items: TicketItem[];
}

export interface TicketItem {
  id: string;
  product_name: string;
  brand_name: string;
  barcode: string;
  quantity_sold: number;
  price_at_sale: number;
  sale_format: string;
  is_wholesale: boolean;
  unit_price: number;
  wholesale_price?: number;
  savings: number;
}

export interface TicketGenerationResult {
  success: boolean;
  ticketUrl?: string;
  ticketData?: TicketData;
  printReady?: boolean;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface StockUpdate {
  stockEntryId: string;
  previousQuantity: number;
  newQuantity: number;
  quantityUsed: number;
}

export interface ProcessedItem {
  productId: string;
  productName: string;
  brandName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  saleFormat: string;
  stockEntryId: string;
  isWholesale: boolean;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  query_timeout?: number;
  statement_timeout?: number;
}

export interface SalesManagerConfig {
  database: DatabaseConfig;
  enableAutoTicketGeneration: boolean;
  ticketBaseUrl: string;
  maxRetries: number;
  retryDelay: number;
  enableLogging: boolean;
}

export interface UserContext {
  id: string;
  email: string;
  role: string;
}

// ===== CLASE PRINCIPAL =====

export class ReusableSalesManager {
  private config: SalesManagerConfig;
  private client: Client | null = null;

  constructor(config: SalesManagerConfig) {
    this.config = config;
  }

  /**
   * Procesa una venta completa desde el carrito
   * @param cartItems - Items del carrito a procesar
   * @param user - Contexto del usuario que realiza la venta
   * @returns Resultado de la venta con ticket generado
   */
  async processSale(cartItems: CartItem[], user: UserContext): Promise<SaleResult> {
    try {
      // Validar datos de entrada
      const validationResult = this.validateCartItems(cartItems);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            message: 'Datos de entrada inválidos',
            details: validationResult.errors,
            status: 400
          }
        };
      }

      // Conectar a la base de datos
      await this.connectDatabase();
      
      // Iniciar transacción
      await this.client!.query('BEGIN');
      this.log('Transacción iniciada');

      try {
        // Procesar cada item del carrito
        const processedItems: ProcessedItem[] = [];
        const stockUpdates: StockUpdate[] = [];
        let totalAmount = 0;

        for (const item of cartItems) {
          const itemResult = await this.processCartItem(item);
          if (!itemResult.success) {
            throw new Error(itemResult.error || 'Error procesando item del carrito');
          }

          processedItems.push(...itemResult.items!);
          stockUpdates.push(...itemResult.stockUpdates!);
          totalAmount += itemResult.totalPrice!;
        }

        // Crear la venta principal
        const saleId = await this.createSale(user.id, totalAmount);
        this.log(`Venta creada con ID: ${saleId}`);

        // Crear los items de venta
        await this.createSaleItems(saleId, processedItems);
        this.log(`${processedItems.length} items de venta creados`);

        // Actualizar el stock
        await this.updateStock(stockUpdates);
        this.log(`${stockUpdates.length} actualizaciones de stock aplicadas`);

        // Confirmar transacción
        await this.client!.query('COMMIT');
        this.log('Transacción confirmada exitosamente');

        // Generar ticket automáticamente si está habilitado
        let ticketUrl: string | undefined;
        let ticketData: TicketData | undefined;
        if (this.config.enableAutoTicketGeneration) {
          const ticketResult = await this.generateTicket(saleId);
          if (ticketResult.success) {
            ticketUrl = ticketResult.ticketUrl;
            ticketData = ticketResult.ticketData;
            this.log(`Ticket generado exitosamente: ${ticketUrl}`);
          } else {
            this.log(`Error generando ticket: ${ticketResult.error}`, 'error');
            // No fallar la venta por error en el ticket
          }
        }

        return {
          success: true,
          saleId,
          ticketUrl,
          totalAmount,
          stockUpdates,
          itemsProcessed: processedItems,
          ticketData
        };

      } catch (transactionError) {
        // Revertir transacción en caso de error
        await this.client!.query('ROLLBACK');
        this.log('Transacción revertida debido a error');
        throw transactionError;
      }

    } catch (error) {
      this.log(`Error en processSale: ${error}`, 'error');
      return {
        success: false,
        error: {
          message: 'Error interno procesando la venta',
          details: error instanceof Error ? error.message : String(error),
          status: 500
        }
      };
    } finally {
      await this.disconnectDatabase();
    }
  }

  /**
   * Procesa un item individual del carrito
   */
  private async processCartItem(item: CartItem): Promise<{
    success: boolean;
    items?: ProcessedItem[];
    stockUpdates?: StockUpdate[];
    totalPrice?: number;
    error?: string;
  }> {
    try {
      // Validar que el producto existe
      const product = await this.getProduct(item.productId);
      if (!product) {
        return {
          success: false,
          error: `Producto no encontrado: ${item.productId}`
        };
      }

      // Verificar stock disponible
      const availableStock = await this.getAvailableStock(item.productId);
      if (availableStock < item.quantity) {
        return {
          success: false,
          error: `Stock insuficiente. Disponible: ${availableStock}, solicitado: ${item.quantity}`
        };
      }

      // Procesar según el tipo de venta
      if (item.stockEntryId && item.specificPrice) {
        // Venta específica de stock entry
        return await this.processSpecificStockSale(item, product);
      } else {
        // Venta FIFO automática
        return await this.processFIFOSale(item, product);
      }

    } catch (error) {
      return {
        success: false,
        error: `Error procesando item: ${error}`
      };
    }
  }

  /**
   * Procesa venta específica de un stock entry
   */
  private async processSpecificStockSale(item: CartItem, product: any): Promise<{
    success: boolean;
    items?: ProcessedItem[];
    stockUpdates?: StockUpdate[];
    totalPrice?: number;
    error?: string;
  }> {
    const stockEntry = await this.getStockEntry(item.stockEntryId!);
    if (!stockEntry) {
      return {
        success: false,
        error: `Stock entry no encontrado: ${item.stockEntryId}`
      };
    }

    if (stockEntry.remaining_quantity < item.quantity) {
      return {
        success: false,
        error: `Stock insuficiente en este lote. Disponible: ${stockEntry.remaining_quantity}`
      };
    }

    const totalPrice = item.specificPrice! * item.quantity;
    
    const processedItem: ProcessedItem = {
      productId: item.productId,
      productName: product.name,
      brandName: product.brand_name || 'Sin marca',
      quantity: item.quantity,
      unitPrice: item.specificPrice!,
      totalPrice,
      saleFormat: item.saleFormat,
      stockEntryId: item.stockEntryId!,
      isWholesale: false
    };

    const stockUpdate: StockUpdate = {
      stockEntryId: item.stockEntryId!,
      previousQuantity: stockEntry.remaining_quantity,
      newQuantity: stockEntry.remaining_quantity - item.quantity,
      quantityUsed: item.quantity
    };

    return {
      success: true,
      items: [processedItem],
      stockUpdates: [stockUpdate],
      totalPrice
    };
  }

  /**
   * Procesa venta FIFO automática
   */
  private async processFIFOSale(item: CartItem, product: any): Promise<{
    success: boolean;
    items?: ProcessedItem[];
    stockUpdates?: StockUpdate[];
    totalPrice?: number;
    error?: string;
  }> {
    // Obtener stock entries ordenados por FIFO
    const stockEntries = await this.getFIFOStockEntries(item.productId);
    if (stockEntries.length === 0) {
      return {
        success: false,
        error: 'No hay stock disponible'
      };
    }

    const processedItems: ProcessedItem[] = [];
    const stockUpdates: StockUpdate[] = [];
    let remainingQuantity = item.quantity;
    let totalPrice = 0;

    for (const stockEntry of stockEntries) {
      if (remainingQuantity <= 0) break;

      const quantityToTake = Math.min(remainingQuantity, stockEntry.current_quantity);
      
      // Determinar precio (unitario vs wholesale)
      let unitPrice = stockEntry.sale_price_unit;
      let isWholesale = false;
      
      if (stockEntry.sale_price_wholesale && 
          stockEntry.sale_price_wholesale > 0 && 
          quantityToTake >= 3) {
        unitPrice = stockEntry.sale_price_wholesale;
        isWholesale = true;
      }

      const itemTotalPrice = quantityToTake * unitPrice;
      totalPrice += itemTotalPrice;

      const processedItem: ProcessedItem = {
        productId: item.productId,
        productName: product.name,
        brandName: product.brand_name || 'Sin marca',
        quantity: quantityToTake,
        unitPrice,
        totalPrice: itemTotalPrice,
        saleFormat: item.saleFormat,
        stockEntryId: stockEntry.id,
        isWholesale
      };

      const stockUpdate: StockUpdate = {
        stockEntryId: stockEntry.id,
        previousQuantity: stockEntry.current_quantity,
        newQuantity: stockEntry.current_quantity - quantityToTake,
        quantityUsed: quantityToTake
      };

      processedItems.push(processedItem);
      stockUpdates.push(stockUpdate);
      remainingQuantity -= quantityToTake;
    }

    if (remainingQuantity > 0) {
      return {
        success: false,
        error: `No se pudo procesar toda la cantidad solicitada. Faltaron ${remainingQuantity} unidades`
      };
    }

    return {
      success: true,
      items: processedItems,
      stockUpdates,
      totalPrice
    };
  }

  /**
   * Valida los items del carrito
   */
  private validateCartItems(cartItems: CartItem[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!cartItems || cartItems.length === 0) {
      errors.push('El carrito está vacío');
      return { isValid: false, errors };
    }

    if (cartItems.length > 50) {
      errors.push('Demasiados items en el carrito (máximo 50)');
    }

    cartItems.forEach((item, index) => {
      const prefix = `Item ${index + 1}:`;
      
      if (!item.productId || item.productId.trim() === '') {
        errors.push(`${prefix} ID del producto es requerido`);
      }
      
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`${prefix} Cantidad debe ser mayor a 0`);
      }
      
      if (item.quantity > 1000) {
        errors.push(`${prefix} Cantidad demasiado alta (máximo 1000)`);
      }
      
      if (!Number.isInteger(item.quantity)) {
        errors.push(`${prefix} Cantidad debe ser un número entero`);
      }
      
      if (!['unitario', 'display', 'pallet'].includes(item.saleFormat)) {
        errors.push(`${prefix} Formato de venta inválido`);
      }
      
      if (item.specificPrice !== undefined) {
        if (item.specificPrice < 0) {
          errors.push(`${prefix} Precio no puede ser negativo`);
        }
        if (item.specificPrice > 1000000) {
          errors.push(`${prefix} Precio demasiado alto`);
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  // ===== MÉTODOS DE BASE DE DATOS =====

  private async connectDatabase(): Promise<void> {
    if (this.client) {
      await this.disconnectDatabase();
    }
    
    this.client = new Client(this.config.database);
    await this.client.connect();
    this.log('Conectado a la base de datos');
  }

  private async disconnectDatabase(): Promise<void> {
    if (this.client) {
      try {
        await this.client.end();
        this.log('Desconectado de la base de datos');
      } catch (error) {
        this.log(`Error desconectando: ${error}`, 'error');
      } finally {
        this.client = null;
      }
    }
  }

  private async getProduct(productId: string): Promise<any> {
    const result = await this.client!.query(
      'SELECT id, name, brand_name FROM products WHERE id = $1',
      [productId]
    );
    return result.rows[0] || null;
  }

  private async getAvailableStock(productId: string): Promise<number> {
    const result = await this.client!.query(
      'SELECT COALESCE(SUM(current_quantity), 0) as total FROM stock_entries WHERE product_id = $1 AND current_quantity > 0',
      [productId]
    );
    return parseInt(result.rows[0].total);
  }

  private async getStockEntry(stockEntryId: string): Promise<any> {
    const result = await this.client!.query(
      'SELECT id, current_quantity, sale_price_unit, sale_price_wholesale FROM stock_entries WHERE id = $1',
      [stockEntryId]
    );
    return result.rows[0] || null;
  }

  private async getFIFOStockEntries(productId: string): Promise<any[]> {
    const result = await this.client!.query(
      `SELECT id, current_quantity, sale_price_unit, sale_price_wholesale, expiration_date, entry_date
       FROM stock_entries
       WHERE product_id = $1 AND current_quantity > 0
       ORDER BY 
         CASE WHEN expiration_date IS NULL THEN 1 ELSE 0 END,
         expiration_date ASC,
         entry_date ASC
       LIMIT 10`,
      [productId]
    );
    return result.rows;
  }

  private async createSale(userId: string, totalAmount: number): Promise<string> {
    const result = await this.client!.query(
      'INSERT INTO sales (user_id, total_amount, payment_method) VALUES ($1, $2, $3) RETURNING id',
      [userId, totalAmount, 'pending']
    );
    return result.rows[0].id;
  }

  private async createSaleItems(saleId: string, items: ProcessedItem[]): Promise<void> {
    for (const item of items) {
      await this.client!.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price, sale_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [saleId, item.productId, item.quantity, item.unitPrice, item.totalPrice, item.saleFormat]
      );
    }
  }

  private async updateStock(stockUpdates: StockUpdate[]): Promise<void> {
    for (const update of stockUpdates) {
      await this.client!.query(
        'UPDATE stock_entries SET current_quantity = $1 WHERE id = $2',
        [update.newQuantity, update.stockEntryId]
      );
    }
  }

  // ===== UTILIDADES =====

  private log(message: string, level: 'info' | 'error' = 'info'): void {
    if (this.config.enableLogging) {
      const timestamp = new Date().toISOString();
      const prefix = `[ReusableSalesManager ${timestamp}]`;
      
      if (level === 'error') {
        console.error(`${prefix} ERROR: ${message}`);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }



  /**
   * Genera un ticket de venta automáticamente
   */
  async generateTicket(saleId: string): Promise<TicketGenerationResult> {
    try {
      // Obtener datos completos de la venta
      const saleData = await this.getSaleData(saleId);
      
      if (!saleData) {
        return {
          success: false,
          error: 'Venta no encontrada'
        };
      }

      // Validar que la venta tenga todos los datos necesarios
      const validation = this.validateTicketData(saleData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Datos de ticket inválidos: ${validation.errors.join(', ')}`
        };
      }

      // Formatear datos para el ticket
      const ticketData = this.formatTicketData(saleData);
      
      return {
        success: true,
        ticketUrl: `${this.config.ticketBaseUrl}/${saleId}`,
        ticketData,
        printReady: true
      };
    } catch (error) {
      this.log(`Error generating ticket: ${error}`, 'error');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al generar ticket'
      };
    }
  }

  /**
   * Valida que los datos del ticket sean correctos
   */
  validateTicketData(saleData: any): ValidationResult {
    const errors: string[] = [];

    // Validaciones básicas de la venta
    if (!saleData.id) errors.push('ID de venta requerido');
    if (!saleData.seller_email) errors.push('Email del vendedor requerido');
    if (typeof saleData.total_amount !== 'number' || saleData.total_amount <= 0) errors.push('Total inválido');
    if (!saleData.created_at) errors.push('Fecha y hora requeridas');
    if (!saleData.sale_items || saleData.sale_items.length === 0) errors.push('Items de venta requeridos');

    // Validar items de venta
    if (saleData.sale_items) {
      saleData.sale_items.forEach((item: any, index: number) => {
        if (!item.stock_entry?.product?.name) errors.push(`Item ${index + 1}: Nombre de producto requerido`);
        if (typeof item.quantity_sold !== 'number' || item.quantity_sold <= 0) errors.push(`Item ${index + 1}: Cantidad inválida`);
        if (typeof item.price_at_sale !== 'number' || item.price_at_sale <= 0) errors.push(`Item ${index + 1}: Precio inválido`);
        if (!item.sale_format) errors.push(`Item ${index + 1}: Formato de venta requerido`);
        if (!item.stock_entry?.barcode) errors.push(`Item ${index + 1}: Código de barras requerido`);
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida un ticket generado comparándolo con los datos originales
   */
  async validateGeneratedTicket(saleId: string, ticketData: TicketData): Promise<ValidationResult> {
    const errors: string[] = [];
    
    try {
      // Obtener datos originales de la venta
      const originalData = await this.getSaleData(saleId);
      
      if (!originalData) {
        errors.push('No se pudieron obtener los datos originales de la venta');
        return { isValid: false, errors };
      }

      // Validar consistencia de datos principales
      if (ticketData.id !== originalData.id) errors.push('ID de venta no coincide');
      if (ticketData.total_amount !== originalData.total_amount) errors.push('Total no coincide');
      if (ticketData.seller_email !== originalData.seller_email) errors.push('Email del vendedor no coincide');
      
      // Validar cantidad de items
      if (ticketData.sale_items.length !== originalData.sale_items.length) {
        errors.push('Cantidad de items no coincide');
      }

      // Validar cada item del ticket
      ticketData.sale_items.forEach((ticketItem, index) => {
        const originalItem = originalData.sale_items[index];
        if (originalItem) {
          if (ticketItem.quantity_sold !== originalItem.quantity_sold) {
            errors.push(`Item ${index + 1}: Cantidad vendida no coincide`);
          }
          if (ticketItem.price_at_sale !== originalItem.price_at_sale) {
            errors.push(`Item ${index + 1}: Precio de venta no coincide`);
          }
          if (ticketItem.product_name !== originalItem.stock_entry.product.name) {
            errors.push(`Item ${index + 1}: Nombre del producto no coincide`);
          }
        }
      });

      // Validar formato de fecha y hora
      if (!this.isValidDateFormat(ticketData.formattedDate)) {
        errors.push('Formato de fecha inválido');
      }
      if (!this.isValidTimeFormat(ticketData.formattedTime)) {
        errors.push('Formato de hora inválido');
      }

      // Validar cálculos
      const calculatedItemCount = ticketData.sale_items.reduce((sum, item) => sum + item.quantity_sold, 0);
      if (ticketData.itemCount !== calculatedItemCount) {
        errors.push('Conteo de items incorrecto');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(`Error durante la validación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Valida el formato de fecha (DD/MM/YYYY)
   */
  private isValidDateFormat(dateString: string): boolean {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    return dateRegex.test(dateString);
  }

  /**
   * Valida el formato de hora (HH:MM:SS)
   */
  private isValidTimeFormat(timeString: string): boolean {
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    return timeRegex.test(timeString);
  }

  /**
   * Ejecuta una validación completa del ticket incluyendo generación y verificación
   */
  async performCompleteTicketValidation(saleId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    
    try {
      // Generar el ticket
      const ticketResult = await this.generateTicket(saleId);
      
      if (!ticketResult.success) {
        errors.push(`Error generando ticket: ${ticketResult.error}`);
        return { isValid: false, errors };
      }

      if (!ticketResult.ticketData) {
        errors.push('No se generaron datos del ticket');
        return { isValid: false, errors };
      }

      // Validar el ticket generado
      const validationResult = await this.validateGeneratedTicket(saleId, ticketResult.ticketData);
      
      return validationResult;
    } catch (error) {
      errors.push(`Error durante la validación completa: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Formatea los datos de la venta para el ticket
   */
  private formatTicketData(saleData: any): TicketData {
    // Formatear fecha y hora
    const saleDate = new Date(saleData.created_at);
    const formattedDate = saleDate.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedTime = saleDate.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Procesar items con información de wholesale pricing
    const processedItems: TicketItem[] = saleData.sale_items.map((item: any) => {
      const isWholesale = item.quantity_sold >= 3;
      const unitPrice = item.price_at_sale;
      const wholesalePrice = isWholesale ? item.price_at_sale : null;
      const savings = 0; // Por ahora no calculamos ahorros sin datos adicionales
      
      return {
        id: item.id,
        product_name: item.stock_entry.product.name,
        brand_name: item.stock_entry.product.brand.name || 'Sin marca',
        barcode: item.stock_entry.barcode || '',
        quantity_sold: item.quantity_sold,
        price_at_sale: item.price_at_sale,
        sale_format: item.sale_format,
        is_wholesale: isWholesale,
        unit_price: unitPrice,
        wholesale_price: wholesalePrice,
        savings
      };
    });

    // Calcular totales
    const itemCount = processedItems.reduce((sum, item) => sum + item.quantity_sold, 0);
    const totalSavings = processedItems.reduce((sum, item) => sum + item.savings, 0);

    return {
      id: saleData.id,
      seller_id: saleData.seller_id,
      seller_email: saleData.seller_email,
      total_amount: saleData.total_amount,
      created_at: saleData.created_at,
      formattedDate,
      formattedTime,
      itemCount,
      totalSavings,
      sale_items: processedItems
    };
  }

  private async getSaleData(saleId: string): Promise<any> {
    await this.connectDatabase();
    try {
      const result = await this.client!.query(
        `SELECT 
           s.id,
           s.user_id as seller_id,
           s.total_amount,
           s.sale_date as created_at,
           u.email as seller_email,
           json_agg(
             json_build_object(
               'id', si.id,
               'quantity_sold', si.quantity_sold,
               'price_at_sale', si.price_at_sale,
               'sale_format', si.sale_format,
               'stock_entry', json_build_object(
                 'barcode', COALESCE(p.barcode, se.barcode, ''),
                 'product', json_build_object(
                   'name', p.name,
                   'brand', json_build_object('name', COALESCE(b.name, 'Sin marca'))
                 )
               )
             )
           ) as sale_items
         FROM sales s
         LEFT JOIN users u ON s.user_id = u.id
         LEFT JOIN sale_items si ON s.id = si.sale_id
         LEFT JOIN stock_entries se ON si.stock_entry_id = se.id
         LEFT JOIN products p ON se.product_id = p.id
         LEFT JOIN brands b ON p.brand_id = b.id
         WHERE s.id = $1
         GROUP BY s.id, s.user_id, s.total_amount, s.sale_date, u.email`,
        [saleId]
      );
      return result.rows[0] || null;
    } finally {
      await this.disconnectDatabase();
    }
  }
}

// ===== FUNCIONES DE UTILIDAD PARA INTEGRACIÓN FÁCIL =====

/**
 * Crea una instancia configurada del gestor de ventas
 */
export function createSalesManager(config: Partial<SalesManagerConfig>): ReusableSalesManager {
  const defaultConfig: SalesManagerConfig = {
    database: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'minimarket',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.POSTGRES_SSL === 'true',
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      query_timeout: 30000,
      statement_timeout: 30000
    },
    enableAutoTicketGeneration: true,
    ticketBaseUrl: '/ticket',
    maxRetries: 3,
    retryDelay: 1000,
    enableLogging: true
  };

  const mergedConfig = { ...defaultConfig, ...config };
  if (config.database) {
    mergedConfig.database = { ...defaultConfig.database, ...config.database };
  }

  return new ReusableSalesManager(mergedConfig);
}

/**
 * Función de conveniencia para procesar una venta simple
 */
export async function processSimpleSale(
  productId: string,
  quantity: number,
  user: UserContext,
  saleFormat: 'unitario' | 'display' | 'pallet' = 'unitario'
): Promise<SaleResult> {
  const salesManager = createSalesManager({});
  const cartItems: CartItem[] = [{
    productId,
    quantity,
    saleFormat
  }];
  
  return await salesManager.processSale(cartItems, user);
}

/**
 * Función de conveniencia para procesar un carrito completo
 */
export async function processCartSale(
  cartItems: CartItem[],
  user: UserContext,
  config?: Partial<SalesManagerConfig>
): Promise<SaleResult> {
  const salesManager = createSalesManager(config || {});
  return await salesManager.processSale(cartItems, user);
}

/**
 * Función de utilidad para generar un ticket de una venta existente
 */
export async function generateSaleTicket(
  saleId: string,
  config?: Partial<SalesManagerConfig>
): Promise<TicketGenerationResult> {
  const manager = createSalesManager(config || {});
  return await manager.generateTicket(saleId);
}

/**
 * Función de utilidad para validar un ticket generado
 */
export async function validateSaleTicket(
  saleId: string,
  config?: Partial<SalesManagerConfig>
): Promise<ValidationResult> {
  const manager = createSalesManager(config || {});
  return await manager.performCompleteTicketValidation(saleId);
}

/**
 * Función de utilidad para procesar venta con validación automática de ticket
 */
export async function processCartSaleWithValidation(
  cartItems: CartItem[],
  user: UserContext,
  config?: Partial<SalesManagerConfig>
): Promise<SaleResult & { ticketValidation?: ValidationResult }> {
  const manager = createSalesManager(config || {});
  
  // Procesar la venta
  const saleResult = await manager.processSale(cartItems, user);
  
  // Si la venta fue exitosa y se generó un ticket, validarlo
  if (saleResult.success && saleResult.saleId && saleResult.ticketData) {
    const ticketValidation = await manager.validateGeneratedTicket(saleResult.saleId, saleResult.ticketData);
    return {
      ...saleResult,
      ticketValidation
    };
  }
  
  return saleResult;
}

/**
 * Función de utilidad para obtener configuración predeterminada
 */
export function getDefaultSalesConfig(): SalesManagerConfig {
  return {
    database: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'minimarket',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.POSTGRES_SSL === 'true',
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      query_timeout: 30000,
      statement_timeout: 30000
    },
    enableAutoTicketGeneration: true,
    ticketBaseUrl: '/ticket',
    maxRetries: 3,
    retryDelay: 1000,
    enableLogging: true
  };
}

/**
 * Función de utilidad para crear configuración personalizada
 */
export function createCustomSalesConfig(
  overrides: Partial<SalesManagerConfig>
): SalesManagerConfig {
  const defaultConfig = getDefaultSalesConfig();
  return {
    ...defaultConfig,
    ...overrides,
    database: {
      ...defaultConfig.database,
      ...overrides.database
    }
  };
}

/**
 * Función de utilidad para validar items del carrito antes del procesamiento
 */
export function validateCartItemsUtility(cartItems: CartItem[]): ValidationResult {
  const errors: string[] = [];
  
  if (!cartItems || cartItems.length === 0) {
    errors.push('El carrito no puede estar vacío');
    return { isValid: false, errors };
  }
  
  cartItems.forEach((item, index) => {
    if (!item.productId) errors.push(`Item ${index + 1}: ID de producto requerido`);
    if (!item.quantity || item.quantity <= 0) errors.push(`Item ${index + 1}: Cantidad debe ser mayor a 0`);
    if (!item.saleFormat) errors.push(`Item ${index + 1}: Formato de venta requerido`);
    if (item.specificPrice !== undefined && item.specificPrice < 0) errors.push(`Item ${index + 1}: Precio específico no puede ser negativo`);
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Función de utilidad para formatear resultado de venta para respuesta de API
 */
export function formatSaleResultForAPI(result: SaleResult) {
  return {
    success: result.success,
    data: result.success ? {
      saleId: result.saleId,
      ticketUrl: result.ticketUrl,
      totalAmount: result.totalAmount,
      itemsProcessed: result.itemsProcessed?.length || 0,
      stockUpdatesCount: result.stockUpdates?.length || 0,
      ticketGenerated: !!result.ticketData
    } : null,
    error: result.error ? {
      message: result.error.message,
      status: result.error.status
    } : null
  };
}

/**
 * Función de utilidad para crear contexto de usuario desde request
 */
export function createUserContextFromRequest(id: string, email: string, role: string = 'user'): UserContext {
  return {
    id,
    email,
    role
  };
}

export default ReusableSalesManager;