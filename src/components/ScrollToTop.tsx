'use client';

import React, { useState, useEffect } from 'react';
import { AppIcon } from '@/components/ui/icon';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      className="scroll-to-top"
      onClick={scrollToTop}
      title="Scroll to top"
      aria-label="Scroll to top"
    >
      <AppIcon name="ArrowUp" size="md" stroke={2.5} />
    </button>
  );
}
