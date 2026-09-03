import { BrevoClient, BrevoEnvironment } from "@getbrevo/brevo";

const FROM_EMAIL = "ordini@lateglieria.it";
const FROM_NAME = "La Teglieria";

function getClient(): BrevoClient | null {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;
  return new BrevoClient({ apiKey, environment: BrevoEnvironment.Default });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(amount);
}

function formatTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;background:#f5f0e8;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">

        <tr><td style="background:#1d1d1f;border-radius:24px 24px 0 0;padding:14px 32px;text-align:center;">
          <div style="display:inline-block;background:#242426;padding:14px 15px;line-height:0;">
            <img src="https://www.lateglieria.it/icons/LT_icon_tile.webp" width="78" height="78" alt="LT" style="display:block;border:2px solid #f5f0e8;" />
          </div>
        </td></tr>

        <tr><td style="background:#ffffff;padding:36px 32px;">
          ${content}
        </td></tr>

        <tr><td style="background:#f5f0e8;border-radius:0 0 24px 24px;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:10px;color:#1d1d1f;opacity:0.3;letter-spacing:0.2em;text-transform:uppercase;">
            © ${new Date().getFullYear()} La Teglieria Artisan Pizza · Tutti i diritti riservati
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── EMAIL 1: Conferma ordine ────────────────────────────────────────────────

type OrderConfirmationInput = {
  customerEmail: string;
  customerName: string;
  orderNumber: number;
  type: string;
  items: Array<{ productName: string; quantity: number; totalPrice: number; variant?: string | null }>;
  subtotal: number;
  total: number;
  deliveryCost?: number | null;
  address?: string | null;
  pickupTime?: Date | string | null;
  estimatedTime?: Date | string | null;
  paymentMethod?: string | null;
  paymentConfirmed?: boolean;
  accountLink?: string | null; // magic link per accesso senza password
};

