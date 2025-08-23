import { NextRequest, NextResponse } from 'next/server';
import { withVendedorAuth } from '../../../utils/auth/middleware';
import { 
  processCartSale, 
  createUserContextFromRequest,
  formatSaleResultForAPI,
  validateCartItemsUtility,
  type CartItem 
} from '../../../../lib/reusable-sales-manager';

/**
 * API para procesar ventas de carrito usando el sistema reutilizable
 * POST /api/sales/cart
 */
export async function POST(request: NextRequest) {
  return withVendedorAuth(request, async (request: NextRequest, userInfo: any) => {
  try {
    const body = await request.json();
    const { cartItems } = body;

    // Validar que se proporcionaron items del carrito
    if (!cartItems || !Array.isArray(cartItems)) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Se requiere un array de items del carrito',
            status: 400 
          } 
        },
        { status: 400 }
      );
    }

    // Convertir items del carrito al formato esperado
    const processedCartItems: CartItem[] = cartItems.map((item: any) => ({
      productId: item.productId || item.product?.id,
      quantity: parseInt(item.quantity) || 1,
      saleFormat: item.saleFormat || 'unitario',
      specificPrice: item.specificPrice ? parseFloat(item.specificPrice) : undefined,
      stockEntryId: item.stockEntryId
    }));

    // Validar items del carrito antes del procesamiento
    const validation = validateCartItemsUtility(processedCartItems);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Items del carrito inválidos',
            details: validation.errors,
            status: 400
          }
        },
        { status: 400 }
      );
    }

    // Crear contexto de usuario
    const userContext = createUserContextFromRequest(
      userInfo.id,
      userInfo.email,
      userInfo.role || 'vendedor'
    );

    // Procesar la venta usando el sistema reutilizable
    const saleResult = await processCartSale(processedCartItems, userContext);

    // Formatear respuesta para API
    const formattedResponse = formatSaleResultForAPI(saleResult);

    // Determinar código de estado HTTP
    const statusCode = saleResult.success ? 200 : (saleResult.error?.status || 500);

    return NextResponse.json(formattedResponse, { status: statusCode });

  } catch (error) {
    console.error('Error en API de venta de carrito:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Error interno del servidor',
          status: 500
        }
      },
      { status: 500 }
    );
  }
  });
}

/**
 * API para validar items del carrito sin procesar la venta
 * POST /api/sales/cart/validate
 */
export async function PUT(request: NextRequest) {
  return withVendedorAuth(request, async (request: NextRequest, userInfo: any) => {
  try {
    const body = await request.json();
    const { cartItems } = body;

    if (!cartItems || !Array.isArray(cartItems)) {
      return NextResponse.json(
        { 
          isValid: false, 
          errors: ['Se requiere un array de items del carrito'] 
        },
        { status: 400 }
      );
    }

    // Convertir items del carrito al formato esperado
    const processedCartItems: CartItem[] = cartItems.map((item: any) => ({
      productId: item.productId || item.product?.id,
      quantity: parseInt(item.quantity) || 1,
      saleFormat: item.saleFormat || 'unitario',
      specificPrice: item.specificPrice ? parseFloat(item.specificPrice) : undefined,
      stockEntryId: item.stockEntryId
    }));

    // Validar items del carrito
    const validation = validateCartItemsUtility(processedCartItems);

    return NextResponse.json(validation, { status: 200 });

  } catch (error) {
    console.error('Error validando carrito:', error);
    
    return NextResponse.json(
      {
        isValid: false,
        errors: ['Error interno validando el carrito']
      },
      { status: 500 }
    );
  }
  });
}