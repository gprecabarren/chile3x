# Alcance de producto — MVP Chile3X

Este documento consolida, sin datos privados, los requerimientos históricos del
proyecto y las decisiones actuales. Sirve como referencia antes de implementar
cada módulo.

## Público y cobertura

- Directorio exclusivamente para mayores de 18 años.
- Cobertura inicial: todas las regiones de Chile, con navegación por región,
  ciudad y comuna.
- Tipos de anuncio: acompañante, agencia y arriendo.
- Chile3X actúa como vitrina; el contacto y cualquier acuerdo ocurren
  directamente entre visitante y anunciante.

## Incluido en el MVP

1. Portada, rutas por ubicación y páginas de perfil optimizadas para SEO.
2. Filtros combinables por ubicación, tipo de aviso, categoría, etiquetas,
   nivel de publicación, verificación y disponibilidad.
3. Alta de anunciante y flujo de perfil en borrador, revisión, aprobación,
   rechazo, publicación, pausa y vencimiento.
4. Fotos y videos en almacenamiento de objetos, con límite y moderación antes
   de ser públicos.
5. Etiquetas de nivel exclusivas: Gold, Premium o VIP.
6. Perfiles de agencia y relación entre la agencia y sus miembros.
7. Estados temporales, favoritos, reacciones y reseñas moderadas.
8. Periodos y pausas de avisos registrados por administración mientras el
   cobro sea manual.
9. Panel administrativo para revisar perfiles, media, reseñas y periodos.

## Fuera de la primera activación pública

- Foro y conversaciones entre usuarios.
- Venta de contenido o suscripciones de creador.
- Cobro, pago y renovación automatizados.
- Estadísticas avanzadas para anunciantes.
- Inicio de sesión con Google; se evaluará después del acceso por correo.

## Privacidad y moderación

- Las pruebas de identidad o información de salud no se publicarán ni se
  conservarán como archivos del producto inicial. Si se realiza una revisión
  manual, el perfil solo conserva el resultado de esa revisión.
- Los videos, imágenes, reseñas y estados quedan pendientes hasta la
  aprobación de un administrador.
- El perfil público expone únicamente los datos de contacto que el anunciante
  autorice.
- Se diseñarán términos, consentimiento y procesos de eliminación/retención
  antes de recibir datos reales.

## Pagos y crecimiento posterior

El modelo de datos conserva periodos de publicación, planes y pausas para
operar manualmente al comienzo. Antes de activar cobros hay que seleccionar un
proveedor que permita explícitamente la categoría de actividad, validar las
obligaciones tributarias y de privacidad aplicables, y agregar webhooks,
conciliación y soporte.
