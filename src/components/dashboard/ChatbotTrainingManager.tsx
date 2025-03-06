
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, FileUp, Save, BrainCircuit } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Categories for training data
const CATEGORIES = [
  { value: "properties", label: "Property Information" },
  { value: "company", label: "Company Information" },
  { value: "service", label: "Services" },
  { value: "area", label: "Area Information" },
  { value: "process", label: "Buying/Selling Process" },
  { value: "faq", label: "FAQ" },
];

interface ChatbotTrainingManagerProps {
  userId: string;
}

const ChatbotTrainingManager = ({ userId }: ChatbotTrainingManagerProps) => {
  const [activeTab, setActiveTab] = useState<"examples" | "upload">("examples");
  const [examples, setExamples] = useState<Array<{
    id?: string;
    question: string;
    answer: string;
    category: string;
    priority: number;
    isNew?: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<{[key: string]: number}>({});
  const [fileContent, setFileContent] = useState<string>("");
  const [uploadProcessing, setUploadProcessing] = useState(false);

  useEffect(() => {
    fetchTrainingExamples();
  }, [userId]);

  const fetchTrainingExamples = async () => {
    setLoading(true);
    try {
      // Fetch existing training examples
      const { data, error } = await supabase
        .from('chatbot_training_data')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: false });

      if (error) throw error;

      // Count examples by category
      const counts: {[key: string]: number} = {};
      if (data) {
        data.forEach(item => {
          counts[item.category] = (counts[item.category] || 0) + 1;
        });

        setCategoryCounts(counts);
        setExamples(data || []);
      }
    } catch (err) {
      console.error('Error fetching training examples:', err);
      toast.error('Failed to load training examples');
    } finally {
      setLoading(false);
    }
  };

  const addNewExample = () => {
    setExamples([
      ...examples, 
      { 
        question: '', 
        answer: '', 
        category: 'faq', 
        priority: 5,
        isNew: true 
      }
    ]);
  };

  const updateExample = (index: number, field: string, value: string | number) => {
    const updatedExamples = [...examples];
    updatedExamples[index] = { 
      ...updatedExamples[index], 
      [field]: value 
    };
    setExamples(updatedExamples);
  };

  const removeExample = async (index: number) => {
    const example = examples[index];
    
    // If it's an existing item, delete from database
    if (example.id) {
      try {
        const { error } = await supabase
          .from('chatbot_training_data')
          .delete()
          .eq('id', example.id);
        
        if (error) throw error;
        
        toast.success('Example deleted successfully');
      } catch (err) {
        console.error('Error deleting example:', err);
        toast.error('Failed to delete example');
        return;
      }
    }
    
    // Remove from local state
    const newExamples = [...examples];
    newExamples.splice(index, 1);
    setExamples(newExamples);
  };

  const saveAllExamples = async () => {
    setSaving(true);
    
    try {
      // Filter examples with validation
      const validExamples = examples.filter(ex => 
        ex.question.trim() !== '' && ex.answer.trim() !== ''
      );
      
      // Group by new vs existing
      const newExamples = validExamples.filter(ex => ex.isNew);
      const existingExamples = validExamples.filter(ex => !ex.isNew);
      
      // Insert new examples
      if (newExamples.length > 0) {
        const { error: insertError } = await supabase
          .from('chatbot_training_data')
          .insert(
            newExamples.map(ex => ({
              user_id: userId,
              question: ex.question,
              answer: ex.answer,
              category: ex.category,
              priority: ex.priority,
              content_type: 'text'
            }))
          );
        
        if (insertError) throw insertError;
      }
      
      // Update existing examples
      for (const example of existingExamples) {
        const { error: updateError } = await supabase
          .from('chatbot_training_data')
          .update({
            question: example.question,
            answer: example.answer,
            category: example.category,
            priority: example.priority
          })
          .eq('id', example.id);
        
        if (updateError) throw updateError;
      }
      
      toast.success('Training examples saved successfully');
      
      // Refresh data
      fetchTrainingExamples();
    } catch (err) {
      console.error('Error saving examples:', err);
      toast.error('Failed to save training examples');
    } finally {
      setSaving(false);
    }
  };

  const processFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      
      // Basic validation
      if (content.length < 10) {
        toast.error('File content is too short');
        return;
      }
      
      setUploadProcessing(true);
      
      try {
        // Process content - simple extraction for demo
        // A more sophisticated approach would use NLP
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const extractedExamples = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Look for patterns like questions (ends with ?)
          if (line.endsWith('?') && i + 1 < lines.length) {
            const question = line;
            let answer = lines[i + 1];
            
            // If next line seems to be part of the answer, include it
            if (i + 2 < lines.length && !lines[i + 2].endsWith('?')) {
              answer += ' ' + lines[i + 2];
              i++;
            }
            
            if (question.length > 10 && answer.length > 10) {
              extractedExamples.push({
                question,
                answer: answer.trim(),
                category: 'faq',
                priority: 5,
                isNew: true
              });
            }
            
            i++; // Skip the answer line
          }
        }
        
        if (extractedExamples.length > 0) {
          setExamples([...examples, ...extractedExamples]);
          toast.success(`Extracted ${extractedExamples.length} Q&A pairs from the file`);
        } else {
          toast.warning('Could not extract any clear Q&A pairs from the file');
        }
      } catch (err) {
        console.error('Error processing file:', err);
        toast.error('Failed to process the file');
      } finally {
        setUploadProcessing(false);
      }
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Chatbot Training Manager
          </CardTitle>
          <CardDescription>
            Train your chatbot with custom questions and answers to better assist your website visitors
          </CardDescription>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "examples" | "upload")}>
          <CardContent>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="examples" className="flex-1">Q&A Examples</TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">Upload Content</TabsTrigger>
            </TabsList>
            
            <TabsContent value="examples" className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Training Examples</h3>
                  <p className="text-sm text-muted-foreground">
                    Add question and answer pairs to train your chatbot
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addNewExample}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Example
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={saveAllExamples}
                    disabled={saving || examples.length === 0}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? 'Saving...' : 'Save All'}
                  </Button>
                </div>
              </div>
              
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Loading training examples...</p>
                </div>
              ) : examples.length === 0 ? (
                <div className="py-8 text-center border rounded-md">
                  <BrainCircuit className="h-12 w-12 mx-auto mb-2 text-muted-foreground/30" />
                  <h3 className="font-medium text-muted-foreground mb-1">No Training Examples Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Add examples to help your chatbot respond to visitor questions
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={addNewExample}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Your First Example
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    {CATEGORIES.map(category => (
                      <Card key={category.value} className="p-4 text-center">
                        <p className="font-medium">{category.label}</p>
                        <p className="text-2xl font-bold mt-1">
                          {categoryCounts[category.value] || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">examples</p>
                      </Card>
                    ))}
                  </div>
                  
                  {examples.map((example, index) => (
                    <div key={example.id || `new-${index}`} className="p-4 border rounded-md space-y-3">
                      <div className="flex justify-between">
                        <div className="flex gap-3">
                          <Select 
                            value={example.category} 
                            onValueChange={(value) => updateExample(index, 'category', value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(category => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select 
                            value={String(example.priority)} 
                            onValueChange={(value) => updateExample(index, 'priority', parseInt(value))}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">Highest</SelectItem>
                              <SelectItem value="8">High</SelectItem>
                              <SelectItem value="5">Medium</SelectItem>
                              <SelectItem value="3">Low</SelectItem>
                              <SelectItem value="1">Lowest</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeExample(index)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      
                      <div className="space-y-1">
                        <Label htmlFor={`question-${index}`}>Question</Label>
                        <Input 
                          id={`question-${index}`}
                          value={example.question}
                          onChange={(e) => updateExample(index, 'question', e.target.value)}
                          placeholder="Enter a question you want your chatbot to answer"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label htmlFor={`answer-${index}`}>Answer</Label>
                        <Textarea 
                          id={`answer-${index}`}
                          value={example.answer}
                          onChange={(e) => updateExample(index, 'answer', e.target.value)}
                          placeholder="Enter the answer to the question"
                          rows={3}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="upload" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Upload Training Content</h3>
                <p className="text-sm text-muted-foreground">
                  Upload text files, FAQs, or property descriptions to train your chatbot
                </p>
              </div>
              
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <FileUp className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                    <h3 className="font-medium mb-1">Upload Training Content</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload a text file with questions and answers to train your chatbot
                    </p>
                    
                    <div className="flex justify-center">
                      <Label
                        htmlFor="file-upload"
                        className="cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center"
                      >
                        <FileUp className="h-4 w-4 mr-2" />
                        Choose File
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".txt,.md,.csv"
                        className="hidden"
                        onChange={processFileUpload}
                        disabled={uploadProcessing}
                      />
                    </div>
                    
                    {uploadProcessing && (
                      <div className="mt-4 text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm">Processing file...</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">File Processing Tips:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                      <li>Text files with question-answer pairs work best</li>
                      <li>Questions should end with a question mark</li>
                      <li>Each answer should follow its question</li>
                      <li>For best results, keep answers clear and concise</li>
                      <li>After uploading, you can edit the extracted Q&A pairs</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default ChatbotTrainingManager;
