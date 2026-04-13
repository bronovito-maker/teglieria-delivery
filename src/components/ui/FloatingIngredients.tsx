"use client";

import React, { useEffect, useState } from 'react';

const ingredients = [
  { id: 1, icon: '🌿', size: '2.5rem', delay: '0s', left: '10%', top: '15%', speed: '6s' },
  { id: 2, icon: '🍅', size: '3.5rem', delay: '1s', left: '80%', top: '25%', speed: '8s' },
  { id: 3, icon: '🍄', size: '2.2rem', delay: '2s', left: '15%', top: '65%', speed: '7s' },
  { id: 4, icon: '🥖', size: '3rem', delay: '0.5s', left: '75%', top: '75%', speed: '10s' },
  { id: 5, icon: '🧄', size: '1.8rem', delay: '3s', left: '45%', top: '10%', speed: '9s' },
  { id: 6, icon: '🧂', size: '1.5rem', delay: '1.5s', left: '90%', top: '60%', speed: '7s' },
  { id: 7, icon: '🌿', size: '2rem', delay: '2.5s', left: '5%', top: '40%', speed: '8s' },
  { id: 8, icon: '🍅', size: '2.8rem', delay: '4s', left: '40%', top: '85%', speed: '9s' },
];

const FloatingIngredients = () => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.pageYOffset);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fade out based on scroll
  const opacity = Math.max(0, 1 - offset / 500);

  if (opacity <= 0) return null;

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none z-0"
      style={{ opacity }}
    >
      {ingredients.map((ing) => (
        <div
          key={ing.id}
          className="absolute animate-float opacity-40 filter grayscale-[0.1]"
          style={{
            left: ing.left,
            top: ing.top,
            fontSize: ing.size,
            animationDelay: ing.delay,
            animationDuration: ing.speed,
          }}
        >
          {ing.icon}
        </div>
      ))}
    </div>
  );
};

export default FloatingIngredients;
