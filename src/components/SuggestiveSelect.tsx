import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

interface Option {
  value: string;
  label: string;
}

interface SuggestiveSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  loading?: boolean;
}

export default function SuggestiveSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  loading = false
}: SuggestiveSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
        // Reset input to selected value if no exact match
        if (inputValue !== value) {
          const exactMatch = options.find(opt => 
            opt.value.toLowerCase() === inputValue.toLowerCase()
          );
          if (!exactMatch) {
            setInputValue(value);
          }
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, inputValue, options]);

  // Filter options based on input
  const filteredOptions = options.filter(option =>
    String(option.value || '').toLowerCase().includes(inputValue.toLowerCase()) ||
    String(option.label || '').toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
    
    // Call onChange immediately to allow free text input
    onChange(newValue);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOptionClick = (option: Option) => {
    setInputValue(option.value);
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleChevronClick = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          autoComplete="off"
        />
        <div 
          className="absolute inset-y-0 right-0 flex items-center px-2 cursor-pointer"
          onClick={handleChevronClick}
        >
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onClick={() => handleOptionClick(option)}
                className={`px-3 py-2 cursor-pointer text-sm ${
                  index === highlightedIndex 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'hover:bg-gray-50'
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="font-medium">{option.value}</div>
                {option.label !== option.value && (
                  <div className="text-xs text-gray-500">{option.label}</div>
                )}
              </div>
            ))
          ) : inputValue.length > 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No matches found for "{inputValue}"
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              Start typing to see options
            </div>
          )}
        </div>
      )}
    </div>
  );
}