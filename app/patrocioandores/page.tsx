import { permanentRedirect } from "next/navigation";

export default function MisspelledSponsorsRedirect() {
  permanentRedirect("/patrocinadores");
}
