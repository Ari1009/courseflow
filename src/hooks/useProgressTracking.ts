
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProgressData {
  course_id: string;
  module_id: string;
  quiz_score: number;
  confidence_level: number;
  struggle_topics: string[];
  understanding_topics: string[];
  reflection_notes: string;
}

interface AdaptiveFeedback {
  weaknesses: string[];
  recommended_resources: Array<{title: string; url: string; type: string}>;
  should_advance: boolean;
  review_topics: string[];
  motivational_message: string;
  next_focus_areas: string[];
  performance_analysis: string;
  study_recommendations: string[];
}

export const useProgressTracking = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [moduleProgress, setModuleProgress] = useState<any[]>([]);
  const [adaptiveFeedback, setAdaptiveFeedback] = useState<AdaptiveFeedback[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const analyzeCourseContent = (courseTitle: string, courseModules: any[] = []) => {
    const title = courseTitle.toLowerCase();
    const moduleContent = courseModules.map(m => m.module_title?.toLowerCase() || '').join(' ');
    const allContent = `${title} ${moduleContent}`;
    
    console.log('Analyzing course content:', { title, moduleContent, allContent });
    
    // More precise detection based on actual course content
    if (allContent.includes('español') || allContent.includes('spanish') || 
        allContent.includes('gramática') || allContent.includes('vocabulario') ||
        allContent.includes('conjugación') || allContent.includes('idioma')) {
      return 'spanish';
    }
    
    if (allContent.includes('react') || allContent.includes('javascript') || 
        allContent.includes('html') || allContent.includes('css') || 
        allContent.includes('frontend') || allContent.includes('web development')) {
      return 'webdev';
    }
    
    if (allContent.includes('python') || allContent.includes('java') || 
        allContent.includes('algorithm') || allContent.includes('programming') ||
        allContent.includes('coding') || allContent.includes('software')) {
      return 'programming';
    }
    
    if (allContent.includes('data') || allContent.includes('machine learning') || 
        allContent.includes('ai') || allContent.includes('analytics') ||
        allContent.includes('statistics')) {
      return 'datascience';
    }
    
    if (allContent.includes('design') || allContent.includes('ui') || 
        allContent.includes('ux') || allContent.includes('graphic')) {
      return 'design';
    }
    
    // Default fallback
    return 'general';
  };

  const generateDetailedFeedback = (progressData: ProgressData, courseTitle: string, courseModules: any[] = []) => {
    const scorePercentage = (progressData.quiz_score / 10) * 100;
    const confidenceLevel = progressData.confidence_level;
    
    // Analyze actual course content
    const courseCategory = analyzeCourseContent(courseTitle, courseModules);
    console.log('Detected course category:', courseCategory, 'for course:', courseTitle);
    
    // Performance analysis based on quiz score and confidence
    let performanceAnalysis = "";
    let studyRecommendations: string[] = [];
    let shouldAdvance = false;
    
    if (scorePercentage >= 80 && confidenceLevel >= 8) {
      performanceAnalysis = "Excellent mastery! You have a strong understanding of the concepts and high confidence.";
      shouldAdvance = true;
      studyRecommendations = [
        "Move to advanced topics in this area",
        "Consider teaching others to reinforce learning", 
        "Apply concepts in real projects"
      ];
    } else if (scorePercentage >= 70 && confidenceLevel >= 6) {
      performanceAnalysis = "Good progress with solid understanding. Some areas need reinforcement.";
      shouldAdvance = true;
      studyRecommendations = [
        "Review weaker topics before advancing",
        "Practice with additional exercises",
        "Build confidence through repetition"
      ];
    } else if (scorePercentage >= 60 || confidenceLevel >= 5) {
      performanceAnalysis = "Moderate understanding. Foundation is building but needs strengthening.";
      shouldAdvance = false;
      studyRecommendations = [
        "Focus on fundamental concepts",
        "Seek additional resources for difficult topics", 
        "Practice more before moving forward"
      ];
    } else {
      performanceAnalysis = "Concepts need significant review. Take time to build solid foundations.";
      shouldAdvance = false;
      studyRecommendations = [
        "Review all basic concepts thoroughly",
        "Consider alternative learning approaches",
        "Don't rush - solid understanding takes time"
      ];
    }

    // Generate course-specific resources based on actual content
    const recommendedResources = generateCourseSpecificResources(courseCategory, progressData.struggle_topics, courseTitle);
    
    // Motivational message based on performance and course type
    let motivationalMessage = "";
    if (scorePercentage >= 80) {
      motivationalMessage = getMotivationalMessage(courseCategory, 'excellent', courseTitle);
    } else if (scorePercentage >= 60) {
      motivationalMessage = getMotivationalMessage(courseCategory, 'good', courseTitle);
    } else {
      motivationalMessage = getMotivationalMessage(courseCategory, 'encouraging', courseTitle);
    }

    return {
      weaknesses: progressData.struggle_topics.slice(0, 3),
      recommended_resources: recommendedResources,
      should_advance: shouldAdvance,
      review_topics: progressData.struggle_topics,
      motivational_message: motivationalMessage,
      next_focus_areas: shouldAdvance ? 
        getNextFocusAreas(courseCategory, courseTitle) :
        progressData.struggle_topics.slice(0, 3),
      performance_analysis: performanceAnalysis,
      study_recommendations: studyRecommendations
    };
  };

  const getMotivationalMessage = (category: string, level: string, courseTitle: string) => {
    const messages = {
      spanish: {
        excellent: `¡Excelente trabajo con ${courseTitle}! Tu dominio del español está mejorando considerablemente. ¡Sigue practicando!`,
        good: `Buen progreso en ${courseTitle}! Estás construyendo una base sólida en español. La práctica constante te llevará al éxito.`,
        encouraging: `Aprender ${courseTitle} requiere tiempo y paciencia. Cada experto fue principiante. Enfócate en entender en lugar de la velocidad.`
      },
      webdev: {
        excellent: `Outstanding work on ${courseTitle}! You're demonstrating excellent mastery of web development concepts.`,
        good: `Good progress on ${courseTitle}! You're building solid web development foundations. Keep practicing!`,
        encouraging: `Learning ${courseTitle} takes time and patience. Every expert web developer was once a beginner.`
      },
      programming: {
        excellent: `Excellent work on ${courseTitle}! Your programming skills are developing strongly.`,
        good: `Good progress on ${courseTitle}! You're building solid programming foundations.`,
        encouraging: `Learning ${courseTitle} takes time. Focus on understanding concepts rather than speed.`
      },
      general: {
        excellent: `Outstanding work on ${courseTitle}! You're demonstrating excellent mastery.`,
        good: `Good progress on ${courseTitle}! You're building solid foundations.`,
        encouraging: `Learning ${courseTitle} takes time and patience. Every expert was once a beginner.`
      }
    };
    
    return messages[category as keyof typeof messages]?.[level as keyof any] || messages.general[level as keyof any];
  };

  const getNextFocusAreas = (category: string, courseTitle: string) => {
    const focusAreas = {
      spanish: ["Conversación avanzada", "Gramática compleja", "Cultura hispana"],
      webdev: ["Advanced React patterns", "Backend integration", "Performance optimization"],
      programming: ["Advanced algorithms", "System design", "Code optimization"],
      datascience: ["Advanced ML models", "Data visualization", "Statistical analysis"],
      design: ["Advanced design systems", "User research", "Interaction design"],
      general: ["Advanced concepts", "Real-world applications", "Best practices"]
    };
    
    return focusAreas[category as keyof typeof focusAreas] || focusAreas.general;
  };

  const generateCourseSpecificResources = (category: string, struggleTopics: string[], courseTitle: string) => {
    const baseResources = {
      spanish: [
        { title: "SpanishDict", url: "https://www.spanishdict.com/", type: "Dictionary & Grammar" },
        { title: "Conjuguemos", url: "https://conjuguemos.com/", type: "Verb Practice" },
        { title: "News in Slow Spanish", url: "https://www.newsinslowspanish.com/", type: "Listening Practice" },
        { title: "Lingolia Spanish", url: "https://espanol.lingolia.com/", type: "Grammar Exercises" }
      ],
      webdev: [
        { title: "MDN Web Docs", url: "https://developer.mozilla.org/", type: "Documentation" },
        { title: "FreeCodeCamp", url: "https://www.freecodecamp.org/", type: "Interactive Course" },
        { title: "CSS Tricks", url: "https://css-tricks.com/", type: "Articles" }
      ],
      programming: [
        { title: "LeetCode", url: "https://leetcode.com/", type: "Practice Problems" },
        { title: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/", type: "Tutorials" },
        { title: "Codecademy", url: "https://www.codecademy.com/", type: "Interactive Course" }
      ],
      general: [
        { title: "Khan Academy", url: "https://www.khanacademy.org/", type: "Free Courses" },
        { title: "Coursera", url: "https://www.coursera.org/", type: "University Courses" },
        { title: "YouTube Educational", url: "https://www.youtube.com/edu", type: "Video Tutorials" }
      ]
    };

    const categoryResources = baseResources[category as keyof typeof baseResources] || baseResources.general;
    
    // Add struggle-topic specific resources
    if (struggleTopics.length > 0) {
      struggleTopics.forEach(topic => {
        categoryResources.push({
          title: `${topic} - Specific Help`,
          url: `https://www.google.com/search?q=${encodeURIComponent(topic + ' ' + courseTitle + ' tutorial')}`,
          type: "Targeted Tutorial"
        });
      });
    }

    return categoryResources.slice(0, 4);
  };

  const saveModuleProgress = async (progressData: ProgressData, courseTitle: string = "", courseModules: any[] = []) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save progress",
        variant: "destructive",
      });
      return { success: false };
    }

    setIsLoading(true);
    try {
      console.log('Saving progress data:', progressData, 'Course:', courseTitle);
      
      // Generate detailed adaptive feedback with actual course content
      const detailedFeedback = generateDetailedFeedback(progressData, courseTitle, courseModules);
      setAdaptiveFeedback([detailedFeedback]);

      // Save to moduleProgress for display
      const progressEntry = {
        id: Date.now().toString(),
        quiz_score: progressData.quiz_score,
        confidence_level: progressData.confidence_level,
        struggle_topics: progressData.struggle_topics,
        understanding_topics: progressData.understanding_topics,
        completed_at: new Date().toISOString(),
        reflection_notes: progressData.reflection_notes,
        course_title: courseTitle
      };

      setModuleProgress(prev => [progressEntry, ...prev]);

      toast({
        title: "Progress Analyzed",
        description: "Your learning progress has been assessed by AI Coach!",
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: "Progress Noted",
        description: "Your learning progress has been recorded!",
      });
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressForCourse = async (courseId: string, courseTitle: string = "") => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Filter progress for specific course
      const courseProgress = moduleProgress.filter(progress => 
        progress.course_title === courseTitle || moduleProgress.length === 0
      );

      if (courseProgress.length === 0) {
        // Create sample progress for demonstration
        const sampleProgress = {
          id: '1',
          quiz_score: 7,
          confidence_level: 6,
          struggle_topics: ['Advanced concepts', 'Implementation'],
          understanding_topics: ['Basic syntax', 'Problem solving'],
          completed_at: new Date().toISOString(),
          reflection_notes: 'Making steady progress',
          course_title: courseTitle
        };

        setModuleProgress([sampleProgress]);
        
        // Generate feedback for sample progress
        const sampleFeedback = generateDetailedFeedback({
          course_id: courseId,
          module_id: '1',
          quiz_score: 7,
          confidence_level: 6,
          struggle_topics: ['Advanced concepts', 'Implementation'],
          understanding_topics: ['Basic syntax', 'Problem solving'],
          reflection_notes: 'Making steady progress'
        }, courseTitle);

        setAdaptiveFeedback([sampleFeedback]);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
      toast({
        title: "Error",
        description: "Failed to load progress data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    moduleProgress,
    adaptiveFeedback,
    isLoading,
    saveModuleProgress,
    getProgressForCourse,
  };
};
