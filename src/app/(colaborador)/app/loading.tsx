import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  );
}
