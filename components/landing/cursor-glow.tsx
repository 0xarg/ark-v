"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

/**
 * Decorative cursor-tracking radial glow.
 * Stays fixed in viewport — trails the cursor with spring physics.
 * Only renders on hover-capable (desktop) devices.
 */
export function CursorGlow() {
  const mouseX = useMotionValue(-1200);
  const mouseY = useMotionValue(-1200);
  const visible = useRef(false);

  const springX = useSpring(mouseX, { stiffness: 80, damping: 22, mass: 0.6 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 22, mass: 0.6 });

  useEffect(() => {
    // Only activate on devices that support hover (desktop)
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const onMove = (e: MouseEvent) => {
      if (!visible.current) visible.current = true;
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[2] overflow-hidden"
      aria-hidden
    >
      {/* Outer soft bloom */}
      <motion.div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 40%, transparent 70%)",
        }}
      />
      {/* Inner tighter core */}
      <motion.div
        style={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: "50%",
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 65%)",
        }}
      />
    </motion.div>
  );
}
