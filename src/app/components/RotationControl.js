import React from "react";
import { Pause, Play } from "lucide-react";

const RotationControl = ({ isActive, onToggle }) => {
  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="relative group">
        <button
          onClick={onToggle}
          className={`
            flex items-center gap-2 px-4 py-2 
            rounded-lg backdrop-blur-md
            border transition-all duration-200
            ${
              isActive
                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                : "bg-slate-900/50 border-white/10 text-white/50"
            }
            hover:bg-white/10 hover:border-cyan-500/30
          `}
        >
          <div className="flex items-center gap-2">
            {isActive ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span className="text-sm font-mono">
              {isActive ? "ROTATION ON" : "ROTATION OFF"}
            </span>
          </div>
        </button>
        <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
            <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10">
              Tab
            </kbd>
            <span>to toggle</span>
          </div>
        </div>
        {isActive && (
          <div className="absolute -right-1 -top-1">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

export default RotationControl;
