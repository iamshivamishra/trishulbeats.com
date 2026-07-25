import type { Metadata } from "next";
import CartClient from "./CartClient";

export const metadata: Metadata = {
  title: "Your Cart — Trishul Beats",
  description: "Review your selected beats and licenses before checkout.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartClient />;
}
