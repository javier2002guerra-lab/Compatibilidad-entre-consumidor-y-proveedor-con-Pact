import { ProductClient } from './productClient';

/**
 * Lógica de la aplicación consumidora: prepara lo que la ficha de producto muestra.
 * Usa: name, price + currency (precio formateado), stock (disponibilidad) y updatedAt.
 */
export interface ProductView {
  found: boolean;
  title: string;
  priceLabel?: string;
  availability?: 'En stock' | 'Agotado';
  lastUpdate?: string; // AAAA-MM-DD
}

export async function loadProductView(client: ProductClient, id: number): Promise<ProductView> {
  const product = await client.getProduct(id);

  if (product === null) {
    return { found: false, title: 'Producto no disponible' };
  }

  return {
    found: true,
    title: product.name,
    priceLabel: `${product.price.toFixed(2)} ${product.currency}`,
    availability: product.stock > 0 ? 'En stock' : 'Agotado',
    lastUpdate: product.updatedAt.toISOString().slice(0, 10),
  };
}
