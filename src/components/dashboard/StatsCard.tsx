import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const variantStyles = {
  default: 'bg-card text-card-foreground',
  primary: 'stats-card-gradient',
  success: 'success-card-gradient',
  warning: 'warning-card-gradient',
  destructive: 'bg-gradient-to-br from-destructive to-red-400 text-white',
};

export default function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        'card-stats border-0 overflow-hidden',
        variantStyles[variant],
        className
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className={cn(
            'text-sm font-medium',
            variant === 'default' ? 'text-muted-foreground' : 'text-current opacity-90'
          )}>
            {title}
          </CardTitle>
          <div className={cn(
            'p-2 rounded-lg',
            variant === 'default' 
              ? 'bg-primary/10 text-primary' 
              : 'bg-white/20 text-current backdrop-blur-sm'
          )}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn(
            'text-2xl font-bold',
            variant === 'default' ? 'text-foreground' : 'text-current'
          )}>
            {value}
          </div>
          {trend && (
            <div className="flex items-center pt-2">
              <span className={cn(
                'text-xs font-medium',
                variant === 'default' ? 'text-muted-foreground' : 'text-current opacity-80'
              )}>
                {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}