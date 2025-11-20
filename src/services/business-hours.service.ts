import { supabase } from '../lib/supabase';

export interface BusinessHour {
  id: string;
  tenant_id: string;
  day_of_week: string;
  is_working_day: boolean;
  start_time: string | null;
  end_time: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  tenant_id: string;
  date: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const businessHoursService = {
  async getAll(tenantId: string | null): Promise<BusinessHour[]> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('day_of_week', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async upsertWorkingHours(
    tenantId: string | null,
    workingHours: Array<{
      day_of_week: string;
      is_working_day: boolean;
      start_time: string | null;
      end_time: string | null;
    }>,
    timezone: string
  ): Promise<void> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Delete existing business hours for this tenant
    const { error: deleteError } = await supabase
      .from('business_hours')
      .delete()
      .eq('tenant_id', tenantId);

    if (deleteError) throw deleteError;

    // Insert new business hours
    const hoursToInsert = workingHours.map((hour) => ({
      tenant_id: tenantId,
      day_of_week: hour.day_of_week,
      is_working_day: hour.is_working_day,
      start_time: hour.is_working_day ? hour.start_time : null,
      end_time: hour.is_working_day ? hour.end_time : null,
      timezone: timezone,
    }));

    const { error: insertError } = await supabase
      .from('business_hours')
      .insert(hoursToInsert);

    if (insertError) throw insertError;
  },

  async getAllHolidays(tenantId: string | null): Promise<Holiday[]> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createHoliday(
    tenantId: string | null,
    holiday: { date: string; name: string }
  ): Promise<Holiday> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const { data, error } = await supabase
      .from('holidays')
      .insert({
        tenant_id: tenantId,
        date: holiday.date,
        name: holiday.name,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteHoliday(holidayId: string): Promise<void> {
    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', holidayId);

    if (error) throw error;
  },
};

