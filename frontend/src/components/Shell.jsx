export default function Shell({ children }) {
  return (
    <div className="min-h-screen sm:flex sm:items-center sm:justify-center sm:bg-ink">
      <div className="mx-auto flex h-screen max-w-[480px] flex-col overflow-hidden bg-bg shadow-lg2 sm:h-[min(900px,95vh)] sm:rounded-[40px]">
        {children}
      </div>
    </div>
  );
}
