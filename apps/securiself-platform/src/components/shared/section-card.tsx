import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function SectionCard({
  title,
  description,
  icon,
  actions,
  footer,
  className,
  contentClassName,
  children,
}: SectionCardProps) {
  return (
    <Card className={className}>
      {title || description || actions ? (
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {icon ? (
                <div className="mt-0.5 text-muted-foreground">{icon}</div>
              ) : null}
              <div className="space-y-1">
                {title ? <CardTitle>{title}</CardTitle> : null}
                {description ? (
                  <CardDescription>{description}</CardDescription>
                ) : null}
              </div>
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn(contentClassName)}>{children}</CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}
