import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
interface LocationSuggestion {
  id: string;
  name: string;
  text: string;
}
interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}
export function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Start typing to search...",
  className = ""
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [hasValidSelection, setHasValidSelection] = useState(!!value);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Sync inputValue when external value changes
  useEffect(() => {
    setInputValue(value || '');
    setHasValidSelection(!!value);
  }, [value]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If user typed but never selected, revert to last valid value
        if (!hasValidSelection && inputValue !== value) {
          setInputValue(value || '');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hasValidSelection, inputValue, value]);
  const searchLocations = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('mapbox-search', {
        body: {
          query
        }
      });
      if (error) throw error;
      setSuggestions(data.suggestions || []);
      setIsOpen(true);
    } catch (err) {
      console.error('Location search error:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setHasValidSelection(false);
    if (!newValue) {
      onChange('');
      setHasValidSelection(true);
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocations(newValue), 300);
  };
  const handleSelect = (suggestion: LocationSuggestion) => {
    setInputValue(suggestion.text);
    onChange(suggestion.text);
    setHasValidSelection(true);
    setIsOpen(false);
    setSuggestions([]);
  };
  const handleClear = () => {
    setInputValue('');
    onChange('');
    setHasValidSelection(true);
    setSuggestions([]);
    setIsOpen(false);
  };
  return <div ref={containerRef} className={`relative ${className}`}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 z-10 text-muted-foreground" />
      <Input placeholder={placeholder} value={inputValue} onChange={handleInputChange} onFocus={() => {
      if (suggestions.length > 0) setIsOpen(true);
      // If there's a current value, start a search to show options
      if (inputValue.length >= 2 && !hasValidSelection) {
        searchLocations(inputValue);
      }
    }} className={`pl-10 ${value ? 'pr-10' : ''} bg-card border-border`} />
      
      {/* Clear button when there's a selected value */}
      {value && <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-secondary transition-colors z-10">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>}
      
      {isOpen && suggestions.length > 0 && <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {suggestions.map(s => <button key={s.id} type="button" onClick={() => handleSelect(s)} className="w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{s.name}</span>
            </button>)}
        </div>}

      {isOpen && suggestions.length === 0 && inputValue.length >= 2 && !isLoading && <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 px-3 py-2 text-sm text-muted-foreground">
          No locations found
        </div>}
      
      {isLoading && <div className={`absolute ${value ? 'right-8' : 'right-3'} top-1/2 -translate-y-1/2`}>
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>}
    </div>;
}