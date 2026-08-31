import type {
  Order,
  OrderItem,
  Product,
  Category,
  ProductVariant,
  ProductAddition,
  ProductRemoval,
  Rider,
  DeliveryZone,
  OrderStatusLog,
  PaymentRefund,
} from "@prisma/client";

export type ClubPromotionWithItems = {
  id: string;
  title: string;
  description: string | null;
  price: number | string;
  imageUrl: string | null;
  startsAt: string | Date;
  endsAt: string | Date;
  active: boolean;
  sortOrder: number;
  items: Array<{ quantity: number; product: { id: string; name: string } }>;
};

export type {
  Order,
  OrderItem,
  Product,
  Category,
  ProductVariant,
  ProductAddition,
  ProductRemoval,
  Rider,
  DeliveryZone,
  OrderStatusLog,
};

// Product with relations
export type ProductWithRelations = Product & {
  category: Category;
  variants: ProductVariant[];
  additions: ProductAddition[];
  removals: ProductRemoval[];
  standardPrice?: Product["price"];
  isClubPrice?: boolean;
  promoPrice?: Product["promoPrice"];
};

// Category with products
export type CategoryWithProducts = Category & {
  products: ProductWithRelations[];
};

// Order with relations
export type OrderWithItems = Order & {
  items: OrderItem[];
  refunds?: PaymentRefund[];
  rider?: Rider | null;
  statusHistory: OrderStatusLog[];
};

// Cart types
export type CartItemAddition = {
  name: string;
  price: number;
  grams?: number;
  available?: boolean;
  allergens?: string[];
};

export type CartItemRemoval = {
  name: string;
};

export type CartItem = {
  id: string; // unique cart item id
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  standardUnitPrice?: number;
  variant?: string;
  variantPriceDelta: number;
  additions: CartItemAddition[];
  removals: CartItemRemoval[];
  notes?: string;
  totalPrice: number;
};
