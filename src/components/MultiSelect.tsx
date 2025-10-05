import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  loading?: boolean;
}

export default function MultiSelect({
  values,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  loading = false
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
        setSearchValue('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    !values.includes(option.value) &&
    (String(option.value || '').toLowerCase().includes(searchValue.toLowerCase()) ||
    String(option.label || '').toLowerCase().includes(searchValue.toLowerCase()))
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOptionClick = (option: Option) => {
    onChange([...values, option.value]);
    setSearchValue('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemoveValue = (valueToRemove: string) => {
    onChange(values.filter(v => v !== valueToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && searchValue === '' && values.length > 0) {
      onChange(values.slice(0, -1));
      return;
    }

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
        setSearchValue('');
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
      <div className="relative min-h-[42px] px-3 py-1 border border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
        <div className="flex flex-wrap gap-1 items-center">
          {values.map(value => (
            <span
              key={value}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
            >
              {value}
              <button
                type="button"
                onClick={() => handleRemoveValue(value)}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={values.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] outline-none border-none py-1"
            autoComplete="off"
          />
        </div>
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
          ) : searchValue.length > 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No matches found for "{searchValue}"
            </div>
          ) : values.length === options.length ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              All options selected
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
