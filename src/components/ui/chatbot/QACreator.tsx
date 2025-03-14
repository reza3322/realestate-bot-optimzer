
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface QACreatorProps {
  userId: string;
  onSubmitSuccess?: () => void;
}

const QACreator = ({ userId, onSubmitSuccess }: QACreatorProps) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('3');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim()) {
      toast.error('Please provide both a question and an answer');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Save Q&A pair to the chatbot_training_files table
      const { error } = await supabase
        .from('chatbot_training_files')
        .insert([
          {
            user_id: userId,
            question: question.trim(),
            answer: answer.trim(),
            category: category,
            priority: parseInt(priority),
            content_type: 'qa_pair',
            source_file: 'Manual Entry',
            extracted_text: `${question.trim()}\n\n${answer.trim()}`
          }
        ]);
      
      if (error) {
        console.error('Error saving Q&A:', error);
        toast.error('Failed to save Q&A pair');
        return;
      }
      
      toast.success('Q&A pair saved successfully');
      
      // Reset form
      setQuestion('');
      setAnswer('');
      setCategory('General');
      setPriority('3');
      
      // Notify parent component if callback provided
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      console.error('Exception saving Q&A:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Q&A Pair</CardTitle>
        <CardDescription>
          Create a question and answer pair to train your chatbot with specific knowledge
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="Enter a question your users might ask"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="answer">Answer</Label>
            <Textarea
              id="answer"
              placeholder="Provide the answer to this question"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
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
                <SelectTrigger id="priority">
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
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Q&A Pair'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default QACreator;
