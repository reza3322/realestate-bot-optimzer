
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const activities = [
  {
    id: 1,
    type: 'lead',
    description: 'New lead from AI chatbot',
    name: 'John Smith',
    email: 'john@example.com',
    time: '10 minutes ago',
    score: 85
  },
  {
    id: 2,
    type: 'property',
    description: 'Property view requested',
    name: 'Sarah Johnson',
    propertyName: 'Skyline Apartment',
    time: '45 minutes ago',
    score: 92
  },
  {
    id: 3,
    type: 'message',
    description: 'AI assistant responded to inquiry',
    name: 'Michael Brown',
    message: 'About property financing options',
    time: '2 hours ago',
    score: 65
  },
  {
    id: 4,
    type: 'lead',
    description: 'Returning visitor',
    name: 'Emily Davis',
    email: 'emily@example.com',
    time: '4 hours ago',
    score: 78
  },
  {
    id: 5,
    type: 'property',
    description: 'New property added',
    propertyName: 'Garden Villa',
    address: '123 Garden Street',
    time: 'Yesterday',
    score: null
  }
];

const RecentActivity = () => {
  // Helper function to get the initials for the avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  // Helper function to get the badge color based on score
  const getScoreBadge = (score: number | null) => {
    if (score === null) return null;
    
    if (score >= 80) {
      return <Badge className="bg-green-500">High {score}%</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-yellow-500">Medium {score}%</Badge>;
    } else {
      return <Badge variant="outline">Low {score}%</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-4 pb-4 border-b">
          <Avatar className="h-10 w-10">
            <AvatarImage src="" alt={activity.name || activity.propertyName} />
            <AvatarFallback>{activity.name ? getInitials(activity.name) : 'P'}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none">
                {activity.name || activity.propertyName}
              </p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
            
            <p className="text-sm text-muted-foreground">{activity.description}</p>
            
            {activity.email && (
              <p className="text-xs">{activity.email}</p>
            )}
            
            {activity.propertyName && !activity.name && (
              <p className="text-xs">{activity.address}</p>
            )}
            
            {activity.message && (
              <p className="text-xs italic">"{activity.message}"</p>
            )}
          </div>
          
          {activity.score !== null && getScoreBadge(activity.score)}
        </div>
      ))}
    </div>
  );
};

export default RecentActivity;
