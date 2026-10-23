import type { NextRequest } from 'next/server';
import type { AdminUser } from './auth';
import { isSupabaseAdminConfigured, supabaseAdmin } from './supabaseClient';

type AuditDetails = Record<string, unknown>;

/** Best-effort audit write: an audit outage must never leak secrets or crash the main operation. */
export async function writeAdminAudit(
  request: NextRequest,
  actor: AdminUser,
  action: string,
  targetType?: string,
  targetId?: string,
  details: AuditDetails = {},
): Promise<void> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    console.error('[admin-audit] Service-role database is unavailable; audit entry was not written.');
    return;
  }

  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const ipAddress = forwardedFor.split(',')[0]?.trim().slice(0, 100) || null;
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) || null;

  try {
    const { error } = await supabaseAdmin.from('admin_audit_logs').insert({
      actor_user_id: actor.id,
      actor_name: actor.name.slice(0, 120),
      actor_email: actor.email.slice(0, 254),
      actor_role: actor.role,
      action: action.slice(0, 100),
      target_type: targetType?.slice(0, 100) || null,
      target_id: targetId?.slice(0, 160) || null,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error('[admin-audit] Failed to write audit event:', error.code || 'unknown');
    }
  } catch {
    // Keep logging best-effort: network failures must not crash the primary action.
    console.error('[admin-audit] Failed to reach the audit database.');
  }
}
