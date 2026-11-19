CREATE OR REPLACE FUNCTION public.send_welcome_message(p_user_id uuid, p_role user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_thread_id uuid := gen_random_uuid();
  v_system_user_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  INSERT INTO public.messages (
    thread_id,
    sender_id,
    receiver_id,
    subject,
    content,
    is_read,
    is_starred
  ) VALUES (
    v_thread_id,
    v_system_user_id,
    p_user_id,
    'Welcome to Set Hound!',
    public.welcome_content(p_user_id, p_role),
    false,
    false
  );
END;
$function$;