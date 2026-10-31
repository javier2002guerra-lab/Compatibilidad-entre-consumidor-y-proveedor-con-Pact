/**
 * Repositorio de productos en memoria.
 * En las pruebas de verificación es la dependencia CONTROLADA: los estados del
 * proveedor (provider states) lo vacían y lo siembran con datos conocidos.
 */
export interface ProductRecord {
  id: number;
  name: string;
  price: number;
  currency: string;
  stock: number;
  updatedAt: Date;
}

export class ProductRepository {
  private products = new Map<number, ProductRecord>();

  findById(id: number): ProductRecord | undefined {
    return this.products.get(id);
  }

  save(product: ProductRecord): void {
    this.products.set(product.id, { ...product });
  }

  clear(): void {
    this.products.clear();
  }
}
