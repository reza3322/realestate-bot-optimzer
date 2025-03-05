
import { useState } from "react";
import { useChatbotSettings } from "./ChatbotSettingsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { testChatbotResponse } from "@/components/ui/chatbot/responseHandlers";

interface TestChatbotProps {
  userId: string;
}

const TestChatbot = ({ userId }: TestChatbotProps) => {
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const testChatbot = async () => {
    if (!testMessage.trim()) {
      toast.error("Please enter a test message");
      return;
    }

    setIsTesting(true);
    try {
      const { response, error } = await testChatbotResponse(testMessage, userId);
      
      if (error) {
        throw new Error(error);
      }

      setTestResponse(response);
      toast.success("Test message processed successfully");
    } catch (error) {
      console.error("Error testing chatbot:", error);
      toast.error(`Error testing chatbot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Chatbot</CardTitle>
        <CardDescription>Send a test message to verify the OpenAI API integration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="testMessage">Test Message</Label>
          <div className="flex gap-2">
            <Input 
              id="testMessage" 
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter a test message..."
              className="flex-1"
            />
            <Button 
              onClick={testChatbot} 
              disabled={isTesting}
            >
              {isTesting ? "Testing..." : "Send Test"}
            </Button>
          </div>
        </div>
        
        {testResponse && (
          <div className="space-y-2">
            <Label htmlFor="testResponse">Response</Label>
            <div className="border rounded-md p-4 bg-secondary/20">
              <p>{testResponse}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestChatbot;
