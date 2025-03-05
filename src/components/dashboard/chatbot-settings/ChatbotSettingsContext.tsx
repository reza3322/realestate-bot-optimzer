
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Define the settings type
interface ChatbotSettingsState {
  primaryColor: string;
  theme: string;
  variation: string;
  botIcon: string;
  fontFamily: string;
  fontSize: number;
  botName: string;
  welcomeMessage: string;
  placeholderText: string;
  enabled: boolean;
  position: string;
  buttonText: string;
  buttonIcon: string;
  buttonSize: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonStyle: string;
  buttonPosition: string;
}

interface ChatbotSettingsContextType {
  settings: ChatbotSettingsState;
  setSettings: React.Dispatch<React.SetStateAction<ChatbotSettingsState>>;
  loading: boolean;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

const defaultSettings: ChatbotSettingsState = {
  primaryColor: "#3b82f6",
  theme: "default",
  variation: "default",
  botIcon: "message-circle",
  fontFamily: "default",
  fontSize: 16,
  botName: "RealHome Assistant",
  welcomeMessage: "Hi there! I'm your RealHome assistant. How can I help you today?",
  placeholderText: "Type your message...",
  enabled: true,
  position: "right",
  buttonText: "Chat with us",
  buttonIcon: "message-circle",
  buttonSize: "medium",
  buttonColor: "#3b82f6",
  buttonTextColor: "#ffffff",
  buttonStyle: "pill",
  buttonPosition: "bottom-right",
};

const ChatbotSettingsContext = createContext<ChatbotSettingsContextType | undefined>(undefined);

export const ChatbotSettingsProvider = ({ 
  children, 
  userId 
}: { 
  children: React.ReactNode; 
  userId: string 
}) => {
  const [settings, setSettings] = useState<ChatbotSettingsState>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { error: tableError } = await supabase
          .from('chatbot_settings')
          .select('count')
          .limit(1)
          .single();
        
        if (tableError && tableError.code === '42P01') {
          console.log('Chatbot settings table does not exist yet, will be created on first save');
        } else {
          const { data, error } = await supabase
            .from("chatbot_settings")
            .select("*")
            .eq("user_id", userId)
            .single();
          
          if (error) {
            if (error.code !== "PGRST116") {
              console.error("Error fetching chatbot settings:", error);
              toast.error("Error loading chatbot settings");
            }
          } else if (data) {
            setSettings(data.settings);
          }
        }
      } catch (error) {
        console.error("Error fetching chatbot settings:", error);
        toast.error("Error loading chatbot settings");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [userId]);

  return (
    <ChatbotSettingsContext.Provider 
      value={{ 
        settings, 
        setSettings, 
        loading, 
        saving, 
        setSaving 
      }}
    >
      {children}
    </ChatbotSettingsContext.Provider>
  );
};

export const useChatbotSettings = () => {
  const context = useContext(ChatbotSettingsContext);
  if (context === undefined) {
    throw new Error("useChatbotSettings must be used within a ChatbotSettingsProvider");
  }
  return context;
};
