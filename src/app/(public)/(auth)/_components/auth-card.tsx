import { Eyebrow } from "@/components/shared/eyebrow";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="w-full max-w-md shadow-sm ring-border [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="gap-3">
        <Eyebrow>{eyebrow}</Eyebrow>
        <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</CardTitle>
        {description && <CardDescription className="text-base">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && (
        <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>
      )}
    </Card>
  );
}
