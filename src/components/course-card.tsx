

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
import type { Course, Product } from '@prisma/client';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';

type CourseWithProgressAndProduct = Course & { 
  progress: number,
  product: Product | null;
};

export function CourseCard({ course }: { course: CourseWithProgressAndProduct }) {
  const pathname = usePathname();
  const isAdminView = pathname.startsWith('/admin');
  const courseLink = isAdminView ? `/admin/courses/${course.id}` : `/courses/${course.id}`;

  const displayImageUrl = course.imageUrl ?? course.product?.imageUrl;
  const displayImageHint = course.imageHint ?? course.product?.imageHint;
  const displayImageDescription = course.imageDescription ?? course.product?.description;

  return (
    <Link href={courseLink} className="block h-full transition-transform hover:scale-[1.02]">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-xl">
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
                ${course.price.toFixed(2)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col p-4">
          <CardTitle className="mb-2 font-headline text-lg leading-tight">
            {course.title}
          </CardTitle>
          <CardDescription className="text-sm">
            {course.description}
          </CardDescription>
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
  );
}
