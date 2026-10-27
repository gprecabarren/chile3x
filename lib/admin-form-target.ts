type AttributeSource = { getAttribute(name: string): string | null };

/** Named controls such as input[name=action] shadow native form properties.
 * Read attributes, including a submit button's native overrides, instead. */
export function adminFormTarget(form: AttributeSource, submitter: AttributeSource | undefined, currentUrl: string) {
  const method = (submitter?.getAttribute("formmethod") ?? form.getAttribute("method") ?? "get").toLowerCase();
  if (method !== "post") return null;
  try {
    const url = new URL(submitter?.getAttribute("formaction") ?? form.getAttribute("action") ?? "", currentUrl);
    return url.origin === new URL(currentUrl).origin && /^https?:$/.test(url.protocol) ? url : null;
  } catch { return null; }
}
