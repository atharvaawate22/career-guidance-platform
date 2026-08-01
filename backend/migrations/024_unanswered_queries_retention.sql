-- Schedules a daily pg_cron job that purges unanswered_queries rows older
-- than the retention window disclosed on the privacy page (Chatbot and
-- WhatsApp assistant section). This is the enforcement half of a promise
-- already made in that disclosure — see CHATBOT_ARCHITECTURE.md §6.
--
-- Idempotent: cron.schedule() with a job_name upserts an existing job of
-- the same name rather than duplicating it, so re-running this file is safe.
-- Degrades gracefully (RAISE NOTICE, not an error) if pg_cron isn't
-- installed or this DB role lacks cron schema privileges, so a fresh local
-- dev database or a differently-provisioned environment never fails startup
-- over this.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.schedule(
        'purge_unanswered_queries',
        '17 3 * * *',
        $cron$DELETE FROM unanswered_queries WHERE created_at < NOW() - INTERVAL '180 days'$cron$
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not schedule purge_unanswered_queries cron job: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_cron extension not installed - skipping unanswered_queries purge schedule';
  END IF;
END $$;
