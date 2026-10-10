import Link from "@/app/NavigationLink";
import type { AccountUser } from "@/lib/auth";
import { emailVerificationLabel, emailVerificationState } from "@/lib/email-verification-policy";

export function AccountIdentityCard({ user }: { user: AccountUser }) {
  const verified = emailVerificationState(user) === "verified";
  return <section id="cuenta" className="account-identity-card" aria-labelledby="account-identity-title">
    <div><p className="eyebrow">TU CUENTA</p><h2 id="account-identity-title">Datos de acceso</h2><p>Tu correo es privado. El usuario identifica tu cuenta, no cambia el @ de tus anuncios.</p><Link href="/mi-cuenta/datos-personales">Editar mis datos y contraseña →</Link></div>
    <div className="account-identity-values">
      <div><span>Correo electrónico</span><strong>{user.email}</strong><small className={verified ? "is-verified" : undefined}>{emailVerificationLabel(user)}</small></div>
      <div><span>Nombre de usuario</span><strong>{user.username ? `@${user.username}` : "Sin configurar"}</strong>
        <details className="account-username-edit"><summary>Editar usuario</summary><form action="/api/mi-cuenta/datos" method="post">
          <input type="hidden" name="action" value="change_username" />
          <label htmlFor="account-username">Nuevo nombre de usuario</label>
          <input id="account-username" name="username" required minLength={3} maxLength={48} defaultValue={user.username ?? ""} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby="account-username-help" />
          <small id="account-username-help">Entre 3 y 48 caracteres: letras, números o guiones. Debe estar disponible.</small>
          <button className="button button-primary" type="submit">Guardar usuario</button>
        </form></details>
      </div>
    </div>
  </section>;
}
