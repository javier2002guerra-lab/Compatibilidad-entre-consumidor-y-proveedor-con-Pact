/**
 * Cliente HTTP real que usa la aplicación consumidora "ProductWebApp".
 * Es el mismo módulo que se ejecuta contra el servidor simulado de Pact.
 */
export interface Product {
  id: number;
  name: string;
  price: number;
  currency: string;
  stock: number;
  updatedAt: Date;
}

export class ProductApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ProductApiError';
  }
}

export class ProductClient {
  constructor(private readonly baseUrl: string) {}

  /**
   * Devuelve el producto, o `null` cuando el proveedor responde 404 PRODUCT_NOT_FOUND.
   * Cualquier otra respuesta no exitosa se considera un error.
   */
  async getProduct(id: number): Promise<Product | null> {
    const response = await fetch(`${this.baseUrl}/products/${id}`, {
      headers: { Accept: 'application/json' },
    });

    if (response.status === 404) {
      const body = (await response.json()) as { error?: string };
      if (body.error === 'PRODUCT_NOT_FOUND') {
        return null;
      }
      throw new ProductApiError(404, `404 inesperado: ${JSON.stringify(body)}`);
    }

    if (!response.ok) {
      throw new ProductApiError(response.status, `Error del catálogo (${response.status})`);
    }

    const body = (await response.json()) as Record<string, unknown>;
    return toProduct(body);
  }
}

function toProduct(body: Record<string, unknown>): Product {
  const { id, name, price, currency, stock, updatedAt } = body;
  if (
    typeof id !== 'number' ||
    typeof name !== 'string' ||
    typeof price !== 'number' ||
    typeof currency !== 'string' ||
    typeof stock !== 'number' ||
    typeof updatedAt !== 'string'
  ) {
    throw new ProductApiError(200, `Respuesta con formato inesperado: ${JSON.stringify(body)}`);
  }
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    throw new ProductApiError(200, `Fecha inválida: ${updatedAt}`);
  }
  return { id, name, price, currency, stock, updatedAt: date };
}
