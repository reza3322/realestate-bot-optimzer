
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
import { Home, UploadCloud, Plus, Edit, MoreHorizontal, Eye, Trash2, Search, Download, Filter, Check, X, FileText, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import Papa from 'papaparse';

const PropertyListings = ({ userId, isPremiumFeature }) => {
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
    
    // Filter by search
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
    
    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter(property => property.status === activeTab);
    }
    
    // Sort
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
    
    // Add additional debugging information
    console.log("Importing data:", JSON.stringify(parsedData.slice(0, 2)));
    
    try {
      // Call the Supabase Edge Function to import properties
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
      
      // Close the dialog after successful import with slight delay
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
      // Preview the uploaded file
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
  
  const handleAddProperty = async () => {
    try {
      // Basic validation
      if (!newProperty.title || !newProperty.price) {
        toast.error("Title and price are required");
        return;
      }
      
      // Ensure numeric fields are actually numbers
      const propertyToAdd = {
        ...newProperty,
        price: parseFloat(newProperty.price) || 0,
        bedrooms: newProperty.bedrooms ? parseInt(newProperty.bedrooms, 10) : null,
        bathrooms: newProperty.bathrooms ? parseFloat(newProperty.bathrooms) : null,
        size: newProperty.size ? parseFloat(newProperty.size) : null,
        user_id: userId
      };
      
      const { data, error } = await supabase
        .from("properties")
        .insert(propertyToAdd)
        .select();
      
      if (error) {
        throw error;
      }
      
      toast.success("Property added successfully");
      fetchProperties();
      
      // Reset form
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
        status: "active"
      });
      
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding property:", error);
      toast.error("Failed to add property");
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
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProperty(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name, value) => {
    setNewProperty(prev => ({ ...prev, [name]: value }));
  };
  
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
  
  const csvExample = `title,price,description,address,city,state,zip,type,bedrooms,bathrooms,size
"Beautiful 3BR Home",450000,"A stunning property with mountain views","123 Main St","Austin","TX","78701","house",3,2,2100
"Downtown Condo",320000,"Modern living in the heart of the city","456 Center Ave","Austin","TX","78704","condo",2,2,1200`;

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
          <Button onClick={() => setIsAddDialogOpen(true)}>
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
                <Button onClick={() => setIsAddDialogOpen(true)}>
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
                              <span className="text-xs bg-secondary px-2 py-1 rounded-md">{Math.round(property.size)} sqft</span>
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
                            property.status === "sold" ? "success" : "outline"
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
                            <DropdownMenuItem onClick={() => alert("Edit property")}>
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

      {/* Add Property Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
            <DialogDescription>
              Enter the details of your new property listing.
            </DialogDescription>
          </DialogHeader>
          <form id="add-property-form" className="space-y-4">
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title*</Label>
                  <Input
                    id="title"
                    name="title"
                    value={newProperty.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Beautiful 3BR Home"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price*</Label>
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
                    placeholder="e.g. Austin"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={newProperty.state}
                      onChange={handleInputChange}
                      placeholder="e.g. TX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP</Label>
                    <Input
                      id="zip"
                      name="zip"
                      value={newProperty.zip}
                      onChange={handleInputChange}
                      placeholder="e.g. 78701"
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
                  <Label htmlFor="size">Size (sq ft)</Label>
                  <Input
                    id="size"
                    name="size"
                    type="number"
                    value={newProperty.size}
                    onChange={handleInputChange}
                    placeholder="e.g. 2000"
                  />
                </div>
              </div>
            </ScrollArea>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProperty}>Save Property</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import Properties from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with your property listings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-md p-4 bg-muted/40">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">CSV Format Guide</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Your CSV file should contain the following column headers:
              </p>
              <div className="text-xs font-mono bg-secondary/30 p-2 rounded overflow-auto whitespace-nowrap mb-2">
                title, price, description, address, city, state, zip, type, bedrooms, bathrooms, size
              </div>
              <details className="text-xs">
                <summary className="font-medium cursor-pointer">CSV Example</summary>
                <pre className="bg-secondary/30 p-2 rounded mt-1 overflow-auto">{csvExample}</pre>
              </details>
            </div>
          
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="csv-upload">Upload CSV</Label>
              <Input 
                id="csv-upload" 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
              />
            </div>
            
            {csvError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{csvError}</AlertDescription>
              </Alert>
            )}
            
            {parsedData.length > 0 && (
              <div className="border rounded-md p-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">CSV Preview ({parsedData.length} properties)</span>
                </div>
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(parsedData[0]).slice(0, 5).map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).slice(0, 5).map((value, j) => (
                            <TableCell key={j}>{value ? String(value).substring(0, 20) : "-"}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
            
            {importStatus && (
              <div className="text-sm">
                {importStatus}
              </div>
            )}
            
            {importResult && (
              <Alert variant={importResult.properties_failed > 0 ? "warning" : "default"}>
                <div className="flex flex-col">
                  <div className="flex items-center">
                    {importResult.properties_failed > 0 ? (
                      <AlertTriangle className="h-4 w-4 mr-2 text-warning" />
                    ) : (
                      <Check className="h-4 w-4 mr-2 text-success" />
                    )}
                    <AlertTitle>Import completed</AlertTitle>
                  </div>
                  <AlertDescription>
                    <div className="space-y-1 mt-1">
                      <div className="text-sm">
                        {importResult.properties_imported} properties imported successfully
                      </div>
                      {importResult.properties_failed > 0 && (
                        <div className="text-sm text-warning">
                          {importResult.properties_failed} properties failed to import
                        </div>
                      )}
                      {importResult.errors && importResult.errors.length > 0 && (
                        <details className="text-xs mt-2">
                          <summary className="cursor-pointer">View Errors</summary>
                          <div className="mt-1 bg-muted p-2 rounded">
                            <ul className="list-disc pl-4">
                              {importResult.errors.slice(0, 5).map((error, i) => (
                                <li key={i} className="mb-1">{error}</li>
                              ))}
                              {importResult.errors.length > 5 && (
                                <li>...and {importResult.errors.length - 5} more errors</li>
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
          <DialogFooter>
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
            >
              {isImporting ? "Importing..." : "Import Properties"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyListings;
