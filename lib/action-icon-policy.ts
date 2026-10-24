import type { ActionIconName } from "@/app/ActionIcon";

// Deliberately conservative: unknown actions keep their text. Do not infer
// actions from URLs, replace brand icons, or decorate numeric/tab choices.
export function actionIconForLabel(label: string): ActionIconName | null {
  const text = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  if (!text || /[\p{Extended_Pictographic}←→↗×✕]/u.test(text)) return null;
  if (/\bwhatsapp\b/.test(text)) return "whatsapp";
  if (/\btelegram\b/.test(text)) return "telegram";
  if (/^volver a mostrar\b/.test(text)) return "eye";
  if (/^(?:volver al sitio web|volver|regresar|anterior)\b/.test(text)) return "back";
  if (/^cerrar sesion\b/.test(text)) return "logout";
  if (/^(?:eliminar|borrar|confirmar eliminacion|quitar|retirar|revocar|desvincular)\b/.test(text)) return "trash";
  if (/^(?:editar|modificar|corregir)\b/.test(text)) return "edit";
  if (/^(?:guardar|actualizar datos|actualizar configuracion)\b/.test(text)) return "save";
  if (/^(?:subir historias|agregar|anadir|crear|registrarse|publicar anuncio)\b/.test(text)) return "plus";
  if (/^(?:restaurar|reactivar|restablecer|reintentar|limpiar|recargar|actualizar|deshacer|cancelar)\b/.test(text)) return "refresh";
  if (/^(?:aplicar filtros|filtrar)\b/.test(text)) return "filter";
  if (/^(?:buscar|encontrar)\b/.test(text)) return "search";
  if (/^(?:enviar|publicar|responder|invitar|reenviar|solicitar)\b/.test(text)) return "send";
  if (/^(?:descargar|exportar)\b/.test(text)) return "download";
  if (/^(?:subir|cargar|seleccionar archivo)\b/.test(text)) return "upload";
  if (/^(?:copiar)\b/.test(text)) return "copy";
  if (/^(?:aprobar|aceptar|confirmar|marcar .*lei|marcar leida|verificar|habilitar|activar)\b/.test(text)) return "check";
  if (/^(?:cerrar|descartar|rechazar|deshabilitar|desactivar)\b/.test(text)) return "close";
  if (/^(?:ocultar|bloquear|documentos privados|contenido exclusivo)\b/.test(text)) return "lock";
  if (/^(?:estadisticas|rendimiento)\b/.test(text)) return "stats";
  if (/^(?:ver cuenta|mi cuenta|mis datos|ingresar|iniciar sesion)\b/.test(text)) return "user";
  if (/^(?:fotos|gestionar fotos|imagenes|galeria)\b/.test(text)) return "image";
  if (/^(?:videos)\b/.test(text)) return "video";
  if (/historias|estados/.test(text)) return "stories";
  if (/^(?:abrir|acceder|ir a|explorar|ver sitio)\b/.test(text)) return "open";
  if (/^(?:ver|previsualizar|revisar|gestionar|mostrar|volver a mostrar)\b/.test(text)) return "eye";
  if (/^(?:siguiente|continuar|entrar)\b/.test(text)) return "next";
  if (/^(?:llamar)\b/.test(text)) return "phone";
  if (/^(?:compartir)\b/.test(text)) return "share";
  if (/^(?:favoritos|me gusta|guardar favorito)\b/.test(text)) return "heart";
  if (/^(?:mensajes|conversar|comentar|comentarios)\b/.test(text)) return "chat";
  if (/^(?:correo|historial correos)\b/.test(text)) return "mail";
  if (/^(?:configurar|configuracion|ajustes)\b/.test(text)) return "settings";
  if (/^(?:reportar|reportes)\b/.test(text)) return "flag";
  if (/^(?:ayuda|contactar a soporte)\b/.test(text)) return "help";
  return null;
}
