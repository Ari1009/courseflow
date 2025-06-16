
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  audience_level TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create modules table
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses ON DELETE CASCADE NOT NULL,
  module_title TEXT NOT NULL,
  module_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES public.modules ON DELETE CASCADE NOT NULL,
  lesson_title TEXT NOT NULL,
  lesson_order INTEGER NOT NULL,
  objectives TEXT[] DEFAULT '{}',
  content TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.lessons ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resources table
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.lessons ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  resource_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for courses
CREATE POLICY "Users can view their own courses" ON public.courses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own courses" ON public.courses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses" ON public.courses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses" ON public.courses
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for modules
CREATE POLICY "Users can view modules of their courses" ON public.modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = modules.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create modules for their courses" ON public.modules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = modules.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update modules of their courses" ON public.modules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = modules.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete modules of their courses" ON public.modules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = modules.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Create RLS policies for lessons
CREATE POLICY "Users can view lessons of their courses" ON public.lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.modules 
      JOIN public.courses ON modules.course_id = courses.id
      WHERE modules.id = lessons.module_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create lessons for their courses" ON public.lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modules 
      JOIN public.courses ON modules.course_id = courses.id
      WHERE modules.id = lessons.module_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update lessons of their courses" ON public.lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.modules 
      JOIN public.courses ON modules.course_id = courses.id
      WHERE modules.id = lessons.module_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete lessons of their courses" ON public.lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.modules 
      JOIN public.courses ON modules.course_id = courses.id
      WHERE modules.id = lessons.module_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Create RLS policies for quiz_questions
CREATE POLICY "Users can view quiz questions of their courses" ON public.quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons 
      JOIN public.modules ON lessons.module_id = modules.id
      JOIN public.courses ON modules.course_id = courses.id
      WHERE lessons.id = quiz_questions.lesson_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create quiz questions for their courses" ON public.quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons 
      JOIN public.modules ON lessons.module_id = modules.id
      JOIN public.courses ON modules.course_id = courses.id
      WHERE lessons.id = quiz_questions.lesson_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Create RLS policies for resources
CREATE POLICY "Users can view resources of their courses" ON public.resources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons 
      JOIN public.modules ON lessons.module_id = modules.id
      JOIN public.courses ON modules.course_id = courses.id
      WHERE lessons.id = resources.lesson_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create resources for their courses" ON public.resources
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons 
      JOIN public.modules ON lessons.module_id = modules.id
      JOIN public.courses ON modules.course_id = courses.id
      WHERE lessons.id = resources.lesson_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
