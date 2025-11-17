import { useState, useEffect } from 'react';
import { executorsService } from '../services/executors.service';
import type { ExecutorWithUser } from '../types/database';

export function useExecutors() {
  const [executors, setExecutors] = useState<ExecutorWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExecutors();
  }, []);

  const fetchExecutors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await executorsService.getExecutors();
      setExecutors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch executors');
    } finally {
      setLoading(false);
    }
  };

  return {
    executors,
    loading,
    error,
    refetch: fetchExecutors,
  };
}
