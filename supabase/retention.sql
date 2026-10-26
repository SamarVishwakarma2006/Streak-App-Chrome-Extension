-- Run as the migration owner after enabling pg_cron in the hosted project.
-- Job names are unique: re-running this updates the existing daily job.
select cron.schedule(
  'streak-evidence-retention',
  '17 3 * * *',
  $$select private.cleanup_expired_evidence();$$
);
-- Only job execution metadata is logged; no evidence, emails or access tokens.
select cron.schedule(
  'streak-job-log-retention',
  '37 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '14 days';$$
);
