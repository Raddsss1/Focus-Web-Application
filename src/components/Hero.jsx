import { useState, useEffect } from "react";

export default function Hero() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseMove(e) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }

    window.addEventListener("mousemove", handleMouseMove);

    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* MOUSE EFFECT */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.2), transparent 80%), transparent 40%`,
        }}
      />
      {/* ROOT DIV */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto w-full">
        {/* LEFT COLUMN */}
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-medium ">
            Focus
          </h1>
          <h1 className="text-2xl md:text3xl lg:text-4xl ">
            the smart way to monitor your study.
          </h1>
          <div>1</div>
        </div>
        {/* RIGHT COLUMN */}
        <div>2</div>
      </div>
    </section>
  );
}
