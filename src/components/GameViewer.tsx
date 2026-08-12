"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Gamecast } from "@/components/Gamecast";
import type { PlayEvent } from "@/lib/sim";

// 3D scene is client-only (WebGL) — never server-render it.
const Gamecast3D = dynamic(
  () => import("@/components/Gamecast3D").then((m) => m.Gamecast3D),
  {
    ssr: false,
    loading: () => (
      <div className="gc3d-loading">Loading 3D broadcast…</div>
    ),
  },
);

type Props = {
  awayName: string;
  homeName: string;
  awayAbbr: string;
  homeAbbr: string;
  plays: PlayEvent[];
  finalAway: number;
  finalHome: number;
};

export function GameViewer(props: Props) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hardball-view");
      if (saved === "2d" || saved === "3d") setMode(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const choose = (m: "2d" | "3d") => {
    setMode(m);
    try {
      localStorage.setItem("hardball-view", m);
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-1">
        <button
          type="button"
          className={`gc-bit-btn ${mode === "2d" ? "on" : ""}`}
          onClick={() => choose("2d")}
        >
          2D
        </button>
        <button
          type="button"
          className={`gc-bit-btn ${mode === "3d" ? "on" : ""}`}
          onClick={() => choose("3d")}
        >
          3D
        </button>
      </div>
      {mode === "3d" ? <Gamecast3D {...props} /> : <Gamecast {...props} />}
    </div>
  );
}
