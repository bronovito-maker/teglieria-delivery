import type { Order, OrderItem, OrderStatusLog, Rider } from "@prisma/client";

export type LoadedOrder = Order & {
  items?: OrderItem[];
  rider?: Rider | null;
  statusHistory?: OrderStatusLog[];
};

const orderItems = (items: OrderItem[] = []) => items.map((item) => ({
  id: item.id,
  productId: item.productId,
  productName: item.productName,
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  totalPrice: item.totalPrice,
  variant: item.variant,
  additions: item.additions,
  removals: item.removals,
  notes: item.notes,
  allergenSnapshot: item.allergenSnapshot,
  ingredientSnapshot: item.ingredientSnapshot,
}));

const statusHistory = (history: OrderStatusLog[] = []) => history.map((entry) => ({
  id: entry.id,
  status: entry.status,
  note: entry.note,
  createdAt: entry.createdAt,
}));

/** Fields needed by the customer UI, excluding auth, Stripe and idempotency data. */
export function toCustomerOrderView(order: LoadedOrder) {
  return {
    id: order.id,
    orderCode: order.orderCode,
    orderNumber: order.orderNumber,
    type: order.type,
    channel: order.channel,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    customerName: order.customerName,
    address: order.address,
    addressDetail: order.addressDetail,
    deliveryZone: order.deliveryZone,
    deliveryCost: order.deliveryCost,
    estimatedTime: order.estimatedTime,
    actualTime: order.actualTime,
    pickupTime: order.pickupTime,
    timeSlot: order.timeSlot,
    subtotal: order.subtotal,
    total: order.total,
    notes: order.notes,
    items: orderItems(order.items),
    rider: order.rider ? { name: order.rider.name } : null,
    statusHistory: statusHistory(order.statusHistory),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/** Fields needed by the assigned rider, excluding customer auth and payment internals. */
export function toRiderOrderView(order: LoadedOrder) {
  return {
    id: order.id,
    orderCode: order.orderCode,
    orderNumber: order.orderNumber,
    type: order.type,
    status: order.status,
    deliveryStatus: order.deliveryStatus,
    riderId: order.riderId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    address: order.address,
    addressDetail: order.addressDetail,
    deliveryZone: order.deliveryZone,
    estimatedTime: order.estimatedTime,
    actualTime: order.actualTime,
    pickupTime: order.pickupTime,
    total: order.total,
    notes: order.notes,
    items: orderItems(order.items),
    rider: order.rider ? { id: order.rider.id, name: order.rider.name } : null,
    statusHistory: statusHistory(order.statusHistory),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
