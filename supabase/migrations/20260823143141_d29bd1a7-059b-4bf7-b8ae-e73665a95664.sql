ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, email, role, terms_accepted_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'artist'),
        (NEW.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz
    );

    IF (NEW.raw_user_meta_data ->> 'role') IN ('artist', 'both') THEN
        INSERT INTO public.artist_profiles (user_id) VALUES (NEW.id);
    END IF;

    IF (NEW.raw_user_meta_data ->> 'role') IN ('venue', 'both') THEN
        INSERT INTO public.venue_profiles (user_id) VALUES (NEW.id);
    END IF;

    RETURN NEW;
END;
$function$;