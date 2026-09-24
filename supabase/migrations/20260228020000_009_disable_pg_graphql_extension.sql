-- ============================================================
-- Migration: Disable Supabase GraphQL endpoint extension
-- Date: 2026-02-28
-- Purpose:
--   1) Disable GraphQL endpoint generation by removing pg_graphql.
--   2) Keep REST/PostgREST behavior unchanged for exposed non-public schemas.
--   3) Do not modify PostGIS or spatial_ref_sys objects.
-- ============================================================

DROP EXTENSION IF EXISTS pg_graphql CASCADE;
