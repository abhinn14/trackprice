import FirecrawlApp from "@mendable/firecrawl-js";

if (!process.env.FIRECRAWL_API_KEY) {
  throw new Error("FIRECRAWL_API_KEY is missing");
}

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

export interface ScrapedProduct {
  productName: string;
  currentPrice: number;
  currencyCode?: string;
  productImageUrl?: string;
}

function isLikelyProductPage(url: string) {
  return !(
    url.includes("/s?") ||
    url.includes("/search") ||
    url.includes("query=")
  );
}

export async function scrapeProduct(
  url: string
): Promise<ScrapedProduct | null> {
  try {
    if (!isLikelyProductPage(url)) {
      return null;
    }

    const result = await firecrawl.scrape(url, {
      formats: [
        {
          type: "json",
          prompt:
            "Extract ONE product's name, current price, currency code, and main image.",
          schema: {
            type: "object",
            properties: {
              productName: { type: "string" },
              currentPrice: { type: "number" },
              currencyCode: { type: "string" },
              productImageUrl: { type: "string" },
            },
            required: ["productName", "currentPrice"],
          },
        },
      ],
    });

    const extracted =
      (result as any)?.data ||
      (Array.isArray(result) && (result as any)[0]?.data) ||
      (result as any)?.results?.[0]?.data ||
      null;

    if (
      !extracted ||
      typeof extracted.productName !== "string" ||
      typeof extracted.currentPrice !== "number"
    ) {
      return null;
    }

    return {
      productName: extracted.productName,
      currentPrice: extracted.currentPrice,
      currencyCode: extracted.currencyCode,
      productImageUrl: extracted.productImageUrl,
    };
  } catch (err) {
    console.error("Firecrawl scrape failed:", err);
    return null;
  }
}
