import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "../../session/session";
import { formatPrice, useCart, useShop, type ShopProduct } from "./useShop";
import { removeFromCart, setQty } from "./shop-actions";
import { ContentImage } from "../ContentImage";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function QtyStepper({
  qty,
  onChange,
}: {
  qty: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(qty - 1)}
        className="grid size-7 place-items-center rounded-full border border-line-2 text-ink font-bold"
      >
        −
      </button>
      <span className="min-w-4 text-center text-[14px] font-semibold tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(qty + 1)}
        className="grid size-7 place-items-center rounded-full border border-line-2 text-ink font-bold"
      >
        +
      </button>
    </div>
  );
}

function ProductCard({ product, session }: { product: ShopProduct; session: Session }) {
  const qc = useQueryClient();
  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3">
      <ContentImage src={product.imageUrl} alt={product.title} className="h-24 w-full rounded-[10px] object-contain bg-surface-2 p-2" />
      <p className="text-[13.5px] font-semibold leading-tight text-ink">{product.title}</p>
      <p className="text-[14px] font-bold text-ink">{formatPrice(product.priceCents, product.currency)}</p>
      {product.qty > 0 ? (
        <QtyStepper qty={product.qty} onChange={(n) => void setQty(session, qc, product.id, n)} />
      ) : (
        <button
          type="button"
          onClick={() => void setQty(session, qc, product.id, 1)}
          className="h-9 rounded-[12px] bg-primary-soft text-[13px] font-semibold text-primary"
        >
          Add to cart
        </button>
      )}
    </div>
  );
}

function CartScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const qc = useQueryClient();
  const { data } = useCart(session);
  const lines = data?.items ?? [];

  return (
    <div className="flex flex-col gap-3">
      <button onClick={onBack} className="flex items-center gap-1 text-[13px] font-semibold text-primary">
        ← Keep shopping
      </button>
      {lines.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-[18px] text-[13px] text-ink-2">Your cart is empty.</p>
      ) : (
        <>
          <div className="rounded-card border border-line bg-surface">
            {lines.map((line) => (
              <div key={line.productId} className="flex items-center gap-3 border-b border-line p-3 last:border-b-0">
                <ContentImage src={line.imageUrl} alt={line.title} className="size-12 rounded-[10px] object-contain bg-surface-2 p-1" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{line.title}</p>
                  <p className="text-[13px] font-bold text-ink">{formatPrice(line.priceCents, line.currency)}</p>
                </div>
                <QtyStepper qty={line.qty} onChange={(n) => void setQty(session, qc, line.productId, n)} />
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => void removeFromCart(session, qc, line.productId)}
                  className="text-[16px] text-ink-3"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-ink-2">Subtotal ({data?.count} items)</span>
            <span className="text-[18px] font-extrabold text-ink">
              {formatPrice(data?.subtotalCents ?? 0, data?.currency ?? "USD")}
            </span>
          </div>
          {/* Checkout links out — no in-app payment. Opens the first item's store as the stub. */}
          <a
            href={lines[0]?.externalUrl || "#"}
            target="_blank"
            rel="noreferrer noopener"
            className="grid h-12 place-items-center rounded-[14px] bg-primary font-semibold text-white"
          >
            Checkout ↗
          </a>
          <p className="text-center text-[11px] text-ink-3">Checkout opens the retailer — no payment is taken here.</p>
        </>
      )}
    </div>
  );
}

// The Shop tab: a product catalog with category filters + a link-out cart.
export function ShopView({ session }: { session: Session }) {
  const { data, isLoading } = useShop(session);
  const [cartOpen, setCartOpen] = useState(false);
  const [category, setCategory] = useState("All");

  if (cartOpen) return <CartScreen session={session} onBack={() => setCartOpen(false)} />;

  const products = data?.products ?? [];
  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  const shown = category === "All" ? products : products.filter((p) => p.category === category);
  const cartCount = products.reduce((n, p) => n + p.qty, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-[18px] flex gap-1.5 overflow-x-auto px-[18px] pb-0.5">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={
              "shrink-0 rounded-full border px-3 py-1 text-[12.5px] font-semibold capitalize transition-colors " +
              (category === c
                ? "border-primary bg-primary-soft text-primary"
                : "border-line-2 bg-surface text-ink-2 hover:border-ink-3")
            }
          >
            {cap(c)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-[13px] text-ink-3">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {shown.map((p) => (
            <ProductCard key={p.id} product={p} session={session} />
          ))}
        </div>
      )}

      {cartCount > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="sticky bottom-3 z-10 h-12 rounded-[14px] bg-primary font-semibold text-white shadow-lg"
        >
          View cart ({cartCount})
        </button>
      )}
    </div>
  );
}
