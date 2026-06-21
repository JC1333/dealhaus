"use client";

type AppSidebarProps = {
  activeWorkspace: string;
  setActiveWorkspace: (workspace: string) => void;
};

export default function AppSidebar({
  activeWorkspace,
  setActiveWorkspace,
}: AppSidebarProps) {
  const navItems = [
    { key: "global", label: "Global Hub" },
    { key: "dashboard", label: "Operations Dashboard" },
    { key: "conversations", label: "AI Conversations" },
    { key: "deals", label: "Active Deals" },
    { key: "revenue", label: "Revenue Analytics" },
    { key: "ingestion", label: "Marketplace Ingestion" },
  ];

  return (
    <aside className="w-full lg:w-72 lg:min-h-screen border-b lg:border-b-0 lg:border-r border-zinc-800 p-4 bg-zinc-950">
      <h1 className="text-4xl lg:text-5xl font-black mb-8 tracking-tight leading-tight">
        DealHaus AI
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 text-zinc-300">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveWorkspace(item.key)}
            className={`w-full text-left bg-zinc-900 p-4 rounded-2xl border transition ${
              activeWorkspace === item.key
                ? "border-cyan-500 text-white"
                : "border-zinc-800 hover:border-cyan-500"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  );
}