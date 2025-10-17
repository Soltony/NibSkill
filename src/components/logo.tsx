import { GraduationCap } from 'lucide-react';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-primary ${className}`}>
      <GraduationCap className="h-8 w-8 text-accent" />
      <span className="text-2xl font-bold font-headline">NIB Training</span>
    </div>
  );
}
