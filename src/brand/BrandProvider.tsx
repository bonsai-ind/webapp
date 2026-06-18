import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchBrand } from "./fetch-brand";
import { validateBrandColor } from "./brand-color";

interface Brand {
  name: string;
  logoUrl: string;
}

// DESIGN.md default brand indigo — used when a seller's color is rejected so a
// forbidden hue can never paint.
const DEFAULT_PRIMARY = "#6C5CE7";

const BrandContext = createContext<Brand | null>(null);

export function useBrand(): Brand {
  const brand = useContext(BrandContext);
  if (!brand) throw new Error("useBrand must be used within a BrandProvider");
  return brand;
}

type State = { status: "loading" } | { status: "resolved"; brand: Brand } | { status: "unknown" };

// Resolves the seller brand from the backend (GET /brand, by Origin — ADR-0003),
// applies the per-seller --primary (validated; forbidden hues fall back to the
// default), and renders an unknown-seller fallback for an unregistered host.
export function BrandProvider({ baseUrl, children }: { baseUrl: string; children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const apply = (name: string, logoUrl: string, primaryColor: string) => {
      if (!active) return;
      const primary = validateBrandColor(primaryColor).ok ? primaryColor : DEFAULT_PRIMARY;
      document.documentElement.style.setProperty("--primary", primary);
      setState({ status: "resolved", brand: { name, logoUrl } });
    };
    fetchBrand(baseUrl)
      .then((seller) => {
        if (!active) return;
        if (seller) apply(seller.name, seller.logoUrl, seller.primaryColor);
        else setState({ status: "unknown" }); // 404 — host isn't a registered seller
      })
      // Network/CORS failure shouldn't block the app — proceed with a default brand.
      .catch(() => apply("Hush", "", DEFAULT_PRIMARY));
    return () => {
      active = false;
    };
  }, [baseUrl]);

  if (state.status === "loading") return null;
  if (state.status === "unknown") {
    return <p role="alert">Unknown seller — this address isn’t set up.</p>;
  }
  return <BrandContext.Provider value={state.brand}>{children}</BrandContext.Provider>;
}
