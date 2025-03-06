
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorOption {
  name: string;
  value: string;
}

interface ColorPickerProps {
  defaultColor?: string;
  onChange?: (color: string) => void;
  className?: string;
  presetColors?: ColorOption[];
  allowCustom?: boolean;
}

const DEFAULT_COLORS: ColorOption[] = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' }
];

export const ColorPicker = ({
  defaultColor = '#3b82f6',
  onChange,
  className,
  presetColors = DEFAULT_COLORS,
  allowCustom = true
}: ColorPickerProps) => {
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [customColor, setCustomColor] = useState(defaultColor);
  const [isOpen, setIsOpen] = useState(false);

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    onChange?.(color);
    setIsOpen(false);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value);
    setSelectedColor(e.target.value);
    onChange?.(e.target.value);
  };

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between font-normal"
          >
            <div className="flex items-center gap-2">
              <div 
                className="h-4 w-4 rounded-full border border-gray-200" 
                style={{ backgroundColor: selectedColor }}
              />
              <span>{selectedColor}</span>
            </div>
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="grid gap-4">
            <div className="grid grid-cols-4 gap-2">
              {presetColors.map((color) => (
                <Button
                  key={color.value}
                  variant="outline"
                  className="relative flex aspect-square h-auto w-auto items-center justify-center rounded-md p-0"
                  style={{ backgroundColor: color.value }}
                  onClick={() => handleColorChange(color.value)}
                >
                  {selectedColor === color.value && (
                    <CheckIcon className="h-4 w-4 text-white" />
                  )}
                  <span className="sr-only">{color.name}</span>
                </Button>
              ))}
            </div>
            
            {allowCustom && (
              <div className="grid gap-2">
                <label 
                  htmlFor="custom-color" 
                  className="text-xs font-medium"
                >
                  Custom Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="custom-color"
                    value={customColor}
                    onChange={handleCustomColorChange}
                    className="h-8 w-8 cursor-pointer rounded-md border-0"
                  />
                  <input
                    type="text"
                    value={customColor}
                    onChange={handleCustomColorChange}
                    className="flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ColorPicker;
