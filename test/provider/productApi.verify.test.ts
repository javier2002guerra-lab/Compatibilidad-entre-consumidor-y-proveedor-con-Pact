import path from 'path';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { Verifier } from '@pact-foundation/pact';
import { createApp } from '../../src/provider/app';
import { ProductRepository } from '../../src/provider/productRepository';

/**
 * Verificación del proveedor.
 * - REAL: la aplicación Express (rutas, validación, controlador y serialización JSON)
 *   escuchando en un puerto HTTP real.
 * - CONTROLADO: el repositorio en memoria, que cada estado vacía y siembra.
 */
const repository = new ProductRepository();
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApp(repository).listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Verificación de ProductCatalogAPI contra el contrato de ProductWebApp', () => {
  it('cumple todas las interacciones del pact', async () => {
    const verifier = new Verifier({
      provider: 'ProductCatalogAPI',
      providerBaseUrl: baseUrl,
      pactUrls: [path.resolve(__dirname, '../../pacts/ProductWebApp-ProductCatalogAPI.json')],
      logLevel: 'warn',
      // Cada interacción parte de un repositorio vacío: los estados no dependen del orden.
      beforeEach: async () => {
        repository.clear();
      },
      stateHandlers: {
        'existe el producto con id 10': async () => {
          repository.clear();
          repository.save({
            id: 10,
            name: 'Teclado mecánico',
            price: 49.9,
            currency: 'USD',
            stock: 12,
            updatedAt: new Date('2026-10-01T10:00:00.000Z'),
          });
          return { description: 'producto 10 sembrado' };
        },
        'no existe el producto con id 999': async () => {
          repository.clear();
          return { description: 'repositorio vacío' };
        },
      },
    });

    // Si alguna interacción no se cumple, verifyProvider() rechaza y la prueba falla.
    await verifier.verifyProvider();
  });
});
