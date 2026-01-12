-- Create a system user for "The Riff Team"
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'riff-team@system.riff',
  now(),
  now(),
  now(),
  '{"first_name": "The Riff", "last_name": "Team", "role": "venue"}'::jsonb,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create the system profile
INSERT INTO public.profiles (id, first_name, last_name, email, role)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'The Riff',
  'Team',
  'riff-team@system.riff',
  'venue'
) ON CONFLICT (id) DO NOTHING;

-- Create function to send welcome message based on role
CREATE OR REPLACE FUNCTION public.send_welcome_message(p_user_id uuid, p_role user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id uuid := gen_random_uuid();
  v_system_user_id uuid := '00000000-0000-0000-0000-000000000000';
  v_content text;
BEGIN
  -- Determine content based on role
  IF p_role = 'artist' THEN
    v_content := 'Welcome to Riff, a platform built to connect artists with venues looking to book live music.

**Getting Started:**

**Create Your Profile:** Head to your Profile to add your band name, genre, pictures, and featured samples. Link your Spotify, SoundCloud, or other streaming platforms.

**Find Venues:** Navigate to the "Find Venues" tab to browse rooms seeking performers. Filter by genre to find the perfect fit, and favorite venues you''re interested in to save them for later.

**Apply:** When you find a room that matches your style, submit an application with your availability (specific dates, a date range, or flexible). Include your preferred payment and lineup details.

**Connect:** Once you apply, venues will review your profile and application. They may reach out via Messages to discuss details, or accept your application directly. Accepted gigs will automatically appear in your Calendar.

We''re excited to help you find your next stage.

Best,
The Riff Team';

  ELSIF p_role = 'venue' THEN
    v_content := 'Welcome to Riff, a platform built to connect venues with talented artists seeking live performance opportunities.

**Getting Started:**

**Create Your Profile:** Head to your Profile to add your venue''s general picture and location. This helps artists better understand your space.

**Add Rooms:** Navigate to the "Rooms" tab to create listings for your performance spaces. Include details like capacity, backline, house rules, genres you''re looking for, and photos of the room.

**Review Applications:** When artists apply to your rooms, you''ll see their submissions in the "Applications" tab. Each application includes the artist''s availability, payment preferences, and act type. Click through to view their full profile, music samples, and streaming links.

**Book Your Shows:** Accept applications to confirm gigs. After adding show times, events will automatically appear in your Calendar. You can also message artists directly to coordinate details.

We''re excited to help you discover your next great act.

Best,
The Riff Team';

  ELSE -- 'both'
    v_content := 'Welcome to Riff, a platform built to connect artists with venues looking to book live music. Since you''ve joined as both an artist and a venue, you have access to the full RIFF experience.

**As an Artist:**

**Create Your Artist Profile:** Add your band name, genre, pictures, and featured samples. Link your Spotify, SoundCloud, or other streaming platforms.

**Find Venues:** Navigate to the "Find Venues" tab to browse rooms seeking performers. Filter by genre to find the perfect fit, and favorite venues you''re interested in to save them for later.

**Apply:** When you find a room that matches your style, submit an application with your availability (specific dates, a date range, or flexible). Include your preferred payment and lineup details.

**Connect:** Once you apply, venues will review your profile and application. They may reach out via Messages to discuss details, or accept your application directly. Accepted gigs will automatically appear in your Calendar.

**As a Venue:**

**Create Your Venue Profile:** Add your venue''s general picture and location. This helps artists better understand your space.

**Add Rooms:** Navigate to the "Rooms" tab to create listings for your performance spaces. Include details like capacity, backline, house rules, genres you''re looking for, and photos of the room.

**Review Applications:** When artists apply to your rooms, you''ll see their submissions in the "Applications" tab. Each application includes the artist''s availability, payment preferences, and act type. Click through to view their full profile, music samples, and streaming links.

**Book Your Shows:** Accept applications to confirm gigs. After adding show times, events will automatically appear in your Calendar. You can also message artists directly to coordinate details.

**Switch Between Roles:** Use the role switcher in your profile menu to toggle between your Artist and Venue dashboards at any time.

We''re excited to help you on both sides of the stage.

Best,
The Riff Team';
  END IF;

  -- Insert the welcome message
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
    'Welcome to Riff!',
    v_content,
    false,
    false
  );
END;
$$;

-- Create trigger function to send welcome message on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Don't send welcome message to the system user
  IF NEW.id != '00000000-0000-0000-0000-000000000000' THEN
    PERFORM public.send_welcome_message(NEW.id, NEW.role);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_welcome ON public.profiles;
CREATE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_welcome();

-- Send welcome messages to all existing users (except system user)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, role FROM public.profiles WHERE id != '00000000-0000-0000-0000-000000000000'
  LOOP
    PERFORM public.send_welcome_message(r.id, r.role);
  END LOOP;
END;
$$;