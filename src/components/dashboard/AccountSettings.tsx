
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Lock, CreditCard, Users, HelpCircle } from "lucide-react";
import { updateUserProfile } from "@/lib/supabase";

interface AccountSettingsProps {
  user: User;
  userPlan: string;
  userProfile?: any;
}

const AccountSettings = ({ user, userPlan, userProfile }: AccountSettingsProps) => {
  const [firstName, setFirstName] = useState(userProfile?.first_name || user.user_metadata?.first_name || "");
  const [lastName, setLastName] = useState(userProfile?.last_name || user.user_metadata?.last_name || "");
  const [phone, setPhone] = useState(userProfile?.phone || user.user_metadata?.phone || "");
  const [company, setCompany] = useState(userProfile?.company || user.user_metadata?.company || "");
  const [isSaving, setIsSaving] = useState(false);

  // Update form if profile changes
  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.first_name || "");
      setLastName(userProfile.last_name || "");
      setPhone(userProfile.phone || "");
      setCompany(userProfile.company || "");
    }
  }, [userProfile]);
  
  const handleUpdateProfile = async () => {
    try {
      setIsSaving(true);
      
      // Update profile in Supabase
      const { error } = await updateUserProfile(user.id, {
        first_name: firstName,
        last_name: lastName,
        phone,
        company
      });
      
      if (error) {
        throw error;
      }
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Plan details based on the user's subscription
  const getPlanDetails = () => {
    switch (userPlan) {
      case 'starter':
        return {
          name: 'Starter',
          price: '€99',
          period: 'per month',
          features: [
            'AI Chatbot integration',
            'Basic CRM functionality',
            'Lead qualification',
            'Email notifications',
            'Basic analytics dashboard',
          ]
        };
      case 'professional':
        return {
          name: 'Professional',
          price: '€299',
          period: 'per month',
          features: [
            'Everything in Starter',
            'AI Agent integration',
            'Advanced CRM functionality',
            '30 qualified leads per month',
            'Automated follow-ups',
            'Property matching engine',
            'Priority support',
          ]
        };
      case 'enterprise':
        return {
          name: 'Enterprise',
          price: '€599',
          period: 'per month',
          features: [
            'Everything in Professional',
            'Social media AI agent',
            'Unlimited qualified leads',
            'Custom integrations',
            'Dedicated account manager',
            'White-label solutions',
            'Advanced analytics',
            'API access',
          ]
        };
      default:
        return {
          name: 'Free Trial',
          price: '€0',
          period: 'limited time',
          features: [
            'Basic features',
            '14-day trial of Professional features',
          ]
        };
    }
  };
  
  const planDetails = getPlanDetails();
  
  // Helper function to get initials for avatar
  const getInitials = (firstName: string, lastName: string) => {
    const firstInitial = firstName ? firstName[0] : '';
    const lastInitial = lastName ? lastName[0] : '';
    return (firstInitial + lastInitial).toUpperCase() || user.email?.[0].toUpperCase() || 'U';
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Account Settings</h2>
      </div>
      
      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={userProfile?.avatar_url || ""} alt={`${firstName} ${lastName}`} />
                  <AvatarFallback>{getInitials(firstName, lastName)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      value={user.email || ''} 
                      disabled
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input 
                      id="phone" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="company">Company/Agency</Label>
                    <Input 
                      id="company" 
                      value={company} 
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Cancel</Button>
              <Button 
                onClick={handleUpdateProfile}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Update Password</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current Plan</span>
                <Badge variant={userPlan === 'starter' ? 'default' : userPlan === 'professional' ? 'outline' : 'secondary'}>
                  {planDetails.name}
                </Badge>
              </CardTitle>
              <CardDescription>Your current subscription plan and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-2xl font-bold">{planDetails.price}</p>
                  <p className="text-sm text-muted-foreground">{planDetails.period}</p>
                </div>
                
                {userPlan === 'starter' && (
                  <Button>Upgrade Plan</Button>
                )}
                
                {userPlan !== 'starter' && (
                  <Button variant="outline">Manage Subscription</Button>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="font-medium">Plan Features:</p>
                <ul className="space-y-1">
                  {planDetails.features.map((feature, index) => (
                    <li key={index} className="text-sm flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4 text-green-500 flex-shrink-0"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing Information
              </CardTitle>
              <CardDescription>Manage your payment methods and billing history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-primary"
                      >
                        <rect width="20" height="14" x="2" y="5" rx="2" />
                        <path d="M2 10h20" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-xs text-muted-foreground">Expires 12/2025</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
              
              <div className="text-sm">
                <p className="font-medium mb-2">Billing History</p>
                <div className="rounded-md border">
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                          <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                          <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <td className="p-2 align-middle">Oct 1, 2023</td>
                          <td className="p-2 align-middle">{planDetails.price}</td>
                          <td className="p-2 align-middle">
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600">
                              Paid
                            </Badge>
                          </td>
                        </tr>
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <td className="p-2 align-middle">Sep 1, 2023</td>
                          <td className="p-2 align-middle">{planDetails.price}</td>
                          <td className="p-2 align-middle">
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600">
                              Paid
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>Manage your team and their access levels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userPlan === 'starter' ? (
                <div className="text-center py-6">
                  <Lock className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-bold mb-2">Team Management</h3>
                  <p className="text-muted-foreground mb-6">
                    Team management is available on the Professional plan and above
                  </p>
                  <Button>Upgrade to Professional</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <div className="relative w-full overflow-auto">
                      <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <td className="p-2 align-middle">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{getInitials(firstName, lastName)}</AvatarFallback>
                                </Avatar>
                                <span>{firstName} {lastName}</span>
                              </div>
                            </td>
                            <td className="p-2 align-middle">{user.email}</td>
                            <td className="p-2 align-middle">
                              <Badge>Owner</Badge>
                            </td>
                            <td className="p-2 align-middle">
                              <Button variant="ghost" size="sm" disabled>
                                Edit
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <Button>
                    <Users className="mr-2 h-4 w-4" />
                    Invite Team Member
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Help & Support
              </CardTitle>
              <CardDescription>Get help with your account and platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-4">
                <p className="font-medium mb-2">Documentation & Resources</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="justify-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 mr-2"
                    >
                      <path d="M10.75 16.82A7.462 7.462 0 0115 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0018 15.06v-11a.75.75 0 00-.546-.721A9.006 9.006 0 0015 3a8.963 8.963 0 00-4.25 1.065V16.82zM9.25 4.065A8.963 8.963 0 005 3c-.85 0-1.673.118-2.454.339A.75.75 0 002 4.06v11a.75.75 0 00.954.721A7.506 7.506 0 015 15.5c1.579 0 3.042.487 4.25 1.32V4.065z" />
                    </svg>
                    User Guide
                  </Button>
                  
                  <Button variant="outline" className="justify-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 mr-2"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    FAQ
                  </Button>
                  
                  <Button variant="outline" className="justify-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 mr-2"
                    >
                      <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                      <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                    </svg>
                    Video Tutorials
                  </Button>
                  
                  <Button variant="outline" className="justify-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 mr-2"
                    >
                      <path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 015 17.25v-3.443c-.501-.048-1-.106-1.495-.172C2.033 13.438 1 12.162 1 10.72V5.28c0-1.441 1.033-2.717 2.505-2.914z" />
                      <path d="M14 6c-.762 0-1.52.02-2.271.062C10.157 6.148 9 7.472 9 8.998v2.24c0 1.519 1.147 2.839 2.71 2.935.214.013.428.024.642.034.2.009.385.09.518.224l2.35 2.35a.75.75 0 001.28-.531v-2.07c1.453-.195 2.5-1.463 2.5-2.915V8.998c0-1.526-1.157-2.85-2.729-2.936A41.645 41.645 0 0014 6z" />
                    </svg>
                    Community Forum
                  </Button>
                </div>
              </div>
              
              <div className="rounded-md border p-4">
                <p className="font-medium mb-2">Contact Support</p>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Our support team is available Monday through Friday, 9am to 5pm CET.
                  </p>
                  
                  <div className="flex flex-col md:flex-row gap-4">
                    <Button variant="outline" className="flex-1 justify-start">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4 mr-2"
                      >
                        <path fillRule="evenodd" d="M10 5c-1.994 0-3.5 1.085-3.5 3.5s1.506 3.5 3.5 3.5 3.5-1.085 3.5-3.5S11.994 5 10 5zm0 1.25a2.375 2.375 0 100 4.75 2.375 2.375 0 000-4.75zM3.5 12.75a.75.75 0 00-.75.75v2.5c0 .138.112.25.25.25h14a.25.25 0 00.25-.25v-2.5a.75.75 0 00-1.5 0v1.75H4.25V13.5a.75.75 0 00-.75-.75z" clipRule="evenodd" />
                      </svg>
                      Email Support
                    </Button>
                    
                    <Button variant="outline" className="flex-1 justify-start">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4 mr-2"
                      >
                        <path fillRule="evenodd" d="M2 10c0-3.967 3.69-7 8-7 4.31 0 8 3.033 8 7s-3.69 7-8 7a9.165 9.165 0 01-1.504-.123 5.976 5.976 0 01-3.935 1.107.75.75 0 01-.584-1.143 3.478 3.478 0 00.522-1.756C2.979 13.825 2 12.025 2 10z" clipRule="evenodd" />
                      </svg>
                      Live Chat
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountSettings;
