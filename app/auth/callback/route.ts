import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/error`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Supabase auth error:", error.message);
    return NextResponse.redirect(`${origin}/error`);
  }

  const safeNext = next.startsWith("/") ? next : "/";

  return NextResponse.redirect(`${origin}${safeNext}`);
}
