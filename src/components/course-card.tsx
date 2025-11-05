
"use client"

import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { usePathname } from 'next/navigation';
import type { Course, Product, Currency, TrainingProvider } from '@prisma/client';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { Building2, Lock } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from '@/lib/utils';

type CourseWithRelations = Course & { 
  progress: number;
  product: Product | null;
  trainingProvider: TrainingProvider | null;
  isLocked: boolean;
  learningPathId?: string;
};

export function CourseCard({ course }: { course: CourseWithRelations }) {
  const pathname = usePathname();
  const isAdminView = pathname.startsWith('/admin');
  
  // If locked, link to the learning path. Otherwise, link to the course.
  const courseLink = course.isLocked && course.learningPathId && !isAdminView
    ? `/learning-paths/${course.learningPathId}`
    : isAdminView
    ? `/admin/courses/${course.id}`
    : `/courses/${course.id}`;

  const displayImageUrl = course.imageUrl ?? course.product?.imageUrl;
  const displayImageHint = course.imageHint ?? course.product?.imageHint;
  const displayImageDescription = course.imageDescription ?? course.product?.description;

  const getCurrencySymbol = (currency: Currency | null | undefined) => {
    if (currency === 'USD') return '$';
    if (currency === 'ETB') return 'Br';
    return '';
  }

  const Wrapper = course.isLocked ? TooltipTrigger : 'div';

  return (
    <TooltipProvider>
      <Tooltip>
        <Wrapper>
          <Link href={courseLink} className={cn("block h-full transition-transform", course.isLocked ? "pointer-events-auto" : "hover:scale-[1.02]")}>
            <Card className={cn(
                "flex h-full flex-col overflow-hidden transition-shadow hover:shadow-xl",
                course.isLocked && !isAdminView && "opacity-60 bg-muted/50 pointer-events-none"
            )}>
              <CardHeader className="p-0">
                <div className="relative aspect-video">
                  {displayImageUrl ? (
                    <Image
                      src={displayImageUrl}
                      alt={displayImageDescription ?? ''}
                      fill
                      className="object-cover"
                      data-ai-hint={displayImageHint ?? ''}
                    />
                  ) : (
                    <Skeleton className="h-full w-full" />
                  )}
                  {course.isPaid && course.price && (
                    <Badge className="absolute top-2 right-2" variant="secondary">
                      {getCurrencySymbol(course.currency)}{course.price.toFixed(2)}
                    </Badge>
                  )}
                   {course.isLocked && !isAdminView && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-secondary/80 text-secondary-foreground backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold">
                      <Lock className="h-3 w-3" />
                      Locked
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col p-4">
                <CardTitle className="mb-2 font-headline text-lg leading-tight">
                  {course.title}
                </CardTitle>
                <CardDescription className="text-sm line-clamp-2">
                  {course.description}
                </CardDescription>
                {course.trainingProvider && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{course.trainingProvider.name}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-2 p-4 pt-0">
                <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{course.progress}%</span>
                </div>
                <Progress value={course.progress} className="h-2 w-full" />
              </CardFooter>
            </Card>
          </Link>
        </Wrapper>
        {course.isLocked && !isAdminView && (
            <TooltipContent>
                <p>Complete prerequisite courses in the learning path to unlock.</p>
            </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
