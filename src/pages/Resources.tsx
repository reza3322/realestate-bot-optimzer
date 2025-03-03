
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/sections/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight } from 'lucide-react';

const resources = [
  {
    title: "Getting Started with RealHomeAI",
    description: "Learn how to set up your RealHomeAI account and start automating your real estate business.",
    link: "#",
    type: "Guide"
  },
  {
    title: "Customizing Your Chatbot",
    description: "Discover how to customize the appearance and behavior of your AI chatbot to match your brand.",
    link: "#",
    type: "Tutorial"
  },
  {
    title: "Lead Qualification Best Practices",
    description: "Tips and strategies for optimizing your chatbot to qualify leads more effectively.",
    link: "#",
    type: "Guide"
  },
  {
    title: "Property Matching Engine",
    description: "How RealHomeAI's property matching technology works to connect buyers with their ideal homes.",
    link: "#",
    type: "Whitepaper"
  },
  {
    title: "Client Success Story: Coastal Homes",
    description: "How Coastal Homes increased conversions by 45% using RealHomeAI's chatbot.",
    link: "#",
    type: "Case Study"
  },
  {
    title: "AI in Real Estate: Future Trends",
    description: "Exploring the evolving role of AI technology in the real estate industry.",
    link: "#",
    type: "Research"
  }
];

const Resources = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="pt-24 pb-20">
        <section className="py-12">
          <div className="container px-4 mx-auto">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Resources</h1>
              <p className="text-lg text-muted-foreground">
                Helpful guides, tutorials and case studies to get the most out of RealHomeAI
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {resources.map((resource, index) => (
                <Card key={index} className="transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="text-sm text-muted-foreground mb-2">{resource.type}</div>
                    <CardTitle>{resource.title}</CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="ghost" className="ml-auto group" asChild>
                      <a href={resource.link}>
                        Read More 
                        <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Resources;