export async function sendOrderConfirmationEmail(order: OrderConfirmationInput): Promise<void> {
  const client = getClient();
  if (!client) {
    console.info("[EMAIL][SKIPPED] BREVO_API_KEY non configurata");
    return;
  }

  const isDelivery = order.type === "DELIVERY";
  const paymentConfirmed = order.paymentConfirmed === true;
  const timeLabel = formatTime(isDelivery ? order.estimatedTime : order.pickupTime);
  const paymentLabel = order.paymentMethod === "STRIPE"
    ? "Carta online (Stripe)"
    : order.paymentMethod === "POS" ? "Carta / POS" : "Contanti";

  const itemsHtml = order.items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f5f0e8;color:#1d1d1f;font-size:14px;">
        <span style="color:#D96A2B;font-weight:700;">${item.quantity}×</span> ${item.productName}
        ${item.variant ? `<br/><span style="font-size:12px;color:#1d1d1f;opacity:0.4;">${item.variant}</span>` : ""}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f5f0e8;text-align:right;font-weight:600;color:#1d1d1f;font-size:14px;white-space:nowrap;">
        ${formatCurrency(Number(item.totalPrice))}
      </td>
    </tr>
  `).join("");

  const content = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#D96A2B;">${paymentConfirmed ? "Pagamento Ricevuto" : "Ordine Ricevuto"}</p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#1d1d1f;line-height:1.2;">Grazie, ${order.customerName}!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#1d1d1f;opacity:0.6;line-height:1.6;">${paymentConfirmed ? "Il pagamento è andato a buon fine e il tuo ordine è confermato. Ecco il riepilogo:" : "Abbiamo ricevuto il tuo ordine — ti confermiamo a breve. Ecco il riepilogo:"}</p>

    <div style="background:#f5f0e8;border-radius:16px;padding:16px 20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Numero Ordine</p>
      <p style="margin:6px 0 0;font-size:32px;font-weight:700;color:#D96A2B;">#${order.orderNumber}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${itemsHtml}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#1d1d1f;opacity:0.5;">Subtotale</td>
        <td style="padding:6px 0;text-align:right;font-size:13px;color:#1d1d1f;opacity:0.5;">${formatCurrency(order.subtotal)}</td>
      </tr>
      ${isDelivery && order.deliveryCost ? `
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#1d1d1f;opacity:0.5;">Consegna</td>
        <td style="padding:6px 0;text-align:right;font-size:13px;color:#1d1d1f;opacity:0.5;">${formatCurrency(Number(order.deliveryCost))}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:12px 0 0;font-size:18px;font-weight:700;color:#1d1d1f;">Totale</td>
        <td style="padding:12px 0 0;text-align:right;font-size:18px;font-weight:700;color:#D96A2B;">${formatCurrency(order.total)}</td>
      </tr>
    </table>

    <div style="background:#f5f0e8;border-radius:16px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:5px 0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;width:40%;">Tipo</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;color:#1d1d1f;">${isDelivery ? "Consegna a domicilio" : "Ritiro in sede"}</td>
        </tr>
        ${timeLabel ? `
        <tr>
          <td style="padding:5px 0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">${isDelivery ? "Consegna prevista" : "Ritiro alle"}</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;color:#1d1d1f;">${timeLabel}</td>
        </tr>` : ""}
        ${isDelivery && order.address ? `
        <tr>
          <td style="padding:5px 0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Indirizzo</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;color:#1d1d1f;">${order.address}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:5px 0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Pagamento</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;color:#1d1d1f;">${paymentLabel}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0;font-size:13px;color:#1d1d1f;opacity:0.5;text-align:center;line-height:1.6;">
      ${paymentConfirmed ? "Ti invieremo un aggiornamento quando il tuo ordine sarà in preparazione." : "Ti invieremo un aggiornamento quando il tuo ordine sarà in consegna."}
    </p>

    ${order.accountLink ? `
    <div style="margin-top:28px;padding-top:24px;border-top:1px solid #f5f0e8;text-align:center;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#1d1d1f;opacity:0.35;">Riordina in 10 secondi la prossima volta</p>
      <p style="margin:0 0 16px;font-size:13px;color:#1d1d1f;opacity:0.5;">I tuoi dati sono già salvati — clicca e sei dentro.</p>
      <a href="${order.accountLink}" style="display:inline-block;padding:14px 32px;background:#D96A2B;color:#ffffff;text-decoration:none;border-radius:99px;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">
        Attiva il tuo account →
      </a>
      <p style="margin:12px 0 0;font-size:11px;color:#1d1d1f;opacity:0.25;">Nessuna password richiesta. Un solo click.</p>
    </div>
    ` : ""}
  `;

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: order.customerEmail, name: order.customerName }],
      subject: paymentConfirmed
        ? `Pagamento ricevuto — ordine #${order.orderNumber} — La Teglieria`
        : `Ordine #${order.orderNumber} ricevuto — La Teglieria`,
      htmlContent: emailWrapper(content),
    });
  } catch (err) {
    console.error("[EMAIL][ERROR] Conferma ordine:", err);
  }
}

// ─── EMAIL 1b: Pagamento rifiutato ──────────────────────────────────────────

type OrderPaymentFailedInput = {
  customerEmail: string;
  customerName: string;
  orderNumber: number;
  total: number;
  retryUrl?: string | null;
};

export async function sendOrderPaymentFailedEmail(order: OrderPaymentFailedInput): Promise<void> {
  const client = getClient();
  if (!client) {
    console.info("[EMAIL][SKIPPED] BREVO_API_KEY non configurata");
    return;
  }

  const content = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#D96A2B;">Pagamento non riuscito</p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#1d1d1f;line-height:1.2;">Non siamo riusciti a completare il pagamento</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#1d1d1f;opacity:0.6;line-height:1.6;">
      Il pagamento dell&apos;ordine <strong>#${order.orderNumber}</strong> non è andato a buon fine. L&apos;ordine non è stato confermato e non ti è stato addebitato alcun importo.
    </p>

    <div style="background:#f5f0e8;border-radius:16px;padding:16px 20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Totale ordine</p>
      <p style="margin:6px 0 0;font-size:32px;font-weight:700;color:#D96A2B;">${formatCurrency(order.total)}</p>
    </div>

    ${order.retryUrl ? `
    <div style="text-align:center;margin:30px 0 28px;">
      <a href="${order.retryUrl}" style="display:inline-block;padding:16px 34px;background:#D96A2B;color:#ffffff;text-decoration:none;border-radius:99px;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
        Riprova il pagamento →
      </a>
    </div>
    ` : ""}

    <p style="margin:0;font-size:13px;color:#1d1d1f;opacity:0.5;text-align:center;line-height:1.6;">
      Se il problema persiste, contattaci prima di effettuare un nuovo ordine.
    </p>
  `;

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: order.customerEmail, name: order.customerName }],
      subject: `Pagamento non riuscito — ordine #${order.orderNumber}`,
      htmlContent: emailWrapper(content),
    });
  } catch (err) {
    console.error("[EMAIL][ERROR] Pagamento non riuscito:", err);
  }
}

