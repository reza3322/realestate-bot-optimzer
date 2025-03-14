import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { Loader2, Trash2, Edit, Check, X, Plus, FilePlus, Globe } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TrainingContentProps {
  userId: string;
  onContentUpdate?: () => void;
}

const TrainingContentManager = ({ userId, onContentUpdate }: TrainingContentProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [crawledContent, setCrawledContent] = useState<any[]>([]);
  const [qaContent, setQaContent] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [activeTab, setActiveTab] = useState("files");

  useEffect(() => {
    fetchAllContent();
  }, [userId]);

  const fetchAllContent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: files, error: filesError } = await supabase
        .from("chatbot_training_files")
        .select("*")
        .eq("user_id", userId)
        .eq("content_type", "file")
        .order("created_at", { ascending: false });
      
      if (filesError) throw filesError;
      setUploadedFiles(files || []);
      
      const { data: qa, error: qaError } = await supabase
        .from("chatbot_training_files")
        .select("*")
        .eq("user_id", userId)
        .eq("content_type", "qa_pair")
        .order("created_at", { ascending: false });
      
      if (qaError) throw qaError;
      setQaContent(qa || []);
      
      const { data: crawled, error: crawledError } = await supabase
        .from("chatbot_training_files")
        .select("*")
        .eq("user_id", userId)
        .eq("category", "Web Crawler")
        .order("created_at", { ascending: false });
      
      if (crawledError) throw crawledError;
      setCrawledContent(crawled || []);
      
    } catch (err: any) {
      console.error("Error fetching content:", err);
      setError(err.message || "Failed to load content");
      toast.error("Failed to load training content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, type: 'file' | 'qa' | 'crawl') => {
    try {
      const { error } = await supabase
        .from("chatbot_training_files")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Content deleted successfully");
      
      if (type === 'file') {
        setUploadedFiles(prev => prev.filter(item => item.id !== id));
      } else if (type === 'qa') {
        setQaContent(prev => prev.filter(item => item.id !== id));
      } else {
        setCrawledContent(prev => prev.filter(item => item.id !== id));
      }
      
      if (onContentUpdate) onContentUpdate();
    } catch (err: any) {
      console.error("Error deleting content:", err);
      toast.error("Failed to delete content");
    }
  };

  const startEditing = (id: string, content: string) => {
    setEditingItem(id);
    setEditedText(content);
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditedText('');
  };

  const saveFileEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from("chatbot_training_files")
        .update({ extracted_text: editedText })
        .eq("id", id);
      
      if (error) throw error;
      
      setUploadedFiles(prev => 
        prev.map(item => 
          item.id === id ? { ...item, extracted_text: editedText } : item
        )
      );
      
      toast.success("Content updated successfully");
      setEditingItem(null);
      if (onContentUpdate) onContentUpdate();
    } catch (err: any) {
      console.error("Error updating content:", err);
      toast.error("Failed to update content");
    }
  };

  const saveQAEdit = async (id: string, field: 'question' | 'answer') => {
    try {
      const updateData = field === 'question' 
        ? { question: editedText } 
        : { answer: editedText };
      
      const { error } = await supabase
        .from("chatbot_training_files")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
      
      setQaContent(prev => 
        prev.map(item => 
          item.id === id ? { ...item, [field]: editedText } : item
        )
      );
      
      toast.success("Q&A updated successfully");
      setEditingItem(null);
      if (onContentUpdate) onContentUpdate();
    } catch (err: any) {
      console.error("Error updating Q&A:", err);
      toast.error("Failed to update Q&A");
    }
  };

  const handleCreateQA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error("Both question and answer are required");
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("chatbot_training_files")
        .insert({
          user_id: userId,
          question: newQuestion,
          answer: newAnswer,
          content_type: "qa_pair",
          category: "Custom Q&A",
          priority: 8,
          source_file: "Q&A Pair",
          extracted_text: newAnswer
        })
        .select();
      
      if (error) throw error;
      
      setQaContent(prev => [data[0], ...prev]);
      setNewQuestion('');
      setNewAnswer('');
      toast.success("Q&A pair created successfully");
      
      if (onContentUpdate) onContentUpdate();
    } catch (err: any) {
      console.error("Error creating Q&A:", err);
      toast.error("Failed to create Q&A pair");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="files">
            <FilePlus className="mr-2 h-4 w-4" />
            Text Files
          </TabsTrigger>
          <TabsTrigger value="qa">
            <Plus className="mr-2 h-4 w-4" />
            Q&A Pairs
          </TabsTrigger>
          <TabsTrigger value="crawl">
            <Globe className="mr-2 h-4 w-4" />
            Web Content
          </TabsTrigger>
        </TabsList>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <TabsContent value="files" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Text Files</CardTitle>
              <CardDescription>View, edit or delete text files that you've uploaded for chatbot training</CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length === 0 ? (
                <div className="text-center p-4 border border-dashed rounded-md">
                  <p className="text-muted-foreground">No text files uploaded yet. Upload a file to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{file.source_file}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(file.created_at).toLocaleDateString()} - Priority: {file.priority}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {editingItem !== file.id && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => startEditing(file.id, file.extracted_text)}
                              >
                                <Edit className="h-4 w-4 mr-1" /> Edit
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => handleDelete(file.id, 'file')}
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {editingItem === file.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="min-h-[200px]"
                          />
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={cancelEditing}
                            >
                              <X className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => saveFileEdit(file.id)}
                            >
                              <Check className="h-4 w-4 mr-1" /> Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 bg-muted p-3 rounded-md text-sm max-h-40 overflow-y-auto">
                          {file.extracted_text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="qa" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Q&A Pairs</CardTitle>
              <CardDescription>Create, edit, or delete custom question and answer pairs for your chatbot</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateQA} className="mb-6 border p-4 rounded-md">
                <h3 className="font-medium mb-3">Add New Q&A Pair</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="new-question">Question</Label>
                    <Input 
                      id="new-question"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="E.g., What services do you offer?"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-answer">Answer</Label>
                    <Textarea 
                      id="new-answer"
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      placeholder="E.g., We offer comprehensive real estate services including property listings, buyer representation, and market analysis."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="pt-2">
                    <Button type="submit" disabled={!newQuestion.trim() || !newAnswer.trim()}>
                      <Plus className="h-4 w-4 mr-1" /> Add Q&A Pair
                    </Button>
                  </div>
                </div>
              </form>
              
              {qaContent.length === 0 ? (
                <div className="text-center p-4 border border-dashed rounded-md">
                  <p className="text-muted-foreground">No Q&A pairs created yet. Add a Q&A pair to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {qaContent.map(qa => (
                    <div key={qa.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">Q&A Pair</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(qa.created_at).toLocaleDateString()} - Priority: {qa.priority}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDelete(qa.id, 'qa')}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-muted-foreground text-xs">Question:</Label>
                          {editingItem === `${qa.id}-q` ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                className="min-h-[100px]"
                              />
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={cancelEditing}
                                >
                                  <X className="h-4 w-4 mr-1" /> Cancel
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => saveQAEdit(qa.id, 'question')}
                                >
                                  <Check className="h-4 w-4 mr-1" /> Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start group">
                              <div className="bg-muted p-3 rounded-md text-sm w-full">{qa.question}</div>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity" 
                                onClick={() => startEditing(`${qa.id}-q`, qa.question)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <Label className="text-muted-foreground text-xs">Answer:</Label>
                          {editingItem === `${qa.id}-a` ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                className="min-h-[100px]"
                              />
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={cancelEditing}
                                >
                                  <X className="h-4 w-4 mr-1" /> Cancel
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => saveQAEdit(qa.id, 'answer')}
                                >
                                  <Check className="h-4 w-4 mr-1" /> Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start group">
                              <div className="bg-muted p-3 rounded-md text-sm w-full">{qa.answer}</div>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity" 
                                onClick={() => startEditing(`${qa.id}-a`, qa.answer)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="crawl" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Crawled Web Content</CardTitle>
              <CardDescription>View or delete web content that has been crawled from your website</CardDescription>
            </CardHeader>
            <CardContent>
              {crawledContent.length === 0 ? (
                <div className="text-center p-4 border border-dashed rounded-md">
                  <p className="text-muted-foreground">No web content has been crawled yet. Use the Web Crawler to add content.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {crawledContent.map(content => (
                    <div key={content.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium truncate max-w-xs">{content.source_file || 'Web Content'}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(content.created_at).toLocaleDateString()} - Priority: {content.priority}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDelete(content.id, 'crawl')}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                      
                      <div className="mt-2 bg-muted p-3 rounded-md text-sm max-h-40 overflow-y-auto">
                        {content.extracted_text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { TrainingContentManager };
