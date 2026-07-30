# Chile3X

Directorio para adultos de alcance nacional: perfiles, agencias y arriendos.
El proyecto está pensado para operar con Cloudflare Workers, D1 y R2, sin
depender de WordPress ni de una suscripción de hosting inicial.

## Estado actual

La primera pantalla pública y el modelo de datos del MVP ya están definidos.
Las fichas que se ven en la portada son de demostración: no hay perfiles reales
ni funciones de contacto activas todavía.

La siguiente etapa habilitará recursos de Cloudflare y construirá:

- registro y acceso de anunciantes;
- panel de revisión manual y publicación;
- perfiles públicos, filtros, favoritos, reacciones y reseñas moderadas;
- carga de fotos y videos a R2;
- pausas y periodos de avisos administrados manualmente.

El detalle de alcance y decisiones tomadas desde los requerimientos históricos
está en [docs/product-scope.md](docs/product-scope.md).

## Desarrollo local

Requiere Node.js 22.13 o superior.

```bash
pnpm install
pnpm dev
pnpm build
pnpm db:generate
```

## Arquitectura

- **Interfaz y servidor:** React con vinext sobre Cloudflare Workers.
- **Base de datos:** Cloudflare D1 + Drizzle ORM.
- **Archivos públicos moderados:** Cloudflare R2.
- **Autenticación:** se incorporará antes del registro público, usando un
  proveedor compatible con Workers y sin almacenar contraseñas en texto plano.

Las uniones lógicas de infraestructura están declaradas en
[.openai/hosting.json](.openai/hosting.json): `DB` para D1 y `MEDIA` para
R2. Los nombres físicos de los recursos se configuran al desplegar.

> R2 mantiene una cuota gratuita mensual, pero Cloudflare solicita activar su
> suscripción de uso y un medio de pago antes de poder crear un bucket. No se
> debe activar hasta que Chile3X necesite recibir fotos o videos reales.

## Principios de operación

- Solo personas mayores de 18 años.
- Cada perfil, reseña y archivo pasa por moderación antes de quedar público.
- Chile3X es un directorio: no interviene en acuerdos entre anunciantes y
  visitantes.
- No se almacenan documentos de identidad ni certificados médicos como
  archivos públicos. Una eventual validación médica se registra solo como
  estado de revisión.
- Los pagos quedan fuera de la primera activación: los planes se controlan
  manualmente hasta definir un medio de pago apto para esta categoría.
