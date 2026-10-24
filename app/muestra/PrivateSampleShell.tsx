import type {ReactNode} from "react";
import {OfficialChile3xLogo} from "@/app/OfficialChile3xLogo";
export function PrivateSampleShell({children}:{children:ReactNode;advertiserWhatsapp?:unknown}) {
  return <><header className="sample-public-header"><OfficialChile3xLogo /><span>Presentación privada · No publicada</span></header>{children}<footer className="sample-public-footer">Chile3X · Vista de muestra. No recibe mensajes, reseñas ni estadísticas públicas.</footer></>;
}
