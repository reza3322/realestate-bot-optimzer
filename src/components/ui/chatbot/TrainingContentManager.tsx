
import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { Trash2, Edit, Save, X, FilePlus, MessageSquarePlus } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/lib/supabase';

interface TrainingContentManagerProps {
  userId: string;
}

interface TrainingItem {
  id: string;
  question?: string;
  answer?: string;
  extracted_text?: string;
  source_file?: string;
  category: string;
  priority: number;
  content_type: string;
}

const priorityLabels = {
  1: 'Low',
  2: 'Medium-Low',
  3: 'Medium',
  4: 'Medium-High',
  5: 'High'
};

const TrainingContentManager = ({ userId }: TrainingContentManagerProps) => {
  const [trainingData, setTrainingData] = useState<TrainingItem[]>([]);
  const [editingItem, setEditingItem] = useState<TrainingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('qa');

  useEffect(() => {
    loadTrainingData();
  }, [userId]);

  const loadTrainingData = async () => {
    setIsLoading(true);
    try {
      // Fetch all training data from chatbot_training_files
      const { data, error } = await supabase
        .from('chatbot_training_files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading training data:', error);
        toast.error('Failed to load training data');
        return;
      }
      
      console.log('Loaded training data:', data);
      setTrainingData(data || []);
    } catch (error) {
      console.error('Exception loading training data:', error);
      toast.error('An unexpected error occurred while loading training data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const { error } = await supabase
        .from('chatbot_training_files')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting item:', error);
        toast.error('Failed to delete item');
        return;
      }
      
      toast.success('Item deleted successfully');
      setTrainingData(trainingData.filter(item => item.id !== id));
    } catch (error) {
      console.error('Exception deleting item:', error);
      toast.error('An unexpected error occurred while deleting the item');
    }
  };

  const handleEdit = (item: TrainingItem) => {
    setEditingItem({ ...item });
  };

  const handleSave = async () => {
    if (!editingItem) return;
    
    try {
      const { error } = await supabase
        .from('chatbot_training_files')
        .update({
          question: editingItem.question,
          answer: editingItem.answer,
          extracted_text: editingItem.extracted_text || editingItem.answer, // Set extracted_text to answer for compatibility
          category: editingItem.category,
          priority: editingItem.priority
        })
        .eq('id', editingItem.id);
      
      if (error) {
        console.error('Error updating item:', error);
        toast.error('Failed to update item');
        return;
      }
      
      toast.success('Item updated successfully');
      
      // Update local state
      setTrainingData(trainingData.map(item => 
        item.id === editingItem.id ? editingItem : item
      ));
      
      setEditingItem(null);
    } catch (error) {
      console.error('Exception updating item:', error);
      toast.error('An unexpected error occurred while updating the item');
    }
  };

  const getContentByType = (contentType: string) => {
    return trainingData.filter(item => {
      if (contentType === 'qa') return item.content_type === 'qa_pair';
      if (contentType === 'files') return item.content_type === 'file';
      if (contentType === 'web') return item.content_type === 'web_crawl';
      return false;
    });
  };

  const renderQAPairs = () => {
    const qaPairs = getContentByType('qa');
    
    if (qaPairs.length === 0) {
      return (
        <div className="text-center py-6">
          <p className="text-muted-foreground">No Q&A pairs found. Add some using the form above.</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => document.getElementById('add-qa-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Add Q&A Pair
          </Button>
        </div>
      );
    }
    
    return qaPairs.map(item => (
      <Card key={item.id} className="mb-4">
        <CardContent className="pt-4">
          {editingItem && editingItem.id === item.id ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor={`edit-question-${item.id}`}>Question</Label>
                <Input 
                  id={`edit-question-${item.id}`}
                  value={editingItem.question || ''}
                  onChange={(e) => setEditingItem({...editingItem, question: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor={`edit-answer-${item.id}`}>Answer</Label>
                <Textarea 
                  id={`edit-answer-${item.id}`}
                  value={editingItem.answer || ''}
                  onChange={(e) => setEditingItem({...editingItem, answer: e.target.value})}
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`edit-category-${item.id}`}>Category</Label>
                  <Select 
                    value={editingItem.category} 
                    onValueChange={(val) => setEditingItem({...editingItem, category: val})}
                  >
                    <SelectTrigger id={`edit-category-${item.id}`}>
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
                
                <div>
                  <Label htmlFor={`edit-priority-${item.id}`}>Priority</Label>
                  <Select 
                    value={editingItem.priority.toString()} 
                    onValueChange={(val) => setEditingItem({...editingItem, priority: parseInt(val)})}
                  >
                    <SelectTrigger id={`edit-priority-${item.id}`}>
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
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingItem(null)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium text-lg">{item.question}</div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEdit(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              
              <div className="text-muted-foreground mt-2">{item.answer}</div>
              
              <div className="flex justify-between items-center mt-4">
                <Badge variant="outline" className="mr-2">{item.category}</Badge>
                <Badge variant={item.priority >= 4 ? "default" : "secondary"}>
                  Priority: {priorityLabels[item.priority as keyof typeof priorityLabels]}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    ));
  };

  const renderFiles = () => {
    const files = getContentByType('files');
    
    if (files.length === 0) {
      return (
        <div className="text-center py-6">
          <p className="text-muted-foreground">No training files found. Upload some documents to extract content.</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => document.getElementById('file-upload-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <FilePlus className="mr-2 h-4 w-4" />
            Upload Documents
          </Button>
        </div>
      );
    }
    
    return files.map(file => (
      <Card key={file.id} className="mb-4">
        <CardContent className="pt-4">
          <div className="flex justify-between items-start mb-2">
            <div className="font-medium text-lg">{file.source_file}</div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleDelete(file.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          
          <div className="text-muted-foreground mt-2 line-clamp-3">{file.extracted_text}</div>
          
          <div className="flex justify-between items-center mt-4">
            <Badge variant="outline">{file.category || 'Document'}</Badge>
            <Badge variant="secondary">
              Priority: {priorityLabels[file.priority as keyof typeof priorityLabels] || 'Medium'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    ));
  };

  const renderWebContent = () => {
    const webContent = getContentByType('web');
    
    if (webContent.length === 0) {
      return (
        <div className="text-center py-6">
          <p className="text-muted-foreground">No web crawled content found. Use the web crawler to import content from your website.</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => document.getElementById('web-crawler-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <FilePlus className="mr-2 h-4 w-4" />
            Crawl Website
          </Button>
        </div>
      );
    }
    
    return webContent.map(item => (
      <Card key={item.id} className="mb-4">
        <CardContent className="pt-4">
          <div className="flex justify-between items-start mb-2">
            <div className="font-medium text-lg">{item.source_file}</div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleDelete(item.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          
          <div className="text-muted-foreground mt-2 line-clamp-3">{item.extracted_text}</div>
          
          <div className="flex justify-between items-center mt-4">
            <Badge variant="outline">{item.category || 'Web Page'}</Badge>
            <Badge variant="secondary">
              Priority: {priorityLabels[item.priority as keyof typeof priorityLabels] || 'Medium'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div>
      <Tabs defaultValue="qa" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="qa">Q&A Pairs ({getContentByType('qa').length})</TabsTrigger>
          <TabsTrigger value="files">Document Files ({getContentByType('files').length})</TabsTrigger>
          <TabsTrigger value="web">Web Content ({getContentByType('web').length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="qa" className="mt-4">
          <div className="space-y-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadTrainingData} 
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh Data'}
            </Button>
            
            <div className="space-y-4">
              {renderQAPairs()}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="files" className="mt-4">
          <div className="space-y-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadTrainingData} 
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh Data'}
            </Button>
            
            <div className="space-y-4">
              {renderFiles()}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="web" className="mt-4">
          <div className="space-y-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadTrainingData} 
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh Data'}
            </Button>
            
            <div className="space-y-4">
              {renderWebContent()}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingContentManager;
