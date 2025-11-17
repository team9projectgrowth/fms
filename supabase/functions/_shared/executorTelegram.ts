import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4';

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
  reply_to_message?: TelegramMessage;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface ExecutorContext {
  chatId: number;
  chatIdStr: string;
  userId: string;
  executorProfileId?: string | null;
  tenantId?: string | null;
  fullName?: string | null;
}

export interface TicketRecord {
  id: string;
  ticket_number: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  location: string | null;
  sla_due_date?: string | null;
  tenant_id?: string | null;
  executor_profile_id?: string | null;
  executor_id?: string | null;
  created_at?: string | null;
}

interface TicketActivityInsert {
  ticket_id: string;
  tenant_id?: string | null;
  activity_type: string;
  comment: string;
  created_by?: string;
  metadata?: Record<string, unknown>;
}

export function isExecutorTelegramUpdate(payload: unknown): payload is TelegramUpdate {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      ('update_id' in payload || 'message' in payload || 'callback_query' in payload),
  );
}

export async function handleExecutorTelegramUpdate(
  update: TelegramUpdate,
  supabase: SupabaseClient,
  telegramBotToken: string,
): Promise<void> {
  try {
    if (update.callback_query) {
      console.log('[executor-webhook] Received callback query', {
        data: update.callback_query.data,
        messageId: update.callback_query.message?.message_id,
      });
      await handleCallbackQuery(update.callback_query, supabase, telegramBotToken);
      return;
    }

    if (update.message) {
      console.log('[executor-webhook] Received message', {
        messageId: update.message.message_id,
        hasReply: Boolean(update.message.reply_to_message),
        chatId: update.message.chat.id,
        text: update.message.text,
      });
      await handleIncomingMessage(update.message, supabase, telegramBotToken);
    }
  } catch (error) {
    console.error('[executor-webhook] Error handling Telegram update', error);
  }
}

async function handleIncomingMessage(
  message: TelegramMessage,
  supabase: SupabaseClient,
  token: string,
): Promise<void> {
  const chatId = message.chat.id;
  const text = (message.text ?? '').trim();

  if (!text) {
    return;
  }

  const lower = text.toLowerCase();

  if (lower.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const tokenValue = parts.length > 1 ? parts[1]?.trim() : '';

    if (tokenValue) {
      try {
        await completeOnboardingHandshake({
          correlationId: tokenValue,
          chatId,
          telegramUserId: message.from?.id,
          messageDate: message.date,
        });
        await safeSendMessage(
          token,
          chatId,
          '✅ You are now connected to the executor bot. Send /mytickets to view your assigned tickets.',
        );
      } catch (err) {
        console.error('[executor-webhook] Failed to complete onboarding handshake', err);
        await safeSendMessage(
          token,
          chatId,
          '⚠️ We could not complete your onboarding. Please request a fresh invite from your administrator.',
        );
      }
      return;
    }

    // For existing users, /start should act as an informational hint only.
    await safeSendMessage(
      token,
      chatId,
      'You are already connected. Send /mytickets to view your assigned tickets.',
    );
    return;
  }

  const context = await getExecutorContext(chatId, supabase);

  if (!context) {
    await safeSendMessage(
      token,
      chatId,
      `We could not find your executor account (chat id: ${String(chatId)}). If you haven’t onboarded yet, please use the invite link sent to your email.`,
    );
    return;
  }

  const handled = await handleUpdateSessionMessage(message, context, supabase, token);
  if (handled) {
    return;
  }

  if (lower.startsWith('/mytickets')) {
    await sendTicketList(context, supabase, token);
    return;
  }

  await safeSendMessage(token, chatId, 'Send /mytickets to view your assigned tickets, or update tickets from the dashboard.');
}

