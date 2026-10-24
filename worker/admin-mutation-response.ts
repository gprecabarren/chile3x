/** A successful POST redirect is an acknowledgement, not another page render.
 * AJAX must navigate separately so a failing destination cannot turn a saved
 * action into a false save error. Native forms keep their original redirects. */
export function adminMutationResponse(request: Request, response: Response) {
  const url = new URL(request.url);
  if (request.method !== "POST" || !url.pathname.startsWith("/api/admin/") || !request.headers.get("accept")?.includes("application/json") || response.status !== 303) return response;
  const location = response.headers.get("location");
  if (!location) return response;
  const destination = new URL(location,request.url);
  if (destination.origin !== url.origin) return response;
  const headers = new Headers(response.headers);
  headers.delete("location"); headers.delete("content-length"); headers.delete("content-encoding");
  headers.set("cache-control","private, no-store"); headers.set("x-robots-tag","noindex, nofollow");
  return Response.json({redirectTo:destination.href},{headers});
}
