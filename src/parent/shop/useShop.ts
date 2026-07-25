import { useQuery } from "@tanstack/react-query";
import type { Session } from "../../session/session";
import { getJson } from "../../api/get-json";

export interface ShopProduct {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  priceCents: number;
  currency: string;
  category: string;
  externalUrl: string;
  qty: number; // in the caller's cart
}

export interface ShopData {
  products: ShopProduct[];
}

export interface CartLine {
  productId: string;
  title: string;
  imageUrl: string;
  priceCents: number;
  currency: string;
  externalUrl: string;
  qty: number;
}

export interface CartData {
  items: CartLine[];
  subtotalCents: number;
  currency: string;
  count: number;
}

// The product catalog with the caller's cart quantities merged, cached under ["shop"].
export function useShop(session: Session) {
  const q = useQuery({ queryKey: ["shop"], queryFn: () => getJson<ShopData>(session, "/shop") });
  return { data: q.data, isLoading: q.isLoading };
}

// The caller's cart (lines + subtotal), cached under ["shop","cart"].
export function useCart(session: Session) {
  const q = useQuery({ queryKey: ["shop", "cart"], queryFn: () => getJson<CartData>(session, "/shop/cart") });
  return { data: q.data, isLoading: q.isLoading };
}

// Format a minor-unit price. USD → "$12.34"; otherwise a currency-tagged amount.
export function formatPrice(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return currency === "USD" ? `$${amount}` : `${amount} ${currency}`;
}
