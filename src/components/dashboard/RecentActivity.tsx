
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
  activities: Activity[];
}

const RecentActivity = ({ activities }: RecentActivityProps) => {
  // If no activities are available, show empty state
  const displayActivities = activities.length > 0 ? activities : [];

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
      {displayActivities.map((activity) => (
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
      ))}
      
      {displayActivities.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          No recent activities to display
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