// ─── EMAIL 2: Invito rider (creato da admin) ────────────────────────────────

type RiderInviteInput = {
  email: string;
  name: string;
  registerUrl: string;
};

export async function sendRiderInviteEmail({ email, name, registerUrl }: RiderInviteInput): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("[EMAIL][SKIPPED] BREVO_API_KEY non configurata — rider invite non inviata a", email);
    return;
  }

  const content = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#D96A2B;">Benvenuto nel Team</p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#1d1d1f;line-height:1.2;">Ciao, ${name}! 🛵</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#1d1d1f;opacity:0.6;line-height:1.6;">
      Sei stato aggiunto come rider de <strong>La Teglieria</strong>. Completa la registrazione per accedere alla tua dashboard e iniziare le consegne.
    </p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${registerUrl}" style="display:inline-block;padding:16px 36px;background:#D96A2B;color:#ffffff;text-decoration:none;border-radius:99px;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">
        Completa la registrazione →
      </a>
    </div>

    <div style="background:#f5f0e8;border-radius:16px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Come accedere</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:5px 0;font-size:14px;color:#1d1d1f;">1. Clicca il tasto qui sopra</td></tr>
        <tr><td style="padding:5px 0;font-size:14px;color:#1d1d1f;">2. Inserisci <strong>${email}</strong> come email</td></tr>
        <tr><td style="padding:5px 0;font-size:14px;color:#1d1d1f;">3. Scegli una password</td></tr>
        <tr><td style="padding:5px 0;font-size:14px;color:#1d1d1f;">4. Accedi alla tua dashboard rider</td></tr>
      </table>
    </div>

    <p style="margin:0;font-size:12px;color:#1d1d1f;opacity:0.35;text-align:center;">
      Per assistenza contatta lo staff de La Teglieria.
    </p>
  `;

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email, name }],
      subject: `🛵 Sei stato aggiunto al team — La Teglieria`,
      htmlContent: emailWrapper(content),
    });
  } catch (err) {
    console.error("[EMAIL][ERROR] Rider invite:", err);
  }
}

// ─── EMAIL 4: Ordine confermato dall'admin ───────────────────────────────────

type OrderConfirmedInput = {
  customerEmail: string;
  customerName: string;
  orderNumber: number;
  type: string;
  estimatedTime?: Date | string | null;
  address?: string | null;
};

export async function sendOrderConfirmedEmail(order: OrderConfirmedInput): Promise<void> {
  const client = getClient();
  if (!client) {
    console.info("[EMAIL][SKIPPED] BREVO_API_KEY non configurata");
    return;
  }

  const isDelivery = order.type === "DELIVERY";
  const timeLabel = formatTime(order.estimatedTime);

  const content = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#D96A2B;">Ordine Accettato</p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#1d1d1f;line-height:1.2;">Stiamo preparando la tua teglia! 🍕</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#1d1d1f;opacity:0.6;line-height:1.6;">
      Il tuo ordine è stato accettato dal nostro staff ed è ora in preparazione.
    </p>

    <div style="background:#f5f0e8;border-radius:16px;padding:16px 20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Numero Ordine</p>
      <p style="margin:6px 0 0;font-size:32px;font-weight:700;color:#D96A2B;">#${order.orderNumber}</p>
    </div>

    ${timeLabel ? `
    <div style="background:#f5f0e8;border-radius:16px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">
        ${isDelivery ? "Consegna prevista" : "Pronto per il ritiro"}
      </p>
      <p style="margin:0;font-size:48px;font-weight:700;color:#1d1d1f;line-height:1;">${timeLabel}</p>
    </div>
    ` : ""}

    <div style="background:#f5f0e8;border-radius:16px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:5px 0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;width:40%;">Tipo</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;color:#1d1d1f;">${isDelivery ? "Consegna a domicilio" : "Ritiro in sede"}</td>
        </tr>
        ${isDelivery && order.address ? `
        <tr>
          <td style="padding:5px 0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Indirizzo</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;color:#1d1d1f;">${order.address}</td>
        </tr>` : ""}
      </table>
    </div>

    <p style="margin:0;font-size:13px;color:#1d1d1f;opacity:0.5;text-align:center;line-height:1.6;">
      ${isDelivery ? "Ti avviseremo non appena il tuo ordine sarà in consegna. 🛵" : "Ti avviseremo non appena il tuo ordine sarà pronto per il ritiro. 🍕"}
    </p>
  `;

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: order.customerEmail, name: order.customerName }],
      subject: `Ordine #${order.orderNumber} confermato — La Teglieria`,
      htmlContent: emailWrapper(content),
    });
  } catch (err) {
    console.error("[EMAIL][ERROR] Ordine confermato:", err);
  }
}

