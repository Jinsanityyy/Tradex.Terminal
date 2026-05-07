"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function DetailModal({ open, onClose, children, title }: DetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/72 backdrop-blur-[6px]"
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-w-[760px] max-h-[82vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[hsl(220,18%,7%)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/6 bg-[hsl(220,18%,7%)]/95 px-5 py-4 backdrop-blur">
          {title ? <h2 className="pr-6 text-base font-semibold text-white">{title}</h2> : null}
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/8 hover:text-white"
          >
          <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
