export type TelegramModerationConfiguration = {
  prohibitedTerms: string;
  maxLinksPerMessage: number;
  floodMaxMessages: number;
  strikeBanThreshold: number;
  temporaryRestrictionMinutes: number;
  autoBanEnabled: boolean;
};

export type TelegramModerationContext = {
  recentMessageCount: number;
  recentDuplicateCount: number;
  recentStrikeCount: number;
};

export type TelegramModerationDecision = {
  ruleCode: "flood" | "duplicate" | "link_abuse" | "credential_scam" | "private_data" | "illegal_content" | "prohibited_term";
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
  action: "warn" | "delete" | "restrict" | "ban";
};

function countLinks(text: string) {
  return text.match(/(?:https?:\/\/|www\.|t\.me\/|telegram\.me\/)/gi)?.length ?? 0;
}

function normalizedTerms(value: string) {
  return value.split(/\r?\n|,/).map((term) => term.trim().toLocaleLowerCase("es-CL")).filter((term) => term.length >= 3).slice(0, 200);
}

export function evaluateTelegramMessage(text: string, config: TelegramModerationConfiguration, context: TelegramModerationContext): TelegramModerationDecision | null {
  const normalized = text.normalize("NFKC").toLocaleLowerCase("es-CL").replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const criticalIllegalPattern = /(?:menor(?:es)?\s+de\s+edad|contenido\s+infantil|niñ[oa]s?)\s+(?:sexual|íntim|adult|escort|acompañ)/i;
  if (criticalIllegalPattern.test(normalized)) {
    return { ruleCode: "illegal_content", reason: "Posible contenido sexual o comercial relacionado con menores de edad.", severity: "critical", action: config.autoBanEnabled ? "ban" : "restrict" };
  }

  const credentialScamPattern = /(?:env[ií]ame|comparte|p[aá]same|necesito)\s+(?:tu\s+)?(?:contraseñ|c[oó]digo\s+(?:otp|de\s+verificaci[oó]n)|clave\s+(?:bancaria|din[aá]mica))/i;
  if (credentialScamPattern.test(normalized)) {
    return { ruleCode: "credential_scam", reason: "Solicitud de contraseñas o códigos de verificación.", severity: "high", action: context.recentStrikeCount + 1 >= config.strikeBanThreshold && config.autoBanEnabled ? "ban" : "restrict" };
  }

  const privateDataPattern = /(?:publica|manda|env[ií]a|comparte)\s+(?:la|tu|el|una?)\s+(?:foto\s+de\s+)?(?:c[eé]dula|pasaporte|documento\s+de\s+identidad|direcci[oó]n\s+particular)/i;
  if (privateDataPattern.test(normalized)) {
    return { ruleCode: "private_data", reason: "Solicitud de documentos o datos privados.", severity: "high", action: "restrict" };
  }

  if (countLinks(normalized) > config.maxLinksPerMessage) {
    return { ruleCode: "link_abuse", reason: "El mensaje contiene demasiados enlaces.", severity: "medium", action: context.recentStrikeCount + 1 >= config.strikeBanThreshold && config.autoBanEnabled ? "ban" : "delete" };
  }

  const term = normalizedTerms(config.prohibitedTerms).find((candidate) => normalized.includes(candidate));
  if (term) {
    return { ruleCode: "prohibited_term", reason: `Coincidencia con un término bloqueado por moderación: ${term}.`, severity: "medium", action: context.recentStrikeCount + 1 >= config.strikeBanThreshold && config.autoBanEnabled ? "ban" : "delete" };
  }

  if (context.recentMessageCount >= config.floodMaxMessages) {
    return { ruleCode: "flood", reason: "Demasiados mensajes en un período corto.", severity: "medium", action: context.recentStrikeCount + 1 >= config.strikeBanThreshold && config.autoBanEnabled ? "ban" : "restrict" };
  }

  if (context.recentDuplicateCount >= 2) {
    return { ruleCode: "duplicate", reason: "Mensaje repetido varias veces.", severity: "medium", action: context.recentStrikeCount + 1 >= config.strikeBanThreshold && config.autoBanEnabled ? "ban" : "delete" };
  }

  return null;
}

export function telegramLinkCount(text: string) {
  return countLinks(text);
}
