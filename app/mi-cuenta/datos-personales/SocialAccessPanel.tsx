import Link from "next/link";
import { authEventLabel, socialProviderLabels, type getAccountSocialAccess, type SocialProvider } from "@/lib/account-social-access";

export function SocialAccessPanel({ access, hasPassword, xEnabled }: { access: Awaited<ReturnType<typeof getAccountSocialAccess>>; hasPassword: boolean; xEnabled: boolean }) {
  return <section className="account-social-access" id="accesos">
    <p className="eyebrow">SEGURIDAD</p><h2>Métodos de acceso</h2>
    <p>Desvincular un servicio no cambia la verificación de tu correo. Necesitas una contraseña para seguir entrando a tu cuenta.</p>
    <div className="account-access-row"><div><strong>Correo y contraseña</strong><small>{hasPassword ? "Configurada" : "Aún no tienes contraseña"}</small></div><Link href="#password">{hasPassword ? "Cambiar" : "Crear contraseña"}</Link></div>
    {(Object.keys(socialProviderLabels) as SocialProvider[]).map(provider => {
      const linked = access.linked[provider];
      if (!linked) return null;
      return <div className="account-access-row" key={provider}><div><strong>{socialProviderLabels[provider]}</strong><small>Vinculado el {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(linked.createdAt.includes("T") ? linked.createdAt : `${linked.createdAt.replace(" ", "T")}Z`))}</small></div>
        {hasPassword ? <details><summary>Desvincular</summary><form action="/api/mi-cuenta/accesos" method="post">
          <strong>¿Desvincular {socialProviderLabels[provider]}?</strong><p>Dejarás de ingresar mediante este servicio. Tu correo conservará su estado y podrás entrar con contraseña. Se cerrarán las demás sesiones.</p>
          <input name="provider" type="hidden" value={provider} /><input name="confirmation" type="hidden" value="unlink" />
          <label>Confirma tu contraseña<input name="current_password" type="password" required maxLength={256} autoComplete="current-password" /></label>
          <button className="button button-outline" type="submit">Confirmar desvinculación</button>
        </form></details> : <Link href="#password">Crear contraseña para desvincular</Link>}
      </div>;
    })}
    {xEnabled && !access.linked.x && <div className="account-access-row"><div><strong>X</strong><small>No vinculado</small></div>{hasPassword ? <details><summary>Vincular X</summary><form action="/api/auth/x/start" method="post"><input name="intent" type="hidden" value="link" /><input name="return_to" type="hidden" value="/mi-cuenta/datos-personales" /><label>Confirma tu contraseña<input name="current_password" type="password" required maxLength={256} autoComplete="current-password" /></label><button className="button button-outline" type="submit">Continuar con X</button></form></details> : <Link href="#password">Primero crea una contraseña</Link>}</div>}
    {access.events.length > 0 && <details className="account-access-history"><summary>Historial de cambios de acceso</summary><ul>{access.events.map(event => <li key={event.id}><span>{authEventLabel(event)}</span><time dateTime={event.createdAt}>{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(event.createdAt))}</time></li>)}</ul></details>}
  </section>;
}
