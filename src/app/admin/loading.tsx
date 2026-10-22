export default function AdminLoading() {
  return <div className="animate-pulse space-y-6" aria-label="Loading admin dashboard">
    <div className="h-9 w-72 rounded-xl bg-white/10" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-32 rounded-3xl bg-white/5" />)}</div>
    <div className="h-80 rounded-3xl bg-white/5" />
  </div>;
}
