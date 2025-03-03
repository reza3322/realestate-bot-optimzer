
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
  highlightColor?: string;
}

function DisplayCard({
  className,
  icon = <Sparkles className="size-4" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  iconClassName,
  titleClassName,
  highlightColor = "bg-muted/70",
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-32 w-[22rem] select-none flex-col justify-between rounded-xl border border-gray-600/20 bg-black/20 backdrop-blur-md px-5 py-3 transition-all duration-500",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("relative inline-block rounded-full p-1.5", highlightColor)}>
          {icon}
        </span>
        <p className={cn("text-base font-medium", titleClassName)}>{title}</p>
      </div>
      <p className="text-gray-400 text-base">{description}</p>
      <p className="text-gray-500 text-sm">{date}</p>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
  const defaultCards = [
    {
      className: "[grid-area:stack] z-30",
    },
    {
      className: "[grid-area:stack] translate-x-16 translate-y-10 z-20",
    },
    {
      className: "[grid-area:stack] translate-x-32 translate-y-20 z-10",
    },
  ];

  const displayCards = cards || defaultCards;

  return (
    <div className="grid [grid-template-areas:'stack'] place-items-center">
      {displayCards.map((cardProps, index) => (
        <DisplayCard key={index} {...cardProps} />
      ))}
    </div>
  );
}