async function handleUpdateSessionMessage(
  message: TelegramMessage,
  context: ExecutorContext,
  supabase: SupabaseClient,
  token: string,
): Promise<boolean> {
  const replyToId = message.reply_to_message?.message_id ?? null;

  let sessionQuery = supabase
    .from('executor_ticket_sessions')
    .select('*')
    .eq('telegram_chat_id', context.chatIdStr)
    .eq('state', 'awaiting_input')
    .order('created_at', { ascending: false })
    .limit(1);

  if (replyToId !== null) {
    sessionQuery = sessionQuery.eq('prompt_message_id', replyToId);
  }

  const { data: sessions, error: sessionError } = await sessionQuery;

  if (sessionError) {
    console.error('[executor-webhook] Failed to fetch session for message', sessionError);
    return false;
  }

  const session = Array.isArray(sessions) ? sessions[0] : sessions ?? null;

  if (!session) {
    return false;
  }

  if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
    await supabase.from('executor_ticket_sessions').update({ state: 'expired' }).eq('id', session.id);
    await safeSendMessage(token, context.chatId, 'This update session has expired. Please tap "Update" on the ticket again.');
    return true;
  }

  const ticket = await fetchTicketById(session.ticket_id, supabase);
  if (!ticket) {
    await safeSendMessage(token, context.chatId, 'Unable to find this ticket. It may have been closed.');
    await supabase.from('executor_ticket_sessions').update({ state: 'cancelled' }).eq('id', session.id);
    return true;
  }

  const comment = (message.text ?? '').trim();
  if (!comment) {
    await safeSendMessage(token, context.chatId, 'Please send a text update or tap cancel.');
    return true;
  }

  console.log('[executor-webhook] Capturing update comment', {
    ticketId: ticket.id,
    sessionId: session.id,
    comment,
  });

  await insertTicketActivity(supabase, {
    ticket_id: ticket.id,
    tenant_id: ticket.tenant_id,
    activity_type: 'executor_update',
    comment,
    created_by: context.userId,
    metadata: {
      source: 'telegram_bot',
      session_id: session.id,
    },
  });

  await supabase.from('executor_ticket_sessions').update({ state: 'completed' }).eq('id', session.id);

  await safeSendMessage(token, context.chatId, `Update captured for ticket ${ticket.ticket_number ?? ''}. Thank you!`);

  return true;
}

async function handleReplyToPrompt(
  message: TelegramMessage,
  context: ExecutorContext,
  supabase: SupabaseClient,
  token: string,
): Promise<boolean> {
  // deprecated; use handleUpdateSessionMessage directly
  return handleUpdateSessionMessage(message, context, supabase, token);
}

async function handleCallbackQuery(
  callback: TelegramCallbackQuery,
  supabase: SupabaseClient,
  token: string,
): Promise<void> {
  const message = callback.message;
  if (!message?.message_id) {
    return;
  }

  const chatId = message.chat.id;
  const context = await getExecutorContext(chatId, supabase);
  if (!context) {
    await answerCallbackQuery(token, callback.id, 'Executor account not found.');
    return;
  }

  const data = callback.data ?? '';
  const [action, ticketId] = data.split('|');

  if (!action || !ticketId) {
    await answerCallbackQuery(token, callback.id, 'Action not recognized.');
    return;
  }

  if (action === 'noop') {
    await answerCallbackQuery(token, callback.id, 'Already updated.');
    return;
  }

  const ticket = await fetchTicketById(ticketId, supabase);
  if (!ticket) {
    await answerCallbackQuery(token, callback.id, 'Ticket not found.');
    return;
  }

  if (!isTicketAssignedToExecutor(ticket, context)) {
    await answerCallbackQuery(token, callback.id, 'You are not assigned to this ticket.');
    return;
  }

  switch (action) {
    case 'status_in_progress':
      await setTicketStatus(ticket, 'in-progress', context, callback, message, supabase, token);
      break;
    case 'status_resolved':
      await setTicketStatus(ticket, 'resolved', context, callback, message, supabase, token);
      break;
    case 'update':
      await startUpdateSession(ticket, context, callback, message, supabase, token);
      break;
    default:
      await answerCallbackQuery(token, callback.id, 'Unknown action.');
  }
}

interface OnboardingCallbackOptions {
  correlationId: string;
  chatId: number;
  telegramUserId?: number;
  messageDate?: number;
}

