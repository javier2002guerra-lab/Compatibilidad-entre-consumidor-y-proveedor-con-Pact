# Compatibilidad entre consumidor y proveedor con Pact

Pruebas de contrato dirigidas por el consumidor (*consumer-driven contract testing*) con
[Pact JS](https://docs.pact.io/implementation_guides/javascript/readme), escritas en **TypeScript**.

| Rol | Nombre en el contrato | Código |
|---|---|---|
| Consumidor | `ProductWebApp` | [`src/consumer/productClient.ts`](src/consumer/productClient.ts) (cliente HTTP real) y [`src/consumer/productView.ts`](src/consumer/productView.ts) (lógica que lo usa) |
| Proveedor | `ProductCatalogAPI` | [`src/provider/app.ts`](src/provider/app.ts) (API Express) y [`src/provider/productRepository.ts`](src/provider/productRepository.ts) |
| Contrato generado | `ProductWebApp-ProductCatalogAPI.json` | [`pacts/`](pacts/) |

## Caso de uso

La aplicación consumidora muestra la **ficha de un producto**. Para ello llama a
`GET /products/:id` y usa:

| Campo | Uso en el consumidor | Matcher |
|---|---|---|
| `id` | identifica el producto (`number`) | `like(10)` (tipo number) |
| `name` | título de la ficha | `string()` |
| `price` | etiqueta `price.toFixed(2)` → `"49.90 USD"` (`number`) | `like(49.9)` (tipo number) |
| `currency` | se concatena en la etiqueta | `regex('^[A-Z]{3}$')` |
| `stock` | `stock > 0` → "En stock" / "Agotado" (`number`) | `like(12)` (tipo number) |
| `updatedAt` | se convierte a `Date` → "última actualización" | `datetime("yyyy-MM-dd'T'HH:mm:ss.SSSX")` |
| `error` (404) | si vale `PRODUCT_NOT_FOUND` el cliente devuelve `null` | valor literal exacto |
| `message` (404) | informativo | `string()` |

> **Por qué `like()` y no `integer()`/`decimal()` en los campos numéricos:** el core de Pact
> acepta strings numéricos (`"12"`, `"49.90"`) con los matchers `integer` y `decimal`. Lo
> comprobamos al hacer la práctica: con `decimal()` el cambio incompatible *no se detectaba*.
> Como el cliente exige `typeof price === 'number'`, el matcher correcto es el de tipo.

### Interacciones del contrato

| # | Estado del proveedor (precondición) | Solicitud | Respuesta esperada | Interpretación del consumidor |
|---|---|---|---|---|
| 1 | `existe el producto con id 10` | `GET /products/10`, `Accept: application/json` | `200`, JSON con `id, name, price, currency, stock, updatedAt` | `Product` con `updatedAt: Date`; ficha `{found: true, priceLabel: "49.90 USD", availability: "En stock", lastUpdate: "2026-10-01"}` |
| 2 | `no existe el producto con id 999` | `GET /products/999`, `Accept: application/json` | `404`, `{ "error": "PRODUCT_NOT_FOUND", "message": <texto> }` | `getProduct()` devuelve `null`; ficha `{found: false, title: "Producto no disponible"}` (no es un error de la app) |

## Requisitos y versiones

Probado en Windows 11 con:

| Herramienta | Versión |
|---|---|
| Node.js | 22.10.0 (requiere ≥ 18, por `fetch` nativo) |
| npm | 10.9.0 |
| TypeScript | 5.9.3 |
| @pact-foundation/pact | 13.2.0 (especificación Pact **V4**) |
| Jest / ts-jest | 29.7.0 / 29.4.15 |
| Express | 4.22.3 |
| Git | necesario para aplicar el parche del cambio incompatible |

No se necesita Pact Broker, base de datos, Docker ni credenciales.

## Instalación

```bash
git clone https://github.com/javier2002guerra-lab/Compatibilidad-entre-consumidor-y-proveedor-con-Pact.git
cd Compatibilidad-entre-consumidor-y-proveedor-con-Pact
git checkout v1.0.0     # versión entregada
npm ci
```

No hay configuración adicional: las pruebas levantan los servidores en puertos libres.
La telemetría anónima de Pact se desactiva en `jest.config.js` (`PACT_DO_NOT_TRACK=true`).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run test:consumer` | Borra `pacts/`, ejecuta el **cliente real** contra el servidor simulado de Pact y **genera** `pacts/ProductWebApp-ProductCatalogAPI.json` |
| `npm run test:provider` | Levanta la API real y **verifica** el contrato contra ella |
| `npm run test:contract` | Las dos anteriores en orden |
| `npm run demo:breaking` | Aplica el cambio incompatible, verifica (debe fallar), revierte y verifica de nuevo (debe pasar) |
| `npm run build` | Comprobación de tipos (`tsc --noEmit`) |
| `npm run start:provider` | Arranca la API manualmente en `http://localhost:3000` (ej.: `/products/10`) |

## Preparación de estados del proveedor

Los estados están en [`test/provider/productApi.verify.test.ts`](test/provider/productApi.verify.test.ts):

- `beforeEach` del `Verifier` vacía el repositorio antes de **cada** interacción.
- `existe el producto con id 10` → vacía y siembra el producto 10 con datos fijos.
- `no existe el producto con id 999` → vacía el repositorio.

Cada estado construye todo lo que necesita desde cero, así que el resultado no depende del
orden de ejecución ni de interacciones anteriores.

### Dependencias reales y controladas

| Durante… | Real | Controlado / simulado |
|---|---|---|
| Prueba del consumidor | `ProductClient` y `loadProductView` (código de la app), `fetch` de Node, HTTP | El proveedor: lo sustituye el **servidor simulado de Pact** |
| Verificación del proveedor | App Express completa (rutas, validación, controlador, serialización JSON) en un puerto HTTP real | `ProductRepository` en memoria, sembrado por los *state handlers*; las solicitudes las reproduce el verificador de Pact |

El contrato no sustituye las pruebas funcionales del proveedor (por ejemplo, la validación
`400 INVALID_ID` no forma parte del contrato porque el consumidor no la usa).

## Cambio incompatible (reproducible y reversible)

El parche [`breaking-change/price-as-string.patch`](breaking-change/price-as-string.patch)
cambia una línea del proveedor para que `price` se envíe como **string** (`"49.90"`) en lugar
de **number** (`49.9`):

```diff
-      price: product.price,
+      price: product.price.toFixed(2), // CAMBIO INCOMPATIBLE: el precio pasa de number a string
```

**Opción automática** (no deja el código roto: revierte siempre, incluso con error o Ctrl+C):

```bash
npm run test:consumer   # genera el contrato
npm run demo:breaking
```

**Opción manual:**

```bash
npm run breaking:apply  # aplica el parche
npm run test:provider   # FALLA: $.price -> Expected '49.90' (String) to be the same type as 49.9 (Decimal)
npm run breaking:revert # revierte el parche
npm run test:provider   # PASA
git status              # src/provider/app.ts sin cambios
```

Fallo esperado en la verificación con el parche aplicado:

```
una solicitud del producto 10
   Given existe el producto con id 10
  returns a response which
    has status code 200 (OK)
    has a matching body (FAILED)

1.1) has a matching body
     $.price -> Expected '49.90' (String) to be the same type as 49.9 (Decimal)
```

## Estructura

```
src/consumer/      cliente real + lógica de la ficha (consumidor)
src/provider/      API Express + repositorio en memoria (proveedor)
test/consumer/     prueba de contrato del consumidor (genera el pact)
test/provider/     verificación del proveedor + state handlers
pacts/             contrato generado por las pruebas (no editar a mano)
breaking-change/   parche del cambio incompatible
scripts/           demostración automática de ruptura y corrección
docs/              informe PDF y capturas de evidencia
```
