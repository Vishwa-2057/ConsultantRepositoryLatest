import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Edit, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isClinic } from '@/utils/roleUtils';

const Carousel = ({ images, autoPlay = true, interval = 5000, onEdit, onDelete, onAdd }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const canEdit = isClinic();

  // Reset currentIndex if it exceeds the new images length
  useEffect(() => {
    if (currentIndex >= images.length) {
      setCurrentIndex(Math.max(0, images.length - 1));
    }
  }, [images.length, currentIndex]);

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, images.length, isPaused]);

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div 
      className="relative w-full h-44 rounded-lg overflow-hidden shadow-lg group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{border:"3px double #2279d0ff", borderRadius:"4px"}}
    >
      {/* Images */}
      <div className="relative w-full h-full">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image.src}
              alt={image.alt || `Slide ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Overlay gradient for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            
            {/* Image caption */}
            {image.caption && (
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-white text-lg font-semibold mb-1">
                  {image.caption}
                </h3>
                {image.description && (
                  <p className="text-white/90 text-sm">
                    {image.description}
                  </p>
                )}
              </div>
            )}
            
            {/* Edit/Delete buttons - Only for Clinic Admin */}
            {canEdit && (onEdit || onDelete) && index === currentIndex && (
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-white/20 hover:bg-white/30 text-white pointer-events-auto"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Edit button clicked, index:', index);
                      onEdit(index);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && images.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-red-500/20 hover:bg-red-500/30 text-white pointer-events-auto"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Delete button clicked, index:', index);
                      onDelete(index);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        onClick={goToPrevious}
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        onClick={goToNext}
      >
        <ChevronRight className="w-5 h-5" />
      </Button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 items-center">
        {images.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-white scale-125' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
            onClick={() => goToSlide(index)}
          />
        ))}
        
        {/* Add button - Only for Clinic Admin */}
        {canEdit && onAdd && (
          <button
            className="ml-3 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
            onClick={onAdd}
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Carousel;
