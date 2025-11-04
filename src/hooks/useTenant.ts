import { createContext, useContext, useState } from 'react';

type TenantContextValue = {
  activeTenantId: string | null;
  setActiveTenantId: (id: string | null) => void;
};

const TenantContext = createContext<TenantContextValue>({
  activeTenantId: null,
  setActiveTenantId: () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  return (
    <TenantContext.Provider value={{ activeTenantId, setActiveTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}



