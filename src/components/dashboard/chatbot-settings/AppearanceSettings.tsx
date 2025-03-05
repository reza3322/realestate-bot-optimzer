
import { useChatbotSettings } from "./ChatbotSettingsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { THEMES, COLORS, FONT_FAMILIES, CHATBOT_ICONS } from "./constants";

const AppearanceSettings = () => {
  const { settings, setSettings } = useChatbotSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how your chatbot looks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select 
              value={settings.theme} 
              onValueChange={(value) => setSettings({...settings, theme: value})}
            >
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    {theme.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="color">Color Variation</Label>
            <Select 
              value={settings.variation} 
              onValueChange={(value) => setSettings({...settings, variation: value})}
            >
              <SelectTrigger id="color">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {COLORS.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    {color.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex gap-2">
              <Input 
                id="primary-color" 
                type="color" 
                value={settings.primaryColor}
                onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                className="w-12 h-10 p-1"
              />
              <Input 
                type="text" 
                value={settings.primaryColor}
                onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="botIcon">Chat Icon</Label>
            <Select 
              value={settings.botIcon} 
              onValueChange={(value) => setSettings({...settings, botIcon: value})}
            >
              <SelectTrigger id="botIcon">
                <SelectValue placeholder="Select icon" />
              </SelectTrigger>
              <SelectContent>
                {CHATBOT_ICONS.map((icon) => (
                  <SelectItem key={icon.value} value={icon.value} className="flex items-center">
                    <div className="flex items-center">
                      <icon.icon className="mr-2 h-4 w-4" />
                      {icon.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fontFamily">Font Family</Label>
            <Select 
              value={settings.fontFamily} 
              onValueChange={(value) => setSettings({...settings, fontFamily: value})}
            >
              <SelectTrigger id="fontFamily">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem 
                    key={font.value} 
                    value={font.value} 
                    className={font.value === "serif" ? "font-serif" : 
                                font.value === "mono" ? "font-mono" : 
                                font.value === "sans" ? "font-sans" : 
                                font.value === "inter" ? "font-sans" : ""}
                  >
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Select 
              value={settings.position} 
              onValueChange={(value) => setSettings({...settings, position: value})}
            >
              <SelectTrigger id="position">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Bottom Left</SelectItem>
                <SelectItem value="right">Bottom Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="fontSize">Font Size: {settings.fontSize}px</Label>
          <Slider 
            id="fontSize"
            min={12}
            max={24}
            step={1}
            value={[settings.fontSize]}
            onValueChange={(value) => setSettings({...settings, fontSize: value[0]})}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AppearanceSettings;
