import { createContext, useContext, useState, ReactNode } from 'react';

type TenantContextType = {
  activeTenantId: string | null;
  setActiveTenantId: (id: string | null) => void;
};

const TenantContext = createContext<TenantContextType>({
  activeTenantId: null,
  setActiveTenantId: () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  return (
    <TenantContext.Provider value={{ activeTenantId, setActiveTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}

