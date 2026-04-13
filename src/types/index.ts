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
} from "@prisma/client";

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
};

// Category with products
export type CategoryWithProducts = Category & {
  products: ProductWithRelations[];
};

// Order with relations
export type OrderWithItems = Order & {
  items: OrderItem[];
  rider?: Rider | null;
  statusHistory: OrderStatusLog[];
};

// Cart types
export type CartItemAddition = {
  name: string;
  price: number;
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
  variant?: string;
  variantPriceDelta: number;
  additions: CartItemAddition[];
  removals: CartItemRemoval[];
  notes?: string;
  totalPrice: number;
};
