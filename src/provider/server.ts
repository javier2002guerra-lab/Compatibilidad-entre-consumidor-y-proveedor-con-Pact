import { createApp } from './app';
import { ProductRepository } from './productRepository';

// Arranque manual del proveedor con datos de ejemplo (no lo usan las pruebas).
const repository = new ProductRepository();
repository.save({
  id: 10,
  name: 'Teclado mecánico',
  price: 49.9,
  currency: 'USD',
  stock: 12,
  updatedAt: new Date('2026-10-01T10:00:00.000Z'),
});

const port = Number(process.env.PORT ?? 3000);
createApp(repository).listen(port, () => {
  console.log(`ProductCatalogAPI escuchando en http://localhost:${port}`);
});
