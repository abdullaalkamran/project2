"use client";

import { ReactNode } from "react";
import { PackageOpen } from "lucide-react";

interface EmptyProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function Empty({
  title = "Nothing here",
  description,
  icon,
  action,
}: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div className="text-gray-300">
        {icon ?? <PackageOpen size={56} strokeWidth={1.2} />}
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-600">{title}</p>
        {description && (
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
