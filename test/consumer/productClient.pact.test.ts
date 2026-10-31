import path from 'path';
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { ProductClient } from '../../src/consumer/productClient';
import { loadProductView } from '../../src/consumer/productView';

/*
 * Elección de matchers (lo que el cliente realmente necesita proteger):
 * - id, price, stock -> like(): el cliente exige `typeof === 'number'`. Los matchers
 *   integer()/decimal() del core de Pact aceptan también strings numéricos ("12", "49.90"),
 *   por lo que NO detectarían que el proveedor cambie el tipo a string.
 * - name, message -> string(): cualquier texto.
 * - currency -> regex ISO-4217 de 3 letras: se concatena en la etiqueta de precio.
 * - updatedAt -> datetime ISO-8601: el cliente lo convierte a Date.
 * - error -> valor literal: el consumidor decide según 'PRODUCT_NOT_FOUND'.
 */
const { like, string, regex, datetime } = MatchersV3;

// El contrato se genera en ./pacts a partir de estas pruebas (no se escribe a mano).
const provider = new PactV4({
  consumer: 'ProductWebApp',
  provider: 'ProductCatalogAPI',
  dir: path.resolve(__dirname, '../../pacts'),
  logLevel: 'warn',
});

describe('Contrato ProductWebApp -> ProductCatalogAPI', () => {
  describe('GET /products/:id', () => {
    it('interacción 1: obtiene un producto existente y la ficha lo interpreta', async () => {
      const interaction = provider
        .addInteraction()
        .given('existe el producto con id 10')
        .uponReceiving('una solicitud del producto 10')
        .withRequest('GET', '/products/10', (req) => req.headers({ Accept: 'application/json' }))
        .willRespondWith(200, (res) =>
          res.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: like(10),
            name: string('Teclado mecánico'),
            price: like(49.9),
            currency: regex('^[A-Z]{3}$', 'USD'),
            stock: like(12),
            updatedAt: datetime("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2026-10-01T10:00:00.000Z'),
          }),
        );

      await interaction.executeTest(async (mockServer) => {
        // Cliente REAL de la aplicación apuntando al servidor simulado de Pact.
        const client = new ProductClient(mockServer.url);

        const product = await client.getProduct(10);
        expect(product).not.toBeNull();
        expect(product!.id).toBe(10);
        expect(product!.price).toBeCloseTo(49.9);
        expect(product!.updatedAt).toBeInstanceOf(Date);
        expect(product!.updatedAt.toISOString()).toBe('2026-10-01T10:00:00.000Z');

        const view = await loadProductView(client, 10);
        expect(view).toEqual({
          found: true,
          title: 'Teclado mecánico',
          priceLabel: '49.90 USD',
          availability: 'En stock',
          lastUpdate: '2026-10-01',
        });
      });
    });

    it('interacción 2: producto inexistente -> el cliente devuelve null y la ficha muestra "no disponible"', async () => {
      const interaction = provider
        .addInteraction()
        .given('no existe el producto con id 999')
        .uponReceiving('una solicitud de un producto inexistente')
        .withRequest('GET', '/products/999', (req) => req.headers({ Accept: 'application/json' }))
        .willRespondWith(404, (res) =>
          res.headers({ 'Content-Type': 'application/json' }).jsonBody({
            // Valor exacto: el consumidor decide su comportamiento según este código.
            error: 'PRODUCT_NOT_FOUND',
            message: string('No existe un producto con id 999'),
          }),
        );

      await interaction.executeTest(async (mockServer) => {
        const client = new ProductClient(mockServer.url);

        await expect(client.getProduct(999)).resolves.toBeNull();

        const view = await loadProductView(client, 999);
        expect(view).toEqual({ found: false, title: 'Producto no disponible' });
      });
    });
  });
});
