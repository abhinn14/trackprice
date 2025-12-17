"use server";

import { createClient } from "@/utils/supabase/server";
import { scrapeProduct } from "@/lib/firecrawl";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";


export async function addProduct(formData: FormData) {
  const url = formData.get("url");

  if (!url || typeof url !== "string") {
    return { error: "URL is required" };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Not authenticated" };
    }

    const productData = await scrapeProduct(url);

    if (!productData?.productName || !productData?.currentPrice) {
      return { error: "Could not extract product information from this URL" };
    }

    const newPrice = Number(productData.currentPrice);

    if (Number.isNaN(newPrice)) {
      return { error: "Invalid price detected" };
    }

    const currency = productData.currencyCode ?? "USD";

    const { data: existingProduct } = await supabase
      .from("products")
      .select("id, current_price")
      .eq("user_id", user.id)
      .eq("url", url)
      .maybeSingle();

    const isUpdate = !!existingProduct;

    const { data: product, error } = await supabase
      .from("products")
      .upsert(
        {
          user_id: user.id,
          url,
          name: productData.productName,
          current_price: newPrice,
          currency,
          image_url: productData.productImageUrl ?? null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,url",
        }
      )
      .select()
      .single();

    if (error) throw error;

    const shouldAddHistory =
      !isUpdate || Number(existingProduct?.current_price) !== newPrice;

    if (shouldAddHistory) {
      await supabase.from("price_history").insert({
        product_id: product.id,
        price: newPrice,
        currency,
      });
    }

    revalidatePath("/");

    return {
      success: true,
      product,
      message: isUpdate
        ? "Product updated with latest price!"
        : "Product added successfully!",
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to add product";

    console.error("Add product error:", err);
    return { error: message };
  }
}


export async function deleteProduct(productId: string) {
  if (!productId) return { error: "Product ID is required" };

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("user_id", user.id);

    if (error) throw error;

    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete product",
    };
  }
}

export async function getProducts() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error:", authError.message);
      return [];
    }

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Products query error:", error.message);
      return [];
    }

    return data ?? [];
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Get products error:", err.message);
    } else {
      console.error("Get products error:", err);
    }
    return [];
  }
}


export async function getPriceHistory(productId: string) {
  if (!productId) return [];

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("price_history")
      .select("*")
      .eq("product_id", productId)
      .order("checked_at", { ascending: true });

    if (error) throw error;

    return data ?? [];
  } catch (err) {
    console.error("Get price history error:", err);
    return [];
  }
}


export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
