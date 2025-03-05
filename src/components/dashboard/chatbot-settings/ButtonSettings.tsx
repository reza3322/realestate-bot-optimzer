
import { useChatbotSettings } from "./ChatbotSettingsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHATBOT_ICONS, BUTTON_SIZES } from "./constants";

const ButtonSettings = () => {
  const { settings, setSettings } = useChatbotSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat Button</CardTitle>
        <CardDescription>Customize the button that opens your chatbot</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="buttonText">Button Text</Label>
            <Input 
              id="buttonText" 
              value={settings.buttonText}
              onChange={(e) => setSettings({...settings, buttonText: e.target.value})}
              placeholder="Chat with us"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="buttonIcon">Button Icon</Label>
            <Select 
              value={settings.buttonIcon} 
              onValueChange={(value) => setSettings({...settings, buttonIcon: value})}
            >
              <SelectTrigger id="buttonIcon">
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
            <Label htmlFor="buttonSize">Button Size</Label>
            <Select 
              value={settings.buttonSize} 
              onValueChange={(value) => setSettings({...settings, buttonSize: value})}
            >
              <SelectTrigger id="buttonSize">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buttonStyle">Button Style</Label>
            <Select 
              value={settings.buttonStyle} 
              onValueChange={(value) => setSettings({...settings, buttonStyle: value})}
            >
              <SelectTrigger id="buttonStyle">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rounded">Rounded</SelectItem>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="pill">Pill</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="button-color">Button Color</Label>
            <div className="flex gap-2">
              <Input 
                id="button-color" 
                type="color" 
                value={settings.buttonColor}
                onChange={(e) => setSettings({...settings, buttonColor: e.target.value})}
                className="w-12 h-10 p-1"
              />
              <Input 
                type="text" 
                value={settings.buttonColor}
                onChange={(e) => setSettings({...settings, buttonColor: e.target.value})}
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="button-text-color">Button Text Color</Label>
            <div className="flex gap-2">
              <Input 
                id="button-text-color" 
                type="color" 
                value={settings.buttonTextColor}
                onChange={(e) => setSettings({...settings, buttonTextColor: e.target.value})}
                className="w-12 h-10 p-1"
              />
              <Input 
                type="text" 
                value={settings.buttonTextColor}
                onChange={(e) => setSettings({...settings, buttonTextColor: e.target.value})}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buttonPosition">Button Position</Label>
            <Select 
              value={settings.buttonPosition} 
              onValueChange={(value) => setSettings({...settings, buttonPosition: value})}
            >
              <SelectTrigger id="buttonPosition">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                <SelectItem value="bottom-center">Bottom Center</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>Button Preview:</div>
              <div 
                className={`
                  flex items-center gap-2 px-4 py-2
                  ${settings.buttonStyle === 'rounded' ? 'rounded-md' : 
                    settings.buttonStyle === 'pill' ? 'rounded-full' : 'rounded-none'}
                  ${settings.buttonSize === 'small' ? 'text-sm' : 
                    settings.buttonSize === 'large' ? 'text-lg' : 'text-base'}
                `} 
                style={{ 
                  backgroundColor: settings.buttonColor,
                  color: settings.buttonTextColor
                }}
              >
                {(() => {
                  const IconComponent = CHATBOT_ICONS.find(icon => icon.value === settings.buttonIcon)?.icon;
                  return IconComponent && <IconComponent className="w-4 h-4" />;
                })()}
                <span>{settings.buttonText}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ButtonSettings;
