import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import { formatPizzaVariant } from "@/lib/pizza-builder";
import { createClient } from "@/lib/supabase/server";
import { isOperatorUser } from "@/lib/rbac";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { escapeHtml } from "@/lib/html";
import { getTrustedSiteOrigin } from "@/lib/request-security";
import { formatOrderTimeSlot } from "@/lib/order-time-slots";
import {
  RECEIPT_QR_ERROR_CORRECTION,
  RECEIPT_QR_QUIET_ZONE_MODULES,
  RECEIPT_QR_RASTER_WIDTH_PX,
  RECEIPT_QR_SIZE_MM,
  RECEIPT_ROLL_WIDTH_MM,
  getReceiptPrintableWidthMm,
} from "@/lib/receipt-layout";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const limit = await rateLimit(`order-print:${getClientIp(request.headers)}`, 30, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, rider: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }

  const isOperator = isOperatorUser(user);
  if (!isOperator) {
    const rider = await prisma.rider.findFirst({
      where: { active: true, authUserId: user.id },
      select: { id: true },
    });
    if (!rider || order.riderId !== rider.id) {
      return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
    }
  }

  const date = new Date(order.createdAt).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
  const time = new Date(order.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
  const displayCode = order.orderCode ?? `${order.type === "ASPORTO" ? "A" : "D"}${String(order.orderNumber).padStart(3, "0")}`;
  const requestedTime = formatOrderTimeSlot(order.type, order.timeSlot)
    || (order.pickupTime
      ? new Date(order.pickupTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })
      : null);

  const itemsHtml = order.items
    .map((item) => {
      let line = `<tr><td>${escapeHtml(item.quantity)}x ${escapeHtml(item.productName)}`;
      if (item.variant) line += ` <small>(${escapeHtml(formatPizzaVariant(item.variant))})</small>`;
      line += `</td><td class="r">${fmt(Number(item.totalPrice))}</td></tr>`;

      const extras: string[] = [];
      if (item.additions) {
        (item.additions as any[]).forEach((a: any) => extras.push(`+ ${escapeHtml(a.name)}`));
      }
      if (item.removals) {
        (item.removals as any[]).forEach((r: any) => extras.push(`- ${escapeHtml(r.name)}`));
      }
      if (item.notes) extras.push(`&quot;${escapeHtml(item.notes)}&quot;`);
      if (extras.length > 0) {
        line += `<tr><td colspan="2" class="mod">${extras.join(", ")}</td></tr>`;
      }
      return line;
    })
    .join("");

  // QR Code generation
  const siteUrl = getTrustedSiteOrigin(request);
  if (!siteUrl) {
    return NextResponse.json({ error: "Origine del sito non configurata" }, { status: 500 });
  }
  const riderUrl = `${siteUrl.replace(/\/$/, "")}/rider/ordine/${encodeURIComponent(order.id)}`;
  const qrCodeDataUrl = await QRCode.toDataURL(riderUrl, {
    errorCorrectionLevel: RECEIPT_QR_ERROR_CORRECTION,
    margin: RECEIPT_QR_QUIET_ZONE_MODULES,
    width: RECEIPT_QR_RASTER_WIDTH_PX,
  });
  const printableWidthMm = getReceiptPrintableWidthMm();
  const styleNonce = request.headers.get("x-nonce");
  const styleNonceAttribute = styleNonce ? ` nonce="${escapeHtml(styleNonce)}"` : "";

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Ordine #${escapeHtml(displayCode)}</title>
<style${styleNonceAttribute}>
  @page { size: ${RECEIPT_ROLL_WIDTH_MM}mm 200mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${RECEIPT_ROLL_WIDTH_MM}mm; max-width: ${RECEIPT_ROLL_WIDTH_MM}mm; }
  body { margin: 0; padding: 0; overflow-x: hidden; background: #fff; color: #000; font-family: 'Courier New', monospace; font-size: 9pt; line-height: 1.25; overflow-wrap: anywhere; }
  .receipt { width: ${printableWidthMm}mm; max-width: ${printableWidthMm}mm; margin: 0 auto; padding: 2mm 0 3mm; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .r { width: 15mm; padding-left: 1.5mm; text-align: right; white-space: nowrap; }
  .sep { border-top: 0.25mm dashed #000; margin: 2mm 0; }
  h1 { margin-bottom: 0.5mm; font-size: 15pt; letter-spacing: 0.2mm; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { padding: 0.35mm 0; vertical-align: top; overflow-wrap: anywhere; }
  small { display: block; margin-top: 0.4mm; font-size: 7.5pt; line-height: 1.2; }
  .mod { padding: 0.4mm 0 0.8mm 2mm; color: #222; font-size: 7.5pt; line-height: 1.2; }
  .total { font-size: 12pt; font-weight: bold; }
  .qr { margin-top: 2mm; text-align: center; break-inside: avoid; page-break-inside: avoid; }
  .qr img { display: block; width: ${RECEIPT_QR_SIZE_MM}mm; height: ${RECEIPT_QR_SIZE_MM}mm; margin: 0 auto; image-rendering: pixelated; }
  .qr-caption { margin-top: 1mm; font-size: 7pt; line-height: 1.2; }
  .thank-you { margin-top: 2mm; font-size: 8pt; }
  @media print {
    html, body { width: ${RECEIPT_ROLL_WIDTH_MM}mm; max-width: ${RECEIPT_ROLL_WIDTH_MM}mm; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body><main class="receipt">
  <div class="center">
    <h1>TEGLIERIA</h1>
  </div>
  <div class="sep"></div>
  <table>
    <tr><td class="bold">Ordine #${escapeHtml(displayCode)}</td><td class="r">${escapeHtml(date)} ${escapeHtml(time)}</td></tr>
    <tr><td>Tipo: ${escapeHtml(order.type === "ASPORTO" ? "ASPORTO" : "DELIVERY")}</td><td class="r">${escapeHtml(order.channel)}</td></tr>
  </table>
  <div class="sep"></div>
  <div>
    <div class="bold">${escapeHtml(order.customerName)} - ${escapeHtml(order.customerPhone)}</div>
    ${order.address ? `<div>${escapeHtml(order.address)}</div>` : ""}
    ${order.addressDetail ? `<div>${escapeHtml(order.addressDetail)}</div>` : ""}
    ${order.deliveryZone ? `<div>Zona: ${escapeHtml(order.deliveryZone)}</div>` : ""}
    ${requestedTime ? `<div class="bold">Orario richiesto: ${escapeHtml(requestedTime)}</div>` : ""}
  </div>
  <div class="sep"></div>
  <table>${itemsHtml}</table>
  <div class="sep"></div>
  <table>
    <tr><td>Subtotale</td><td class="r">${fmt(Number(order.subtotal))}</td></tr>
    ${Number(order.clubSavings) > 0 ? `<tr><td>Risparmio Club</td><td class="r">-${escapeHtml(fmt(Number(order.clubSavings)))}</td></tr>` : ""}
    ${order.deliveryCost && Number(order.deliveryCost) > 0 ? `<tr><td>Consegna</td><td class="r">${escapeHtml(fmt(Number(order.deliveryCost)))}</td></tr>` : ""}
    <tr><td class="total">TOTALE</td><td class="r total">${fmt(Number(order.total))}</td></tr>
  </table>
  ${order.notes ? `<div class="sep"></div><div>Note: ${escapeHtml(order.notes)}</div>` : ""}
  
  <div class="sep"></div>
  <div class="qr">
    <img src="${qrCodeDataUrl}" alt="QR per gestione consegna rider" />
    <p class="qr-caption">Scansiona per gestire consegna</p>
  </div>

  <div class="sep"></div>
  <div class="center thank-you">Grazie e buon appetito!</div>
  ${request.headers.get("x-nonce") ? `<script nonce="${escapeHtml(request.headers.get("x-nonce"))}">
    window.addEventListener("load",function(){
      var receipt=document.querySelector(".receipt");
      var pageHeightMm=Math.max(58,Math.ceil(receipt.getBoundingClientRect().height*25.4/96));
      var pageStyle=document.createElement("style");
      pageStyle.nonce="${escapeHtml(request.headers.get("x-nonce"))}";
      pageStyle.textContent="@page{size:${RECEIPT_ROLL_WIDTH_MM}mm "+pageHeightMm+"mm;margin:0}";
      document.head.appendChild(pageStyle);
      window.print();
    },{once:true});
  </script>` : ""}
</main></body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

function fmt(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
