
import React, { useRef } from "react";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const [scrollYProgress, setScrollYProgress] = React.useState(0);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const containerHeight = containerRef.current.offsetHeight;
      const windowHeight = window.innerHeight;
      
      // Calculate scroll progress (value between 0 and 1)
      let progress = 1 - (containerTop / (windowHeight - containerHeight * 0.5));
      progress = Math.min(Math.max(progress, 0), 1);
      
      setScrollYProgress(progress);
    };
    
    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Call once to set initial position
    
    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Calculate rotation and scale based on scroll progress
  const rotate = 20 - (scrollYProgress * 20); // 20deg to 0deg
  const scale = isMobile ? 0.7 + (scrollYProgress * 0.2) : 1.05 - (scrollYProgress * 0.05);
  const translateY = -100 * scrollYProgress;

  return (
    <div
      className="h-[60rem] md:h-[80rem] flex items-center justify-center relative p-2 md:p-20"
      ref={containerRef}
    >
      <div
        className="py-10 md:py-40 w-full relative"
        style={{
          perspective: "1000px",
        }}
      >
        <div 
          className="max-w-5xl mx-auto text-center"
          style={{
            transform: `translateY(${translateY}px)`,
          }}
        >
          {titleComponent}
        </div>
        <div
          className="max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full border-4 border-[#6C6C6C] p-2 md:p-6 bg-[#222222] rounded-[30px] shadow-2xl"
          style={{
            transform: `rotateX(${rotate}deg) scale(${scale})`,
            boxShadow: "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
          }}
        >
          <div className="h-full w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-zinc-900 md:rounded-2xl md:p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
