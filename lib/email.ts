import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is missing");
}

if (!process.env.RESEND_FROM_EMAIL) {
  throw new Error("RESEND_FROM_EMAIL is missing");
}

const resend = new Resend(process.env.RESEND_API_KEY);

interface ProductEmailData {
  name: string;
  url: string;
  currency: string;
  image_url?: string | null;
}

export async function sendPriceDropAlert(
  userEmail: string,
  product: ProductEmailData,
  oldPrice: number,
  newPrice: number
) {
  try {
    const priceDrop = oldPrice - newPrice;
    const percentageDrop = ((priceDrop / oldPrice) * 100).toFixed(1);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: userEmail,
      subject: `🎉 Price Drop Alert: ${product.name}`,
      html: `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #FA5D19, #FF8C42); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">🎉 Price Drop Alert!</h1>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    ${
      product.image_url
        ? `<div style="text-align:center;margin-bottom:20px">
            <img src="${product.image_url}" alt="${product.name}" style="max-width:200px;border-radius:8px;border:1px solid #e5e7eb" />
           </div>`
        : ""
    }

    <h2 style="margin-top:0">${product.name}</h2>

    <p style="background:#fef3c7;padding:12px;border-left:4px solid #f59e0b">
      <strong>Price dropped by ${percentageDrop}%</strong>
    </p>

    <table style="width:100%;margin:20px 0">
      <tr>
        <td style="padding:10px;color:#9ca3af;text-decoration:line-through">
          ${product.currency} ${oldPrice.toFixed(2)}
        </td>
      </tr>
      <tr>
        <td style="padding:10px;font-size:28px;color:#FA5D19;font-weight:bold">
          ${product.currency} ${newPrice.toFixed(2)}
        </td>
      </tr>
      <tr>
        <td style="padding:10px;color:#16a34a;font-weight:bold">
          You save ${product.currency} ${priceDrop.toFixed(2)}
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin-top:30px">
      <a href="${product.url}" style="background:#FA5D19;color:white;padding:14px 30px;border-radius:6px;text-decoration:none;font-weight:600">
        View Product →
      </a>
    </div>

    <p style="font-size:12px;color:#6b7280;text-align:center;margin-top:30px">
      You are receiving this because you're tracking this product.
    </p>
  </div>

</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { error };
    }

    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Email failed";
    console.error("Email error:", message);
    return { error: message };
  }
}
