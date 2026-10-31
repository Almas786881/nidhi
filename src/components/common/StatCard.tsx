import React from 'react';
import { cn } from '@/utils/cn';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'positive' | 'warning' | 'negative' | 'neutral';
  color?: 'blue' | 'navy' | 'teal' | 'amber' | 'rose' | 'purple' | 'emerald';
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = 'neutral',
  color = 'navy',
  onClick,
  className,
}) => {
  const colorMap = {
    navy: 'text-navy-900 bg-navy-50 border-navy-100',
    blue: 'text-blue-700 bg-blue-50 border-blue-100',
    teal: 'text-teal-700 bg-teal-50 border-teal-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    rose: 'text-rose-700 bg-rose-50 border-rose-100',
    purple: 'text-purple-700 bg-purple-50 border-purple-100',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  };

  const iconBgMap = {
    navy: 'bg-navy-900 text-white',
    blue: 'bg-blue-600 text-white',
    teal: 'bg-teal-600 text-white',
    amber: 'bg-amber-600 text-white',
    rose: 'bg-rose-600 text-white',
    purple: 'bg-purple-600 text-white',
    emerald: 'bg-emerald-600 text-white',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-slate-200 p-5 shadow-sm transition-all duration-200',
        onClick && 'cursor-pointer hover:border-slate-300 hover:shadow-md active:scale-[0.99]',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className={cn('p-3 rounded-lg shadow-sm', iconBgMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs">
          <span
            className={cn(
              'font-medium',
              trendType === 'positive' && 'text-emerald-600',
              trendType === 'warning' && 'text-amber-600',
              trendType === 'negative' && 'text-rose-600',
              trendType === 'neutral' && 'text-slate-500'
            )}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  );
};
