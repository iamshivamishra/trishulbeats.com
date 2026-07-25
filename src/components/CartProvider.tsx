"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/http";
import { cartApi } from "@/lib/api/cart";
import { packCartApi } from "@/lib/api/pack-cart";
import type { CartItemPopulated } from "@/types";

const STORAGE_KEY = "trishul_cart";

interface LocalCartItem {
  beatId: string;
  licenseId: string;
}

interface CartContextType {
  items: CartItemPopulated[];
  count: number;
  total: number;
  packCount: number;
  totalCount: number;
  loading: boolean;
  addItem: (beatId: string, licenseId: string) => Promise<void>;
  removeItem: (beatId: string) => Promise<void>;
  updateLicense: (beatId: string, licenseId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
  isInCart: (beatId: string) => boolean;
}

const CartContext = createContext<CartContextType | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

function getLocalCart(): LocalCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCart(items: LocalCartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function clearLocalCart() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session?.user;
  const isLoading = status === "loading";

  const [items, setItems] = useState<CartItemPopulated[]>([]);
  const [packCount, setPackCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const total = items.reduce((sum, i) => sum + i.price, 0);
  const count = items.length;
  const totalCount = count + packCount;

  const fetchPackCount = useCallback(async () => {
    try {
      const data = await packCartApi.get();
      setPackCount(data.count);
    } catch {
      setPackCount(0);
    }
  }, []);

  // Fetch server cart for logged-in users
  const fetchServerCart = useCallback(async () => {
    try {
      const data = await cartApi.get();
      setItems(data.items);
    } catch {
      /* ignore */
    }
  }, []);

  // Load cart from localStorage for guests
  const loadGuestCart = useCallback(() => {
    const local = getLocalCart();
    const guestItems: CartItemPopulated[] = local.map((item) => ({
      beatId: item.beatId,
      licenseId: item.licenseId,
      beatTitle: "",
      beatGenre: "",
      producerName: "",
      licenseName: "",
      licenseType: "basic" as const,
      price: 0,
    }));
    setItems(guestItems);
  }, []);

  // Sync guest cart to server on login
  const syncGuestCartToServer = useCallback(async () => {
    const local = getLocalCart();
    if (local.length === 0) return;

    for (const item of local) {
      try {
        await cartApi.add(item.beatId, item.licenseId);
      } catch {
        /* skip failed items */
      }
    }

    clearLocalCart();
  }, []);

  // Initialize cart
  useEffect(() => {
    if (isLoading) return;

    const init = async () => {
      setLoading(true);
      if (isLoggedIn) {
        await syncGuestCartToServer();
        await Promise.all([fetchServerCart(), fetchPackCount()]);
      } else {
        loadGuestCart();
        setPackCount(0);
      }
      setLoading(false);
    };

    init();
  }, [isLoggedIn, isLoading, fetchServerCart, fetchPackCount, loadGuestCart, syncGuestCartToServer]);

  const addItem = useCallback(
    async (beatId: string, licenseId: string) => {
      if (items.some((i) => i.beatId === beatId)) {
        toast.info("This beat is already in your cart");
        return;
      }

      if (isLoggedIn) {
        try {
          await cartApi.add(beatId, licenseId);
          await fetchServerCart();
          toast.success("Added to cart");
        } catch (error) {
          if (error instanceof ApiError) {
            toast.error(error.message);
          } else {
            toast.error("Something went wrong");
          }
        }
      } else {
        const local = getLocalCart();
        if (local.some((i) => i.beatId === beatId)) {
          toast.info("This beat is already in your cart");
          return;
        }
        local.push({ beatId, licenseId });
        setLocalCart(local);
        setItems((prev) => [
          ...prev,
          {
            beatId,
            licenseId,
            beatTitle: "",
            beatGenre: "",
            producerName: "",
            licenseName: "",
            licenseType: "basic",
            price: 0,
          },
        ]);
        toast.success("Added to cart");
      }
    },
    [isLoggedIn, items, fetchServerCart]
  );

  const removeItem = useCallback(
    async (beatId: string) => {
      if (isLoggedIn) {
        try {
          await cartApi.remove(beatId);
          await fetchServerCart();
          toast.success("Removed from cart");
        } catch {
          toast.error("Something went wrong");
        }
      } else {
        const local = getLocalCart().filter((i) => i.beatId !== beatId);
        setLocalCart(local);
        setItems((prev) => prev.filter((i) => i.beatId !== beatId));
        toast.success("Removed from cart");
      }
    },
    [isLoggedIn, fetchServerCart]
  );

  const updateLicense = useCallback(
    async (beatId: string, licenseId: string) => {
      if (isLoggedIn) {
        try {
          await cartApi.updateLicense(beatId, licenseId);
          await fetchServerCart();
          toast.success("License updated");
        } catch (error) {
          if (error instanceof ApiError) {
            toast.error(error.message);
          } else {
            toast.error("Something went wrong");
          }
        }
      } else {
        const local = getLocalCart().map((i) =>
          i.beatId === beatId ? { ...i, licenseId } : i
        );
        setLocalCart(local);
        setItems((prev) =>
          prev.map((i) => (i.beatId === beatId ? { ...i, licenseId } : i))
        );
        toast.success("License updated");
      }
    },
    [isLoggedIn, fetchServerCart]
  );

  const clearCart = useCallback(async () => {
    if (isLoggedIn) {
      try {
        await cartApi.clear();
        setItems([]);
        toast.success("Cart cleared");
      } catch {
        toast.error("Something went wrong");
      }
    } else {
      clearLocalCart();
      setItems([]);
      toast.success("Cart cleared");
    }
  }, [isLoggedIn]);

  const refresh = useCallback(async () => {
    if (isLoggedIn) {
      await Promise.all([fetchServerCart(), fetchPackCount()]);
    }
  }, [isLoggedIn, fetchServerCart, fetchPackCount]);

  const isInCart = useCallback(
    (beatId: string) => items.some((i) => i.beatId === beatId),
    [items]
  );

  const contextValue = useMemo(
    () => ({
      items,
      count,
      total,
      packCount,
      totalCount,
      loading,
      addItem,
      removeItem,
      updateLicense,
      clearCart,
      refresh,
      isInCart,
    }),
    [items, count, total, packCount, totalCount, loading, addItem, removeItem, updateLicense, clearCart, refresh, isInCart]
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}
