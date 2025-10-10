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
import { Button } from '@/components/ui/button';
import type { Course } from '@/lib/data';

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link href={`/courses/${course.id}`} className="block h-full transition-transform hover:scale-[1.02]">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-xl">
        <CardHeader className="p-0">
          <div className="relative aspect-video">
            <Image
              src={course.image.imageUrl}
              alt={course.image.description}
              fill
              className="object-cover"
              data-ai-hint={course.image.imageHint}
            />
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