async function completeOnboardingHandshake(options: OnboardingCallbackOptions): Promise<void> {
  const { correlationId, chatId, telegramUserId, messageDate } = options;
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const authToken =
    Deno.env.get('MAKE_ONBOARDING_CALLBACK_TOKEN') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is not configured for onboarding callback.');
  }

  if (!authToken) {
    throw new Error('No authorization token configured for onboarding callback.');
  }

  const callbackUrl = `${supabaseUrl}/functions/v1/user-onboarding-callback`;
  const joinedAtIso = messageDate
    ? new Date(messageDate * 1000).toISOString()
    : new Date().toISOString();

  const payload = {
    correlation_id: correlationId,
    chat_id: String(chatId),
    telegram_user_id: String(telegramUserId ?? chatId),
    joined_at: joinedAtIso,
    status: 'completed',
  };

  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Onboarding callback failed (${response.status}): ${bodyText}`);
  }
}

async function getExecutorContext(chatId: number, supabase: SupabaseClient): Promise<ExecutorContext | null> {
  const chatIdStr = String(chatId);
  const chatIdNum = Number(chatId);

  let user: any = null;
  let userError: any = null;

  console.log('[executor-webhook] Incoming chatId', chatId, chatIdStr);

  if (!Number.isNaN(chatIdNum)) {
    const result = await supabase
      .from('users')
      .select('id, tenant_id, role, full_name, telegram_chat_id')
      .eq('telegram_chat_id', chatIdNum)
      .maybeSingle();
    user = result.data;
    userError = result.error;
    if (user) {
      console.log('[executor-webhook] Matched user by numeric chat_id', user.id);
    }
  }

  if (!user && !userError) {
    const result = await supabase
      .from('users')
      .select('id, tenant_id, role, full_name, telegram_chat_id')
      .eq('telegram_chat_id', chatIdStr)
      .maybeSingle();
    user = result.data;
    userError = result.error;
    if (user) {
      console.log('[executor-webhook] Matched user by string chat_id', user.id);
    }
  }

  if (!user && !userError) {
    const result = await supabase
      .from('users')
      .select('id, tenant_id, role, full_name, telegram_chat_id, telegram_user_id')
      .eq('telegram_user_id', chatIdStr)
      .maybeSingle();
    user = result.data;
    userError = result.error;
    if (user) {
      console.log('[executor-webhook] Matched user by telegram_user_id', user.id);
    }
  }

  if (userError) {
    console.error('[executor-webhook] Failed to fetch user for chat', chatIdStr, userError);
    return null;
  }

  if (!user || user.role !== 'executor') {
    console.warn('[executor-webhook] User not found or not executor for chat', chatIdStr);
    return null;
  }

  const { data: executorProfile, error: profileError } = await supabase
    .from('executor_profiles')
    .select('id, tenant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[executor-webhook] Failed to fetch executor profile', profileError);
  }

  if (!executorProfile) {
    console.warn('[executor-webhook] No executor profile for user', user.id);
  }

  return {
    chatId,
    chatIdStr,
    userId: user.id,
    executorProfileId: executorProfile?.id ?? null,
    tenantId: executorProfile?.tenant_id ?? user.tenant_id ?? null,
    fullName: user.full_name ?? null,
  };
}

async function sendTicketList(context: ExecutorContext, supabase: SupabaseClient, token: string): Promise<void> {
  const tickets = await fetchExecutorTickets(context, supabase);

  if (!tickets.length) {
    await safeSendMessage(token, context.chatId, 'No open tickets assigned to you right now. Great work!');
    return;
  }

  await safeSendMessage(
    token,
    context.chatId,
    `You have ${tickets.length} ticket(s) awaiting attention. Select an action below:`,
  );

  for (const ticket of tickets) {
    const message = formatTicketMessage(ticket);
    const keyboard = buildTicketKeyboard(ticket);
    await safeSendMessage(token, context.chatId, message, keyboard);
  }
}

async function fetchExecutorTickets(context: ExecutorContext, supabase: SupabaseClient): Promise<TicketRecord[]> {
  let query = supabase
    .from('tickets')
    .select(
      'id, ticket_number, title, description, status, priority, category, location, sla_due_date, tenant_id, executor_profile_id, executor_id, created_at',
    )
    .in('status', ['open', 'in-progress'])
    .order('status', { ascending: true })
    .order('created_at', { ascending: true });

  if (context.executorProfileId && context.userId) {
    query = query.or(`executor_profile_id.eq.${context.executorProfileId},executor_id.eq.${context.userId}`);
  } else if (context.executorProfileId) {
    query = query.eq('executor_profile_id', context.executorProfileId);
  } else {
    query = query.eq('executor_id', context.userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[executor-webhook] Failed to fetch tickets for executor', error);
    return [];
  }

  return (data ?? []) as TicketRecord[];
}

function formatTicketMessage(ticket: TicketRecord): string {
  const lines = [
    `Ticket ${ticket.ticket_number ?? ticket.id}`,
    ticket.title ?? '',
    `Status: ${formatStatus(ticket.status)}`,
    `Priority: ${ticket.priority}`,
  ];

  if (ticket.location) {
    lines.push(`Location: ${ticket.location}`);
  }

  const due = ticket.sla_due_date;
  if (due) {
    lines.push(`SLA: ${formatDateTime(due)}`);
  }

  return lines.filter(Boolean).join('\n');
}

function buildTicketKeyboard(ticket: TicketRecord) {
  const rows: { text: string; callback_data: string }[][] = [];

  if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
    const statusRow: { text: string; callback_data: string }[] = [];
    if (ticket.status !== 'in-progress') {
      statusRow.push({
        text: 'In Progress',
        callback_data: `status_in_progress|${ticket.id}`,
      });
    } else {
      statusRow.push({
        text: 'In Progress ✅',
        callback_data: `noop|${ticket.id}`,
      });
    }

    statusRow.push({
      text: 'Resolved',
      callback_data: `status_resolved|${ticket.id}`,
    });

    rows.push(statusRow);
    rows.push([
      {
        text: 'Update',
        callback_data: `update|${ticket.id}`,
      },
    ]);
  }

  return { inline_keyboard: rows };
}

async function fetchTicketById(ticketId: string, supabase: SupabaseClient): Promise<TicketRecord | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select(
      'id, ticket_number, title, description, status, priority, category, location, sla_due_date, tenant_id, executor_profile_id, executor_id, created_at',
    )
    .eq('id', ticketId)
    .maybeSingle();

  if (error) {
    console.error('[executor-webhook] Failed to fetch ticket', ticketId, error);
    return null;
  }

  return (data as TicketRecord) ?? null;
}

function isTicketAssignedToExecutor(ticket: TicketRecord, context: ExecutorContext): boolean {
  if (context.executorProfileId && ticket.executor_profile_id === context.executorProfileId) {
    return true;
  }

  if (ticket.executor_id === context.userId) {
    return true;
  }

  return false;
}

async function setTicketStatus(
  ticket: TicketRecord,
  targetStatus: 'in-progress' | 'resolved',
  context: ExecutorContext,
  callback: TelegramCallbackQuery,
  message: TelegramMessage,
  supabase: SupabaseClient,
  token: string,
): Promise<void> {
  if (ticket.status === targetStatus) {
    await answerCallbackQuery(token, callback.id, `Ticket already ${formatStatus(targetStatus)}.`);
    return;
  }

  const updates: Record<string, unknown> = { status: targetStatus };

  const { error: updateError } = await supabase.from('tickets').update(updates).eq('id', ticket.id);
  if (updateError) {
    console.error('[executor-webhook] Failed to update ticket status', updateError);
    await answerCallbackQuery(token, callback.id, 'Could not update ticket status.');
    return;
  }

  await insertTicketActivity(supabase, {
    ticket_id: ticket.id,
    tenant_id: ticket.tenant_id,
    activity_type: 'status_change',
    comment: `Status changed from ${formatStatus(ticket.status)} to ${formatStatus(targetStatus)} by ${context.fullName ?? 'executor'}.`,
    created_by: context.userId,
    metadata: {
      source: 'telegram_bot',
      previous_status: ticket.status,
      new_status: targetStatus,
    },
  });

  await supabase
    .from('executor_ticket_sessions')
    .insert({
      ticket_id: ticket.id,
      executor_profile_id: context.executorProfileId,
      executor_user_id: context.userId,
      telegram_chat_id: context.chatIdStr,
      telegram_message_id: message.message_id,
      session_type: 'status_change',
      state: 'completed',
      metadata: {
        action: targetStatus,
        callback_id: callback.id,
      },
    })
    .select('id')
    .maybeSingle();

  const updatedTicket = await fetchTicketById(ticket.id, supabase);

  if (!updatedTicket) {
    await answerCallbackQuery(token, callback.id, 'Status updated.');
    return;
  }

  if (targetStatus === 'resolved') {
    await deleteMessage(token, context.chatId, message.message_id);
    await answerCallbackQuery(token, callback.id, 'Ticket resolved.');
    await safeSendMessage(token, context.chatId, `Ticket ${updatedTicket.ticket_number ?? ''} marked as Resolved.`);
    return;
  }

  await editMessageText(token, context.chatId, message.message_id, formatTicketMessage(updatedTicket));
  await editMessageReplyMarkup(token, context.chatId, message.message_id, buildTicketKeyboard(updatedTicket));
  await answerCallbackQuery(token, callback.id, 'Ticket marked In Progress.');
}

async function startUpdateSession(
  ticket: TicketRecord,
  context: ExecutorContext,
  callback: TelegramCallbackQuery,
  message: TelegramMessage,
  supabase: SupabaseClient,
  token: string,
): Promise<void> {
  await supabase
    .from('executor_ticket_sessions')
    .update({ state: 'cancelled' })
    .eq('ticket_id', ticket.id)
    .eq('telegram_chat_id', context.chatIdStr)
    .eq('state', 'awaiting_input');

  const prompt = await safeSendMessage(
    token,
    context.chatId,
    `Please reply with your update for ticket ${ticket.ticket_number ?? ''}.`,
    undefined,
    true,
  );

  if (!prompt) {
    console.error('[executor-webhook] Failed to send update prompt', { ticketId: ticket.id, chatId: context.chatIdStr });
    await answerCallbackQuery(token, callback.id, 'Unable to start update session.');
    return;
  }

  const { data: newSession, error: insertError } = await supabase
    .from('executor_ticket_sessions')
    .insert({
      ticket_id: ticket.id,
      executor_profile_id: context.executorProfileId,
      executor_user_id: context.userId,
      telegram_chat_id: context.chatIdStr,
      telegram_message_id: message.message_id,
      prompt_message_id: prompt.message_id,
      session_type: 'update',
      state: 'awaiting_input',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      metadata: {
        callback_id: callback.id,
      },
    })
    .select()
    .maybeSingle();

  if (insertError) {
    console.error('[executor-webhook] Failed to create update session', insertError);
    await answerCallbackQuery(token, callback.id, 'Could not start update session.');
    return;
  }

  await answerCallbackQuery(token, callback.id, 'Update session started. Please reply with your update.');

  if (newSession?.id) {
    await supabase
      .from('executor_ticket_sessions')
      .update({
        metadata: {
          ...(newSession.metadata ?? {}),
          prompt_message_id: prompt.message_id,
        },
      })
      .eq('id', newSession.id);
  }
}

async function insertTicketActivity(supabase: SupabaseClient, payload: TicketActivityInsert): Promise<void> {
  const { error } = await supabase.from('ticket_activities').insert({
    ticket_id: payload.ticket_id,
    tenant_id: payload.tenant_id,
    activity_type: payload.activity_type,
    comment: payload.comment,
    created_by: payload.created_by,
    metadata: payload.metadata,
  });

  if (error) {
    console.error('[executor-webhook] Failed to insert ticket activity', error);
  } else {
    console.log('[executor-webhook] Ticket activity recorded', {
      ticketId: payload.ticket_id,
      activityType: payload.activity_type,
    });
  }
}

async function telegramApiCall(token: string, method: string, body: Record<string, unknown>): Promise<any | null> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error(`[executor-webhook] Telegram API error (${method})`, result);
      return null;
    }

    return result.result;
  } catch (error) {
    console.error(`[executor-webhook] Telegram API call failed (${method})`, error);
    return null;
  }
}

async function safeSendMessage(
  token: string,
  chatId: number,
  text: string,
  keyboard?: { inline_keyboard: { text: string; callback_data: string }[][] },
  forceReply = false,
): Promise<any | null> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };

  if (keyboard) {
    payload.reply_markup = keyboard;
  }

  if (!keyboard && forceReply) {
    payload.reply_markup = { force_reply: true };
  }

  return telegramApiCall(token, 'sendMessage', payload);
}

async function editMessageReplyMarkup(
  token: string,
  chatId: number,
  messageId: number,
  keyboard: { inline_keyboard: { text: string; callback_data: string }[][] },
): Promise<void> {
  await telegramApiCall(token, 'editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: keyboard,
  });
}

async function editMessageText(token: string, chatId: number, messageId: number, text: string): Promise<void> {
  await telegramApiCall(token, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  });
}

async function answerCallbackQuery(token: string, callbackId: string, text: string): Promise<void> {
  await telegramApiCall(token, 'answerCallbackQuery', {
    callback_query_id: callbackId,
    text,
    show_alert: false,
  });
}

async function deleteMessage(token: string, chatId: number, messageId: number): Promise<void> {
  await telegramApiCall(token, 'deleteMessage', {
    chat_id: chatId,
    message_id: messageId,
  });
}

function formatStatus(status: string): string {
  const normalized = status.replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDateTime(value: string): string {
  try {
    const date = new Date(value);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

