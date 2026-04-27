import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import ChatWidget from "@/components/chat/ChatWidget";

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const slides = [
    {
      title: "WELCOME TO",
      subtitle: "BUKIDNON STATE UNIVERSITY",
      motto: "Educate. Innovate. Lead."
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Utility Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-8">
            <div className="flex items-center space-x-4">
              <span className="text-xs font-medium text-blue-900">Recent News</span>
              <div className="overflow-hidden max-w-xs">
                <p className="text-xs text-gray-600 animate-pulse">
                  Notice of Hiring – Instructor II
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              December 15, 2024
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* University Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 flex items-center justify-center" style={{backgroundColor: 'transparent'}}>
                <img 
                  src="/LOGO.png" 
                  alt="BukSU Logo"
                  className="w-14 h-14 object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-900">BUKIDNON STATE UNIVERSITY</h1>
                <p className="text-xs text-gray-600">Malaybalay City, Bukidnon 8700, Philippines</p>
              </div>
            </div>

            {/* Accreditation Logos */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="w-8 h-8 rounded flex items-center justify-center" style={{backgroundColor: '#001C38'}}>
                <span className="text-white text-xs font-bold">A+</span>
              </div>
              <div className="w-8 h-8 rounded flex items-center justify-center" style={{backgroundColor: '#001C38'}}>
                <span className="text-white text-xs font-bold">ISO</span>
              </div>
              <div className="w-8 h-8 rounded flex items-center justify-center" style={{backgroundColor: '#001C38'}}>
                <span className="text-white text-xs font-bold">QA</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className={`transition-all duration-300 bg-white md:bg-[#001C38] ${isScrolled ? 'sticky top-0 z-50 shadow-lg' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {['About', 'Academics', 'Research & Extension', 'Administration & Finance', 'Students', 'Good Governance', 'Contact Us'].map((item) => (
                <div key={item} className="relative group">
                  <button className="px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors rounded">
                    {item}
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-1">
                      <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Submenu Item 1</a>
                      <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Submenu Item 2</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Header Branding */}
            <div className="md:hidden flex items-center space-x-3">
              <img 
                src="/LOGO.png" 
                alt="BukSU Logo"
                className="w-10 h-10 object-cover"
              />
              <div className="flex flex-col">
                <span className="font-bold text-[#001C38] leading-tight" style={{fontSize: '12px'}}>BUKIDNON STATE UNIVERSITY</span>
                <span className="text-gray-600 leading-tight text-bold" style={{fontSize: '7px', color: '#001C38'}}>Malaybalay City, Bukidnon 8700, Philippines</span>
              </div>
            </div>

            {/* Search Icon */}
            <div className="flex items-center space-x-0">
              <button className="p-2 text-[#001C38] md:text-white hover:bg-gray-200 md:hover:bg-blue-800 rounded-lg transition-colors">
                <Search className="w-6 h-6" />
              </button>
              
              {/* Mobile Menu Toggle */}
              <button 
                className="md:hidden p-2 text-[#001C38] hover:bg-gray-200 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-blue-800">
              {['About', 'Academics', 'Research & Extension', 'Administration & Finance', 'Students', 'Good Governance', 'Contact Us'].map((item) => (
                <a key={item} href="#" className="block px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors rounded">
                  {item}
                </a>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Hero Banner Section */}
      <section className="relative h-screen overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <div className="w-full h-full bg-white">
            <div className="absolute inset-0 bg-black/20"></div>
            {/* Simulated campus background */}
            <div className="absolute inset-0 ">
              <div className="grid grid-cols-6 h-full">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className="border border-white/10"></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <p className="text-lg md:text-2xl tracking-wider">
                {slides[currentSlide].title}
              </p>
              <h1 className="text-4xl md:text-7xl font-bold " style={{color: '#001C38'}}>
                {slides[currentSlide].subtitle}
              </h1>
            </div>
            
            {/* University Seal */}
            <div className="relative flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="w-32 h-32 md:w-48 md:h-48 flex items-center justify-center"
              >
                <img 
                  src="/LOGO.png" 
                  alt="BukSU University Seal" 
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>
            
            {/* Motto */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-center space-x-2">
                <div className="w-16 h-0.5 bg-yellow-400"></div>
                <span className="text-lg md:text-xl font-semibold text-blue-900 tracking-widest">
                  {slides[currentSlide].motto}
                </span>
                <div className="w-16 h-0.5 bg-yellow-400"></div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Carousel Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5 text-blue-900" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5 text-blue-900" />
        </button>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-blue-900" />
        </div>
      </section>

      {/* Additional Content Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center p-8"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-900 font-bold text-xl">50+</span>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-2">Years of Excellence</h3>
              <p className="text-gray-600">Providing quality education for over five decades</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-center p-8"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-900 font-bold text-xl">20K</span>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-2">Students</h3>
              <p className="text-gray-600">Empowering thousands of learners annually</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center p-8"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-900 font-bold text-xl">100+</span>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-2">Programs</h3>
              <p className="text-gray-600">Diverse academic offerings across disciplines</p>
            </motion.div>
          </div>
        </div>
      </section>

      <ChatWidget />
    </div>
  );
}
