import { ORDER_STATUS_LABELS } from "@/lib/constants";

type OrderNotificationInput = {
  id: string;
  orderNumber: number;
  status: string;
  customerName: string;
  customerPhone: string;
  estimatedTime: Date | string | null;
  actualTime: Date | string | null;
  rider?: { name?: string | null } | null;
};

const NOTIFIABLE_STATUSES = new Set(["CONFIRMED", "OUT", "DELIVERED"]);

function toTimeLabel(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function buildCustomerMessage(order: OrderNotificationInput): string | null {
  if (!NOTIFIABLE_STATUSES.has(order.status)) return null;

  const riderName = order.rider?.name ? ` con ${order.rider.name}` : "";
  const eta = toTimeLabel(order.estimatedTime);

  if (order.status === "CONFIRMED") {
    return eta
      ? `Ordine #${order.orderNumber} confermato. Consegna prevista per le ${eta}.`
      : `Ordine #${order.orderNumber} confermato.`;
  }

  if (order.status === "OUT") {
    return `Ordine #${order.orderNumber} in consegna${riderName}.`;
  }

  if (order.status === "DELIVERED") {
    const deliveredAt = toTimeLabel(order.actualTime);
    return deliveredAt
      ? `Ordine #${order.orderNumber} consegnato alle ${deliveredAt}. Buon appetito!`
      : `Ordine #${order.orderNumber} consegnato. Buon appetito!`;
  }

  return null;
}

export async function notifyCustomerOrderStatus(order: OrderNotificationInput): Promise<void> {
  if (!NOTIFIABLE_STATUSES.has(order.status)) return;

  const webhookUrl = process.env.ORDER_STATUS_WEBHOOK_URL;
  const message = buildCustomerMessage(order);

  const payload = {
    type: "ORDER_STATUS_UPDATED",
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status] || order.status,
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
    },
    message,
    estimatedTime: order.estimatedTime ? new Date(order.estimatedTime).toISOString() : null,
    actualTime: order.actualTime ? new Date(order.actualTime).toISOString() : null,
    riderName: order.rider?.name || null,
    sentAt: new Date().toISOString(),
  };

  if (!webhookUrl) {
    console.info("[NOTIFY][SKIPPED] ORDER_STATUS_WEBHOOK_URL non configurato", payload);
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[NOTIFY][ERROR] Webhook failed", {
        status: res.status,
        body: errorText,
      });
    }
  } catch (error) {
    console.error("[NOTIFY][ERROR] Network error", error);
  }
}
