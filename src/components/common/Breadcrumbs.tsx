import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const location = useLocation();

  // If items not provided, construct from pathname
  const pathnames = location.pathname.split('/').filter(x => x);

  const crumbs: BreadcrumbItem[] = items || pathnames.map((segment, idx) => {
    const href = `/${pathnames.slice(0, idx + 1).join('/')}`;
    const label = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    return { label, href: idx === pathnames.length - 1 ? undefined : href };
  });

  return (
    <nav className="flex items-center text-xs font-medium text-slate-500 mb-4" aria-label="Breadcrumb">
      <Link to="/" className="flex items-center hover:text-navy-900 transition-colors">
        <Home className="w-3.5 h-3.5 mr-1" />
        <span>Portal</span>
      </Link>
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400" />
          {crumb.href ? (
            <Link to={crumb.href} className="hover:text-navy-900 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-semibold">{crumb.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
