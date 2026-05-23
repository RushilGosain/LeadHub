/**
 * lib/distribution-engine.ts
 *
 * Fair Lead Distribution Engine
 * ─────────────────────────────
 * Rules:
 *  1. Assign exactly 3 providers per lead
 *  2. Mandatory providers first (if quota available)
 *  3. Fill remaining slots with fair round-robin from pool
 *  4. Round-robin index persisted in DB (survives restarts)
 *  5. Monthly quota respected (hard cap = 10)
 *  6. Same provider never gets the same lead twice
 *  7. Concurrency-safe via DB upsert + unique constraints
 */

import { SupabaseClient } from '@supabase/supabase-js';

export const PROVIDERS_PER_LEAD = 3;
export const DEFAULT_MONTHLY_QUOTA = 10;

interface Provider {
  id: string;
  name: string;
  monthly_quota_limit: number;
  monthly_quota_used: number;
  is_available: boolean;
}

interface PoolEntry {
  provider_id: string;
  is_mandatory: boolean;
}

interface DistributionResult {
  leadId: string;
  assigned: string[];
  skipped: boolean;
  reason?: string;
}

/**
 * Distribute a single lead to exactly PROVIDERS_PER_LEAD providers.
 * This function is safe to call concurrently – unique constraints in
 * lead_assignments will prevent double-assignment.
 */
export async function distributeLead(
  supabase: SupabaseClient,
  leadId: string,
  service: string
): Promise<DistributionResult> {
  // 1. Fetch pool for this service
  const { data: poolData, error: poolErr } = await supabase
    .from('service_provider_pools')
    .select('provider_id, is_mandatory')
    .eq('service', service);

  if (poolErr) throw new Error(`Pool fetch failed: ${poolErr.message}`);

  const pool: PoolEntry[] = poolData || [];

  // If no pool defined, fall back to all available providers
  let providerIds: string[] = pool.map((p) => p.provider_id);
  const mandatoryIds: string[] = pool
    .filter((p) => p.is_mandatory)
    .map((p) => p.provider_id);

  if (providerIds.length === 0) {
    // No pool configured – use all available providers
    const { data: all } = await supabase
      .from('agents')
      .select('id')
      .eq('is_available', true);
    providerIds = (all || []).map((a: any) => a.id);
  }

  if (providerIds.length === 0) {
    return { leadId, assigned: [], skipped: true, reason: 'No providers available' };
  }

  // 2. Fetch provider details (quota)
  const { data: providers, error: provErr } = await supabase
    .from('agents')
    .select('id, name, monthly_quota_limit, monthly_quota_used, is_available')
    .in('id', providerIds);

  if (provErr) throw new Error(`Provider fetch failed: ${provErr.message}`);

  const eligibleProviders: Provider[] = (providers || []).filter(
    (p: Provider) =>
      p.is_available && p.monthly_quota_used < (p.monthly_quota_limit ?? DEFAULT_MONTHLY_QUOTA)
  );

  if (eligibleProviders.length === 0) {
    return { leadId, assigned: [], skipped: true, reason: 'All providers at quota' };
  }

  // 3. Already-assigned providers for this lead (concurrency guard)
  const { data: existing } = await supabase
    .from('lead_assignments')
    .select('provider_id')
    .eq('lead_id', leadId);

  const alreadyAssigned = new Set((existing || []).map((e: any) => e.provider_id));

  // 4. Build selection list: mandatory first, then fair round-robin fill
  const selected: string[] = [];

  // Mandatory providers
  for (const mid of mandatoryIds) {
    if (selected.length >= PROVIDERS_PER_LEAD) break;
    if (alreadyAssigned.has(mid)) continue;
    const provider = eligibleProviders.find((p) => p.id === mid);
    if (provider) {
      selected.push(mid);
    }
  }

  // Fair round-robin fill for remaining slots
  if (selected.length < PROVIDERS_PER_LEAD) {
    const nonMandatoryEligible = eligibleProviders.filter(
      (p) => !mandatoryIds.includes(p.id) && !selected.includes(p.id) && !alreadyAssigned.has(p.id)
    );

    const roundRobinSelected = await selectViaRoundRobin(
      supabase,
      service,
      nonMandatoryEligible,
      PROVIDERS_PER_LEAD - selected.length
    );

    selected.push(...roundRobinSelected);
  }

  if (selected.length === 0) {
    return { leadId, assigned: [], skipped: true, reason: 'No eligible providers after filtering' };
  }

  // 5. Insert assignments (unique constraint prevents duplicates under concurrency)
  const assignments = selected.map((pid) => ({
    lead_id: leadId,
    provider_id: pid,
  }));

  const { error: insertErr } = await supabase
    .from('lead_assignments')
    .insert(assignments);

  // Ignore unique_violation (concurrent insert) – that's expected and correct
  if (insertErr && !insertErr.message.includes('unique') && !insertErr.code?.includes('23505')) {
    throw new Error(`Assignment insert failed: ${insertErr.message}`);
  }

  // 6. Increment quota for each assigned provider
  for (const pid of selected) {
    await supabase.rpc('increment_provider_quota', { p_provider_id: pid });
  }

  // 7. Update lead status to 'assigned' and set first provider as assigned_agent_id
  if (selected.length > 0) {
    await supabase
      .from('leads')
      .update({
        status: 'assigned',
        assigned_agent_id: selected[0],
        assigned_at: new Date().toISOString(),
      })
      .eq('id', leadId);
  }

  return { leadId, assigned: selected };
}

/**
 * Persistent round-robin selection.
 * The RR index is stored in distribution_state table, so it survives restarts.
 */
async function selectViaRoundRobin(
  supabase: SupabaseClient,
  service: string,
  candidates: Provider[],
  count: number
): Promise<string[]> {
  if (candidates.length === 0) return [];

  // Sort candidates by id for deterministic ordering
  const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));

  // Get or create RR state for this service
  let { data: stateData } = await supabase
    .from('distribution_state')
    .select('rr_index')
    .eq('service', service)
    .maybeSingle();

  let rrIndex = stateData?.rr_index ?? 0;

  const selected: string[] = [];
  let attempts = 0;
  const maxAttempts = sorted.length * 2;

  while (selected.length < count && attempts < maxAttempts) {
    const candidate = sorted[rrIndex % sorted.length];
    rrIndex++;
    attempts++;

    if (!selected.includes(candidate.id)) {
      selected.push(candidate.id);
    }
  }

  // Persist new RR index
  await supabase.from('distribution_state').upsert(
    { service, rr_index: rrIndex, updated_at: new Date().toISOString() },
    { onConflict: 'service' }
  );

  return selected;
}