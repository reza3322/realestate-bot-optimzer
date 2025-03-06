
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Upload, FileSpreadsheet, Link, Lock } from "lucide-react";
import WebsiteIntegration from "./WebsiteIntegration";

interface PropertyListingsProps {
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
  userId?: string;
}

const PropertyListings = ({ userPlan, isPremiumFeature, userId = "" }: PropertyListingsProps) => {
  const [activePropertyTab, setActivePropertyTab] = useState("manual");
  
  const properties = [
    {
      id: 1,
      title: "Luxury Villa with Pool",
      description: "Beautiful villa with 4 bedrooms and a large pool",
      price: "€850,000",
      views: 230,
      inquiries: 14,
      status: "active",
      imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2075&q=80"
    },
    {
      id: 2,
      title: "City Center Apartment",
      description: "Modern 2 bedroom apartment in the heart of the city",
      price: "€320,000",
      views: 189,
      inquiries: 8,
      status: "active",
      imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
    },
    {
      id: 3,
      title: "Ocean View House",
      description: "Stunning 3 bedroom house with panoramic ocean views",
      price: "€520,000",
      views: 156,
      inquiries: 6,
      status: "pending",
      imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Property Management</h2>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Property
        </Button>
      </div>
      
      <Tabs defaultValue="manual" value={activePropertyTab} onValueChange={setActivePropertyTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-3xl">
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
                <CardTitle>Add New Property</CardTitle>
                <CardDescription>Enter the details of your property</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Property Title</Label>
                      <Input id="title" placeholder="e.g. Luxury Villa with Pool" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input id="price" placeholder="e.g. 850000" type="number" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="type">Property Type</Label>
                      <Input id="type" placeholder="e.g. Villa, Apartment, House" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input id="bedrooms" placeholder="e.g. 4" type="number" />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" placeholder="Full property address" />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" placeholder="Describe the property..." />
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button>Save Property</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Upload Options</CardTitle>
                <CardDescription>Upload your property data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Images
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Bulk Import (CSV/Excel)
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  disabled={isPremiumFeature('professional')}
                  onClick={() => !isPremiumFeature('professional') && setActivePropertyTab('automated')}
                >
                  {isPremiumFeature('professional') && <Lock className="mr-2 h-4 w-4" />}
                  {!isPremiumFeature('professional') && <Link className="mr-2 h-4 w-4" />}
                  API Integration
                  {isPremiumFeature('professional') && <span className="ml-auto text-xs text-muted-foreground">(Pro)</span>}
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <h3 className="text-xl font-bold mt-6">Your Properties</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {properties.map((property) => (
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
                  <CardDescription>{property.price}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm pb-3">
                  <p className="line-clamp-2">{property.description}</p>
                  <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                    <span>{property.views} views</span>
                    <span>{property.inquiries} inquiries</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-0">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="outline" size="sm">Delete</Button>
                </CardFooter>
              </Card>
            ))}
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
              
              <WebsiteIntegration 
                userId={userId} 
                userPlan={userPlan} 
                isPremiumFeature={isPremiumFeature}
              />
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
    </div>
  );
};

export default PropertyListings;
