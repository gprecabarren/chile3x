import type {ReactNode} from "react";
import {OfficialChile3xLogo} from "@/app/OfficialChile3xLogo";
export function PrivateSampleShell({children}:{children:ReactNode;advertiserWhatsapp?:unknown}) {
  return <main className="directory-root private-sample-root"><header className="sample-public-header"><OfficialChile3xLogo /><span>Presentación privada · No publicada</span></header>{children}</main>;
}
