const defaultStyles = {
  container: "relative w-full max-w-md rounded-md border border-border bg-card text-card-foreground shadow-sm",
  header: "flex items-center justify-between py-2 px-4 border-b border-border",
  title: "text-sm font-semibold",
  closeButton: "h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
  messages: "flex flex-col gap-3 p-4",
  userBubble: "col-start-1 rounded-md bg-secondary text-card p-2 w-fit max-w-[80%]",
  botBubble: "col-start-1 rounded-md bg-muted text-card-foreground p-2 w-fit max-w-[80%]",
  userIcon: "col-start-2 row-start-1 h-6 w-6",
  botIcon: "col-start-1 row-start-1 h-6 w-6",
  inputArea: "py-2 px-4 border-t border-border",
  input: "flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  button: "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-secondary h-10 px-4 ml-2",
};

const darkStyles = {
  container: "relative w-full max-w-md rounded-md border border-neutral-800 bg-neutral-950 text-white shadow-sm",
  header: "flex items-center justify-between py-2 px-4 border-b border-neutral-800",
  title: "text-sm font-semibold",
  closeButton: "h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
  messages: "flex flex-col gap-3 p-4",
  userBubble: "col-start-1 rounded-md bg-neutral-700 text-white p-2 w-fit max-w-[80%]",
  botBubble: "col-start-1 rounded-md bg-neutral-800 text-white p-2 w-fit max-w-[80%]",
  userIcon: "col-start-2 row-start-1 h-6 w-6",
  botIcon: "col-start-1 row-start-1 h-6 w-6",
  inputArea: "py-2 px-4 border-t border-neutral-800",
  input: "flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white",
  button: "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-secondary h-10 px-4 ml-2 text-white",
};

const modernStyles = {
  container: "relative w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-md overflow-hidden",
  header: "flex items-center justify-center py-4 bg-primary text-primary-foreground",
  title: "text-lg font-semibold",
  closeButton: "absolute top-2 right-2 h-7 w-7 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
  messages: "flex flex-col gap-4 p-5",
  userBubble: "rounded-xl bg-primary/10 text-card p-3 w-fit max-w-[80%] col-start-1",
  botBubble: "rounded-xl bg-secondary/10 text-card-foreground p-3 w-fit max-w-[80%] col-start-1",
  userIcon: "col-start-2 row-start-1 h-8 w-8 rounded-full",
  botIcon: "col-start-1 row-start-1 h-8 w-8 rounded-full",
  inputArea: "py-4 px-5 border-t border-border bg-secondary/5",
  input: "flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  button: "inline-flex items-center justify-center rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-secondary h-11 px-5 ml-3",
};

const minimalStyles = {
  container: "relative w-full max-w-md rounded-md bg-transparent text-card-foreground",
  header: "flex items-center justify-between py-2 px-3",
  title: "text-sm font-medium",
  closeButton: "h-5 w-5 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
  messages: "flex flex-col gap-2 p-3",
  userBubble: "col-start-1 rounded-md bg-accent text-accent-foreground p-2 w-fit max-w-[80%]",
  botBubble: "col-start-1 rounded-md bg-muted text-card-foreground p-2 w-fit max-w-[80%]",
  userIcon: "col-start-2 row-start-1 h-5 w-5",
  botIcon: "col-start-1 row-start-1 h-5 w-5",
  inputArea: "py-2 px-3",
  input: "flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  button: "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-secondary h-9 px-3 ml-2",
};

// Additional styles to be added to the global CSS
const globalChatStyles = `
.chatbot-message {
  line-height: 1.5;
}

.chatbot-message p {
  margin-bottom: 0.75rem;
}

.chatbot-message a {
  color: #3b82f6;
  text-decoration: underline;
  font-weight: 500;
  transition: color 0.2s;
}

.chatbot-message a:hover {
  color: #2563eb;
}

/* Emoji spacing */
.chatbot-message p:has(img.emoji) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Property listing styling */
.chatbot-message p:has(strong:first-child) {
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}
`;

// Export the styles
export { defaultStyles, darkStyles, modernStyles, minimalStyles, globalChatStyles };