// ─── EMAIL 5: Aggiornamento orario ──────────────────────────────────────────

type TimeUpdateInput = {
  customerEmail: string;
  customerName: string;
  orderNumber: number;
  newEstimatedTime: Date | string;
};

export async function sendTimeUpdateEmail(order: TimeUpdateInput): Promise<void> {
  const client = getClient();
  if (!client) return;

  const timeLabel = formatTime(order.newEstimatedTime);
  if (!timeLabel) return;

  const content = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#D96A2B;">Orario Aggiornato</p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#1d1d1f;line-height:1.2;">Nuova stima per il tuo ordine</h1>

    <div style="background:#f5f0e8;border-radius:16px;padding:16px 20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Ordine</p>
      <p style="margin:6px 0 0;font-size:32px;font-weight:700;color:#D96A2B;">#${order.orderNumber}</p>
    </div>

    <div style="background:#f5f0e8;border-radius:16px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Arrivo stimato</p>
      <p style="margin:0;font-size:48px;font-weight:700;color:#1d1d1f;line-height:1;">${timeLabel}</p>
    </div>

    <p style="margin:0;font-size:13px;color:#1d1d1f;opacity:0.5;text-align:center;line-height:1.6;">
      Il nostro staff ha aggiornato l'orario stimato per il tuo ordine. 🍕
    </p>
  `;

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: order.customerEmail, name: order.customerName }],
      subject: `Orario aggiornato — ordine #${order.orderNumber}`,
      htmlContent: emailWrapper(content),
    });
  } catch (err) {
    console.error("[EMAIL][ERROR] Time update:", err);
  }
}

// ─── EMAIL 6: Ordine pronto per il ritiro (ASPORTO) ─────────────────────────

type OrderReadyInput = {
  customerEmail: string;
  customerName: string;
  orderNumber: number;
  estimatedTime?: Date | string | null;
};

export async function sendOrderReadyEmail(order: OrderReadyInput): Promise<void> {
  const client = getClient();
  if (!client) return;

  const timeLabel = formatTime(order.estimatedTime);

  const content = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#D96A2B;">Pronto per il ritiro</p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#1d1d1f;line-height:1.2;">La tua teglia è pronta! 🍕</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#1d1d1f;opacity:0.6;line-height:1.6;">
      Il tuo ordine è pronto e ti aspetta in sede. Vieni a ritirarlo quando vuoi!
    </p>

    <div style="background:#f5f0e8;border-radius:16px;padding:16px 20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Ordine</p>
      <p style="margin:6px 0 0;font-size:32px;font-weight:700;color:#D96A2B;">#${order.orderNumber}</p>
    </div>

    ${timeLabel ? `
    <div style="background:#f5f0e8;border-radius:16px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Disponibile dalle</p>
      <p style="margin:0;font-size:48px;font-weight:700;color:#1d1d1f;line-height:1;">${timeLabel}</p>
    </div>
    ` : ""}

    <p style="margin:0;font-size:13px;color:#1d1d1f;opacity:0.5;text-align:center;line-height:1.6;">
      Ti aspettiamo! 🍕
    </p>
  `;

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: order.customerEmail, name: order.customerName }],
      subject: `Ordine #${order.orderNumber} pronto — vieni a ritirarlo`,
      htmlContent: emailWrapper(content),
    });
  } catch (err) {
    console.error("[EMAIL][ERROR] Ordine pronto:", err);
  }
}

