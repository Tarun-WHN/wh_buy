export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1B2A4A]">
            <span className="text-lg font-bold text-white">N</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#1B2A4A]">
            NOW-BUY
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Enterprise Procurement Platform
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
