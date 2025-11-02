"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // === SCROLL TARGETS ===
  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Fundo
    ctx.fillStyle = "rgba(15, 30, 50, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Rios
    ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, 0);
    ctx.bezierCurveTo(200, 300, 400, 200, 600, 600);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width - 100, 0);
    ctx.bezierCurveTo(
      canvas.width - 200,
      400,
      canvas.width - 400,
      200,
      canvas.width - 600,
      800
    );
    ctx.stroke();

    // Zonas de risco
    ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
    ctx.beginPath();
    ctx.arc(300, 400, 150, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(239, 68, 68, 0.1)";
    ctx.beginPath();
    ctx.arc(canvas.width - 300, 300, 200, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(251, 146, 60, 0.12)";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height - 200, 180, 0, Math.PI * 2);
    ctx.fill();

    // Resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background/60 z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-20 text-center max-w-2xl mx-auto px-4"
      >
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.8 }}
          className="text-5xl md:text-7xl font-bold mb-4 text-balance"
        >
          <span className="text-foreground">GeoRisk</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-lg md:text-xl text-muted-foreground mb-8 text-balance"
        >
          Análise inteligente de risco geográfico
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            size="lg"
            style={{ cursor: "pointer" }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8"
            onClick={() => handleScrollTo("teste-section")}
          >
            Testar agora
          </Button>

          <Button
            size="lg"
            variant="outline"
            style={{ cursor: "pointer" }}
            className="border-accent text-accent hover:bg-accent/10 rounded-full px-8 bg-transparent"
            onClick={() => handleScrollTo("sobre-section")}
          >
            Saiba mais
          </Button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20"
      >
        <div className="w-6 h-10 border-2 border-accent rounded-full flex items-start justify-center p-2">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="w-1 h-2 bg-accent rounded-full"
          />
        </div>
      </motion.div>
    </section>
  );
}