// ─── EMAIL 7: Ordine completato/consegnato ───────────────────────────────────

type OrderDeliveredInput = {
  customerEmail: string;
  customerName: string;
  orderNumber: number;
  type: string;
};

export async function sendOrderDeliveredEmail(order: OrderDeliveredInput): Promise<void> {
  const client = getClient();
  if (!client) return;

  const isDelivery = order.type === "DELIVERY";

  const content = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#D96A2B;">Ordine Completato</p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#1d1d1f;line-height:1.2;">
      ${isDelivery ? "Buon appetito! 🍕" : "Grazie per il ritiro! 🍕"}
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#1d1d1f;opacity:0.6;line-height:1.6;">
      ${isDelivery
        ? "Il tuo ordine è stato consegnato. Speriamo ti sia piaciuto!"
        : "Il tuo ordine è stato ritirato. Speriamo ti sia piaciuto!"}
    </p>

    <div style="background:#f5f0e8;border-radius:16px;padding:16px 20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Ordine</p>
      <p style="margin:6px 0 0;font-size:32px;font-weight:700;color:#D96A2B;">#${order.orderNumber}</p>
    </div>

    <p style="margin:0;font-size:13px;color:#1d1d1f;opacity:0.5;text-align:center;line-height:1.6;">
      A presto da La Teglieria! 🍕
    </p>
  `;

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: order.customerEmail, name: order.customerName }],
      subject: `Ordine #${order.orderNumber} completato — grazie!`,
      htmlContent: emailWrapper(content),
    });
  } catch (err) {
    console.error("[EMAIL][ERROR] Ordine completato:", err);
  }
}

// ─── EMAIL 8: Feedback post-ordine ──────────────────────────────────────────

type OrderFeedbackInput = {
  customerEmail: string;
  customerName: string;
  orderNumber: number;
  feedbackUrl: string;
};

export async function sendOrderFeedbackEmail(order: OrderFeedbackInput): Promise<void> {
  const client = getClient();
  if (!client) return;

  const content = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#D96A2B;">Un minuto per noi</p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#1d1d1f;line-height:1.2;">Com'è andata, ${order.customerName}?</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#1d1d1f;opacity:0.6;line-height:1.6;">
      Ora che hai avuto modo di gustare il tuo ordine <strong>#${order.orderNumber}</strong>, ci farebbe piacere sapere com'è andata. Bastano 30 secondi: il tuo feedback ci aiuta a migliorare ogni teglia.
    </p>

    <div style="text-align:center;margin:30px 0 28px;">
      <a href="${order.feedbackUrl}" style="display:inline-block;padding:16px 34px;background:#D96A2B;color:#ffffff;text-decoration:none;border-radius:99px;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
        Valuta il tuo ordine →
      </a>
    </div>

    <p style="margin:0;font-size:12px;color:#1d1d1f;opacity:0.4;text-align:center;line-height:1.6;">
      La valutazione viene usata per le nostre statistiche interne. Se ti sei trovato bene, potrai anche lasciarci una recensione su Google.
    </p>
  `;

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: order.customerEmail, name: order.customerName }],
      subject: `Com'è andato il tuo ordine #${order.orderNumber}? — La Teglieria`,
      htmlContent: emailWrapper(content),
    });
  } catch (err) {
    console.error("[EMAIL][ERROR] Feedback ordine:", err);
    throw err;
  }
}

// ─── EMAIL 3: Rider welcome ──────────────────────────────────────────────────

type RiderWelcomeInput = {
  email: string;
  name: string;
};

