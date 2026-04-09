export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen bg-background flex flex-col pt-16">
      <div className="max-w-7xl mx-auto w-full flex-1 p-6 lg:p-12">
         {children}
      </div>
    </div>
  );
}
