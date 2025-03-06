
import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface ColorPickerProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const ColorPicker = ({ value, onValueChange }: ColorPickerProps) => {
  const [open, setOpen] = useState(false);
  
  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#f97316", // orange
    "#06b6d4", // cyan
    "#6366f1", // indigo
    "#000000", // black
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start flex gap-2 h-10"
          style={{ borderColor: value }}
        >
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: value }}
          />
          <span>{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="grid grid-cols-5 gap-2">
          {colors.map((color) => (
            <div
              key={color}
              className="w-8 h-8 rounded-full cursor-pointer border border-gray-200 dark:border-gray-700"
              style={{ backgroundColor: color }}
              onClick={() => {
                onValueChange(color);
                setOpen(false);
              }}
            />
          ))}
        </div>
        <div className="flex mt-4">
          <input
            type="color"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className="w-full cursor-pointer"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
