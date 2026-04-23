"use client";

import React, { useEffect, useState } from "react";

const ingredients = [
  {
    id: 1,
    icon: "🌿",
    size: "2.7rem",
    left: "10%",
    top: "15%",
    xDepth: -95,
    yDepth: -160,
    rotateDepth: -15,
    opacity: 0.62,
  },
  {
    id: 2,
    icon: "🍅",
    size: "3.8rem",
    left: "80%",
    top: "25%",
    xDepth: 120,
    yDepth: -210,
    rotateDepth: 22,
    opacity: 0.74,
  },
  {
    id: 3,
    icon: "🍄",
    size: "2.4rem",
    left: "16%",
    top: "66%",
    xDepth: -80,
    yDepth: -120,
    rotateDepth: -10,
    opacity: 0.56,
  },
  {
    id: 4,
    icon: "🥖",
    size: "3.2rem",
    left: "74%",
    top: "76%",
    xDepth: 115,
    yDepth: -140,
    rotateDepth: 14,
    opacity: 0.65,
  },
  {
    id: 5,
    icon: "🧄",
    size: "2rem",
    left: "45%",
    top: "10%",
    xDepth: 65,
    yDepth: -170,
    rotateDepth: 26,
    opacity: 0.58,
  },
  {
    id: 6,
    icon: "🧂",
    size: "1.7rem",
    left: "90%",
    top: "60%",
    xDepth: -75,
    yDepth: -105,
    rotateDepth: -18,
    opacity: 0.54,
  },
  {
    id: 7,
    icon: "🌿",
    size: "2.2rem",
    left: "6%",
    top: "42%",
    xDepth: 102,
    yDepth: -165,
    rotateDepth: 18,
    opacity: 0.6,
  },
  {
    id: 8,
    icon: "🍅",
    size: "3rem",
    left: "40%",
    top: "84%",
    xDepth: -130,
    yDepth: -235,
    rotateDepth: -24,
    opacity: 0.7,
  },
];

const FloatingIngredients = () => {
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(900);
  const [viewportWidth, setViewportWidth] = useState(1280);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        ticking = false;
      });
    };

    const handleResize = () => {
      setViewportHeight(window.innerHeight || 900);
      setViewportWidth(window.innerWidth || 1280);
    };

    handleResize();
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const heroRange = Math.max(480, Math.floor(viewportHeight * 0.95));
  const rawProgress = Math.min(1, scrollY / heroRange);
  const easedProgress = 1 - Math.pow(1 - rawProgress, 1.55);

  const depthScale =
    viewportWidth < 640 ? 0.48 : viewportWidth < 1024 ? 0.72 : 1.18;
  const rotationScale =
    viewportWidth < 640 ? 0.55 : viewportWidth < 1024 ? 0.78 : 1.05;
  const scaleBoost = viewportWidth < 640 ? 0.04 : viewportWidth < 1024 ? 0.06 : 0.1;
  const isMobile = viewportWidth < 640;
  const containerOpacity = Math.max(0, (isMobile ? 0.74 : 0.96) - rawProgress * 1.02);
  const mobileOverrides: Record<number, { left?: string; top?: string; size?: string; opacity?: number }> = {
    1: { left: "6%", top: "22%", size: "2.15rem", opacity: 0.28 },
    2: { left: "90%", top: "58%", size: "2.75rem", opacity: 0.22 },
  };

  if (containerOpacity <= 0) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-0"
      style={{ opacity: containerOpacity }}
    >
      {ingredients.map((ing) => {
        if (isMobile && ![1, 2].includes(ing.id)) {
          return null;
        }

        const override = isMobile ? mobileOverrides[ing.id] : undefined;

        return (
          <div
            key={ing.id}
            className="absolute ingredient-parallax will-change-transform"
            style={{
              left: override?.left ?? ing.left,
              top: override?.top ?? ing.top,
              fontSize: override?.size ?? ing.size,
              opacity: override?.opacity ?? ing.opacity,
              transform: `translate3d(${easedProgress * ing.xDepth * depthScale}px, ${easedProgress * ing.yDepth * depthScale}px, 0) rotate(${easedProgress * ing.rotateDepth * rotationScale}deg) scale(${1 + easedProgress * scaleBoost})`,
            }}
          >
            {ing.icon}
          </div>
        );
      })}
    </div>
  );
};

export default FloatingIngredients;
