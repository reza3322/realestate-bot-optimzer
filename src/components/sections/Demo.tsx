
import { GradientHeading } from '@/components/ui/gradient-heading';
import Chatbot from '@/components/ui/chatbot';

const Demo = () => {
  return (
    <section id="demo" className="py-20 bg-secondary/50">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <GradientHeading size="lg" variant="secondary">
            See RealHomeAI in Action
          </GradientHeading>
          <p className="text-lg text-muted-foreground mt-4">
            Try our AI assistant to see how it can help you qualify leads, engage customers,
            and recommend properties.
          </p>
        </div>
        
        <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4">
          <Chatbot 
            theme="modern"
            variation="blue"
            maxHeight="400px"
            welcomeMessage="👋 Hi there! I'm your RealHomeAI assistant. I can help you find properties, answer questions about listings, and even schedule viewings. Try asking me about available properties or how I can help with your real estate needs!"
            placeholderText="Type your message here..."
          />
        </div>
      </div>
    </section>
  );
};

export default Demo;
