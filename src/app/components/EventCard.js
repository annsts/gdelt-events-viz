import React from "react";
import { MapPin, Link, Scale, AudioWaveform, X, ExternalLink, Clock } from "lucide-react";

export const EventCard = ({ data, onClose }) => {
  if (!data) return null;

  // Conflict scale
  const getConflictScale = (scale) => {
    if (scale >= 7)
      return {
        color: "text-emerald-400",
        bg: "bg-emerald-400/10",
        border: "border-emerald-400/20",
        description: "Strong Cooperation",
        hint: "Highly positive actions (aid, support)",
      };
    if (scale >= 4)
      return {
        color: "text-green-400",
        bg: "bg-green-400/10",
        border: "border-green-400/20",
        description: "Moderate Cooperation",
        hint: "Diplomatic or economic collaboration",
      };
    if (scale >= 1)
      return {
        color: "text-lime-400",
        bg: "bg-lime-400/10",
        border: "border-lime-400/20",
        description: "Mild Cooperation",
        hint: "Minor supportive actions",
      };
    if (scale >= -1)
      return {
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        border: "border-amber-400/20",
        description: "Neutral",
        hint: "Neither cooperative nor conflictual",
      };
    if (scale >= -4)
      return {
        color: "text-orange-400",
        bg: "bg-orange-400/10",
        border: "border-orange-400/20",
        description: "Mild Tension",
        hint: "Disagreements, criticism",
      };
    if (scale >= -7)
      return {
        color: "text-rose-400",
        bg: "bg-rose-400/10",
        border: "border-rose-400/20",
        description: "High Tension",
        hint: "Strong verbal conflicts",
      };
    return {
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      description: "Severe Conflict",
      hint: "Most negative interactions",
    };
  };

  // Tone scale
  const getToneScale = (tone) => {
    if (tone >= 7)
      return {
        color: "text-emerald-400",
        bg: "bg-emerald-400/10",
        border: "border-emerald-400/20",
        description: "Very Positive",
        hint: "Highly optimistic content",
      };
    if (tone >= 3)
      return {
        color: "text-green-400",
        bg: "bg-green-400/10",
        border: "border-green-400/20",
        description: "Positive",
        hint: "Favorable outlook",
      };
    if (tone >= -3)
      return {
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        border: "border-amber-400/20",
        description: "Neutral",
        hint: "Balanced perspective",
      };
    if (tone >= -7)
      return {
        color: "text-orange-400",
        bg: "bg-orange-400/10",
        border: "border-orange-400/20",
        description: "Negative",
        hint: "Critical or concerning",
      };
    return {
      color: "text-rose-400",
      bg: "bg-rose-400/10",
      border: "border-rose-400/20",
      description: "Very Negative",
      hint: "Highly critical or alarming",
    };
  };

  const conflictScale = getConflictScale(data.goldsteinScale);
  const toneScale = getToneScale(data.tone);

  return (
    <div className="data-point-container fixed top-0 right-0 w-96 h-screen overflow-hidden z-10">
      <div className="absolute inset-0 backdrop-blur-xl bg-slate-900/80 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-slate-800/50 to-slate-900/50 pointer-events-none" />
      <div className="relative h-full flex flex-col z-10">
        <div className="flex items-center justify-between p-4 border-b border-white/10 backdrop-blur-md bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-sm text-cyan-400 font-medium tracking-wide">
              DATA NODE #{data.id}
            </h2>
          </div>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white/90 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-sm">
          {data.image && (
            <div className="relative h-40 border-b border-white/10">
              <img
                src={data.image}
                alt={data.article.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent pointer-events-none" />
            </div>
          )}
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className={`p-3 rounded-lg ${conflictScale.bg} border ${conflictScale.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Scale className={`w-4 h-4 ${conflictScale.color}`} />
                  <span className="text-xs text-white/70">Cooperation-Conflict Scale</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-lg font-bold ${conflictScale.color}`}>
                      {data.goldsteinScale.toFixed(1)}
                    </span>
                    <span className={`text-sm ${conflictScale.color}`}>
                      {conflictScale.description}
                    </span>
                  </div>
                  <span className="text-xs text-white/50">{conflictScale.hint}</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${toneScale.bg} border ${toneScale.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AudioWaveform className={`w-4 h-4 ${toneScale.color}`} />
                  <span className="text-xs text-white/70">Content Tone</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-lg font-bold ${toneScale.color}`}>
                      {data.tone.toFixed(1)}
                    </span>
                    <span className={`text-sm ${toneScale.color}`}>
                      {toneScale.description}
                    </span>
                  </div>
                  <span className="text-xs text-white/50">{toneScale.hint}</span>
                </div>
              </div>
            </div>
            {(data.article?.title || data.article?.description) && (
              <div className="rounded-lg bg-white/5 border border-white/10">
                <div className="p-3 border-b border-white/10">
                  <span className="text-xs text-white/50 uppercase tracking-wider">
                    Article
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {data.article?.title && (
                    <h3 className="text-white/90 font-medium leading-snug">
                      {data.article.title}
                    </h3>
                  )}
                  {data.article?.description && (
                    <p className="text-white/70 text-xs leading-relaxed">
                      {data.article.description}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 text-xs">
              {data.location && (
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <div className="flex items-center gap-2 text-white/70 mr-4">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    Location
                  </div>
                  <span className="text-white/90">{data.location}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-2 rounded bg-white/5">
                <div className="flex items-center gap-2 text-white/70">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Updated
                </div>
                <span className="text-white/90">
                  {new Date(data.timestamp).toLocaleString()}
                </span>
              </div>
              {data.sourceURL && (
                <a
                  href={data.sourceURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 text-white/70">
                    <Link className="w-3 h-3 text-cyan-400" />
                    Source
                  </div>
                  <div className="flex items-center gap-1 text-cyan-400">
                    <span className="truncate max-w-[200px]">
                      {new URL(data.sourceURL).hostname}
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
