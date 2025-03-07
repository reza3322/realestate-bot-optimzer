
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
import { Plus, Trash2, FileUp, Edit, Save, X, AlertCircle, FileText, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
}

const ChatbotTraining = ({ userId }: ChatbotTrainingProps) => {
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  useEffect(() => {
    fetchTrainingData();
  }, [activeTab]);

  const fetchTrainingData = async () => {
    setLoading(true);
    try {
      console.log('Fetching training data for userId:', userId, 'contentType:', activeTab);
      const { data, error } = await supabase
        .from('chatbot_training_data')
        .select('*')
        .eq('user_id', userId)
        .eq('content_type', activeTab)
        .order('priority', { ascending: false });
      
      if (error) {
        console.error('Error fetching training data:', error);
        throw error;
      }
      
      console.log('Fetched training data:', data?.length || 0, 'items');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain' && file.type !== 'application/pdf' && file.type !== 'text/csv') {
      toast.error('Only text, CSV, or PDF files are accepted');
      return;
    }

    setSelectedFile(file);
    setUploadSuccess(false);
    setUploadedFileName("");
    console.log(`Selected file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setFileUploading(true);
    setUploadSuccess(false);
    
    try {
      const timestamp = Date.now();
      const safeFileName = selectedFile.name.replace(/\s+/g, '_');
      const filePath = `${userId}/${timestamp}_${safeFileName}`;
      
      console.log('Preparing to upload file to storage path:', filePath);
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('chatbot_training_files')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`File upload failed: ${uploadError.message}`);
      }
      
      console.log('File uploaded successfully to path:', filePath);

      try {
        console.log('Processing file, calling edge function with:', { filePath, userId, contentType: activeTab });
        
        const { data, error } = await supabase.functions.invoke('process-pdf-content', {
          body: JSON.stringify({
            filePath,
            userId,
            contentType: activeTab
          })
        });
        
        console.log('Edge function response:', data);
        
        if (error) {
          console.error('Edge function error:', error);
          throw new Error(`Edge function failed: ${error.message || JSON.stringify(error)}`);
        }
        
        if (data && data.success) {
          toast.success(`File processed successfully. Added ${data.entriesCount || 0} training items.`);
          
          // Fetch updated data after processing completes
          fetchTrainingData();
        } else {
          throw new Error((data && data.error) || 'Unknown error during file processing');
        }
      } catch (funcError) {
        console.error('Error invoking edge function:', funcError);
        toast.error(`Failed to process file: ${funcError.message}`);
        throw funcError;
      }
      
      setUploadSuccess(true);
      setUploadedFileName(selectedFile.name);
      
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Error in file upload process:', error);
      toast.error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadSuccess(false);
    } finally {
      setFileUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadSuccess(false);
    setUploadedFileName("");
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
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
                <h3 className="text-lg font-medium">Add New {activeTab === 'faqs' ? 'FAQ' : 
                                                           activeTab === 'property' ? 'Property Detail' : 
                                                           activeTab === 'business' ? 'Business Info' : 
                                                           'Custom Response'}</h3>
                
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
                
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Bulk Import</p>
                  
                  {uploadSuccess && (
                    <Alert className="mb-3 bg-green-50 border-green-200">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700">
                          <strong>Upload successful!</strong> File: {uploadedFileName}
                        </AlertDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={resetUpload} 
                        className="mt-2 text-green-700 border-green-300 hover:bg-green-100/50"
                      >
                        Upload another file
                      </Button>
                    </Alert>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label 
                        htmlFor="file-upload" 
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-md hover:bg-secondary/50 transition-colors">
                          <FileUp size={16} />
                          <span>{selectedFile ? selectedFile.name : 'Select text, CSV or PDF file'}</span>
                        </div>
                        <Input 
                          id="file-upload" 
                          type="file" 
                          accept=".txt,.pdf,.csv" 
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={fileUploading || uploadSuccess}
                        />
                      </label>
                      
                      {selectedFile && !uploadSuccess && (
                        <Button 
                          onClick={uploadFile} 
                          disabled={fileUploading}
                          variant={fileUploading ? "outline" : "default"}
                          size="sm"
                          className="gap-1"
                        >
                          {fileUploading ? (
                            <><span className="animate-spin">↻</span> Uploading...</>
                          ) : (
                            <>
                              <FileUp size={16} />
                              Upload Now
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For text files: Each question and answer should be on separate lines.
                      For CSV files: Each row should have a question and answer in separate columns.
                      For PDF files: Content will be automatically processed and added as training data.
                    </p>
                  </div>
                </div>
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
