import { Menu, X } from "lucide-react";
import { useState } from "react";
export default function NavBar() {
  const [mobileMenuIsOpen, setMobileMenuIsOpen] = useState(false);

  return (
    // ROOT NavBar
    <nav className="fixed top-0 z-50 bg-slate-950/20 w-full transition-all duration-300 backdrop-blur-sm">
      {/* NavBar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
          {/* LOGO SECTION */}
          <div className="flex items-center space-x-2 group cursor-pointer">
            {/* LOGO */}
            <div>
              <img
                src="/favicon.svg"
                alt="Focus"
                className="h-6 w-6 sm:w-8 sm:h-8"
              />
            </div>
            {/* LOGO NAME */}
            <span className="font-medium text-lg sm:text-xl md:text-2xl">
              <span className="text-white">Focus</span>
            </span>
          </div>
          {/* NAV LINKS */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <a
              href="#how-it-works"
              className="text-gray-300 hover:text-white text-sm lg:text-base transition-colors duration-300"
            >
              How It Works
            </a>
            <a
              href="#for-students"
              className="text-gray-300 hover:text-white text-sm lg:text-base transition-colors duration-300"
            >
              For Students
            </a>
            <a
              href="#for-teachers"
              className="text-gray-300 hover:text-white text-sm lg:text-base transition-colors duration-300"
            >
              For Teachers
            </a>
            <a
              href="#faqs"
              className="block text-gray-300 hover:text-white text-sm lg:text-base transition-colors duration-300"
            >
              FAQs
            </a>
          </div>
          <div>
            <a
              href="#get-started"
              className="hidden md:block bg-blue-500 hover:bg-slate-500 hover:cursor-pointer text-white py-2 px-4 rounded-md transition-colors duration-300"
            >
              Get Started
            </a>
          </div>
          {/* MENU BUTTON */}
          <button
            className="md:hidden items-center p-2 text-gray-300 hover:text-white " //focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white
            onClick={() => setMobileMenuIsOpen((prev) => !prev)}
          >
            {mobileMenuIsOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuIsOpen && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 animate-in slide-in-from-top duration-300">
          <div className="px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuIsOpen(false)}
              className="block text-gray-300 hover:text-white text-sm lg:text-base transition-colors duration-300"
            >
              How It Works
            </a>
            <a
              href="#for-students"
              onClick={() => setMobileMenuIsOpen(false)}
              className="block text-gray-300 hover:text-white text-sm lg:text-base transition-colors duration-300"
            >
              For Students
            </a>
            <a
              href="#for-teachers"
              onClick={() => setMobileMenuIsOpen(false)}
              className="block text-gray-300 hover:text-white text-sm lg:text-base transition-colors duration-300"
            >
              For Teachers
            </a>
            <a
              href="#faqs"
              onClick={() => setMobileMenuIsOpen(false)}
              className="block text-gray-300 hover:text-white text-sm lg:text-base transition-colors duration-300"
            >
              FAQs
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
