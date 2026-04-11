import React, { useState, useEffect } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

const slides = [
  {
    // Elektrikář u rozvaděče
    image: "/hero/elektrikar.jpg",
  },
  {
    // Instalatér
    image: "/hero/instalater.jpg",
  },
  {
    // Klimatizace
    image: "/hero/klimatizace.jpg",
  },
  {
    // Advokát v kanceláři
    image: "/hero/advokat.png",
  },
  {
    // Hlídání dětí
    image: "/hero/hlidani-deti.png",
  },
  {
    // Masáže
    image: "/hero/masaze.png",
  },
  {
    // Obkladač
    image: "/hero/obkladac.jpg",
  },
  {
    // Sádrokartonář
    image: "/hero/sadrokartonar.png",
  },
  {
    // Topenář u kotle
    image: "/hero/topenar.jpg",
  },
  {
    // Účetní
    image: "/hero/ucetni.png",
  },
  {
    // Úklidové práce
    image: "https://images.pexels.com/photos/4107112/pexels-photo-4107112.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    // Rekonstrukce RD
    image: "https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    // Strojní výkopové práce
    image: "https://images.pexels.com/photos/2058911/pexels-photo-2058911.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
];

const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl group">
      {/* Slides */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img
              src={slide.image}
              alt={`Slide ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        aria-label="Previous slide"
      >
        <CaretLeft weight="bold" className="w-5 h-5 text-gray-800" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        aria-label="Next slide"
      >
        <CaretRight weight="bold" className="w-5 h-5 text-gray-800" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
              index === currentSlide 
                ? 'bg-orange-500 w-6' 
                : 'bg-white/60 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
