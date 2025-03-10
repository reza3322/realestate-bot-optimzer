import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Home, UploadCloud, Plus, Edit, MoreHorizontal, Eye, Trash2, Search, Download, Filter, Check, X, FileText, AlertTriangle, HelpCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import Papa from 'papaparse';
import { Checkbox } from "@/components/ui/checkbox";

const PropertyListings = ({ userId, userPlan, isPremiumFeature }) => {
  const [activeTab, setActiveTab] = useState("all");
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [csvError, setCsvError] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const [newProperty, setNewProperty] = useState({
    title: "",
    description: "",
    price: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    type: "house",
    bedrooms: "",
    bathrooms: "",
    size: "",
    url: "",
    livingArea: "",
    plotArea: "",
    garageArea: "",
    terrace: "",
    hasPool: false,
    status: "active"
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc"
  });
  const [importResult, setImportResult] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPropertyId, setEditPropertyId] = useState(null);
  
  useEffect(() => {
    if (userId) {
      fetchProperties();
    }
  }, [userId]);
  
  useEffect(() => {
    if (properties.length > 0) {
      handleFilter();
    }
  }, [properties, searchQuery, activeTab, sortConfig]);
  
  const handleFilter = () => {
    let filtered = [...properties];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        property => 
          property.title?.toLowerCase().includes(query) ||
          property.address?.toLowerCase().includes(query) ||
          property.city?.toLowerCase().includes(query) ||
          property.description?.toLowerCase().includes(query)
      );
    }
    
    if (activeTab !== "all") {
      filtered = filtered.filter(property => property.status === activeTab);
    }
    
    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredProperties(filtered);
  };
  
  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setProperties(data || []);
      setFilteredProperties(data || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast.error("Failed to load properties");
    } finally {
      setLoading(false);
    }
  };
  
  const handlePropertyImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      toast.error("No valid data to import");
      return;
    }
    
    setIsImporting(true);
    setImportStatus("Importing properties...");
    
    console.log("Importing data:", JSON.stringify(parsedData.slice(0, 2)));
    
    try {
      const { data, error } = await supabase.functions.invoke("import-properties", {
        body: {
          userId,
          properties: parsedData,
          source: "csv"
        }
      });
      
      if (error) {
        throw error;
      }
      
      console.log("Import result:", data);
      setImportResult(data);
      
      if (data.properties_imported > 0) {
        toast.success(`Successfully imported ${data.properties_imported} properties`);
        fetchProperties();
      } else {
        toast.warning("No properties were imported");
      }
      
      if (data.properties_failed > 0) {
        toast.error(`${data.properties_failed} properties failed to import`);
        console.error("Failed imports:", data.errors);
      }
      
      setImportStatus(`Import completed. ${data.properties_imported} imported, ${data.properties_failed} failed.`);
      
      if (data.properties_imported > 0) {
        setTimeout(() => {
          setImportDialogOpen(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Error importing properties:", error);
      toast.error("Failed to import properties");
      setImportStatus("Import failed");
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setUploadedFile(file);
    setCsvError(null);
    setImportResult(null);
    
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log("Parsed CSV data:", results);
          if (results.errors.length > 0) {
            setCsvError(`CSV parsing error: ${results.errors[0].message}`);
            setParsedData([]);
          } else if (results.data.length === 0) {
            setCsvError("The CSV file is empty");
            setParsedData([]);
          } else {
            setParsedData(results.data);
            setImportStatus(`Ready to import ${results.data.length} properties`);
          }
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          setCsvError(`Failed to parse CSV: ${error.message}`);
          setParsedData([]);
        }
      });
    } else {
      setParsedData([]);
      setImportStatus(null);
    }
  };
  
  const resetPropertyForm = () => {
    setNewProperty({
      title: "",
      description: "",
      price: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      type: "house",
      bedrooms: "",
      bathrooms: "",
      size: "",
      url: "",
      livingArea: "",
      plotArea: "",
      garageArea: "",
      terrace: "",
      hasPool: false,
      status: "active"
    });
    setIsEditMode(false);
    setEditPropertyId(null);
  };
  
  const handleAddProperty = async () => {
    try {
      if (!newProperty.title || !newProperty.price) {
        toast.error("Title and price are required");
        return;
      }
      
      const propertyToAdd = {
        ...newProperty,
        price: parseFloat(newProperty.price) || 0,
        bedrooms: newProperty.bedrooms ? parseInt(newProperty.bedrooms, 10) : null,
        bathrooms: newProperty.bathrooms ? parseFloat(newProperty.bathrooms) : null,
        size: newProperty.size ? parseFloat(newProperty.size) : null,
        livingArea: newProperty.livingArea ? parseFloat(newProperty.livingArea) : null,
        plotArea: newProperty.plotArea ? parseFloat(newProperty.plotArea) : null,
        garageArea: newProperty.garageArea ? parseFloat(newProperty.garageArea) : null,
        terrace: newProperty.terrace ? parseFloat(newProperty.terrace) : null,
        user_id: userId
      };
      
      if (isEditMode && editPropertyId) {
        const { data, error } = await supabase
          .from("properties")
          .update(propertyToAdd)
          .eq("id", editPropertyId)
          .select();
        
        if (error) {
          console.error("Error updating property:", error);
          throw error;
        }
        
        toast.success("Property updated successfully");
      } else {
        const { data, error } = await supabase
          .from("properties")
          .insert(propertyToAdd)
          .select();
        
        if (error) {
          console.error("Error adding property:", error);
          throw error;
        }
        
        toast.success("Property added successfully");
      }
      
      fetchProperties();
      resetPropertyForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding/updating property:", error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'add'} property: ${error.message || error}`);
    }
  };
  
  const handleDeleteProperty = async (id) => {
    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", id);
      
      if (error) {
        throw error;
      }
      
      toast.success("Property deleted successfully");
      fetchProperties();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Failed to delete property");
    }
  };
  
  const handleEditProperty = (property) => {
    setNewProperty({
      title: property.title || "",
      description: property.description || "",
      price: property.price?.toString() || "",
      address: property.address || "",
      city: property.city || "",
      state: property.state || "",
      zip: property.zip || "",
      type: property.type || "house",
      bedrooms: property.bedrooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      size: property.size?.toString() || "",
      url: property.url || "",
      livingArea: property.livingArea?.toString() || "",
      plotArea: property.plotArea?.toString() || "",
      garageArea: property.garageArea?.toString() || "",
      terrace: property.terrace?.toString() || "",
      hasPool: property.hasPool === true,
      status: property.status || "active"
    });
    setIsEditMode(true);
    setEditPropertyId(property.id);
    setIsAddDialogOpen(true);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProperty(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name, value) => {
    setNewProperty(prev => ({ ...prev, [name]: value }));
  };
  
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '';
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  const csvExample = `title,price,description,address,city,state,zip,type,bedrooms,bathrooms,size,livingArea,plotArea,garageArea,terrace,hasPool,url
"Beautiful 3BR Villa",450000,"A stunning property with mountain views","123 Main St","Marbella","Málaga","29660","villa",3,2,2100,150,1000,30,50,true,"https://youragency.com/listing/123"
"Downtown Condo",320000,"Modern living in the heart of the city","456 Center Ave","Marbella","Málaga","29601","condo",2,2,1200,100,0,20,30,false,"https://youragency.com/listing/456"`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Property Management</h2>
          <p className="text-muted-foreground">
            Manage your listings and property details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => {
            resetPropertyForm();
            setIsAddDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
          
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <UploadCloud className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="all">
                All Properties
                {properties.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {properties.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="sold">Sold</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search properties..."
              className="pl-8 w-full md:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Home className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No properties found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Try a different search term" : "Add your first property listing to get started"}
                </p>
                <Button onClick={() => {
                  resetPropertyForm();
                  setIsAddDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead className="hidden md:table-cell">Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">
                        {property.title || "Untitled Property"}
                      </TableCell>
                      <TableCell>{formatCurrency(property.price)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {property.city ? `${property.city}, ${property.state || ''}` : "Location not specified"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {property.bedrooms || property.bathrooms || property.size ? (
                          <div className="flex items-center gap-2">
                            {property.bedrooms && (
                              <span className="text-xs bg-secondary px-2 py-1 rounded-md">{property.bedrooms} BR</span>
                            )}
                            {property.bathrooms && (
                              <span className="text-xs bg-secondary px-2 py-1 rounded-md">{property.bathrooms} BA</span>
                            )}
                            {property.size && (
                              <span className="text-xs bg-secondary px-2 py-1 rounded-md">{Math.round(property.size)} m²</span>
                            )}
                            {property.hasPool && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md">Pool</span>
                            )}
                          </div>
                        ) : (
                          "No details"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            property.status === "active" ? "default" :
                            property.status === "pending" ? "secondary" :
                            property.status === "sold" ? "outline" : "outline"
                          }
                        >
                          {property.status ? property.status.charAt(0).toUpperCase() + property.status.slice(1) : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(property.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => alert("View property details")}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditProperty(property)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Property
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteProperty(property.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Property
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        if (!open) resetPropertyForm();
        setIsAddDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Property' : 'Add New Property'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Update the details of your property listing.' 
                : 'Enter the details of your new property listing.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title*</Label>
                <Input
                  id="title"
                  name="title"
                  value={newProperty.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Beautiful 3BR Villa"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (€)*</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={newProperty.price}
                  onChange={handleInputChange}
                  placeholder="e.g. 450000"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={newProperty.description}
                  onChange={handleInputChange}
                  placeholder="Describe your property..."
                  rows={3}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="url">Property URL/Web Address</Label>
                <Input
                  id="url"
                  name="url"
                  value={newProperty.url}
                  onChange={handleInputChange}
                  placeholder="e.g. https://youragency.com/properties/villa-123"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={newProperty.address}
                  onChange={handleInputChange}
                  placeholder="e.g. 123 Main St"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={newProperty.city}
                  onChange={handleInputChange}
                  placeholder="e.g. Marbella"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    name="state"
                    value={newProperty.state}
                    onChange={handleInputChange}
                    placeholder="e.g. Málaga"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP/Postal Code</Label>
                  <Input
                    id="zip"
                    name="zip"
                    value={newProperty.zip}
                    onChange={handleInputChange}
                    placeholder="e.g. 29660"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Property Type</Label>
                <Select 
                  name="type" 
                  value={newProperty.type} 
                  onValueChange={(value) => handleSelectChange("type", value)}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="land">Land</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  name="status"
                  value={newProperty.status} 
                  onValueChange={(value) => handleSelectChange("status", value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  name="bedrooms"
                  type="number"
                  value={newProperty.bedrooms}
                  onChange={handleInputChange}
                  placeholder="e.g. 3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  name="bathrooms"
                  type="number"
                  step="0.5"
                  value={newProperty.bathrooms}
                  onChange={handleInputChange}
                  placeholder="e.g. 2.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Total Size (m²)</Label>
                <Input
                  id="size"
                  name="size"
                  type="number"
                  value={newProperty.size}
                  onChange={handleInputChange}
                  placeholder="e.g. 200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="livingArea">Living Area (m²)</Label>
                <Input
                  id="livingArea"
                  name="livingArea"
                  type="number"
                  value={newProperty.livingArea}
                  onChange={handleInputChange}
                  placeholder="e.g. 150"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plotArea">Plot Area (m²)</Label>
                <Input
                  id="plotArea"
                  name="plotArea"
                  type="number"
                  value={newProperty.plotArea}
                  onChange={handleInputChange}
                  placeholder="e.g. 1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="garageArea">Garage Area (m²)</Label>
                <Input
                  id="garageArea"
                  name="garageArea"
                  type="number"
                  value={newProperty.garageArea}
                  onChange={handleInputChange}
                  placeholder="e.g. 30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terrace">Terrace (m²)</Label>
                <Input
                  id="terrace"
                  name="terrace"
                  type="number"
                  value={newProperty.terrace}
                  onChange={handleInputChange}
                  placeholder="e.g. 50"
                />
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <Checkbox 
                  id="hasPool" 
                  checked={newProperty.hasPool}
                  onCheckedChange={(checked) => {
                    setNewProperty(prev => ({ 
                      ...prev, 
                      hasPool: checked === true ? true : false 
                    }));
                  }}
                />
                <Label htmlFor="hasPool" className="text-sm font-normal">
                  Property has a swimming pool
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetPropertyForm();
              setIsAddDialogOpen(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddProperty}>
              {isEditMode ? 'Update Property' : 'Save Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UploadCloud className="h-5 w-5 mr-2 text-primary" />
              Import Properties from CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file with your property listings to quickly import multiple properties at once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-2 mt-0.5">
                    <HelpCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">CSV Format Requirements</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Your CSV file must include the following column headers (title and price are required):
                    </p>
                    <div className="bg-muted rounded-md p-2 overflow-x-auto">
                      <code className="text-xs text-muted-foreground font-mono">
                        title, price, description, address, city, state, zip, type, bedrooms, bathrooms, size, livingArea, plotArea, garageArea, terrace, hasPool, url
                      </code>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <details className="text-sm">
                  <summary className="font-medium cursor-pointer text-primary flex items-center">
                    <FileText className="h-4 w-4 mr-1 inline" />
                    View example CSV format
                  </summary>
                  <div className="mt-2 bg-muted rounded-md p-3 overflow-x-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">{csvExample}</pre>
                  </div>
                </details>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="csv-upload" className="text-sm font-medium">Upload your CSV file</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg px-6 py-8 text-center hover:bg-muted/40 transition-colors cursor-pointer">
                  <Input 
                    id="csv-upload" 
                    type="file" 
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <UploadCloud className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mb-3">CSV files only (max 10MB)</p>
                    <Button variant="outline" size="sm" className="pointer-events-none">
                      Select CSV File
                    </Button>
                  </label>
                </div>
              </div>
            </div>
            
            {uploadedFile && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-green-100 p-1 rounded">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium">{uploadedFile.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {(uploadedFile.size / 1024).toFixed(0)} KB
                  </Badge>
                </div>
                
                {importStatus && (
                  <p className="text-sm text-muted-foreground">{importStatus}</p>
                )}
              </div>
            )}
            
            {csvError && (
              <Alert variant="destructive" className="text-sm">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{csvError}</AlertDescription>
              </Alert>
            )}
            
            {parsedData.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">CSV Preview</h3>
                  <Badge variant="outline">{parsedData.length} properties</Badge>
                </div>
                <ScrollArea className="h-[200px] rounded-md border">
                  <div className="p-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(parsedData[0]).slice(0, 5).map((header, i) => (
                            <TableHead key={i} className="text-xs whitespace-nowrap">{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row).slice(0, 5).map((value, j) => (
                              <TableCell key={j} className="text-xs py-2">
                                {value ? String(value).substring(0, 20) + (String(value).length > 20 ? '...' : '') : "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                        {parsedData.length > 5 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-2">
                              + {parsedData.length - 5} more properties
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {importResult && (
              <Alert variant={importResult.properties_imported > 0 ? "default" : "destructive"} className="text-sm">
                <div className="flex flex-col">
                  <div className="flex items-center">
                    {importResult.properties_imported > 0 ? (
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                    )}
                    <AlertTitle>Import {importResult.properties_imported > 0 ? "Successful" : "Completed"}</AlertTitle>
                  </div>
                  <AlertDescription>
                    <div className="space-y-1 mt-1">
                      <div className="text-sm">
                        <span className="font-medium">{importResult.properties_imported}</span> properties imported successfully
                      </div>
                      {importResult.properties_failed > 0 && (
                        <div className="text-sm text-destructive">
                          <span className="font-medium">{importResult.properties_failed}</span> properties failed to import
                        </div>
                      )}
                      {importResult.errors && importResult.errors.length > 0 && (
                        <details className="text-xs mt-2">
                          <summary className="cursor-pointer font-medium">View Errors</summary>
                          <div className="mt-1 bg-muted p-2 rounded">
                            <ul className="list-disc pl-4">
                              {importResult.errors.slice(0, 3).map((error, i) => (
                                <li key={i} className="mb-1">{error}</li>
                              ))}
                              {importResult.errors.length > 3 && (
                                <li>...and {importResult.errors.length - 3} more errors</li>
                              )}
                            </ul>
                          </div>
                        </details>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>
          
          <DialogFooter className="mt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setUploadedFile(null);
                setParsedData([]);
                setCsvError(null);
                setImportStatus(null);
                setImportResult(null);
                setImportDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePropertyImport} 
              disabled={isImporting || parsedData.length === 0}
              className="min-w-[120px]"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Import {parsedData.length > 0 ? `(${parsedData.length})` : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyListings;
