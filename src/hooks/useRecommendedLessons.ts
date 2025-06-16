import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecommendedLesson {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  category: string;
  relevanceScore: number;
  source: 'ai-generated' | 'curated';
}

interface Course {
  id: string;
  title: string;
  modules: any[];
  progress: number;
}

export const useRecommendedLessons = (currentCourse?: Course, quizScores: number[] = []) => {
  const [recommendedLessons, setRecommendedLessons] = useState<RecommendedLesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);

  const generateRecommendedLessons = async () => {
    if (!currentCourse) return;

    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastRequestTime < 2000) { // 2 second cooldown
      return;
    }
    setLastRequestTime(now);

    setIsLoading(true);
    try {
      // Extract current learning context
      const courseContext = extractCourseContext(currentCourse);
      const avgScore = quizScores.length > 0 ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length : 0;
      
      console.log('Generating recommendations for:', courseContext.courseTitle);
      
      // Try AI-powered recommendations with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const recommendationPromise = generateAIRecommendations(courseContext, avgScore);
      
      try {
        const aiLessons = await Promise.race([recommendationPromise, timeoutPromise]) as RecommendedLesson[];
        
        if (aiLessons && aiLessons.length > 0) {
          // Sort by relevance and take top 6
          const sortedLessons = aiLessons
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 6);
          
          setRecommendedLessons(sortedLessons);
          console.log('AI recommendations loaded successfully');
        } else {
          throw new Error('No AI recommendations received');
        }
      } catch (aiError) {
        console.log('AI generation failed, using fallback lessons:', aiError);
        const fallbackLessons = generateFallbackLessons(currentCourse, avgScore);
        setRecommendedLessons(fallbackLessons);
      }
    } catch (error) {
      console.error('Error generating recommended lessons:', error);
      // Always provide fallback lessons as last resort
      const fallbackLessons = generateFallbackLessons(currentCourse, 7); // Default good score
      setRecommendedLessons(fallbackLessons);
    } finally {
      setIsLoading(false);
    }
  };

  const extractCourseContext = (course: Course) => {
    const moduleTopics = course.modules
      .map(module => module.module_title || '')
      .filter(title => title.length > 0);
    
    const lessonTopics = course.modules
      .flatMap(module => module.lessons || [])
      .map(lesson => lesson.lesson_title || '')
      .filter(title => title.length > 0);

    return {
      courseTitle: course.title,
      moduleTopics,
      lessonTopics,
      progress: course.progress || 0,
      totalModules: course.modules.length
    };
  };

  const generateAIRecommendations = async (courseContext: any, avgScore: number): Promise<RecommendedLesson[]> => {
    console.log('Calling Supabase edge function for lesson recommendations...');
    
    const { data, error } = await supabase.functions.invoke('generate-lesson-recommendations', {
      body: {
        courseTitle: courseContext.courseTitle,
        moduleTopics: courseContext.moduleTopics,
        lessonTopics: courseContext.lessonTopics,
        progress: courseContext.progress,
        averageQuizScore: avgScore,
        requestedCount: 6
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Supabase function error: ${error.message}`);
    }

    console.log('Received lesson recommendations:', data);
    
    if (!data?.recommendations || !Array.isArray(data.recommendations)) {
      throw new Error('Invalid response format from recommendations API');
    }

    return data.recommendations;
  };

  const generateFallbackLessons = (course: Course, avgScore: number): RecommendedLesson[] => {
    console.log('Generating fallback lessons for course:', course.title);
    
    const category = analyzeCourseCategory(course.title);
    const templates = getLessonTemplatesForCategory(category);
    
    return templates.slice(0, 6).map((template, index) => {
      let relevanceScore = template.baseRelevance;
      
      // Adjust based on performance
      if (avgScore < 6) {
        if (template.difficulty === 'Beginner') relevanceScore += 0.2;
        if (template.difficulty === 'Advanced') relevanceScore -= 0.3;
      } else if (avgScore > 8) {
        if (template.difficulty === 'Advanced') relevanceScore += 0.2;
        if (template.difficulty === 'Beginner') relevanceScore -= 0.2;
      }

      return {
        id: `fallback-${category}-${Date.now()}-${index}`,
        title: template.title,
        description: template.description,
        difficulty: template.difficulty,
        estimatedTime: template.estimatedTime,
        category: template.category,
        relevanceScore: Math.max(0.1, Math.min(1.0, relevanceScore)),
        source: 'curated' as const
      };
    });
  };

  const addSimilarLessons = async (newCourse: Course) => {
    if (!newCourse) return;
    
    console.log('Adding similar lessons for new course:', newCourse.title);
    
    try {
      const courseContext = extractCourseContext(newCourse);
      const aiLessons = await generateAIRecommendations(courseContext, 7); // Assume good performance for new course
      
      // Add new lessons and maintain limit of 6
      setRecommendedLessons(prev => {
        const updated = [...aiLessons.slice(0, 2), ...prev];
        return updated.slice(0, 6);
      });
    } catch (error) {
      console.log('Failed to generate AI lessons for new course, using fallback');
      // Fallback to static similar lessons
      const category = analyzeCourseCategory(newCourse.title);
      const similarLessons = generateSimilarLessons(category, newCourse.title);
      
      setRecommendedLessons(prev => {
        const updated = [...similarLessons, ...prev];
        return updated.slice(0, 6);
      });
    }
  };

  const generateSimilarLessons = (category: string, courseTitle: string): RecommendedLesson[] => {
    const templates = getLessonTemplatesForCategory(category);
    
    return templates.slice(0, 2).map((template, index) => ({
      id: `similar-${category}-${Date.now()}-${index}`,
      title: `Advanced ${template.title}`,
      description: `${template.description} - Building on your ${courseTitle} foundation`,
      difficulty: template.difficulty,
      estimatedTime: template.estimatedTime,
      category: template.category,
      relevanceScore: template.baseRelevance + 0.1,
      source: 'curated' as const
    }));
  };

  const getLessonTemplatesForCategory = (category: string) => {
    const lessonTemplates = {
      spanish: [
        {
          title: "Advanced Spanish Conversation Techniques",
          description: "Master natural conversation flow and idiomatic expressions",
          difficulty: "Advanced",
          estimatedTime: "45 min",
          category: "Speaking",
          baseRelevance: 0.9
        },
        {
          title: "Spanish Grammar Deep Dive: Subjunctive Mood",
          description: "Understand and practice the complex subjunctive mood",
          difficulty: "Advanced",
          estimatedTime: "60 min",
          category: "Grammar",
          baseRelevance: 0.8
        },
        {
          title: "Spanish Cultural Context and Usage",
          description: "Learn cultural nuances behind language patterns",
          difficulty: "Intermediate",
          estimatedTime: "40 min",
          category: "Culture",
          baseRelevance: 0.75
        }
      ],
      webdev: [
        {
          title: "Advanced React Patterns and Performance",
          description: "Custom hooks, context patterns, and optimization techniques",
          difficulty: "Advanced",
          estimatedTime: "75 min",
          category: "Frontend",
          baseRelevance: 0.9
        },
        {
          title: "Modern JavaScript ES2024 Features",
          description: "Latest JavaScript features and advanced usage patterns",
          difficulty: "Advanced",
          estimatedTime: "50 min",
          category: "JavaScript",
          baseRelevance: 0.8
        },
        {
          title: "Web Performance and Optimization",
          description: "Core Web Vitals, advanced caching, and performance monitoring",
          difficulty: "Advanced",
          estimatedTime: "65 min",
          category: "Performance",
          baseRelevance: 0.85
        }
      ],
      programming: [
        {
          title: "Advanced Algorithm Design and Analysis",
          description: "Complex algorithms, time complexity optimization, and advanced data structures",
          difficulty: "Advanced",
          estimatedTime: "90 min",
          category: "Algorithms",
          baseRelevance: 0.9
        },
        {
          title: "System Design and Architecture",
          description: "Scalable systems, microservices, and distributed computing",
          difficulty: "Advanced",
          estimatedTime: "80 min",
          category: "System Design",
          baseRelevance: 0.85
        },
        {
          title: "Advanced Programming Patterns",
          description: "Design patterns, functional programming, and code architecture",
          difficulty: "Advanced",
          estimatedTime: "70 min",
          category: "Patterns",
          baseRelevance: 0.8
        }
      ],
      general: [
        {
          title: "Advanced Critical Thinking",
          description: "Complex problem-solving and analytical reasoning techniques",
          difficulty: "Advanced",
          estimatedTime: "50 min",
          category: "Thinking",
          baseRelevance: 0.8
        },
        {
          title: "Professional Communication Mastery",
          description: "Advanced presentation and leadership communication skills",
          difficulty: "Advanced",
          estimatedTime: "45 min",
          category: "Communication",
          baseRelevance: 0.7
        },
        {
          title: "Strategic Learning and Development",
          description: "Meta-learning techniques and advanced skill acquisition",
          difficulty: "Advanced",
          estimatedTime: "40 min",
          category: "Learning",
          baseRelevance: 0.75
        }
      ]
    };

    return lessonTemplates[category as keyof typeof lessonTemplates] || lessonTemplates.general;
  };

  const analyzeCourseCategory = (courseTitle: string) => {
    const title = courseTitle.toLowerCase();
    
    if (title.includes('spanish') || title.includes('español')) return 'spanish';
    if (title.includes('react') || title.includes('javascript') || title.includes('web') || title.includes('html') || title.includes('css')) return 'webdev';
    if (title.includes('python') || title.includes('programming') || title.includes('algorithm')) return 'programming';
    if (title.includes('data') || title.includes('machine learning') || title.includes('ai')) return 'datascience';
    if (title.includes('design') || title.includes('ui') || title.includes('ux')) return 'design';
    
    return 'general';
  };

  useEffect(() => {
    if (currentCourse) {
      generateRecommendedLessons();
    }
  }, [currentCourse?.id]); // Only trigger on course change, not quiz scores

  const refreshRecommendations = () => {
    generateRecommendedLessons();
  };

  return {
    recommendedLessons,
    isLoading,
    refreshRecommendations,
    addSimilarLessons
  };
};
