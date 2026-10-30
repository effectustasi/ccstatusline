import { z } from 'zod';

const CoercedNumberSchema = z.preprocess((value) => {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return value;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
}, z.number());

const RateLimitPeriodSchema = z.looseObject({
    used_percentage: CoercedNumberSchema.nullable().optional(),
    resets_at: CoercedNumberSchema.nullable().optional() // Unix epoch seconds
});

// Claude apps gateway spend limit (Claude Code 2.1.251+). The dollar fields and
// period arrive separately from the percentage, so they can be absent.
const SpendLimitSchema = RateLimitPeriodSchema.extend({
    used_usd: CoercedNumberSchema.nullable().optional(),
    limit_usd: CoercedNumberSchema.nullable().optional(),
    period: z.string().nullable().optional()
});

export type RateLimitPeriod = z.infer<typeof RateLimitPeriodSchema>;

// Every object is loose, nested ones included: Custom Command widgets pipe the
// parsed payload to their command, which must see the fields no widget reads.
export const StatusJSONSchema = z.looseObject({
    hook_event_name: z.string().optional(),
    session_id: z.string().optional(),
    transcript_path: z.string().optional(),
    cwd: z.string().optional(),
    model: z.union([
        z.string(),
        z.looseObject({
            id: z.string().optional(),
            display_name: z.string().optional()
        })
    ]).optional(),
    workspace: z.looseObject({
        current_dir: z.string().optional(),
        project_dir: z.string().optional()
    }).nullable().optional(),
    version: z.string().nullable().optional(),
    output_style: z.looseObject({ name: z.string().optional() }).nullable().optional(),
    effort: z.looseObject({ level: z.string().nullable().optional() }).nullable().optional(),
    cost: z.looseObject({
        total_cost_usd: CoercedNumberSchema.optional(),
        total_duration_ms: CoercedNumberSchema.optional(),
        total_api_duration_ms: CoercedNumberSchema.optional(),
        total_lines_added: CoercedNumberSchema.optional(),
        total_lines_removed: CoercedNumberSchema.optional()
    }).nullable().optional(),
    context_window: z.looseObject({
        context_window_size: CoercedNumberSchema.nullable().optional(),
        total_input_tokens: CoercedNumberSchema.nullable().optional(),
        total_output_tokens: CoercedNumberSchema.nullable().optional(),
        current_usage: z.union([
            CoercedNumberSchema,
            z.looseObject({
                input_tokens: CoercedNumberSchema.optional(),
                output_tokens: CoercedNumberSchema.optional(),
                cache_creation_input_tokens: CoercedNumberSchema.optional(),
                cache_read_input_tokens: CoercedNumberSchema.optional()
            })
        ]).nullable().optional(),
        used_percentage: CoercedNumberSchema.nullable().optional(),
        remaining_percentage: CoercedNumberSchema.nullable().optional()
    }).nullable().optional(),
    vim: z.looseObject({ mode: z.string().optional() }).nullable().optional(),
    // Only the Fast Mode widget reads it, so a malformed value is dropped
    // rather than failing the whole payload
    fast_mode: z.boolean().nullable().optional().catch(undefined),
    worktree: z.looseObject({
        name: z.string().optional(),
        path: z.string().optional(),
        branch: z.string().optional(),
        original_cwd: z.string().optional(),
        original_branch: z.string().optional()
    }).nullable().optional(),
    // Claude Code reports the live prompt-cache state, including the real
    // expiry timestamp, so consumers do not have to infer it from transcript
    // timings. Absent on older Claude Code versions.
    prompt_cache: z.looseObject({
        warm: z.boolean().nullable().optional(),
        caching_observed: z.boolean().nullable().optional(),
        ttl: z.string().nullable().optional(),
        expires_at: CoercedNumberSchema.nullable().optional(), // Unix epoch seconds
        hit_ratio: CoercedNumberSchema.nullable().optional(),
        recache_tokens_if_cold: CoercedNumberSchema.nullable().optional()
    }).nullable().optional(),
    rate_limits: z.looseObject({
        five_hour: RateLimitPeriodSchema.optional(),
        seven_day: RateLimitPeriodSchema.optional(),
        seven_day_sonnet: RateLimitPeriodSchema.nullable().optional(),
        seven_day_opus: RateLimitPeriodSchema.nullable().optional(),
        spend_limit: SpendLimitSchema.nullable().optional()
    }).nullable().optional()
});

export type StatusJSON = z.infer<typeof StatusJSONSchema>;
