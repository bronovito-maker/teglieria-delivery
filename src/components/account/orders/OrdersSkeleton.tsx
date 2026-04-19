export default function OrdersSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-28 bg-zinc-200 rounded-full mb-3" />
        <div className="h-8 w-40 bg-zinc-200 rounded-full mb-4" />
        <div className="h-20 w-full bg-zinc-100 rounded-[1.5rem] mb-3" />
        <div className="h-2 w-full bg-zinc-100 rounded-full mb-2" />
        <div className="h-2 w-3/4 bg-zinc-100 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="h-4 w-32 bg-zinc-200 rounded-full mb-3" />
          <div className="h-3 w-full bg-zinc-100 rounded-full mb-2" />
          <div className="h-3 w-4/5 bg-zinc-100 rounded-full" />
        </div>
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="h-4 w-24 bg-zinc-200 rounded-full mb-3" />
          <div className="h-3 w-full bg-zinc-100 rounded-full mb-2" />
          <div className="h-3 w-3/4 bg-zinc-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}
