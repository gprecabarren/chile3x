# Enlace de inicio en los paneles — 23-10-2026

Alcance: sustituir exclusivamente el logo del encabezado lateral de administración y de Mi cuenta por `← Volver al inicio sitio web`, con destino `/`. Se conserva el logo público y el enlace de la barra superior existente.

- El enlace mantiene texto legible, flecha decorativa, foco visible y altura mínima de 44 px.
- Las reglas heredadas del recuadro del logo excluyen `.sidebar-return-site`; ya no cambian el enlace a una cuadrícula con fondo negro.
- No añade efectos, consultas, imágenes ni manejadores de navegación nuevos. Conserva cierre del menú al navegar, Escape y contención de foco existentes.
- No modifica permisos, metadatos, robots ni URLs públicas.

## Verificación local

- Compilación y TypeScript completos: correctos.
- ESLint de ambos componentes: sin errores ni avisos.
- 21 pruebas relacionadas correctas: administración, historias/navegación de cuenta, menús, fundamentos compartidos y nuevo enlace.
- Classic: administrador en 390 px y escritorio 1366 px; cuenta en 320 px y escritorio 1366 px.
- Liquid Glass: administrador en 320 px y escritorio; cuenta en 320/390 px y escritorio 1366 px.
- En móvil no hay solapamiento con la X. Altura observada del enlace: 48,5 px. Sin logo en ambos encabezados laterales.
- Navegación real al inicio por clic desde administrador y por Enter desde cuenta confirmada en Chrome. Las comprobaciones móviles son emuladas, no un iPhone físico.
- El capturador CDP dejó de responder; la evidencia visual se obtuvo con el navegador Chrome conectado mediante la extensión.
- Evidencias locales: `outputs/qa-sidebar-return-user-mobile.jpg` y `outputs/qa-sidebar-return-admin-mobile.jpg` (Liquid Glass, 320 px).

Solo se utilizaron las cuentas desechables locales ya existentes. Se restauraron el tema local Classic y el rol de vista local de usuario. No se desplegó ni se alteró producción: hay otros cambios anteriores pendientes de verificación en este mismo espacio de trabajo.
