export interface SellerBrand {
  sellerId: string;
  hostname: string;
  name: string;
  logoUrl: string;
  primaryColor: string;
}

// Resolve the seller brand for the current host. PUBLIC (pre-login) — the gateway
// resolves by request Origin (ADR-0003). Returns null for an unregistered host.
export async function fetchBrand(baseUrl: string): Promise<SellerBrand | null> {
  const res = await fetch(`${baseUrl}/brand`);
  if (!res.ok) return null;
  return res.json();
}
