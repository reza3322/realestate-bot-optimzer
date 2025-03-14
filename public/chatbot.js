(function() {
  // Get the user ID from the script tag
  const scriptTag = document.currentScript;
  // Use URLSearchParams to properly parse ?user= so we don't include other unwanted parameters
  const urlParams = new URL(scriptTag.src).searchParams;
  const userId = urlParams.get('user');
  
  if (!userId) {
    console.error('RealHome.AI Chatbot: User ID not provided');
    return;
  }
  
  // Create a unique visitor ID for this user
  let visitorId = localStorage.getItem('realhome_visitor_id');
  if (!visitorId) {
    visitorId = 'visitor_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('realhome_visitor_id', visitorId);
  }
  
  // Create a conversation ID for this session or retrieve existing one
  let conversationId = localStorage.getItem(`realhome_conversation_${userId}`);
  if (!conversationId) {
    conversationId = 'conv_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(`realhome_conversation_${userId}`, conversationId);
  }
  
  console.log(`Initializing chatbot for user ${userId} with conversation ID ${conversationId}`);
  
  // Create styles
  const style = document.createElement('style');
  style.textContent = `
    .realhome-chatbot-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    .realhome-chatbot-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #3b82f6;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.2s ease;
    }
    
    .realhome-chatbot-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    .realhome-chatbot-window {
      position: absolute;
      bottom: 70px;
      right: 0;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px) scale(0.9);
      pointer-events: none;
    }
    
    .realhome-chatbot-window.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }
    
    .realhome-chatbot-header {
      background-color: #3b82f6;
      color: white;
      padding: 15px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .realhome-chatbot-close {
      cursor: pointer;
      font-size: 20px;
    }
    
    .realhome-chatbot-messages {
      flex: 1;
      padding: 15px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .realhome-chatbot-message {
      max-width: 80%;
      padding: 10px 15px;
      border-radius: 18px;
      line-height: 1.4;
      font-size: 14px;
      position: relative;
      animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .realhome-chatbot-message.bot {
      background-color: #f1f5f9;
      color: #334155;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    
    .realhome-chatbot-message.user {
      background-color: #3b82f6;
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    
    .realhome-chatbot-input-container {
      padding: 10px 15px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 10px;
    }
    
    .realhome-chatbot-input {
      flex: 1;
      padding: 10px 15px;
      border-radius: 24px;
      border: 1px solid #e2e8f0;
      outline: none;
      font-size: 14px;
    }
    
    .realhome-chatbot-input:focus {
      border-color: #3b82f6;
    }
    
    .realhome-chatbot-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #3b82f6;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: none;
    }

    .realhome-chatbot-typing {
      display: flex;
      align-items: center;
      margin-top: 5px;
      margin-bottom: 10px;
    }

    .realhome-chatbot-typing-dot {
      width: 8px;
      height: 8px;
      background-color: #bbb;
      border-radius: 50%;
      margin: 0 2px;
      animation: typing 1.4s infinite both;
    }

    .realhome-chatbot-typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .realhome-chatbot-typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    .realhome-chatbot-message a {
      color: #3b82f6;
      text-decoration: underline;
      word-break: break-all;
    }
    
    .realhome-chatbot-message.bot a:hover {
      color: #2563eb;
    }

    .realhome-property-image {
      max-width: 100%;
      border-radius: 8px;
      margin-top: 8px;
      margin-bottom: 8px;
    }

    @keyframes typing {
      0% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
      100% { transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  
  // Create chatbot container
  const container = document.createElement('div');
  container.className = 'realhome-chatbot-container';
  
  // Create chatbot button
  const button = document.createElement('div');
  button.className = 'realhome-chatbot-button';
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8
               8.5 8.5 0 0 1-7.6 4.7
               8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7
               a8.38 8.38 0 0 1-.9-3.8
               8.5 8.5 0 0 1 4.7-7.6
               8.38 8.38 0 0 1 3.8-.9h.5
               a8.48 8.48 0 0 1 8 8v.5z">
      </path>
    </svg>
  `;
  
  // Create chatbot window
  const chatWindow = document.createElement('div');
  chatWindow.className = 'realhome-chatbot-window';
  
  // Create chatbot header
  const header = document.createElement('div');
  header.className = 'realhome-chatbot-header';
  header.innerHTML = `
    <div>RealHome.AI Assistant</div>
    <div class="realhome-chatbot-close">&times;</div>
  `;
  
  // Create messages container
  const messagesContainer = document.createElement('div');
  messagesContainer.className = 'realhome-chatbot-messages';
  
  // Create input container
  const inputContainer = document.createElement('div');
  inputContainer.className = 'realhome-chatbot-input-container';
  inputContainer.innerHTML = `
    <input type="text" class="realhome-chatbot-input" placeholder="Type your message...">
    <button class="realhome-chatbot-send">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    </button>
  `;
  
  // Assemble the chatbot
  chatWindow.appendChild(header);
  chatWindow.appendChild(messagesContainer);
  chatWindow.appendChild(inputContainer);
  container.appendChild(button);
  container.appendChild(chatWindow);
  document.body.appendChild(container);
  
  // Load previous chat messages if they exist
  const loadPreviousMessages = async () => {
    try {
      if (!conversationId) return;
      
      // Get previous messages from the API
      const response = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/get-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          userId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          // Clear the messages container
          messagesContainer.innerHTML = '';
          
          // Add previous messages
          data.messages.forEach(exchange => {
            addMessage('user', exchange.message);
            addMessage('bot', exchange.response);
          });
          
          console.log(`Loaded ${data.messages.length} previous messages`);
        } else {
          // Add default welcome message
          addMessage('bot', 'Hi there! I\'m your RealHome assistant. How can I help you with your real estate needs today?');
        }
      } else {
        // Add default welcome message
        addMessage('bot', 'Hi there! I\'m your RealHome assistant. How can I help you with your real estate needs today?');
      }
    } catch (error) {
      console.error('Error loading previous messages:', error);
      // Add default welcome message
      addMessage('bot', 'Hi there! I\'m your RealHome assistant. How can I help you with your real estate needs today?');
    }
  };
  
  // Event listeners for opening/closing the window
  button.addEventListener('click', () => {
    chatWindow.classList.toggle('open');
  });
  
  header.querySelector('.realhome-chatbot-close').addEventListener('click', () => {
    chatWindow.classList.remove('open');
  });
  
  // Send message on Enter or Send button
  const input = inputContainer.querySelector('.realhome-chatbot-input');
  const sendButton = inputContainer.querySelector('.realhome-chatbot-send');
  
  function sendMessage() {
    const message = input.value.trim();
    if (message) {
      addMessage('user', message);
      showTypingIndicator();
      input.value = '';
      
      // Call the chatbot API
      fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/chatbot-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          userId,
          visitorInfo: {
            visitorId
          },
          conversationId
        })
      })
      .then(response => response.json())
      .then(data => {
        removeTypingIndicator();
        if (data.error) {
          addMessage('bot', 'Sorry, I encountered an error. Please try again later.');
        } else {
          // Save conversation ID for future reference
          if (data.conversationId && data.conversationId !== conversationId) {
            conversationId = data.conversationId;
            localStorage.setItem(`realhome_conversation_${userId}`, conversationId);
          }
          
          // Process property links to keep them in the widget
          let processedResponse = data.response;
          
          // Fix links to use the embedded handler instead of external links
          processedResponse = processedResponse.replace(
            /\[([^\]]+)\]\(https?:\/\/[^)]+\/property\/([a-zA-Z0-9-]+)\)/g, 
            '[$1](javascript:handlePropertyClick("$2"))'
          );
          
          // Also fix any other property URLs
          processedResponse = processedResponse.replace(
            /https?:\/\/[^)\s]+\/property\/([a-zA-Z0-9-]+)/g, 
            'javascript:handlePropertyClick("$1")'
          );
          
          addMessage('bot', processedResponse);
        }
      })
      .catch(error => {
        removeTypingIndicator();
        console.error('Error:', error);
        addMessage('bot', 'Sorry, I encountered an error. Please try again later.');
      });
    }
  }
  
  input.addEventListener('keypress', event => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });
  
  sendButton.addEventListener('click', sendMessage);
  
  // Handle property link clicks in the chat
  window.handlePropertyClick = function(propertyId) {
    console.log(`Property clicked: ${propertyId}`);
    
    // Instead of navigating away, send a follow-up question about this property
    input.value = `Tell me more about this property (${propertyId})`;
    // Optional: automatically send the message
    // sendMessage();
  };
  
  // Function to add a message to the chat
  function addMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.className = `realhome-chatbot-message ${sender}`;
    
    // Process markdown in bot messages
    if (sender === 'bot') {
      // Convert markdown links
      let processedText = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" onclick="event.stopPropagation();">$1</a>');
      
      // Convert bold
      processedText = processedText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      
      // Convert line breaks
      processedText = processedText.replace(/\n/g, '<br>');
      
      messageElement.innerHTML = processedText;
    } else {
      messageElement.textContent = text;
    }
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  // Typing indicator functions
  function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'realhome-chatbot-typing';
    typingIndicator.innerHTML = `
      <div class="realhome-chatbot-message bot" style="padding: 8px 15px;">
        <div class="realhome-chatbot-typing">
          <div class="realhome-chatbot-typing-dot"></div>
          <div class="realhome-chatbot-typing-dot"></div>
          <div class="realhome-chatbot-typing-dot"></div>
        </div>
      </div>
    `;
    typingIndicator.id = 'chatbot-typing-indicator';
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  function removeTypingIndicator() {
    const typingIndicator = document.getElementById('chatbot-typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
  
  // Load settings and previous conversation
  async function loadSettings() {
    try {
      // **This URL is stripped down to only user_id and select=settings** 
      // to avoid extra query params that cause 400 Bad Request.
      const response = await fetch(
        `https://ckgaqkbsnrvccctqxsqv.supabase.co/rest/v1/chatbot_settings?user_id=eq.${userId}&select=settings`,
        {
          method: 'GET',
          headers: {
            // Must include both apikey and Authorization for Supabase
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ2Fxa2JzbnJ2Y2NjdHF4c3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMTEyODksImV4cCI6MjA1NjU4NzI4OX0.z62BR5psK8FBR5lfqbnpbFMfQLKgzFCisqDiuWg4MKM',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ2Fxa2JzbnJ2Y2NjdHF4c3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMTEyODksImV4cCI6MjA1NjU4NzI4OX0.z62BR5psK8FBR5lfqbnpbFMfQLKgzFCisqDiuWg4MKM',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          applySettings(data[0].settings);
        } else {
          console.warn('No settings found for this user ID.');
        }
      } else {
        console.error('Failed to fetch settings:', response.statusText);
      }
      
      // After settings, load previous messages
      await loadPreviousMessages();
    } catch (error) {
      console.error('Error loading chatbot settings:', error);
      // Still try to load previous messages even if settings fail
      await loadPreviousMessages();
    }
  }
  
  // This function applies the retrieved settings
  function applySettings(settings) {
    if (!settings) return;
    
    // Update position
    if (settings.position === 'left') {
      container.style.left = '20px';
      container.style.right = 'auto';
      chatWindow.style.left = '0';
      chatWindow.style.right = 'auto';
    }
    
    // Update color
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
    
    // Update chat icon
    if (settings.botIcon) {
      let iconSvg = '';
      switch (settings.botIcon) {
        case 'message-circle':
          iconSvg = '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>';
          break;
        case 'bot':
          iconSvg = '<rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line>';
          break;
        case 'headphones':
          iconSvg = '<path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>';
          break;
        case 'message-square':
          iconSvg = '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>';
          break;
        case 'brain':
          iconSvg = '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04Z\"></path><path d=\"M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2Z\"></path>';
          break;
      }
      button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>`;
    }
    
    // Update font size
    if (settings.fontSize) {
      const root = document.documentElement;
      root.style.setProperty('--realhome-chatbot-font-size', `${settings.fontSize}px`);
    }
    
    // Update bot name
    if (settings.botName) {
      header.querySelector('div:first-child').textContent = settings.botName;
    }
    
    // Update input placeholder
    if (settings.placeholderText) {
      input.placeholder = settings.placeholderText;
    }
  }
  
  // Finally, load settings when the script loads
  loadSettings();
})();
