import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  title: string;
  audience_level: string;
  duration: string;
  instructions?: string;
  progress: number;
  created_at: string;
  folder_id?: string;
  modules: Module[];
}

interface Module {
  id: string;
  module_title: string;
  module_order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  lesson_title: string;
  lesson_order: number;
  objectives: string[];
  content: string;
  completed: boolean;
  quiz: QuizQuestion[];
  free_resources: Resource[];
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  question_order: number;
}

interface Resource {
  id: string;
  title: string;
  url: string;
  resource_order: number;
}

export const useCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const calculateCourseProgress = (modules: Module[]) => {
    if (!modules || modules.length === 0) return 0;
    
    const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);
    if (totalLessons === 0) return 0;
    
    const completedLessons = modules.reduce((total, module) => {
      return total + module.lessons.filter(lesson => lesson.completed).length;
    }, 0);
    
    return Math.round((completedLessons / totalLessons) * 100);
  };

  const fetchCourses = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      const coursesWithModules = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { data: modulesData, error: modulesError } = await supabase
            .from('modules')
            .select('*')
            .eq('course_id', course.id)
            .order('module_order');

          if (modulesError) throw modulesError;

          const modulesWithLessons = await Promise.all(
            (modulesData || []).map(async (module) => {
              const { data: lessonsData, error: lessonsError } = await supabase
                .from('lessons')
                .select('*')
                .eq('module_id', module.id)
                .order('lesson_order');

              if (lessonsError) throw lessonsError;

              const lessonsWithQuizAndResources = await Promise.all(
                (lessonsData || []).map(async (lesson) => {
                  const [quizData, resourcesData] = await Promise.all([
                    supabase
                      .from('quiz_questions')
                      .select('*')
                      .eq('lesson_id', lesson.id)
                      .order('question_order'),
                    supabase
                      .from('resources')
                      .select('*')
                      .eq('lesson_id', lesson.id)
                      .order('resource_order')
                  ]);

                  return {
                    ...lesson,
                    quiz: quizData.data || [],
                    free_resources: resourcesData.data || []
                  };
                })
              );

              return {
                ...module,
                lessons: lessonsWithQuizAndResources
              };
            })
          );

          const progress = calculateCourseProgress(modulesWithLessons);
          
          // Update course progress in database
          if (progress !== course.progress) {
            await supabase
              .from('courses')
              .update({ progress })
              .eq('id', course.id);
          }

          return {
            ...course,
            progress,
            modules: modulesWithLessons,
            folder_id: course.folder_id || undefined
          };
        })
      );

      setCourses(coursesWithModules);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createCourse = async (courseData: {
    title: string;
    audience_level: string;
    duration: string;
    instructions?: string;
    folder_id?: string;
  }) => {
    if (!user) return null;

    try {
      // Call the edge function to generate course content
      const { data: generateResponse, error: generateError } = await supabase.functions.invoke('generate-course', {
        body: courseData
      });

      if (generateError) throw generateError;

      // Create course in database with folder_id if provided
      const courseInsertData: any = {
        user_id: user.id,
        title: courseData.title,
        audience_level: courseData.audience_level,
        duration: courseData.duration,
        instructions: courseData.instructions,
      };

      // Only add folder_id if it's provided
      if (courseData.folder_id) {
        courseInsertData.folder_id = courseData.folder_id;
      }

      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert(courseInsertData)
        .select()
        .single();

      if (courseError) throw courseError;

      // Create modules, lessons, quiz questions, and resources
      const modules = generateResponse.courseContent.modules;
      for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
        const moduleData = modules[moduleIndex];
        
        const { data: module, error: moduleError } = await supabase
          .from('modules')
          .insert({
            course_id: course.id,
            module_title: moduleData.module_title,
            module_order: moduleIndex + 1,
          })
          .select()
          .single();

        if (moduleError) throw moduleError;

        for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex++) {
          const lessonData = moduleData.lessons[lessonIndex];
          
          const { data: lesson, error: lessonError } = await supabase
            .from('lessons')
            .insert({
              module_id: module.id,
              lesson_title: lessonData.lesson_title,
              lesson_order: lessonIndex + 1,
              objectives: lessonData.objectives,
              content: lessonData.content,
            })
            .select()
            .single();

          if (lessonError) throw lessonError;

          // Create quiz questions
          for (let quizIndex = 0; quizIndex < lessonData.quiz.length; quizIndex++) {
            const quizData = lessonData.quiz[quizIndex];
            await supabase
              .from('quiz_questions')
              .insert({
                lesson_id: lesson.id,
                question: quizData.question,
                options: quizData.options,
                correct_answer: quizData.answer,
                question_order: quizIndex + 1,
              });
          }

          // Create resources
          for (let resourceIndex = 0; resourceIndex < lessonData.free_resources.length; resourceIndex++) {
            const resourceData = lessonData.free_resources[resourceIndex];
            await supabase
              .from('resources')
              .insert({
                lesson_id: lesson.id,
                title: resourceData.title,
                url: resourceData.url,
                resource_order: resourceIndex + 1,
              });
          }
        }
      }

      await fetchCourses();
      return course;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  };

  const deleteCourse = async (courseId: string) => {
    try {
      console.log(`Starting deletion process for course: ${courseId}`);
      
      // First, delete any quiz scores associated with this course
      const { error: quizScoresError } = await supabase
        .from('quiz_scores')
        .delete()
        .eq('course_id', courseId);

      if (quizScoresError) {
        console.error('Error deleting quiz scores:', quizScoresError);
        throw quizScoresError;
      }

      console.log('Quiz scores deleted successfully');

      // Now delete the course (cascade will handle modules, lessons, quiz_questions, and resources)
      const { error: courseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (courseError) {
        console.error('Error deleting course:', courseError);
        throw courseError;
      }

      console.log('Course deleted successfully');

      setCourses(prev => prev.filter(course => course.id !== courseId));
      toast({
        title: "Course Deleted",
        description: "The course has been removed from your library.",
      });
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: "Failed to delete course. Please try again.",
        variant: "destructive",
      });
    }
  };

  const moveCourseToFolder = async (courseId: string, folderId: string | null) => {
    try {
      // Update database
      const { error } = await supabase
        .from('courses')
        .update({ folder_id: folderId })
        .eq('id', courseId);

      if (error) throw error;

      // Update local state
      setCourses(prev => prev.map(course => 
        course.id === courseId ? { ...course, folder_id: folderId || undefined } : course
      ));

      toast({
        title: "Course Moved",
        description: folderId ? "Course moved to folder successfully." : "Course removed from folder.",
      });
    } catch (error) {
      console.error('Error moving course:', error);
      toast({
        title: "Error",
        description: "Failed to move course",
        variant: "destructive",
      });
    }
  };

  const updateLessonCompletion = async (lessonId: string, completed: boolean) => {
    try {
      console.log(`Updating lesson ${lessonId} completion to: ${completed}`);
      
      const { error } = await supabase
        .from('lessons')
        .update({ completed })
        .eq('id', lessonId);

      if (error) throw error;

      // Refresh courses to recalculate progress
      await fetchCourses();
      
      toast({
        title: completed ? "Lesson Completed!" : "Lesson Updated",
        description: completed ? "Great job! Keep up the excellent work." : "Lesson status updated.",
      });
    } catch (error) {
      console.error('Error updating lesson completion:', error);
      toast({
        title: "Error",
        description: "Failed to update lesson progress",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  return {
    courses,
    isLoading,
    createCourse,
    deleteCourse,
    moveCourseToFolder,
    updateLessonCompletion,
    refetch: fetchCourses,
  };
};
