# Respaldo externo cifrado en Google Drive

Chile3X conserva sus datos operativos en Cloudflare. Este flujo añade una segunda
copia **cifrada** y separada en el Drive de `chile3x.site@gmail.com`.

La carpeta raíz es `Chile3X - Respaldos` y contiene:

- `01 - Base de datos`: exportación SQL diaria de D1.
- `02 - Medios cifrados`: copia incremental de R2, sin propagar borrados.
- `03 - Manifiestos`: comprobantes cifrados de cada ejecución.
- `04 - Recuperacion y configuracion`: material de recuperación conservado fuera
  del repositorio.

El workflow se ejecuta a diario a las 09:17 UTC (temprano en Chile) y también
se puede iniciar manualmente desde **Actions > Chile3X off-site backup**.
No se ejecuta hasta que existan todos los secretos indicados más abajo.

## Barreras de costo y retención

- El workflow usa `rclone copy`, nunca `sync`: una eliminación en R2 no borra
  el respaldo de Drive.
- Antes de cargar, se detiene si Drive tiene menos de 1 GiB disponible.
- R2 se lee de forma incremental: solo se copian objetos nuevos o modificados.
- La base se exporta antes de la franja de mayor uso. Una exportación de D1 puede
  mantener la base ocupada durante el proceso, por lo que se programa fuera de
  horario de atención.
- No hay planes de pago ni autorización de sobreconsumo dentro del workflow.
  Aun así, R2 conserva sus tarifas de excedente normales si la cuenta supera sus
  cuotas gratuitas; se debe observar el panel de uso de Cloudflare al crecer.

## Secretos requeridos en GitHub

Todos se agregan en `Settings > Secrets and variables > Actions` del repositorio
`gprecabarren/chile3x`. No se deben guardar en código, D1, R2 ni variables
públicas.

| Secreto | Propósito | Alcance mínimo |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Cuenta de Cloudflare | Identificador, no se publica por comodidad. |
| `CF_D1_DATABASE_ID` | Base `chile3x-db` | Identificador de la base. |
| `CF_D1_EXPORT_TOKEN_EDIT` | Exportar la base | Token API de Cloudflare con **Account > D1 > Edit**, limitado a la cuenta. Cloudflare exige este permiso para iniciar la exportación SQL. |
| `R2_BACKUP_ACCESS_KEY_ID` | Leer medios | Credencial R2 S3. |
| `R2_BACKUP_SECRET_ACCESS_KEY` | Leer medios | Credencial R2 S3. |
| `R2_BACKUP_ENDPOINT` | Endpoint R2 | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. |
| `RCLONE_GDRIVE_CONFIG` | Acceso restringido a Drive | Configuración del remoto `gdrive`, con `root_folder_id` de la carpeta raíz. |
| `RCLONE_CRYPT_PASSWORD` | Cifrado de archivos | Frase de recuperación única y fuerte. |
| `RCLONE_CRYPT_PASSWORD2` | Cifrado de nombres | Segunda frase de recuperación única y fuerte. |

### Cloudflare

1. Crear un token API separado, con permiso de cuenta **D1: Edit**. Cloudflare
   exige ese permiso para iniciar una exportación SQL, aunque el workflow solo
   llama al endpoint de exportación. No usar la Global API Key ni el token del
   despliegue.
2. En R2, crear un token S3 **Object Read only** limitado al bucket
   `chile3x-media`. Guardar el Access Key ID, Secret Access Key y endpoint solo
   como secretos de GitHub. El Secret Access Key se muestra una vez.

### Google Drive y rclone

1. Crear un cliente OAuth propio de Google para Drive y autorizarlo con
   `chile3x.site@gmail.com`. No se usa el cliente compartido de rclone, que
   está siendo retirado durante 2026.
2. Crear el remoto `gdrive` con `root_folder_id` igual al identificador de
   `Chile3X - Respaldos` y conservar solo su configuración como
   `RCLONE_GDRIVE_CONFIG`.
3. Generar y guardar de forma offline las dos frases de recuperación. Si se
   pierden, los medios cifrados no se podrán restaurar.

Durante la instalación inicial de Chile3X, esas dos frases también se
guardaron como credenciales genéricas locales de Windows en el equipo de
administración. No se incluyen en Git, D1, R2 ni dentro de la carpeta de
Drive. Si se cambia de equipo o se elimina ese perfil de Windows, hay que
registrar nuevamente las frases antes de depender de esta copia para una
restauración.

La configuración se restringe a la carpeta de respaldos. El workflow no recibe
permisos de escritura sobre Cloudflare y sus credenciales R2 son solo lectura.

## Prueba inicial y restauración

La primera ejecución manual debe incluir base y medios. Confirmar en Drive que
existen nuevos objetos dentro de las tres carpetas. Los nombres de archivo no
serán legibles dentro de las carpetas cifradas: es intencional.

Para restaurar:

1. Instalar rclone y recrear el remoto Drive junto con los dos remotos `crypt`.
2. Descargar la fecha requerida de `drivecrypt-db:` y restaurar el SQL en una
   base D1 de recuperación, nunca directamente sobre producción.
3. Descargar `drivecrypt-media:` y validar los archivos antes de reponerlos en
   R2.
4. Mantener la frase de recuperación fuera de GitHub y fuera de esta carpeta de
   Drive.
