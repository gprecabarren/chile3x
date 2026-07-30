import Link from "next/link";
import { safeAccountReturnTo } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string }> }) {
  const params = await searchParams;
  const returnTo = safeAccountReturnTo(params.return_to ?? null);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-brand" href="/">CHILE<span>3X</span></Link>
        <p className="eyebrow">CUENTA DE ANUNCIANTE</p>
        <h1>Vuelve a tu panel.</h1>
        <p>Gestiona tus perfiles, actualiza tu aviso y consulta el estado de revisión.</p>
        {params.error && <p className="form-alert" role="alert">El correo o la contraseña no coinciden.</p>}
        <form action="/api/auth/login" method="post" className="auth-form">
          <input name="return_to" type="hidden" value={returnTo} />
          <label>Correo electrónico<input name="email" type="email" required maxLength={160} autoComplete="email" /></label>
          <label>Contraseña<input name="password" type="password" required autoComplete="current-password" /></label>
          <button className="button button-primary" type="submit">Ingresar</button>
        </form>
        <p className="auth-switch">¿Aún no publicas? <Link href={`/registro?return_to=${encodeURIComponent(returnTo)}`}>Crear cuenta</Link></p>
      </section>
    </main>
  );
}
