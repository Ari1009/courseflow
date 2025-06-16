import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useRecommendedLessons } from '@/hooks/useRecommendedLessons';
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRight, 
  BookOpen, 
  Brain, 
  CheckCircle, 
  Clock, 
  GraduationCap, 
  Lightbulb, 
  Play, 
  Plus, 
  Star, 
  Target,
  TrendingUp,
  RefreshCw,
  Award,
  Rocket
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  audience_level: string;
  duration: string;
  created_at: string;
  modules: any[];
  progress: number;
}

interface LearningPathProps {
  courses: Course[];
  onCourseSelect?: (course: Course) => void;
  onCreateCourse?: (courseData: {
    title: string;
    audience_level: string;
    duration: string;
    instructions?: string;
  }) => Promise<any>;
  currentCourse?: Course;
  newlyCreatedCourse?: Course;
}

const LearningPath: React.FC<LearningPathProps> = ({ 
  courses, 
  onCourseSelect, 
  onCreateCourse,
  currentCourse,
  newlyCreatedCourse 
}) => {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const { toast } = useToast();

  // Calculate actual progress based on completed lessons
  const calculateCourseProgress = (course: Course) => {
    if (!course.modules || course.modules.length === 0) return 0;
    
    let totalLessons = 0;
    let completedLessons = 0;
    
    course.modules.forEach(module => {
      if (module.lessons && module.lessons.length > 0) {
        totalLessons += module.lessons.length;
        completedLessons += module.lessons.filter((lesson: any) => lesson.completed).length;
      }
    });
    
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  };

  // Get quiz scores from localStorage or default
  const getQuizScores = () => {
    try {
      const scores = localStorage.getItem(`quiz_scores_${currentCourse?.id}`);
      return scores ? JSON.parse(scores) : [];
    } catch {
      return [];
    }
  };

  const { recommendedLessons, isLoading, refreshRecommendations, addSimilarLessons } = useRecommendedLessons(
    currentCourse, 
    getQuizScores()
  );

  // Auto-generate similar lessons when a new course is created
  useEffect(() => {
    if (newlyCreatedCourse && addSimilarLessons) {
      addSimilarLessons(newlyCreatedCourse);
    }
  }, [newlyCreatedCourse, addSimilarLessons]);

  // Filter out current course from recommendations
  const otherCourses = courses.filter(course => course.id !== currentCourse?.id);

  // Analyze course content to suggest next steps
  const analyzeCourseContent = (course: Course) => {
    const title = course.title.toLowerCase();
    const moduleContent = course.modules?.map(m => m.module_title?.toLowerCase() || '').join(' ') || '';
    const allContent = `${title} ${moduleContent}`;
    
    if (allContent.includes('español') || allContent.includes('spanish')) return 'spanish';
    if (allContent.includes('react') || allContent.includes('javascript') || allContent.includes('web')) return 'webdev';
    if (allContent.includes('python') || allContent.includes('programming')) return 'programming';
    if (allContent.includes('data') || allContent.includes('machine learning')) return 'datascience';
    return 'general';
  };

  // Get recommended courses based on current course
  const getRecommendedCourses = useMemo(() => {
    if (!currentCourse) return otherCourses.slice(0, 3);
    
    const currentCategory = analyzeCourseContent(currentCourse);
    const currentLevel = currentCourse.audience_level.toLowerCase();
    
    // Score courses based on relevance
    const scoredCourses = otherCourses.map(course => {
      let score = 0;
      const courseCategory = analyzeCourseContent(course);
      const courseLevel = course.audience_level.toLowerCase();
      
      // Same category bonus
      if (courseCategory === currentCategory) score += 30;
      
      // Progressive difficulty bonus
      if (currentLevel === 'beginner' && courseLevel === 'intermediate') score += 25;
      if (currentLevel === 'intermediate' && courseLevel === 'advanced') score += 25;
      if (currentLevel === 'advanced' && courseLevel === 'expert') score += 20;
      
      // Complementary skills bonus
      if (currentCategory === 'webdev' && courseCategory === 'programming') score += 15;
      if (currentCategory === 'programming' && courseCategory === 'datascience') score += 15;
      if (currentCategory === 'spanish' && courseCategory === 'general') score += 10;
      
      // Recent courses bonus (more recent = higher score)
      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(course.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      score += Math.max(0, 10 - daysSinceCreation);
      
      return { course, score };
    });
    
    return scoredCourses
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.course);
  }, [currentCourse, otherCourses]);

  const handleStartLearning = async (courseData: any) => {
    setIsGenerating(courseData.title);
    try {
      if (onCreateCourse) {
        const newCourse = await onCreateCourse({
          title: courseData.title,
          audience_level: courseData.difficulty || 'intermediate',
          duration: courseData.estimatedTime || '8-12 hours',
          instructions: `Create an advanced course on ${courseData.title}. ${courseData.description || ''} This should build upon foundational knowledge and focus on practical applications.`
        });
        
        if (newCourse && addSimilarLessons) {
          addSimilarLessons(newCourse);
        }
        
        toast({
          title: "Advanced Course Created",
          description: `New course "${courseData.title}" has been generated with AI-powered lesson recommendations!`,
        });
      }
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(null);
    }
  };

  const handleRefreshRecommendations = () => {
    refreshRecommendations();
    toast({
      title: "Recommendations Updated",
      description: "Generated new AI-powered lesson recommendations based on your learning progress",
    });
  };

  if (!currentCourse) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <CardTitle className="text-xl mb-2">Select a Course First</CardTitle>
          <CardDescription>
            Choose a course to see personalized progress recommendations and next steps
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  const currentProgress = calculateCourseProgress(currentCourse);

  return (
    <div className="space-y-8">
      {/* Progress Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-green-600 text-white border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center space-x-2">
                <TrendingUp className="h-6 w-6" />
                <span>Your Learning Progress</span>
              </CardTitle>
              <CardDescription className="text-blue-100">
                AI-powered recommendations for advancing your {currentCourse.title} expertise
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{currentProgress}%</div>
              <div className="text-sm text-blue-200">Complete</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* AI-Generated Lesson Recommendations */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2 text-2xl">
                <Brain className="h-6 w-6 text-purple-600" />
                <span>Next Level Recommendations</span>
              </CardTitle>
              <CardDescription>
                AI-generated lessons that build upon your current learning and advance your expertise (Max 6 lessons)
              </CardDescription>
            </div>
            <Button
              onClick={handleRefreshRecommendations}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh AI Recommendations
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendedLessons.map((lesson) => (
                <Card key={lesson.id} className="bg-white border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg leading-tight">{lesson.title}</CardTitle>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant={lesson.difficulty === 'Beginner' ? 'secondary' : lesson.difficulty === 'Intermediate' ? 'default' : 'destructive'}>
                          {lesson.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          AI Generated
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="text-sm leading-relaxed">{lesson.description}</CardDescription>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{lesson.estimatedTime}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Target className="h-4 w-4" />
                        <span>{lesson.category}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      onClick={() => handleStartLearning(lesson)}
                      disabled={isGenerating === lesson.title}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {isGenerating === lesson.title ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating Course...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Create Advanced Course
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Next Courses */}
      <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-2xl">
            <Rocket className="h-6 w-6 text-green-600" />
            <span>Next Courses</span>
          </CardTitle>
          <CardDescription>
            Courses recommended based on your {currentCourse.title} progress and interests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {getRecommendedCourses.map((course) => {
              const category = analyzeCourseContent(course);
              const courseProgress = calculateCourseProgress(course);
              const categoryIcons = {
                spanish: '🇪🇸',
                webdev: '💻',
                programming: '⚡',
                datascience: '📊',
                general: '📚'
              };

              return (
                <Card key={course.id} className="bg-white border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onCourseSelect?.(course)}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <span className="text-2xl">
                          {categoryIcons[category as keyof typeof categoryIcons] || '📚'}
                        </span>
                        <span className="line-clamp-2">{course.title}</span>
                      </CardTitle>
                      <Badge variant="outline">{course.audience_level}</Badge>
                    </div>
                    <CardDescription className="text-sm">
                      Duration: {course.duration}
                    </CardDescription>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{courseProgress}%</span>
                      </div>
                      <Progress value={courseProgress} className="h-2" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onCourseSelect?.(course);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Continue Course
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Learning Statistics */}
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-2xl">
            <Award className="h-6 w-6 text-orange-600" />
            <span>Learning Statistics</span>
          </CardTitle>
          <CardDescription>
            Your learning journey metrics and achievements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{courses.length}</div>
              <div className="text-sm text-gray-600">Courses Created</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {Math.round(courses.reduce((sum, c) => sum + calculateCourseProgress(c), 0) / courses.length) || 0}%
              </div>
              <div className="text-sm text-gray-600">Avg Progress</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {courses.reduce((sum, c) => sum + (c.modules?.length || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Modules</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {courses.filter(c => calculateCourseProgress(c) === 100).length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LearningPath;
