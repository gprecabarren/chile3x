import type {ReactNode} from "react";
import {PublicHeader} from "@/app/directorio/_components";
import {DirectoryCityBar} from "@/app/directorio/DirectoryCityBar";
export function PrivateSampleShell({children}:{children:ReactNode;advertiserWhatsapp?:unknown}) {
  return <main className="directory-root private-sample-root"><PublicHeader preview /><DirectoryCityBar kind="escort" preview />{children}</main>;
}
