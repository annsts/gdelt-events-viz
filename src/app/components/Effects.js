import React from "react";

export const LoadingOverlay = () => (
  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[#00FFFF] font-mono">
    <div className="text-center space-y-4">
      <div className="text-2xl">LOADING DATA</div>
      <div className="w-48 h-1 bg-[#00FFFF]/20">
        <div className="h-full bg-[#00FFFF] animate-pulse" />
      </div>
    </div>
  </div>
);

export const GridOverlay = () => (
  <div className="absolute inset-0 pointer-events-none">
    <div
      className="w-full h-full border-[1px] border-[#00FFFF]/20"
      style={{
        backgroundImage: `
            linear-gradient(0deg, transparent 24%, 
            rgba(0, 255, 255, 0.03) 25%, 
            rgba(0, 255, 255, 0.03) 26%, 
            transparent 27%, transparent 74%, 
            rgba(0, 255, 255, 0.03) 75%, 
            rgba(0, 255, 255, 0.03) 76%, 
            transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, 
            rgba(0, 255, 255, 0.03) 25%, 
            rgba(0, 255, 255, 0.03) 26%, 
            transparent 27%, transparent 74%, 
            rgba(0, 255, 255, 0.03) 75%, 
            rgba(0, 255, 255, 0.03) 76%, 
            transparent 77%, transparent)
          `,
        backgroundSize: "60px 60px",
      }}
    />
  </div>
);

export const ScanLines = () => (
  <div
    className="absolute inset-0 pointer-events-none mix-blend-overlay"
    style={{
      background: `repeating-linear-gradient(
          transparent 0px,
          rgba(0, 0, 0, 0.3) 1px,
          transparent 2px,
          transparent 4px
        )`,
    }}
  />
);
