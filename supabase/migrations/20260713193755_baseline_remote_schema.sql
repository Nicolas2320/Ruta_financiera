


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."consume_assistant_daily_question"("p_user_id" "uuid", "p_usage_date" "date", "p_daily_limit" integer) RETURNS TABLE("allowed" boolean, "question_count" integer, "remaining_questions" integer, "daily_limit" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  consumed_count integer;
begin
  if p_daily_limit < 1 then
    raise exception 'Daily limit must be greater than zero';
  end if;

  insert into public.assistant_daily_usage (user_id, usage_date, question_count)
  values (p_user_id, p_usage_date, 1)
  on conflict (user_id, usage_date)
  do update
    set question_count = public.assistant_daily_usage.question_count + 1
    where public.assistant_daily_usage.question_count < p_daily_limit
  returning public.assistant_daily_usage.question_count into consumed_count;

  if consumed_count is null then
    select public.assistant_daily_usage.question_count
      into consumed_count
    from public.assistant_daily_usage
    where user_id = p_user_id
      and usage_date = p_usage_date;

    return query
    select
      false,
      coalesce(consumed_count, 0),
      0,
      p_daily_limit;

    return;
  end if;

  return query
  select
    true,
    consumed_count,
    greatest(p_daily_limit - consumed_count, 0),
    p_daily_limit;
end;
$$;


ALTER FUNCTION "public"."consume_assistant_daily_question"("p_user_id" "uuid", "p_usage_date" "date", "p_daily_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."assistant_daily_usage" (
    "user_id" "uuid" NOT NULL,
    "usage_date" "date" NOT NULL,
    "question_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assistant_daily_usage_question_count_check" CHECK (("question_count" >= 0))
);


ALTER TABLE "public"."assistant_daily_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_profiles" (
    "user_id" "uuid" NOT NULL,
    "onboarding" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "completed_actions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "exact_values" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."financial_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assistant_daily_usage"
    ADD CONSTRAINT "assistant_daily_usage_pkey" PRIMARY KEY ("user_id", "usage_date");



ALTER TABLE ONLY "public"."financial_profiles"
    ADD CONSTRAINT "financial_profiles_pkey" PRIMARY KEY ("user_id");



CREATE OR REPLACE TRIGGER "set_assistant_daily_usage_updated_at" BEFORE UPDATE ON "public"."assistant_daily_usage" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_financial_profiles_updated_at" BEFORE UPDATE ON "public"."financial_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."assistant_daily_usage"
    ADD CONSTRAINT "assistant_daily_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_profiles"
    ADD CONSTRAINT "financial_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can delete own financial profile" ON "public"."financial_profiles" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own financial profile" ON "public"."financial_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own assistant usage" ON "public"."assistant_daily_usage" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own financial profile" ON "public"."financial_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own financial profile" ON "public"."financial_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."assistant_daily_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."consume_assistant_daily_question"("p_user_id" "uuid", "p_usage_date" "date", "p_daily_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_assistant_daily_question"("p_user_id" "uuid", "p_usage_date" "date", "p_daily_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."consume_assistant_daily_question"("p_user_id" "uuid", "p_usage_date" "date", "p_daily_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_assistant_daily_question"("p_user_id" "uuid", "p_usage_date" "date", "p_daily_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."assistant_daily_usage" TO "anon";
GRANT ALL ON TABLE "public"."assistant_daily_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."assistant_daily_usage" TO "service_role";



GRANT ALL ON TABLE "public"."financial_profiles" TO "anon";
GRANT ALL ON TABLE "public"."financial_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


