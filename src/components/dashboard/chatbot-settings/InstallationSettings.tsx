
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface InstallationSettingsProps {
  generateEmbedCode: () => string;
  saveSettings: () => Promise<void>;
  saving: boolean;
}

const InstallationSettings = ({ 
  generateEmbedCode, 
  saveSettings, 
  saving 
}: InstallationSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Installation</CardTitle>
        <CardDescription>Copy this code to embed the chatbot on your website</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="embedCode">Embed Code</Label>
          <div className="relative">
            <Textarea 
              id="embedCode" 
              value={generateEmbedCode()}
              readOnly
              className="font-mono text-sm h-24 pr-20"
            />
            <Button
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => {
                navigator.clipboard.writeText(generateEmbedCode());
                toast.success("Embed code copied to clipboard");
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InstallationSettings;
