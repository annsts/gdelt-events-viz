import React, { useRef, useEffect, useState } from "react";

const toRad = (deg) => (deg * Math.PI) / 180;

export const CircularDashboard = ({ data }) => {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let animationFrameId;
    let lastTime = 0;
    const animate = (currentTime) => {
      if (lastTime === 0) lastTime = currentTime;
      const delta = currentTime - lastTime;
      setRotation((prev) => (prev + delta * 0.01) % 360);
      lastTime = currentTime;
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawRing = (radius, segments, rotation, color) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (let i = 0; i < segments; i++) {
        const startAngle = toRad(i * (360 / segments) + rotation);
        const endAngle = toRad((i + 0.8) * (360 / segments) + rotation);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      }
      ctx.stroke();
    };

    drawRing(100, 12, rotation, "#00FFFF");
    drawRing(120, 24, -rotation * 0.5, "#00FFFF80");
    drawRing(140, 36, rotation * 0.25, "#00FFFF40");
  }, [rotation]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
      />
      <div className="absolute inset-0">
        {data.map((point, index) => {
          const angle = (index * 360) / data.length + rotation;
          const radius = 120;
          const x = Math.cos(toRad(angle)) * radius;
          const y = Math.sin(toRad(angle)) * radius;
          return (
            <div
              key={index}
              className="absolute w-24 h-12 flex items-center justify-center"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                transition: "all 0.3s ease-out",
              }}
            ></div>
          );
        })}
      </div>
    </div>
  );
};
