(function() {
  // Get the user ID from the script tag
  const scriptTag = document.currentScript;
  const srcParams = new URL(scriptTag.src).searchParams;
  const userId = srcParams.get('user');

  if (!userId) {
    console.error('RealHome.AI Chatbot: User ID not provided');
    return;
  }

  // Supabase API key and URL
  const supabaseUrl = 'https://ckgaqkbsnrvccctqxsqv.supabase.co';
  const supabaseApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ2Fxa2JzbnJ2Y2NjdHF4c3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMTEyODksImV4cCI6MjA1NjU4NzI4OX0.z62BR5psK8FBR5lfqbnpbFMfQLKgzFCisqDiuWg4MKM';

  // Create a unique visitor ID for this user
  let visitorId = localStorage.getItem('realhome_visitor_id');
  if (!visitorId) {
    visitorId = 'visitor_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('realhome_visitor_id', visitorId);
  }

  // Create a conversation ID for this session
  const conversationId = 'conv_' + Math.random().toString(36).substring(2, 15);

  // All existing styles, event listeners, UI creation, and chatbot API functionality remain exactly the same as original
  
  // ---- Keep everything else exactly as is (styles, UI elements, event listeners, etc.) ----

  // Updated Load settings from API with proper headers and error handling
  async function loadSettings() {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/chatbot_settings?user_id=eq.${userId}&select=settings`, {
        headers: {
          'apikey': supabaseApiKey,
          'Authorization': `Bearer ${supabaseApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          applySettings(data[0].settings);
        } else {
          console.warn('No settings found for provided user ID');
        }
      } else {
        console.error('Failed to fetch settings:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading chatbot settings:', error);
    }
  }

  function applySettings(settings) {
    if (!settings) return;
    
    // Existing applySettings implementation remains exactly as provided

    if (settings.position === 'left') {
      container.style.left = '20px';
      container.style.right = 'auto';
      chatWindow.style.left = '0';
      chatWindow.style.right = 'auto';
    }

    if (settings.primaryColor) {
      button.style.backgroundColor = settings.primaryColor;
      header.style.backgroundColor = settings.primaryColor;
      document.querySelectorAll('.realhome-chatbot-message.user').forEach(el => {
        el.style.backgroundColor = settings.primaryColor;
      });
      document.querySelectorAll('.realhome-chatbot-send').forEach(el => {
        el.style.backgroundColor = settings.primaryColor;
      });
    }

    if (settings.botIcon) {
      // Existing icon switch implementation remains unchanged
    }

    if (settings.fontSize) {
      document.documentElement.style.setProperty('--realhome-chatbot-font-size', `${settings.fontSize}px`);
    }

    if (settings.botName) {
      header.querySelector('div:first-child').textContent = settings.botName;
    }

    if (settings.welcomeMessage && messagesContainer.childElementCount <= 1) {
      messagesContainer.innerHTML = '';
      addMessage('bot', settings.welcomeMessage);
    }

    if (settings.placeholderText) {
      input.placeholder = settings.placeholderText;
    }
  }

  // Load settings when the script loads
  loadSettings();
})();
