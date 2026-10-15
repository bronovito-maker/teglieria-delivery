import { safeLocalStorage } from './browser-storage';
import type { CartItem } from '@/types';
import { useCartStore } from '@/store/cart';
const KEY = 'teglieria-pending-checkout';
export type PendingCheckout = { id: string; statusUrl: string; expiresAt: string; cartSignature: string; orderType: 'ASPORTO' | 'DELIVERY' };
export function cartSignature(items: readonly CartItem[], orderType: string) { return JSON.stringify({items,orderType}); }
export function readPendingCheckout(): PendingCheckout | null {
  try {
    const value = JSON.parse(safeLocalStorage.getItem(KEY) || 'null');
    if (!value || typeof value.id !== 'string' || !value.statusUrl?.startsWith(`/stato-ordine/${value.id}`) || !Number.isFinite(Date.parse(value.expiresAt))) return null;
    return value;
  } catch { return null; }
}
export function rememberCheckout(order: { id: string; statusUrl: string; paymentReservationExpiresAt: string }, items: readonly CartItem[], orderType: 'ASPORTO' | 'DELIVERY') {
  const pending = {id:order.id,statusUrl:order.statusUrl,expiresAt:order.paymentReservationExpiresAt,cartSignature:cartSignature(items,orderType),orderType};
  safeLocalStorage.setItem(KEY,JSON.stringify(pending));
  return pending;
}
export function settleCheckout(order: {id:string;paymentStatus:string;status:string}) {
  const pending=readPendingCheckout();if(pending?.id!==order.id)return;
  if (['PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(order.paymentStatus)) {
    const cart=useCartStore.getState();
    if(cartSignature(cart.items,cart.orderType)===pending.cartSignature)cart.clearCart();
    safeLocalStorage.removeItem(KEY);
  } else if(order.status==='CANCELLED')safeLocalStorage.removeItem(KEY);
}
