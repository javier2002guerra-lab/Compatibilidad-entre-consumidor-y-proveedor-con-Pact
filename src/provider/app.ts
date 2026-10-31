import express, { Request, Response } from 'express';
import { ProductRepository } from './productRepository';

/**
 * API "ProductCatalogAPI" (proveedor).
 * GET /products/:id -> 200 con el producto, 404 si no existe, 400 si el id no es válido.
 */
export function createApp(repository: ProductRepository) {
  const app = express();

  app.get('/products/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'INVALID_ID', message: 'El id debe ser un entero positivo' });
    }

    const product = repository.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ error: 'PRODUCT_NOT_FOUND', message: `No existe un producto con id ${id}` });
    }

    return res.status(200).json({
      id: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      stock: product.stock,
      updatedAt: product.updatedAt.toISOString(),
    });
  });

  return app;
}
