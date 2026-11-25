import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
      return NextResponse.redirect(new URL(target, request.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=The+verification+link+is+invalid+or+expired.", request.url));
}
