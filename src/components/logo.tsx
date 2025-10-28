
import { GraduationCap } from 'lucide-react';

export function Logo({ className, color }: { className?: string; color?: string }) {
  return (
    <div className={`flex items-center gap-2 text-primary ${className}`}>
      <GraduationCap className="h-8 w-8 text-accent" style={{ color: color }} />
      <span className="text-2xl font-bold font-headline" style={{ color: color }}>NIB Training</span>
    </div>
  );
}
