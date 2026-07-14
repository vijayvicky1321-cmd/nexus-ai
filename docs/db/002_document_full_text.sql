-- Adds full_text so PDF Q&A can use whole-document context for broad
-- "analyze this document" questions instead of only top-k retrieved chunks.
alter table documents add column if not exists full_text text;
