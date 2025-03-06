
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { HexColorPicker } from "react-colorful";
import { Input } from "@/components/ui/input";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [color, setColor] = useState(value || "#000000");

  useEffect(() => {
    if (value !== color) {
      setColor(value);
    }
  }, [value]);

  const handleChange = (newColor: string) => {
    setColor(newColor);
    onChange(newColor);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);
    if (/^#([0-9A-F]{3}){1,2}$/i.test(newColor)) {
      onChange(newColor);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full h-10 flex items-center justify-between px-3 ${className}`}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-5 w-5 rounded-full border"
              style={{ backgroundColor: color }}
            />
            <span>{color}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex flex-col gap-4">
          <HexColorPicker color={color} onChange={handleChange} />
          <Input
            value={color}
            onChange={handleInputChange}
            className="mt-2"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ColorPicker;
