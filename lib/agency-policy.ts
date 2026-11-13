export const AGENCY_INVITATION_DAYS = 7;
export const AGENCY_PERSONAL_ESCORT_LIMIT = 1;
export const AGENCY_WORKFLOW_VERSION = "2026.11.13.1";
export const AGENCY_CONSENT_VERSION = "agency-management-2026.10.31";
export const AGENCY_PROFILE_GUIDE = [
  {
    type: "escort",
    title: "Escort personal",
    steps: [
      "Crea tu cuenta",
      "Prepara tu único Escort personal",
      "Envía a revisión",
      "Publica y decide quién lo gestiona",
    ],
    text: "Un Escort personal fuera de la papelera por cuenta. Puedes tener además agencias y arriendos. Puedes aceptar varias asociaciones y retirar la gestión o salir de cada agencia cuando quieras.",
  },
  {
    type: "agency",
    title: "Agencia",
    steps: [
      "Crea el anuncio de agencia",
      "Invita Escorts existentes o crea perfiles gestionados",
      "Envía cada anuncio a revisión",
      "Propón vincular un perfil a una cuenta personal",
    ],
    text: "Cada agencia puede preparar varios Escorts autorizados con ID propio, también con ayuda de administración. Los perfiles gestionados quedan ligados a su agencia y disponen de un cupo separado. La vinculación a una cuenta personal exige que su titular acepte y que administración compruebe la titularidad. Después la persona conserva el anuncio y decide los permisos de la agencia.",
  },
  {
    type: "rental",
    title: "Arriendo",
    steps: [
      "Crea tu cuenta",
      "Prepara uno o varios arriendos",
      "Envía a revisión",
      "Gestiona sus datos, contactos y medios",
    ],
    text: "Admite varios anuncios por cuenta. Cada anuncio corresponde a un espacio y conserva su propia revisión. No concede permisos sobre cuentas o anuncios de personas que utilicen el espacio.",
  },
  {
    type: "content",
    title: "Venta de contenido",
    steps: [
      "Crea tu Escort personal",
      "Indica si solo vendes contenido",
      "Envía a revisión",
      "Administra tu contenido y sus accesos",
    ],
    text: "Es una modalidad del anuncio personal, no un cupo adicional. Si solo vendes contenido y no eres escort, apareces únicamente en Venta de contenido y no puedes incorporarte como Escort de una agencia. La biblioteca privada pertenece a la cuenta y sus accesos se gestionan por separado.",
  },
] as const;
