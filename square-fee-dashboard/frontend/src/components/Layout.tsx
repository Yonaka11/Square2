import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ title, subtitle, actions, children }: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">{actions}</div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
