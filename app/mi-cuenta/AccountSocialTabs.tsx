import Link from "@/app/NavigationLink";

export function AccountSocialTabs({ active }: { active: "favorites" | "comments" }) {
  return <nav className="account-social-tabs" aria-label="Favoritos y comentarios">
    <Link href="/mi-cuenta/favoritos" aria-current={active === "favorites" ? "page" : undefined}>Favoritos</Link>
    <Link href="/mi-cuenta/comentarios" aria-current={active === "comments" ? "page" : undefined}>Comentarios</Link>
  </nav>;
}
