# Acceso con X — estado y activación

Actualizado: 10 de octubre de 2026.

## Estado publicado

La integración está preparada y el botón aparece entre Google y Apple. Permanece deshabilitada mediante el ajuste `x_sign_in_status=disabled` (también es el valor predeterminado). La sección `/admin/configuracion/x` permite editar el Client ID, reemplazar el Client Secret y guardar el estado. No se compraron créditos ni se habilitó recarga automática.

La aplicación de X tiene permiso de solo lectura, solicitud de correo autorizada y tipo Web App confidencial. Su callback fijo es `https://chile3x.cl/api/auth/x/callback`. Sitio, términos y privacidad apuntan al dominio Chile3X. Las credenciales iniciales siguen como secretos de Cloudflare; un reemplazo desde el panel se almacena cifrado en D1 con AES-GCM, una clave privada `X_SETTINGS_ENCRYPTION_KEY` de Cloudflare y contexto específico para X. Ese registro privado está excluido de los ajustes públicos. Nunca se devuelve el secreto o su cifrado al HTML y el formulario vacío conserva la credencial existente.

## Antes de habilitar

1. Comprobar en el portal de X el saldo y los requisitos vigentes para consultar `/2/users/me`. Si se requieren créditos, el propietario debe decidir el presupuesto y completar la compra. El saldo era US$0 al configurar la integración.
2. Habilitar la bandera durante una prueba controlada con el propietario. Verificar registro nuevo, ingreso posterior, identidad existente, correo ausente/no confirmado y desvinculación. Si falla la consulta de identidad, mantener la bandera deshabilitada.
3. Confirmar la información de privacidad y la app consentida. La integración no publica, no lee mensajes privados y no solicita permisos de escritura o acceso permanente.

Para activar, usar `/admin/configuracion/x`, seleccionar Activado y confirmar expresamente la comprobación de requisitos. La bandera antigua `X_OAUTH_ENABLED` ya no controla el proveedor: el ajuste administrativo es la única fuente del estado, y se cierra por defecto si falta configuración. Los cambios se auditan sin secretos e invalidan intentos OAuth y registros pendientes, sin alterar cuentas ni anuncios. Mantener `--keep-vars` en los despliegues y conservar la clave de cifrado; no rotarla sin volver a cifrar las credenciales privadas. Nunca poner el Client Secret directamente en argumentos de comandos.

## Controles implementados

- OAuth 2.0 con PKCE S256, estado y cookie de navegador asociados, caducidad de diez minutos y consumo único.
- Solo se considera verificado un correo entregado como `confirmed_email`. Un correo ausente requiere completar y verificar uno mediante el flujo del sitio.
- No se fusionan cuentas por coincidencia de correo: una cuenta existente debe iniciar sesión con su método actual y vincular X desde Mis datos, confirmando su contraseña.
- Se mantienen validaciones de mayoría de edad, campos obligatorios, aceptación y separación de identidades administrativas.
- El token se usa para consultar identidad; se solicita su revocación al terminar y no se guarda como credencial permanente.
- Desvincular exige contraseña, conserva la verificación y los anuncios, registra el cambio y renueva las sesiones.

Las pruebas automatizadas cubren PKCE, permisos, correo confirmado, revocación y controles de acceso. La prueba completa contra X real continúa pendiente; una configuración guardada no equivale a un acceso validado.
