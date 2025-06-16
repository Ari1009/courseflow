
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QuizScoreData {
  lessonId: string;
  courseId: string;
  score: number;
  totalQuestions: number;
  timeTakenSeconds?: number;
  struggleTopics?: string[];
  confidenceLevel?: number;
}

export const useQuizScoring = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const saveQuizScore = async (scoreData: QuizScoreData) => {
    if (!user) {
      console.error('No user found when trying to save quiz score');
      toast({
        title: "Error",
        description: "You must be logged in to save quiz scores",
        variant: "destructive",
      });
      return { success: false };
    }

    console.log('Saving quiz score with data:', scoreData);
    setIsLoading(true);
    
    try {
      const insertData = {
        user_id: user.id,
        lesson_id: scoreData.lessonId,
        course_id: scoreData.courseId,
        score: scoreData.score,
        total_questions: scoreData.totalQuestions,
        time_taken_seconds: scoreData.timeTakenSeconds,
        struggle_topics: scoreData.struggleTopics || [],
        confidence_level: scoreData.confidenceLevel
      };

      console.log('Inserting data to database:', insertData);

      const { data, error } = await supabase
        .from('quiz_scores')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Database error when saving quiz score:', error);
        throw error;
      }

      console.log('Quiz score saved successfully:', data);

      toast({
        title: "Quiz Score Saved",
        description: "Your progress has been recorded by the AI Tutor!",
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error saving quiz score:', error);
      
      // Check if it's an authentication error
      if (error.message?.includes('JWT')) {
        toast({
          title: "Authentication Error",
          description: "Please log out and log back in to continue.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Saving Score",
          description: "There was an issue saving your quiz score. Please try again.",
          variant: "destructive",
        });
      }
      
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    saveQuizScore,
    isLoading,
  };
};
