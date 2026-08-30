import React from 'react';

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-300 rounded ${className}`}></div>
);

export const DocumentSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <Skeleton className="h-8 w-20" />
  </div>
);

export const ChatSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-16 w-full" />
    <Skeleton className="h-16 w-4/5 ml-auto" />
    <Skeleton className="h-16 w-full" />
  </div>
);

export const SearchSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    ))}
  </div>
);
