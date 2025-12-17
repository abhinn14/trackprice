import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeProduct } from "@/lib/firecrawl";
import { sendPriceDropAlert } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables missing");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: products, error } = await supabase
      .from("products")
      .select("*");

    if (error) throw error;
    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No products to check",
      });
    }

    const results = {
      total: products.length,
      updated: 0,
      failed: 0,
      priceChanges: 0,
      alertsSent: 0,
    };

    for (const product of products) {
      try {
        const productData = await scrapeProduct(product.url);

        if (!productData?.currentPrice) {
          results.failed++;
          continue;
        }

        const newPrice = Number(productData.currentPrice);
        const oldPrice = Number(product.current_price);

        if (Number.isNaN(newPrice) || Number.isNaN(oldPrice)) {
          results.failed++;
          continue;
        }

        await supabase
          .from("products")
          .update({
            current_price: newPrice,
            currency: productData.currencyCode ?? product.currency,
            name: productData.productName ?? product.name,
            image_url: productData.productImageUrl ?? product.image_url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", product.id);

        if (newPrice !== oldPrice) {
          await supabase.from("price_history").insert({
            product_id: product.id,
            price: newPrice,
            currency: productData.currencyCode ?? product.currency,
          });

          results.priceChanges++;

          if (newPrice < oldPrice) {
            const { data, error } =
              await supabase.auth.admin.getUserById(product.user_id);

            if (!error && data?.user?.email) {
              const emailResult = await sendPriceDropAlert(
                data.user.email,
                product,
                oldPrice,
                newPrice
              );

              if (emailResult?.success) {
                results.alertsSent++;
              }
            }
          }
        }

        results.updated++;
      } catch (err) {
        console.error(`Error processing product ${product.id}`, err);
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Price check completed",
      results,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";

    console.error("Cron job error:", err);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Price check endpoint is working. Use POST to trigger.",
  });
}
