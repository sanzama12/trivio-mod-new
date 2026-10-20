BEGIN;
SET search_path TO trovio, public;

-- Runtime SQL đã qualified; trigger/hàm cũ cũng phải tự xác định schema.
-- Không phụ thuộc SET theo session vì transaction pooling có thể đổi backend.
DO $$
DECLARE fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='trovio' AND p.prokind='f'
  LOOP
    EXECUTE format('ALTER FUNCTION trovio.%I(%s) SET search_path = trovio, public', fn.proname, fn.arguments);
  END LOOP;
END $$;
COMMIT;
