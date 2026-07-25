import type { QueryClient } from "@tanstack/react-query";
import type { Session } from "../../session/session";
import { deleteJson, postVoid } from "../../api/get-json";

function refresh(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["shop"] });
}

// Set the absolute quantity of a product in the caller's cart.
export async function setQty(session: Session, qc: QueryClient, productId: string, qty: number): Promise<void> {
  if (qty < 1) return removeFromCart(session, qc, productId);
  await postVoid(session, "/shop/cart", { productId, qty });
  refresh(qc);
}

// Remove a product from the caller's cart.
export async function removeFromCart(session: Session, qc: QueryClient, productId: string): Promise<void> {
  await deleteJson(session, `/shop/cart/${productId}`);
  refresh(qc);
}
