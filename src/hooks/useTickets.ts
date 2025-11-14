import { useState, useEffect } from 'react';
import { ticketsService } from '../services/tickets.service';
import type { TicketWithRelations, CreateTicketInput, UpdateTicketInput, TicketFilters } from '../types/database';

export function useTickets(filters?: TicketFilters, page = 1, limit = 10) {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, [JSON.stringify(filters), page, limit]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ticketsService.getTickets(filters, page, limit);
      setTickets(result.tickets);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (input: CreateTicketInput) => {
    try {
      const newTicket = await ticketsService.createTicket(input);
      setTickets(prev => [newTicket as any, ...prev]);
      return newTicket;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create ticket');
    }
  };

  const updateTicket = async (id: string, input: UpdateTicketInput) => {
    try {
      const updatedTicket = await ticketsService.updateTicket(id, input);
      setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updatedTicket } : t));
      return updatedTicket;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update ticket');
    }
  };

  const deleteTicket = async (id: string) => {
    try {
      await ticketsService.deleteTicket(id);
      setTickets(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete ticket');
    }
  };

  const assignExecutor = async (ticketId: string, executorId: string) => {
    try {
      const updatedTicket = await ticketsService.assignExecutor(ticketId, executorId);
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updatedTicket } : t));
      return updatedTicket;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to assign executor');
    }
  };

  const updateStatus = async (ticketId: string, status: string) => {
    try {
      const updatedTicket = await ticketsService.updateStatus(ticketId, status);
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updatedTicket } : t));
      return updatedTicket;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return {
    tickets,
    total,
    totalPages,
    loading,
    error,
    fetchTickets,
    createTicket,
    updateTicket,
    deleteTicket,
    assignExecutor,
    updateStatus,
  };
}

export function useTicket(id: string) {
  const [ticket, setTicket] = useState<TicketWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTicket();
    }
  }, [id]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ticketsService.getTicketById(id);
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket');
    } finally {
      setLoading(false);
    }
  };

  return {
    ticket,
    loading,
    error,
    refetch: fetchTicket,
  };
}
