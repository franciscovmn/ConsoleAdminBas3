// src/components/DashboardLayout.tsx
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, Menu, BarChart3, Activity } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const NavContent = () => {
  const { user, signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Activity },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center h-16 px-6 border-b border-border">
        {/* Substituição do texto "bas3" pela logo */}
        <img src="/logo.png" alt="bas3 logo" className="h-8 w-auto" />
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email}
              </p>
              <p className="text-xs text-muted-foreground">Nutricionista</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="ml-2 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export const DashboardLayout = () => {
  return (
    <div className="min-h-screen w-full flex bg-gradient-subtle">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64 lg:flex lg:flex-col lg:bg-card lg:border-r lg:border-border">
        <NavContent />
      </div>

      {/* Main content area */}
      <div className="flex flex-col w-full lg:pl-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
          {/* Substituição do texto "bas3" pela logo no cabeçalho móvel */}
          <img src="/logo.png" alt="bas3 logo" className="h-14 w-auto" />
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};