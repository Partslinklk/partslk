"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StoreData } from "./store-data";

const StoreDataContext = createContext<StoreData | null>(null);

export function StoreDataProvider({ data, children }: { data: StoreData; children: ReactNode }) {
  return <StoreDataContext value={data}>{children}</StoreDataContext>;
}

export function useStoreData(): StoreData {
  const ctx = useContext(StoreDataContext);
  if (!ctx) throw new Error("useStoreData must be used within StoreDataProvider");
  return ctx;
}
