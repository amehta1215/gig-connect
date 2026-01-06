-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('artist', 'venue', 'both');

-- Create enum for application status
CREATE TYPE public.application_status AS ENUM ('in_progress', 'accepted', 'archived');

-- Create enum for payment preferences
CREATE TYPE public.payment_preference AS ENUM ('door_split', 'bar_split', 'tip_based', 'flat_fee', 'rental', 'no_preference');

-- Create enum for lineup preferences
CREATE TYPE public.lineup_preference AS ENUM ('co_acts_needed', 'co_acts_confirmed', 'solo_performer', 'no_preference');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'artist',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create artist_profiles table
CREATE TABLE public.artist_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    band_name TEXT,
    genre TEXT,
    location TEXT,
    bio TEXT,
    spotify_link TEXT,
    soundcloud_link TEXT,
    apple_music_link TEXT,
    youtube_link TEXT,
    facebook_link TEXT,
    tiktok_link TEXT,
    pictures TEXT[] DEFAULT '{}',
    featured_samples TEXT[] DEFAULT '{}',
    past_gigs TEXT[] DEFAULT '{}',
    press_links TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create venue_profiles table
CREATE TABLE public.venue_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    venue_name TEXT,
    location TEXT,
    bio TEXT,
    event_types TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create venue_listings (rooms) table
CREATE TABLE public.venue_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_profile_id UUID REFERENCES public.venue_profiles(id) ON DELETE CASCADE NOT NULL,
    venue_name TEXT NOT NULL,
    room_name TEXT,
    location TEXT,
    capacity INTEGER,
    genres TEXT[] DEFAULT '{}',
    pictures TEXT[] DEFAULT '{}',
    bio TEXT,
    backline_info TEXT,
    house_rules TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    thread_id UUID NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create applications table
CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    venue_listing_id UUID REFERENCES public.venue_listings(id) ON DELETE CASCADE NOT NULL,
    status application_status DEFAULT 'in_progress',
    payment_preference payment_preference,
    lineup_preference lineup_preference,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Artist profiles policies
CREATE POLICY "Anyone can view artist profiles" ON public.artist_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own artist profile" ON public.artist_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own artist profile" ON public.artist_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artist profile" ON public.artist_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Venue profiles policies
CREATE POLICY "Anyone can view venue profiles" ON public.venue_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own venue profile" ON public.venue_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own venue profile" ON public.venue_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own venue profile" ON public.venue_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Venue listings policies
CREATE POLICY "Anyone can view venue listings" ON public.venue_listings
    FOR SELECT USING (true);

CREATE POLICY "Venue owners can manage their listings" ON public.venue_listings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.venue_profiles 
            WHERE id = venue_profile_id AND user_id = auth.uid()
        )
    );

-- Messages policies
CREATE POLICY "Users can view their own messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Applications policies
CREATE POLICY "Artists can view their own applications" ON public.applications
    FOR SELECT USING (
        auth.uid() = artist_id OR 
        EXISTS (
            SELECT 1 FROM public.venue_listings vl
            JOIN public.venue_profiles vp ON vl.venue_profile_id = vp.id
            WHERE vl.id = venue_listing_id AND vp.user_id = auth.uid()
        )
    );

CREATE POLICY "Artists can create applications" ON public.applications
    FOR INSERT WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Relevant parties can update applications" ON public.applications
    FOR UPDATE USING (
        auth.uid() = artist_id OR 
        EXISTS (
            SELECT 1 FROM public.venue_listings vl
            JOIN public.venue_profiles vp ON vl.venue_profile_id = vp.id
            WHERE vl.id = venue_listing_id AND vp.user_id = auth.uid()
        )
    );

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'artist')
    );
    
    -- Create artist profile if role is artist or both
    IF (NEW.raw_user_meta_data ->> 'role') IN ('artist', 'both') THEN
        INSERT INTO public.artist_profiles (user_id) VALUES (NEW.id);
    END IF;
    
    -- Create venue profile if role is venue or both
    IF (NEW.raw_user_meta_data ->> 'role') IN ('venue', 'both') THEN
        INSERT INTO public.venue_profiles (user_id) VALUES (NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artist_profiles_updated_at BEFORE UPDATE ON public.artist_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_profiles_updated_at BEFORE UPDATE ON public.venue_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_listings_updated_at BEFORE UPDATE ON public.venue_listings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();