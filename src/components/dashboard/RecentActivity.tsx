
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface Activity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  user_id: string;
  target_id?: string;
  target_type?: string;
}

interface RecentActivityProps {
  activities?: Activity[];
  userId?: string;
}

const RecentActivity = ({ activities: initialActivities, userId }: RecentActivityProps) => {
  const [activities, setActivities] = useState<Activity[]>(initialActivities || []);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) {
          console.error('Error fetching activities:', error);
        } else {
          setActivities(data || []);
        }
      } catch (error) {
        console.error('Error in fetchActivities:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [userId]);

  // Display activities or loading state
  const displayActivities = loading 
    ? [] 
    : activities.length > 0 
      ? activities 
      : [];

  // Helper function to get the initials for the avatar
  const getInitials = (type: string) => {
    switch (type) {
      case 'lead':
        return 'LD';
      case 'property':
        return 'PR';
      case 'message':
        return 'MS';
      default:
        return 'AC';
    }
  };
  
  // Helper function to get the badge color based on type
  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'lead':
        return <Badge className="bg-green-500">Lead</Badge>;
      case 'property':
        return <Badge className="bg-blue-500">Property</Badge>;
      case 'message':
        return <Badge variant="outline">Message</Badge>;
      default:
        return <Badge variant="outline">Activity</Badge>;
    }
  };

  // Format time relative to now
  const formatRelativeTime = (timestamp: string) => {
    try {
      const now = new Date();
      const time = new Date(timestamp);
      const diffMs = now.getTime() - time.getTime();
      
      // Convert to appropriate time unit
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return `${diffSecs} seconds ago`;
      
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins} minutes ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hours ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} days ago`;
      
      // If more than a week, return the date
      return time.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown time";
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex flex-col space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start space-x-4 pb-4 border-b">
              <div className="h-10 w-10 rounded-full bg-muted/50 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted/50 animate-pulse rounded"></div>
                <div className="h-3 w-1/2 bg-muted/30 animate-pulse rounded"></div>
              </div>
              <div className="h-6 w-16 bg-muted/40 animate-pulse rounded-full"></div>
            </div>
          ))}
        </div>
      ) : displayActivities.length > 0 ? (
        displayActivities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4 pb-4 border-b">
            <Avatar className="h-10 w-10">
              <AvatarImage src="" alt={activity.type} />
              <AvatarFallback>{getInitials(activity.type)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium leading-none">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(activity.created_at)}</p>
              </div>
              
              {activity.target_id && (
                <p className="text-xs text-muted-foreground">
                  ID: {activity.target_id.substring(0, 8)}...
                </p>
              )}
            </div>
            
            {getActivityBadge(activity.type)}
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          No recent activities to display
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
