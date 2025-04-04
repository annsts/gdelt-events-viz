export const Tooltip = ({ data, position }) => {
    if (!data) return null;
  
    return (
      <div
        className="absolute backdrop-blur-lg rounded-lg overflow-hidden animate-fadeIn"
        style={{
          left: position.x + 15,
          top: position.y + 15,
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-black/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 animate-pulse" />
          <div className="relative p-3 font-mono min-w-[200px]">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-400 font-semibold">ID: {data.id}</span>
            </div>
            <div className="mb-2 p-1.5 rounded bg-white/5 flex justify-between items-center">
              <span className="text-white/70 text-xs">Score</span>
              <span className="text-cyan-400 font-medium">
                {data.sentimentScore.toFixed(2)}
              </span>
            </div>
            <div className="text-white/90 text-xs mb-2">{data.text}</div>
            <div className="text-[10px] text-white/50 pt-2 border-t border-white/10">
              {new Date(data.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    );
  };