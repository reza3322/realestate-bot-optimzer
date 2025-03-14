
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/lib/supabase';

interface QACreatorProps {
  userId: string;
  onQACreated?: () => void;
}

const QACreator = ({ userId, onQACreated }: QACreatorProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState("3");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim()) {
      toast.error("Please provide both a question and an answer");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Insert into chatbot_training_files with content_type 'qa_pair'
      const { error } = await supabase
        .from('chatbot_training_files')
        .insert({
          user_id: userId,
          question: question.trim(),
          answer: answer.trim(),
          category,
          priority: parseInt(priority),
          content_type: 'qa_pair',
          extracted_text: answer.trim(), // Keep extracted_text for compatibility
          source_file: 'Manual Entry'
        });
      
      if (error) {
        console.error('Error creating Q&A:', error);
        toast.error(`Error creating Q&A: ${error.message}`);
        return;
      }
      
      toast.success("Q&A pair added successfully!");
      
      // Reset form
      setQuestion("");
      setAnswer("");
      setCategory("General");
      setPriority("3");
      
      // Trigger refresh callback
      if (onQACreated) {
        onQACreated();
      }
    } catch (error) {
      console.error('Exception creating Q&A:', error);
      toast.error("Failed to create Q&A pair. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Training Q&A</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input 
              id="question" 
              placeholder="e.g., What properties do you have in Marbella?" 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="answer">Answer</Label>
            <Textarea 
              id="answer" 
              placeholder="e.g., We have several luxury villas in Marbella, ranging from 2 to 5 bedrooms with prices starting at €1.5 million." 
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
              rows={5}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Properties">Properties</SelectItem>
                  <SelectItem value="Services">Services</SelectItem>
                  <SelectItem value="Location">Location</SelectItem>
                  <SelectItem value="Process">Process</SelectItem>
                  <SelectItem value="Pricing">Pricing</SelectItem>
                  <SelectItem value="FAQ">FAQ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Low (1)</SelectItem>
                  <SelectItem value="2">Medium-Low (2)</SelectItem>
                  <SelectItem value="3">Medium (3)</SelectItem>
                  <SelectItem value="4">Medium-High (4)</SelectItem>
                  <SelectItem value="5">High (5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Q&A Pair"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default QACreator;
