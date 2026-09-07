export async function requireMobileUser(request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new Error("Unauthorized: sign in again in EchoNotes.");
  const token = authorization.slice(7).trim();
  if (!token) throw new Error("Unauthorized: sign in again in EchoNotes.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized: your session has expired. Sign in again.");
  return data.user;
}

export function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function mobileApiError(error) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  const status = message.startsWith("Unauthorized:") ? 401 : 400;
  console.error("Mobile API request failed", error);
  return jsonResponse({ error: message }, status);
}
