-- Rebrand the system sender and personalize the welcome message greeting.

-- 1. Rename the system sender profile so messages show "The SET HOUND Team"
UPDATE public.profiles
SET first_name = 'The SET HOUND', last_name = 'Team'
WHERE id = '00000000-0000-0000-0000-000000000000';

-- 2. Shared content builder: greeting addressed to the profile's name
CREATE OR REPLACE FUNCTION public.welcome_content(p_user_id uuid, p_role user_role)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_content text;
BEGIN
  IF p_role = 'venue' THEN
    SELECT vp.venue_name INTO v_name FROM public.venue_profiles vp WHERE vp.user_id = p_user_id LIMIT 1;
  ELSIF p_role = 'artist' THEN
    SELECT ap.band_name INTO v_name FROM public.artist_profiles ap WHERE ap.user_id = p_user_id LIMIT 1;
  ELSE
    SELECT vp.venue_name INTO v_name FROM public.venue_profiles vp WHERE vp.user_id = p_user_id LIMIT 1;
    IF v_name IS NULL THEN
      SELECT ap.band_name INTO v_name FROM public.artist_profiles ap WHERE ap.user_id = p_user_id LIMIT 1;
    END IF;
  END IF;

  IF v_name IS NULL OR btrim(v_name) = '' THEN
    SELECT p.first_name INTO v_name FROM public.profiles p WHERE p.id = p_user_id;
  END IF;

  IF p_role = 'artist' THEN
    v_content := 'Welcome to SET HOUND, a platform built to connect artists with venues looking to book live music.

Getting Started:

• Create Your Profile: Head to your Profile to add your band name, genre, pictures, and featured samples. Link your Spotify, SoundCloud, or other streaming platforms.
• Find Venues: Navigate to the "Find Venues" tab to browse rooms seeking performers. Filter by genre to find the perfect fit, and favorite venues you''re interested in to save them for later.
• Apply: When you find a room that matches your style, submit an application with your availability (specific dates, a date range, or flexible). Include your preferred payment and lineup details.
• Connect: Once you apply, venues will review your profile and application. They may reach out via Messages to discuss details, or accept your application directly. Accepted gigs will automatically appear in your Calendar.

We''re excited to help you find your next stage.

Best,
The SET HOUND Team';
  ELSIF p_role = 'venue' THEN
    v_content := 'Welcome to SET HOUND, a platform built to connect venues with talented artists seeking live performance opportunities.

Getting Started:

• Create Your Profile: Head to your Profile to add your venue''s general picture and location. This helps artists better understand your space.
• Add Rooms: Navigate to the "Rooms" tab to create listings for your performance spaces. Include details like capacity, backline, house rules, genres you''re looking for, and photos of the room.
• Review Applications: When artists apply to your rooms, you''ll see their submissions in the "Applications" tab. Each application includes the artist''s availability, payment preferences, and act type. Click through to view their full profile, music samples, and streaming links.
• Book Your Shows: Accept applications to confirm gigs. After adding show times, events will automatically appear in your Calendar. You can also message artists directly to coordinate details.

We''re excited to help you discover your next great act.

Best,
The SET HOUND Team';
  ELSE
    v_content := 'Welcome to SET HOUND, a platform built to connect artists with venues looking to book live music. Since you''ve joined as both an artist and a venue, you have access to the full SET HOUND experience.

As an Artist:

• Create Your Artist Profile: Add your band name, genre, pictures, and featured samples. Link your Spotify, SoundCloud, or other streaming platforms.
• Find Venues: Navigate to the "Find Venues" tab to browse rooms seeking performers. Filter by genre to find the perfect fit, and favorite venues you''re interested in to save them for later.
• Apply: When you find a room that matches your style, submit an application with your availability (specific dates, a date range, or flexible). Include your preferred payment and lineup details.
• Connect: Once you apply, venues will review your profile and application. They may reach out via Messages to discuss details, or accept your application directly. Accepted gigs will automatically appear in your Calendar.

As a Venue:

• Create Your Venue Profile: Add your venue''s general picture and location. This helps artists better understand your space.
• Add Rooms: Navigate to the "Rooms" tab to create listings for your performance spaces. Include details like capacity, backline, house rules, genres you''re looking for, and photos of the room.
• Review Applications: When artists apply to your rooms, you''ll see their submissions in the "Applications" tab. Each application includes the artist''s availability, payment preferences, and act type. Click through to view their full profile, music samples, and streaming links.
• Book Your Shows: Accept applications to confirm gigs. After adding show times, events will automatically appear in your Calendar. You can also message artists directly to coordinate details.

Switch Between Roles: Use the role switcher in your profile menu to toggle between your Artist and Venue dashboards at any time.

We''re excited to help you on both sides of the stage.

Best,
The SET HOUND Team';
  END IF;

  RETURN 'Hi ' || v_name || ',

' || v_content;
END;
$$;

-- 3. send_welcome_message now uses the shared builder
CREATE OR REPLACE FUNCTION public.send_welcome_message(p_user_id uuid, p_role user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    'Welcome to SET HOUND!',
    public.welcome_content(p_user_id, p_role),
    false,
    false
  );
END;
$$;

-- 4. Resend existing welcome messages with the SET HOUND sender and personalized greeting
DO $$
DECLARE
  r RECORD;
BEGIN
  CREATE TEMP TABLE welcome_recipients ON COMMIT DROP AS
    SELECT m.receiver_id, p.role
    FROM public.messages m
    JOIN public.profiles p ON p.id = m.receiver_id
    WHERE m.sender_id = '00000000-0000-0000-0000-000000000000'
      AND m.subject IN ('Welcome to Riff!', 'Welcome to SET HOUND!');

  DELETE FROM public.messages
  WHERE sender_id = '00000000-0000-0000-0000-000000000000'
    AND subject IN ('Welcome to Riff!', 'Welcome to SET HOUND!');

  FOR r IN SELECT receiver_id, role FROM welcome_recipients LOOP
    PERFORM public.send_welcome_message(r.receiver_id, r.role);
  END LOOP;

  DROP TABLE welcome_recipients;
END;
$$;