export async function sendRiderWelcomeEmail({ email, name }: RiderWelcomeInput): Promise<void> {
  const client = getClient();
  if (!client) return;

  const content = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#D96A2B;">Benvenuto nel Team</p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#1d1d1f;line-height:1.2;">Ciao, ${name}! 🛵</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#1d1d1f;opacity:0.6;line-height:1.6;">
      La tua registrazione come rider de La Teglieria è andata a buon fine. Sei ora parte del nostro team di consegne.
    </p>

    <div style="background:#f5f0e8;border-radius:16px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Prossimi passi</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;font-size:14px;color:#1d1d1f;">✅ &nbsp;Accedi alla tua dashboard rider</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#1d1d1f;">📋 &nbsp;Controlla gli ordini assegnati</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#1d1d1f;">🗺️ &nbsp;Aggiorna la tua posizione in tempo reale</td></tr>
      </table>
    </div>

    <p style="margin:0;font-size:13px;color:#1d1d1f;opacity:0.4;text-align:center;line-height:1.6;">
      Per qualsiasi necessità contatta il responsabile logistica.
    </p>
  `;

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email, name }],
      subject: `🛵 Benvenuto nel team — La Teglieria`,
      htmlContent: emailWrapper(content),
    });
  } catch (err) {
    console.error("[EMAIL][ERROR] Rider welcome:", err);
  }
}

// ─── EMAIL 3: Cliente welcome ─────────────────────────────────────────────────

type CustomerWelcomeInput = {
  email: string;
  name: string;
};

export async function sendCustomerWelcomeEmail({ email, name }: CustomerWelcomeInput): Promise<void> {
  const client = getClient();
  if (!client) return;

  const content = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#D96A2B;">Registrazione Completata</p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#1d1d1f;line-height:1.2;">Benvenuto, ${name}! 🍕</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#1d1d1f;opacity:0.6;line-height:1.6;">
      Il tuo account La Teglieria è pronto. Ora puoi ordinare più velocemente con i tuoi dati salvati.
    </p>

    <div style="background:#f5f0e8;border-radius:16px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Con il tuo account puoi</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;font-size:14px;color:#1d1d1f;">⚡ &nbsp;Ordinare con un click (dati pre-compilati)</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#1d1d1f;">📬 &nbsp;Ricevere aggiornamenti sull'ordine via email</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#1d1d1f;">📦 &nbsp;Tenere traccia dei tuoi ordini passati</td></tr>
      </table>
    </div>

    <p style="margin:0 0 4px;font-size:13px;color:#1d1d1f;opacity:0.4;text-align:center;">
      Se non hai creato tu questo account, ignora questa email.
    </p>
  `;

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email, name }],
      subject: `🍕 Benvenuto su La Teglieria!`,
      htmlContent: emailWrapper(content),
    });
  } catch (err) {
    console.error("[EMAIL][ERROR] Customer welcome:", err);
  }
}

// ─── EMAIL 4: Rider partito ──────────────────────────────────────────────────

type RiderDepartedInput = {
  customerEmail: string;
  customerName: string;
  orderNumber: number;
  riderName?: string | null;
  estimatedTime?: Date | string | null;
  address?: string | null;
};

export async function sendRiderDepartedEmail(order: RiderDepartedInput): Promise<void> {
  const client = getClient();
  if (!client) {
    console.info("[EMAIL][SKIPPED] BREVO_API_KEY non configurata");
    return;
  }

  const timeLabel = formatTime(order.estimatedTime);

  const content = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#D96A2B;">In Consegna</p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#1d1d1f;line-height:1.2;">La tua teglia è in arrivo!</h1>

    <div style="background:#f5f0e8;border-radius:16px;padding:16px 20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Ordine</p>
      <p style="margin:6px 0 0;font-size:32px;font-weight:700;color:#D96A2B;">#${order.orderNumber}</p>
    </div>

    <div style="background:#f5f0e8;border-radius:16px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${order.riderName ? `
        <tr>
          <td style="padding:5px 0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;width:40%;">Rider</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;color:#1d1d1f;">${order.riderName}</td>
        </tr>` : ""}
        ${timeLabel ? `
        <tr>
          <td style="padding:5px 0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Arrivo previsto</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;color:#1d1d1f;">${timeLabel}</td>
        </tr>` : ""}
        ${order.address ? `
        <tr>
          <td style="padding:5px 0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1d1d1f;opacity:0.4;">Indirizzo</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;color:#1d1d1f;">${order.address}</td>
        </tr>` : ""}
      </table>
    </div>

    <p style="margin:0;font-size:15px;color:#1d1d1f;opacity:0.6;text-align:center;line-height:1.6;">
      Tieniti pronto! La tua pizza artigianale è in viaggio verso di te. 🛵
    </p>
  `;

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: order.customerEmail, name: order.customerName }],
      subject: `Ordine #${order.orderNumber} in consegna — La Teglieria`,
      htmlContent: emailWrapper(content),
    });
  } catch (err) {
    console.error("[EMAIL][ERROR] Rider partito:", err);
  }
}
