
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Plus, Loader2, Save } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface QACreatorProps {
  userId: string;
  onCreateComplete?: (success: boolean) => void;
}

const QACreator = ({ userId, onCreateComplete }: QACreatorProps) => {
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [category, setCategory] = useState<string>("General");
  const [priority, setPriority] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!question.trim() || !answer.trim()) {
      toast.error("Please enter both a question and an answer");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("chatbot_training_files")
        .insert({
          user_id: userId,
          question: question,
          answer: answer,
          source_file: "Q&A Pair",
          extracted_text: answer, // Also store in extracted_text for compatibility
          category: category,
          priority: priority,
          content_type: "qa_pair"
        });

      if (error) throw error;
      
      toast.success("Q&A pair created successfully!");
      setQuestion("");
      setAnswer("");
      setCategory("General");
      setPriority(5);
      
      if (onCreateComplete) onCreateComplete(true);
    } catch (error: any) {
      console.error("Error creating Q&A pair:", error);
      toast.error(`Failed to create Q&A pair: ${error.message || "Unknown error"}`);
      if (onCreateComplete) onCreateComplete(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create Q&A Pair</CardTitle>
        <CardDescription>
          Add question and answer pairs to directly train your chatbot
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="question">Question</Label>
          <Textarea 
            id="question" 
            placeholder="Enter a question your users might ask" 
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="answer">Answer</Label>
          <Textarea 
            id="answer" 
            placeholder="Enter the answer to the question" 
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="min-h-[150px]"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input 
            id="category" 
            placeholder="e.g., General, Services, Pricing" 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Priority Level ({priority})</Label>
            <span className="text-xs text-muted-foreground">Higher values = higher priority</span>
          </div>
          <Slider 
            value={[priority]} 
            min={1} 
            max={10} 
            step={1} 
            onValueChange={([v]) => setPriority(v)} 
            disabled={isSubmitting}
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !question.trim() || !answer.trim()} 
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Creating...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create Q&A Pair
            </>
          )}
        </Button>
        
        <div className="text-xs text-muted-foreground mt-2">
          <p>Creating Q&A pairs helps your chatbot:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Provide consistent answers to common questions</li>
            <li>Give accurate information about your products or services</li>
            <li>Understand your business-specific terminology</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default QACreator;
