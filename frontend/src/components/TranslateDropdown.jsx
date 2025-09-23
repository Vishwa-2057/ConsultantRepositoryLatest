import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Globe, ChevronDown, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh-cn', name: '中文 (简体)', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
];

export function TranslateDropdown() {
  const location = useLocation();
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Load saved language from localStorage
    return localStorage.getItem('selectedLanguage') || 'en';
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [originalTexts, setOriginalTexts] = useState(new Map());

  // Auto-translate page when component mounts if a language is selected
  useEffect(() => {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage && savedLanguage !== 'en') {
      // Small delay to ensure page content is loaded
      setTimeout(() => {
        translatePageContent(savedLanguage);
      }, 500);
    }
  }, []);

  // Listen for route changes and auto-translate new pages
  useEffect(() => {
    if (currentLanguage !== 'en') {
      // Reset original texts for new page
      setOriginalTexts(new Map());
      
      // Small delay to ensure new page content is loaded
      const timer = setTimeout(() => {
        translatePageContent(currentLanguage);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Translation function using MyMemory API (free, no CORS issues)
  const translateText = async (text, targetLang) => {
    try {
      // Skip very short or empty text
      if (!text || text.trim().length < 2) {
        return text;
      }

      // Use MyMemory API which is free and doesn't have CORS issues
      const encodedText = encodeURIComponent(text.trim());
      const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLang}`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const result = await response.json();
        if (result.responseStatus === 200 && result.responseData) {
          return result.responseData.translatedText;
        }
      }
    } catch (error) {
      console.error('Translation error:', error);
    }
    
    // Fallback: return original text if translation fails
    return text;
  };

  const translatePageContent = async (languageCode) => {
    if (languageCode === 'en') {
      resetToOriginal();
      return;
    }

    setIsTranslating(true);
    setCurrentLanguage(languageCode);
    
    // Save selected language to localStorage
    localStorage.setItem('selectedLanguage', languageCode);

    try {
      // Find all text nodes to translate
      const textNodes = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // Skip script and style elements
            const parent = node.parentElement;
            if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
              return NodeFilter.FILTER_REJECT;
            }
            // Only translate non-empty text nodes with meaningful content
            const text = node.textContent.trim();
            if (text.length > 1 && !/^[\d\s\-_.,!@#$%^&*()+={}[\]:";'<>?/|\\`~]*$/.test(text)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          }
        }
      );

      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }

      console.log(`Found ${textNodes.length} text nodes to translate`);

      // Store original texts if not already stored
      if (originalTexts.size === 0) {
        const newOriginalTexts = new Map();
        textNodes.forEach((node, index) => {
          newOriginalTexts.set(index, node.textContent);
        });
        setOriginalTexts(newOriginalTexts);
      }

      // Translate each text node with delay to avoid rate limiting
      for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes[i];
        const originalText = originalTexts.get(i) || node.textContent;
        
        if (originalText.trim().length > 1) {
          console.log(`Translating: "${originalText.substring(0, 50)}..."`);
          const translatedText = await translateText(originalText, languageCode);
          
          if (translatedText && translatedText !== originalText) {
            node.textContent = translatedText;
            console.log(`Translated to: "${translatedText.substring(0, 50)}..."`);
          }
          
          // Add small delay to avoid overwhelming the API
          if (i < textNodes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

    } catch (error) {
      console.error('Translation failed:', error);
      alert('Translation failed. Please try again or use browser translation.');
    }

    setIsTranslating(false);
  };

  const resetToOriginal = () => {
    if (originalTexts.size > 0) {
      // Find all text nodes again and restore original text
      const textNodes = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
              return NodeFilter.FILTER_REJECT;
            }
            if (node.textContent.trim().length > 0) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          }
        }
      );

      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }

      // Restore original texts
      textNodes.forEach((node, index) => {
        const originalText = originalTexts.get(index);
        if (originalText) {
          node.textContent = originalText;
        }
      });
    }

    setCurrentLanguage('en');
    setOriginalTexts(new Map());
    
    // Remove selected language from localStorage
    localStorage.removeItem('selectedLanguage');
  };

  const getCurrentLanguageInfo = () => {
    return languages.find(lang => lang.code === currentLanguage) || languages[0];
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-2" disabled={isTranslating}>
            {isTranslating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{getCurrentLanguageInfo().flag}</span>
            <span className="hidden md:inline">
              {isTranslating ? 'Translating...' : getCurrentLanguageInfo().name}
            </span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
          <DropdownMenuItem
            onClick={resetToOriginal}
            className={`flex items-center gap-3 ${currentLanguage === 'en' ? 'bg-accent' : ''}`}
          >
            <span className="text-base">🇺🇸</span>
            <span>English (Original)</span>
          </DropdownMenuItem>
          
          <div className="border-t border-border my-1"></div>
          
          {languages.slice(1).map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => translatePageContent(language.code)}
              className={`flex items-center gap-3 ${currentLanguage === language.code ? 'bg-accent' : ''}`}
              disabled={isTranslating}
            >
              <span className="text-base">{language.flag}</span>
              <span>{language.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

    </>
  );
}
