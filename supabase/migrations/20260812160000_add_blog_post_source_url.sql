-- Tracks the origin news link for AI-drafted blog posts (see
-- api/generate-blog-draft.ts) so the auto-draft cron can skip headlines
-- it's already turned into a draft, instead of re-drafting the same news
-- every run. NULL for posts written normally by staff.
ALTER TABLE blog_posts ADD COLUMN source_url TEXT;
