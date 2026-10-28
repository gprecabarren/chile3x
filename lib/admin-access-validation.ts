export function normalizeGithubLogin(value: string) { return value.trim().replace(/^@/, "").toLowerCase(); }
export function validGithubLogin(value: string) { return /^(?=.{1,39}$)[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/.test(value); }
export function validAdminEmail(value: string) {
  if (value.length > 160 || /[^\x21-\x7e]/.test(value)) return false;
  const parts = value.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length > 0 && local.length <= 64 && /^[a-z\d!#$%&'*+/=?^_`{|}~.-]+$/i.test(local) && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..")
    && domain.length <= 253 && domain.includes(".") && domain.split(".").every(label => label.length <= 63 && /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label)) && /^[a-z]{2,63}$/i.test(domain.split(".").at(-1) ?? "");
}

export const ADMIN_ACCESS_NOTICES: Record<string, string> = {
  created: "El acceso quedó autorizado. GitHub deberá verificar el correo en el primer ingreso.",
  updated: "El nivel de acceso fue actualizado.", login_updated: "Se corrigió el usuario de la invitación. El correo y el nivel de acceso se conservaron.",
  revoked: "El acceso fue revocado y todas sus sesiones quedaron cerradas.", reactivated: "El acceso fue reactivado.", sessions_revoked: "Todas las sesiones de esa persona quedaron cerradas.",
  duplicate: "Ese usuario de GitHub ya tiene un acceso activo.",
  email_conflict: "Ese correo ya pertenece a una cuenta de anunciante o tester. Debes resolver esa cuenta antes de reservarlo para administración.",
  email_duplicate: "Ese correo ya está reservado para otra identidad administrativa.",
  invalid: "Revisa el usuario, el correo y el nivel seleccionado.", invalid_login: "El usuario de GitHub no tiene un formato válido. Escribe su usuario real, no el nombre visible ni una URL.",
  invalid_email: "El correo no tiene un formato válido. Revisa el nombre, el signo @ y el dominio.",
  github_missing: "Ese usuario no existe en GitHub. Comprueba el usuario que aparece debajo del nombre visible en su perfil.",
  github_organization: "El acceso requiere una cuenta personal de GitHub; no se puede autorizar una organización.",
  github_unavailable: "No se pudo comprobar la cuenta en GitHub. No se guardaron cambios; inténtalo nuevamente en unos minutos.",
  identity_bound: "Esta persona ya ingresó o la invitación cambió. Recarga la página; una identidad vinculada no puede reasignarse.",
  protected: "La identidad propietaria está protegida y no puede modificarse desde el panel.", missing: "Ese acceso ya no existe.",
};
