import { ArrowRightIcon } from "lucide-react";
// import { useState, useEffect } from "react";

export default function Hero() {
  // MOUSE EFFECT
  // const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // useEffect(() => {
  //   function handleMouseMove(e) {
  //     setMousePosition({ x: e.clientX, y: e.clientY });
  //   }

  //   window.addEventListener("mousemove", handleMouseMove);

  //   return () => window.removeEventListener("mousemove", handleMouseMove);
  // }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* MOUSE EFFECT */}
      {/* <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.2), transparent 80%), transparent 40%`,
        }}
      /> */}
      {/* ROOT DIV */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto w-full">
        {/* LEFT COLUMN */}
        <div className="flex flex-col space-y-4 items-center justify-center md:items-start text-center md:text-left">
          <h1 className="text-2xl md:text-4xl lg:text-7xl font-medium ">
            Having trouble focusing on your studies?
          </h1>
          <h1 className="text-lg md:text-3xl lg:text-4xl ">
            the smart way to monitor your study.
          </h1>
          {/* Bottom Part */}
          <div className="flex flex-row gap-4 mt-4 ">
            {/* Teacher Registration */}
            <a
              href="teacher-registration"
              className="bg-blue-600 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-blue-800 transition-all duration-300 ease-in-out"
            >
              Teacher Registration
            </a>
            {/* Student Registration */}
            <div className="group flex flex-row gap-2 items-center justify-center cursor-pointer">
              <a href="#student-registration" className="group-hover:underline">
                Are you ready to focus?
              </a>
              <ArrowRightIcon className="group-hover:translate-x-2 transition-all duration-300 ease-in-out" />
            </div>
          </div>
        </div>
        {/* RIGHT COLUMN */}
        <div className="flex items-center justify-center">
          <div className="w-full h-64 md:h-[26rem] bg-gray-300/20 opacity-20 backdrop-blur-sm rounded-lg">
            <div className=" p-4 bg-gray-400 opacity-20 backdrop-blur-sm rounded-lg">
              <div>113</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
