import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, rider: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }

  const date = new Date(order.createdAt).toLocaleDateString("it-IT");
  const time = new Date(order.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const displayCode = order.orderCode ?? `${order.type === "ASPORTO" ? "A" : "D"}${String(order.orderNumber).padStart(3, "0")}`;

  const itemsHtml = order.items
    .map((item) => {
      let line = `<tr><td>${item.quantity}x ${item.productName}`;
      if (item.variant) line += ` <small>(${item.variant})</small>`;
      line += `</td><td class="r">${fmt(Number(item.totalPrice))}</td></tr>`;

      const extras: string[] = [];
      if (item.additions) {
        (item.additions as any[]).forEach((a: any) => extras.push(`+ ${a.name}`));
      }
      if (item.removals) {
        (item.removals as any[]).forEach((r: any) => extras.push(`- ${r.name}`));
      }
      if (item.notes) extras.push(`"${item.notes}"`);
      if (extras.length > 0) {
        line += `<tr><td colspan="2" class="mod">${extras.join(", ")}</td></tr>`;
      }
      return line;
    })
    .join("");

  // QR Code generation
  const host = request.headers.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const riderUrl = `${protocol}://${host}/rider/ordine/${order.id}`;
  const qrCodeDataUrl = await QRCode.toDataURL(riderUrl, { margin: 1, width: 200 });

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Ordine #${displayCode}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 4mm; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .r { text-align: right; }
  .sep { border-top: 1px dashed #000; margin: 4px 0; }
  h1 { font-size: 18px; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .mod { font-size: 10px; color: #555; padding-left: 16px; }
  .total { font-size: 16px; font-weight: bold; }
  .qr { margin-top: 10px; text-align: center; }
  .qr img { width: 100px; height: 100px; }
  @media print { body { width: 80mm; } }
</style>
</head>
<body>
  <div class="center">
    <h1>TEGLIERIA</h1>
  </div>
  <div class="sep"></div>
  <table>
    <tr><td class="bold">Ordine #${displayCode}</td><td class="r">${date} ${time}</td></tr>
    <tr><td>Tipo: ${order.type === "ASPORTO" ? "ASPORTO" : "DELIVERY"}</td><td class="r">${order.channel}</td></tr>
  </table>
  <div class="sep"></div>
  <div>
    <div class="bold">${order.customerName} - ${order.customerPhone}</div>
    ${order.address ? `<div>${order.address}</div>` : ""}
    ${order.addressDetail ? `<div>${order.addressDetail}</div>` : ""}
    ${order.deliveryZone ? `<div>Zona: ${order.deliveryZone}</div>` : ""}
  </div>
  <div class="sep"></div>
  <table>${itemsHtml}</table>
  <div class="sep"></div>
  <table>
    <tr><td>Subtotale</td><td class="r">${fmt(Number(order.subtotal))}</td></tr>
    ${order.deliveryCost && Number(order.deliveryCost) > 0 ? `<tr><td>Consegna</td><td class="r">${fmt(Number(order.deliveryCost))}</td></tr>` : ""}
    <tr><td class="total">TOTALE</td><td class="r total">${fmt(Number(order.total))}</td></tr>
  </table>
  ${order.notes ? `<div class="sep"></div><div>Note: ${order.notes}</div>` : ""}
  
  <div class="sep"></div>
  <div class="qr">
    <img src="${qrCodeDataUrl}" alt="Rider QR" />
    <p style="font-size: 8px;">Scansiona per gestire consegna</p>
  </div>

  <div class="sep"></div>
  <div class="center" style="margin-top:8px;font-size:10px;">Grazie e buon appetito!</div>
  <script>window.onload=function(){window.print();}</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function fmt(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
