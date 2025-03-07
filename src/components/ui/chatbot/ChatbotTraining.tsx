import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, FileUp, Edit, Save, X, AlertCircle, FileText, FileQuestion } from "lucide-react";
import FileUpload from "./FileUpload";
import { LanguageCode } from "./types";

interface TrainingItem {
  id?: string;
  content_type: string;
  question: string;
  answer: string;
  category?: string;
  priority?: number;
}

interface ChatbotTrainingProps {
  userId: string;
  userPlan?: string;
  isPremiumFeature?: (requiredPlan: string) => boolean;
}

const ChatbotTraining = ({ userId, userPlan, isPremiumFeature }: ChatbotTrainingProps) => {
  const [activeTab, setActiveTab] = useState<string>("faqs");
  const [items, setItems] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState<TrainingItem>({
    content_type: activeTab,
    question: "",
    answer: "",
    category: "",
    priority: 0
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTabSection, setActiveTabSection] = useState<"manual" | "file-upload">("manual");

  useEffect(() => {
    fetchTrainingData();
  }, [activeTab]);

  const fetchTrainingData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chatbot_training_data')
        .select('*')
        .eq('user_id', userId)
        .eq('content_type', activeTab)
        .order('priority', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching training data:', error);
      toast.error('Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setNewItem({
      content_type: value,
      question: "",
      answer: "",
      category: "",
      priority: 0
    });
    setEditingIndex(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const addItem = async () => {
    if (!newItem.question.trim() || !newItem.answer.trim()) {
      toast.error('Question and answer fields are required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chatbot_training_data')
        .insert({
          user_id: userId,
          content_type: activeTab,
          question: newItem.question.trim(),
          answer: newItem.answer.trim(),
          category: newItem.category?.trim() || null,
          priority: newItem.priority || 0
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      setItems(prev => [...prev, data[0]]);
      setNewItem({
        content_type: activeTab,
        question: "",
        answer: "",
        category: "",
        priority: 0
      });
      toast.success('Item added successfully');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const updateItem = async () => {
    if (editingIndex === null) return;
    
    const item = items[editingIndex];
    if (!newItem.question.trim() || !newItem.answer.trim()) {
      toast.error('Question and answer fields are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('chatbot_training_data')
        .update({
          question: newItem.question.trim(),
          answer: newItem.answer.trim(),
          category: newItem.category?.trim() || null,
          priority: newItem.priority || 0
        })
        .eq('id', item.id);
      
      if (error) {
        throw error;
      }
      
      const updatedItems = [...items];
      updatedItems[editingIndex] = { 
        ...item, 
        question: newItem.question,
        answer: newItem.answer,
        category: newItem.category,
        priority: newItem.priority 
      };
      
      setItems(updatedItems);
      setEditingIndex(null);
      setNewItem({
        content_type: activeTab,
        question: "",
        answer: "",
        category: "",
        priority: 0
      });
      toast.success('Item updated successfully');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chatbot_training_data')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      setItems(items.filter(item => item.id !== id));
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setNewItem({
      ...items[index]
    });
    
    setActiveTabSection("manual");
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setNewItem({
      content_type: activeTab,
      question: "",
      answer: "",
      category: "",
      priority: 0
    });
  };

  const handleFileUploadComplete = (success: boolean) => {
    if (success) {
      fetchTrainingData();
    }
  };

  const filteredItems = items.filter(item => 
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Train Your Chatbot</CardTitle>
        <CardDescription>
          Add custom training data to improve your chatbot's responses.
          The chatbot will prioritize this data when responding to user queries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
            <TabsTrigger value="property">Property Details</TabsTrigger>
            <TabsTrigger value="business">Business Info</TabsTrigger>
            <TabsTrigger value="custom">Custom Responses</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <Tabs value={activeTabSection} onValueChange={(value) => setActiveTabSection(value as "manual" | "file-upload")}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="manual" className="flex-1">
                      <FileQuestion className="w-4 h-4 mr-2" />
                      Manual Entry
                    </TabsTrigger>
                    <TabsTrigger value="file-upload" className="flex-1">
                      <FileUp className="w-4 h-4 mr-2" />
                      File Upload
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="manual" className="space-y-4">
                    <h3 className="text-lg font-medium">
                      {editingIndex === null ? (
                        `Add New ${activeTab === 'faqs' ? 'FAQ' : 
                          activeTab === 'property' ? 'Property Detail' : 
                          activeTab === 'business' ? 'Business Info' : 
                          'Custom Response'}`
                      ) : (
                        `Edit ${activeTab === 'faqs' ? 'FAQ' : 
                          activeTab === 'property' ? 'Property Detail' : 
                          activeTab === 'business' ? 'Business Info' : 
                          'Custom Response'}`
                      )}
                    </h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="question">
                        {activeTab === 'faqs' ? 'Question' : 
                         activeTab === 'property' ? 'Property Query' : 
                         activeTab === 'business' ? 'Business Query' : 
                         'User Query'}
                      </Label>
                      <Input 
                        id="question" 
                        name="question"
                        value={newItem.question}
                        onChange={handleInputChange}
                        placeholder="e.g., What are your office hours?"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="answer">
                        {activeTab === 'faqs' ? 'Answer' : 
                         activeTab === 'property' ? 'Property Information' : 
                         activeTab === 'business' ? 'Business Information' : 
                         'Response'}
                      </Label>
                      <Textarea 
                        id="answer" 
                        name="answer"
                        value={newItem.answer}
                        onChange={handleInputChange}
                        placeholder="e.g., Our office is open Monday to Friday, 9 AM to 5 PM."
                        rows={4}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Category (Optional)</Label>
                      <Input 
                        id="category" 
                        name="category"
                        value={newItem.category || ''}
                        onChange={handleInputChange}
                        placeholder="e.g., Office Information"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority (0-10)</Label>
                      <Input 
                        id="priority" 
                        name="priority"
                        type="number"
                        min={0}
                        max={10}
                        value={newItem.priority || 0}
                        onChange={handleInputChange}
                        placeholder="Priority level (higher numbers = higher priority)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher priority items will be matched first when a similar question is asked.
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {editingIndex === null ? (
                        <Button 
                          onClick={addItem} 
                          className="flex gap-2 items-center"
                        >
                          <Plus size={16} />
                          Add Item
                        </Button>
                      ) : (
                        <>
                          <Button 
                            onClick={updateItem} 
                            className="flex gap-2 items-center"
                          >
                            <Save size={16} />
                            Save Changes
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={cancelEditing} 
                            className="flex gap-2 items-center"
                          >
                            <X size={16} />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="file-upload">
                    <FileUpload userId={userId} onUploadComplete={handleFileUploadComplete} />
                  </TabsContent>
                </Tabs>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Existing Items</h3>
                  <Input 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48"
                  />
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <FileText size={40} className="mb-2 opacity-20" />
                    <p>
                      {searchQuery 
                        ? 'No matching items found' 
                        : `No ${activeTab} items added yet`}
                    </p>
                    <p className="text-sm mt-1">
                      {searchQuery 
                        ? 'Try a different search term'
                        : 'Add items to help your chatbot provide better responses'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[450px] pr-4">
                    <div className="space-y-3">
                      {filteredItems.map((item, index) => (
                        <Card key={item.id} className="p-3 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="font-medium">{item.question}</p>
                              <p className="text-sm text-muted-foreground">{item.answer}</p>
                              {item.category && (
                                <div className="flex items-center mt-1">
                                  <span className="text-xs bg-secondary/60 text-secondary-foreground px-2 py-0.5 rounded-full">
                                    {item.category}
                                  </span>
                                  {item.priority > 0 && (
                                    <span className="text-xs bg-primary/10 text-primary ml-2 px-2 py-0.5 rounded-full">
                                      Priority: {item.priority}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => startEditing(index)} 
                                className="h-8 w-8 p-0"
                              >
                                <Edit size={14} />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => deleteItem(item.id!)} 
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                              >
                                <Trash2 size={14} />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t px-6 py-4 bg-muted/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle size={16} />
          <p>
            The more training data you provide, the better your chatbot will perform. 
            Focus on adding frequently asked questions and detailed property information.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ChatbotTraining;
