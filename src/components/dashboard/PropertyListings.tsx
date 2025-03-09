
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogTrigger, DialogTitle, DialogDescription, DialogHeader, DialogFooter, DialogContent, Dialog } from "@/components/ui/dialog";
import { PlusCircle, Upload, FileSpreadsheet, Link, Lock, Trash2, Edit, X, ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Papa from 'papaparse';
import { ScrollArea } from "@/components/ui/scroll-area";

interface PropertyListingsProps {
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
}

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  views?: number;
  inquiries?: number;
  status: string;
  imageUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  type?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  images?: string[];
}

interface FormData {
  title: string;
  description: string;
  price: number;
  status: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  size: number;
}

const PropertyListings = ({ userPlan, isPremiumFeature }: PropertyListingsProps) => {
  const [activePropertyTab, setActivePropertyTab] = useState("manual");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    price: 0,
    status: "active",
    type: "",
    bedrooms: 0,
    bathrooms: 0,
    address: "",
    city: "",
    state: "",
    zip: "",
    size: 0
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvParseResult, setCsvParseResult] = useState<any[]>([]);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [csvUploadLoading, setCsvUploadLoading] = useState(false);
  
  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to view properties");
        return;
      }

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching properties:", error);
        toast.error("Failed to load properties");
        return;
      }

      // Transform the data to match our component's expected format
      const formattedProperties = data.map(property => ({
        ...property,
        imageUrl: property.images && property.images.length > 0 
          ? property.images[0] 
          : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
        views: Math.floor(Math.random() * 200) + 50, // Demo value
        inquiries: Math.floor(Math.random() * 15), // Demo value
      }));

      setProperties(formattedProperties);
    } catch (error) {
      console.error("Error in fetchProperties:", error);
      toast.error("Failed to load properties data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'bedrooms' || name === 'bathrooms' || name === 'size' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      price: 0,
      status: "active",
      type: "",
      bedrooms: 0,
      bathrooms: 0,
      address: "",
      city: "",
      state: "",
      zip: "",
      size: 0
    });
    setEditingProperty(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to add or edit properties");
        return;
      }

      // Validate form data
      if (!formData.title || !formData.price) {
        toast.error("Title and price are required");
        return;
      }

      // Prepare property data
      const propertyData = {
        ...formData,
        user_id: session.user.id,
      };

      let result;
      
      if (editingProperty) {
        // Update existing property
        const { data, error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editingProperty)
          .select();
          
        if (error) throw error;
        result = data;
        toast.success("Property updated successfully");
      } else {
        // Add new property
        const { data, error } = await supabase
          .from('properties')
          .insert(propertyData)
          .select();
          
        if (error) throw error;
        result = data;
        toast.success("Property added successfully");
      }

      // Refresh properties list
      fetchProperties();
      
      // Close the dialog and reset form
      setIsDialogOpen(false);
      resetForm();
      
    } catch (error: any) {
      console.error("Error saving property:", error);
      toast.error(error.message || "Failed to save property");
    }
  };

  const handleEdit = (property: Property) => {
    setFormData({
      title: property.title || "",
      description: property.description || "",
      price: property.price || 0,
      status: property.status || "active",
      type: property.type || "",
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      address: property.address || "",
      city: property.city || "",
      state: property.state || "",
      zip: property.zip || "",
      size: property.size || 0
    });
    setEditingProperty(property.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!propertyToDelete) return;
    
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyToDelete);
        
      if (error) throw error;
      
      // Remove from list and close dialog
      setProperties(properties.filter(p => p.id !== propertyToDelete));
      setIsDeleteDialogOpen(false);
      setPropertyToDelete(null);
      toast.success("Property deleted successfully");
    } catch (error: any) {
      console.error("Error deleting property:", error);
      toast.error(error.message || "Failed to delete property");
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // TODO: Implement image upload functionality
    toast.info("Image upload will be implemented in a future update");
  };

  const handleCsvUpload = () => {
    csvInputRef.current?.click();
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Parse CSV file with more flexible options
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, // Automatically convert numeric values
      transformHeader: (header) => header.trim(), // Trim whitespace from headers
      complete: (results) => {
        console.log("Parsed CSV data:", results.data);
        setCsvParseResult(results.data);
        setIsCsvDialogOpen(true);
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        toast.error("Failed to parse CSV file");
      }
    });
  };

  const importCsvProperties = async () => {
    try {
      setCsvUploadLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to import properties");
        return;
      }
      
      // Log the data being sent to the function
      console.log("Sending to import-properties:", {
        userId: session.user.id,
        properties: csvParseResult,
        source: 'csv'
      });
      
      // Send all parsed data to the backend to handle normalization there
      const { data, error } = await supabase.functions.invoke('import-properties', {
        body: {
          userId: session.user.id,
          properties: csvParseResult,
          source: 'csv'
        }
      });
        
      if (error) throw error;
      
      console.log("Import response:", data);
      
      // Close dialog and refresh list
      setIsCsvDialogOpen(false);
      setCsvParseResult([]);
      fetchProperties();
      
      // Show import summary
      if (data.properties_imported > 0) {
        toast.success(`Successfully imported ${data.properties_imported} properties`);
      }
      
      if (data.properties_failed > 0) {
        toast.warning(`${data.properties_failed} properties failed to import`);
      }
      
    } catch (error: any) {
      console.error("Error importing properties:", error);
      toast.error(error.message || "Failed to import properties");
    } finally {
      setCsvUploadLoading(false);
    }
  };
  
  // Display CSV upload guide information
  const CsvGuideInfo = () => (
    <div className="text-sm text-muted-foreground mt-4 space-y-2">
      <h4 className="font-medium text-foreground">CSV Format Guide</h4>
      <p>Our flexible importer supports many CSV formats with these fields:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Required:</strong> Title (or name), Price</li>
        <li><strong>Optional:</strong> Description, Status, Type, Bedrooms, Bathrooms, Address, City, State, Zip, Size</li>
      </ul>
      <p>The system automatically recognizes many different column name variations and formats, including:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Price formats:</strong> Numbers with currency symbols (€, $, £), with commas, with 'k' or 'm' suffixes</li>
        <li><strong>Size formats:</strong> Square feet (sqft), square meters (sqm, m²), with or without units</li>
        <li><strong>Bathroom formats:</strong> Decimals (1.5) or fractions (1 1/2)</li>
      </ul>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Property Management</h2>
        <Button onClick={() => {
          resetForm();
          setIsDialogOpen(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Property
        </Button>
      </div>
      
      <Tabs defaultValue="manual" value={activePropertyTab} onValueChange={setActivePropertyTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="manual">Manual Upload</TabsTrigger>
          <TabsTrigger value="automated" disabled={isPremiumFeature('professional')}>
            {isPremiumFeature('professional') && <Lock className="mr-2 h-4 w-4" />}
            Automated Import
          </TabsTrigger>
          <TabsTrigger value="analytics" disabled={isPremiumFeature('professional')}>
            {isPremiumFeature('professional') && <Lock className="mr-2 h-4 w-4" />}
            Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle>Demo Property List</CardTitle>
                <CardDescription>Click Add New Property to add a real property</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>Get started with your property listings:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Add properties manually with detailed information</li>
                    <li>Import multiple properties using CSV</li>
                    <li>Your chatbot will automatically know about your properties</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Upload Options</CardTitle>
                <CardDescription>Upload your property data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start" onClick={handleImageUpload}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Images
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    multiple 
                    onChange={handleFileChange}
                  />
                </Button>
                
                <Button variant="outline" className="w-full justify-start" onClick={handleCsvUpload}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Bulk Import (CSV)
                  <input 
                    type="file" 
                    ref={csvInputRef} 
                    className="hidden" 
                    accept=".csv" 
                    onChange={handleCsvFileChange}
                  />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  disabled={isPremiumFeature('professional')}
                  onClick={() => !isPremiumFeature('professional') && setActivePropertyTab('automated')}
                >
                  {isPremiumFeature('professional') && <Lock className="mr-2 h-4 w-4" />}
                  {!isPremiumFeature('professional') && <Link className="mr-2 h-4 w-4" />}
                  Website Scraping
                  {isPremiumFeature('professional') && <span className="ml-auto text-xs text-muted-foreground">(Pro)</span>}
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <h3 className="text-xl font-bold mt-6">Your Properties</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-3 flex justify-center items-center h-40">
                <div className="animate-spin h-6 w-6 border-t-2 border-primary rounded-full"></div>
              </div>
            ) : properties.length === 0 ? (
              <div className="col-span-3 text-center p-8 border rounded-lg">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <h4 className="text-lg font-medium mb-2">No properties yet</h4>
                <p className="text-muted-foreground mb-4">Add your first property to get started</p>
                <Button onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Property
                </Button>
              </div>
            ) : (
              properties.map((property) => (
                <Card key={property.id} className="overflow-hidden">
                  <img 
                    src={property.imageUrl} 
                    alt={property.title}
                    className="h-48 w-full object-cover"
                  />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{property.title}</CardTitle>
                      <Badge variant={property.status === 'active' ? 'default' : 'outline'}>
                        {property.status === 'active' ? 'Active' : 'Pending'}
                      </Badge>
                    </div>
                    <CardDescription>{property.price.toLocaleString('en-US', {style: 'currency', currency: 'EUR'})}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm pb-3">
                    <p className="line-clamp-2">{property.description}</p>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <span>{property.views} views</span>
                      <span>{property.inquiries} inquiries</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-0">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(property)}>
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setPropertyToDelete(property.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="automated">
          {isPremiumFeature('professional') ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-bold mb-2">Upgrade to Professional Plan</h3>
              <p className="text-muted-foreground mb-6">
                Automated property imports are available on the Professional plan and above
              </p>
              <Button>Upgrade Now</Button>
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Website Scraping</CardTitle>
                  <CardDescription>
                    Paste a website URL to automatically import properties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input placeholder="https://realestatewebsite.com/listings" />
                    <Button>Import</Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>API Integration</CardTitle>
                  <CardDescription>
                    Connect to your MLS or agency platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-key">API Key</Label>
                      <Input id="api-key" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="api-url">API Endpoint URL</Label>
                      <Input id="api-url" placeholder="https://api.example.com/listings" />
                    </div>
                    <Button>Connect API</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="analytics">
          {isPremiumFeature('professional') ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-bold mb-2">Upgrade to Professional Plan</h3>
              <p className="text-muted-foreground mb-6">
                Property analytics are available on the Professional plan and above
              </p>
              <Button>Upgrade Now</Button>
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Property Performance</CardTitle>
                  <CardDescription>See which properties are performing best</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Analytics charts will appear here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Property Dialog - Updated with ScrollArea and improved layout */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingProperty ? "Edit Property" : "Add New Property"}</DialogTitle>
            <DialogDescription>
              {editingProperty ? "Update your property details" : "Enter the details of your property"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <form id="property-form" onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4 px-1">
                <div className="space-y-2">
                  <Label htmlFor="title">Property Title*</Label>
                  <Input 
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Luxury Villa with Pool"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price* (€)</Label>
                    <Input 
                      id="price"
                      name="price"
                      value={formData.price || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 850000"
                      type="number"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => handleSelectChange('status', value)}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Property Type</Label>
                    <Input 
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      placeholder="e.g. Villa, Apartment, House" 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input 
                      id="bedrooms"
                      name="bedrooms"
                      value={formData.bedrooms || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 4"
                      type="number" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input 
                      id="bathrooms"
                      name="bathrooms"
                      value={formData.bathrooms || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 2.5"
                      type="number" 
                      step="0.5"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="size">Size (m²)</Label>
                    <Input 
                      id="size"
                      name="size"
                      value={formData.size || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 200"
                      type="number" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Street address" 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input 
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="City" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input 
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="State or Province" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zip">Postal Code</Label>
                    <Input 
                      id="zip"
                      name="zip"
                      value={formData.zip}
                      onChange={handleInputChange}
                      placeholder="Postal Code" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the property..."
                    rows={3}
                  />
                </div>
              </div>
            </form>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button type="submit" form="property-form">{editingProperty ? "Update Property" : "Add Property"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this property? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Preview Dialog - Updated with more information */}
      <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Import Properties from CSV</DialogTitle>
            <DialogDescription>
              Review the properties to be imported from your CSV file
            </DialogDescription>
          </DialogHeader>
          
          <CsvGuideInfo />
          
          <ScrollArea className="max-h-[400px] border rounded-md">
            <table className="min-w-full">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground tracking-wider">Title</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground tracking-wider">Price</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground tracking-wider">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground tracking-wider">Location</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground tracking-wider">Size</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground tracking-wider">Beds/Baths</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {csvParseResult.map((row, index) => {
                  // Find title using advanced fuzzy matching
                  const titleFields = ['title', 'Title', 'name', 'Name', 'property_name', 'property name', 'heading', 'Heading', 'listing_title'];
                  let title = null;
                  for (const field of titleFields) {
                    if (row[field]) {
                      title = row[field];
                      break;
                    }
                  }
                  // If still not found, try partial matching
                  if (!title) {
                    for (const key in row) {
                      if (key.toLowerCase().includes('title') || key.toLowerCase().includes('name') || 
                          key.toLowerCase().includes('property') || key.toLowerCase().includes('heading')) {
                        title = row[key];
                        break;
                      }
                    }
                  }
                  
                  // Find price using similar approach
                  const priceFields = ['price', 'Price', 'cost', 'Cost', 'value', 'Value', 'asking_price', 'listing_price'];
                  let price = null;
                  for (const field of priceFields) {
                    if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
                      price = row[field];
                      break;
                    }
                  }
                  // If still not found, try partial matching
                  if (!price) {
                    for (const key in row) {
                      if (key.toLowerCase().includes('price') || key.toLowerCase().includes('cost') || 
                          key.toLowerCase().includes('value') || key.toLowerCase().includes('eur') || 
                          key.toLowerCase().includes('usd')) {
                        price = row[key];
                        break;
                      }
                    }
                  }
                  
                  // Same for other fields
                  const typeFields = ['type', 'Type', 'property_type', 'property type', 'category', 'Category'];
                  let type = null;
                  for (const field of typeFields) {
                    if (row[field]) {
                      type = row[field];
                      break;
                    }
                  }
                  
                  // Get city
                  const cityFields = ['city', 'City', 'town', 'Town', 'location', 'Location'];
                  let city = null;
                  for (const field of cityFields) {
                    if (row[field]) {
                      city = row[field];
                      break;
                    }
                  }
                  
                  // Get state
                  const stateFields = ['state', 'State', 'province', 'Province', 'region', 'Region'];
                  let state = null;
                  for (const field of stateFields) {
                    if (row[field]) {
                      state = row[field];
                      break;
                    }
                  }
                  
                  // Get size
                  const sizeFields = ['size', 'Size', 'area', 'Area', 'square_feet', 'square_meters', 'sqft', 'sqm'];
                  let size = null;
                  for (const field of sizeFields) {
                    if (row[field]) {
                      size = row[field];
                      break;
                    }
                  }
                  
                  // Get bedrooms
                  const bedroomFields = ['bedrooms', 'Bedrooms', 'beds', 'Beds', 'bedroom', 'Bedroom', 'br', 'BR'];
                  let bedrooms = null;
                  for (const field of bedroomFields) {
                    if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
                      bedrooms = row[field];
                      break;
                    }
                  }
                  
                  // Get bathrooms
                  const bathroomFields = ['bathrooms', 'Bathrooms', 'baths', 'Baths', 'bathroom', 'Bathroom', 'ba', 'BA'];
                  let bathrooms = null;
                  for (const field of bathroomFields) {
                    if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
                      bathrooms = row[field];
                      break;
                    }
                  }
                  
                  return (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="px-4 py-2 text-sm">{title || "No title"}</td>
                      <td className="px-4 py-2 text-sm">{typeof price === 'number' ? price.toLocaleString() : (price || "Not specified")}</td>
                      <td className="px-4 py-2 text-sm">{type || "Not specified"}</td>
                      <td className="px-4 py-2 text-sm">{city ? `${city}${state ? `, ${state}` : ''}` : "No location"}</td>
                      <td className="px-4 py-2 text-sm">{size ? (typeof size === 'number' ? `${size.toLocaleString()} m²` : size) : "Not specified"}</td>
                      <td className="px-4 py-2 text-sm">
                        {bedrooms || bathrooms ? 
                          `${bedrooms || '?'} bd / ${bathrooms || '?'} ba` : 
                          "Not specified"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
          <p className="text-sm text-muted-foreground mt-2">
            {csvParseResult.length} properties found in CSV file.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCsvDialogOpen(false)} disabled={csvUploadLoading}>
              Cancel
            </Button>
            <Button onClick={importCsvProperties} disabled={csvUploadLoading}>
              {csvUploadLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-current rounded-full"></div>
                  Importing...
                </>
              ) : (
                "Import Properties"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyListings;
