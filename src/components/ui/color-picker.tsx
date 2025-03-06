
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <div 
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
          style={{ backgroundColor: color }}
        />
        <Input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div 
            className="h-9 w-9 rounded cursor-pointer border border-input flex items-center justify-center"
            style={{ backgroundColor: color }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="grid grid-cols-8 gap-1">
            {colorOptions.map((colorOption) => (
              <button
                key={colorOption}
                type="button"
                className="w-6 h-6 rounded-md border border-input"
                style={{ backgroundColor: colorOption }}
                onClick={() => {
                  onChange(colorOption);
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
          
          <div className="mt-4">
            <input
              type="color"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-8"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const colorOptions = [
  "#000000", "#ffffff", "#f44336", "#e91e63", "#9c27b0", "#673ab7", 
  "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
  "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722",
  "#795548", "#9e9e9e", "#607d8b", "#1abc9c", "#2ecc71", "#3498db",
  "#9b59b6", "#f1c40f", "#e67e22", "#e74c3c", "#ecf0f1", "#95a5a6"
];
