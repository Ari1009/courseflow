
-- Create table to store quiz scores and progress
CREATE TABLE public.quiz_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  lesson_id UUID REFERENCES public.lessons NOT NULL,
  course_id UUID REFERENCES public.courses NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  total_questions INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  time_taken_seconds INTEGER,
  struggle_topics TEXT[],
  confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 10)
);

-- Create table for AI tutor chat history
CREATE TABLE public.tutor_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  course_id UUID REFERENCES public.courses NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for quiz_scores
ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quiz scores" 
  ON public.quiz_scores 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz scores" 
  ON public.quiz_scores 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz scores" 
  ON public.quiz_scores 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Add RLS policies for tutor_chats
ALTER TABLE public.tutor_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tutor chats" 
  ON public.tutor_chats 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tutor chats" 
  ON public.tutor_chats 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_quiz_scores_user_course ON public.quiz_scores(user_id, course_id);
CREATE INDEX idx_quiz_scores_lesson ON public.quiz_scores(lesson_id);
CREATE INDEX idx_tutor_chats_user_course ON public.tutor_chats(user_id, course_id);
