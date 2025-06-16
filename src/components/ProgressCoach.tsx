
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  TrendingUp, 
  Target, 
  BookOpen, 
  Award, 
  AlertCircle, 
  CheckCircle2,
  ExternalLink,
  Star,
  Lightbulb,
  Trophy
} from "lucide-react";
import { useProgressTracking } from '@/hooks/useProgressTracking';

interface ProgressCoachProps {
  courseId: string;
  courseName: string;
  totalModules: number;
  courseModules?: any[];
  currentCourse?: {
    id: string;
    title: string;
    progress: number;
    modules: Array<{
      id: string;
      module_title: string;
      lessons: Array<{
        id: string;
        lesson_title: string;
        completed: boolean;
        quiz?: any[];
      }>;
    }>;
  };
}

const ProgressCoach: React.FC<ProgressCoachProps> = ({ 
  courseId, 
  courseName, 
  totalModules,
  courseModules = [],
  currentCourse
}) => {
  const { moduleProgress, adaptiveFeedback, getProgressForCourse, isLoading } = useProgressTracking();
  const [latestFeedback, setLatestFeedback] = useState<any>(null);

  useEffect(() => {
    getProgressForCourse(courseId, courseName);
  }, [courseId, courseName]);

  useEffect(() => {
    if (adaptiveFeedback.length > 0) {
      setLatestFeedback(adaptiveFeedback[0]);
    }
  }, [adaptiveFeedback]);

  // Calculate accurate course progress using currentCourse data
  const calculateAccurateProgress = () => {
    if (!currentCourse || !currentCourse.modules) {
      return {
        totalLessons: 0,
        completedLessons: 0,
        progressPercentage: currentCourse?.progress || 0,
        completedModules: 0
      };
    }

    const totalLessons = currentCourse.modules.reduce((total, module) => 
      total + (module.lessons?.length || 0), 0
    );
    
    const completedLessons = currentCourse.modules.reduce((total, module) => 
      total + (module.lessons?.filter(lesson => lesson.completed).length || 0), 0
    );

    const completedModules = currentCourse.modules.filter(module => 
      module.lessons && module.lessons.length > 0 && 
      module.lessons.every(lesson => lesson.completed)
    ).length;

    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      totalLessons,
      completedLessons,
      progressPercentage,
      completedModules
    };
  };

  // Analyze course content for specific coaching
  const analyzeCourseContent = () => {
    const title = courseName.toLowerCase();
    const moduleContent = courseModules.map(m => m.module_title?.toLowerCase() || '').join(' ');
    const allContent = `${title} ${moduleContent}`;
    
    if (allContent.includes('español') || allContent.includes('spanish') || 
        allContent.includes('gramática') || allContent.includes('vocabulario')) {
      return 'spanish';
    }
    
    if (allContent.includes('react') || allContent.includes('javascript') || 
        allContent.includes('html') || allContent.includes('css')) {
      return 'webdev';
    }
    
    if (allContent.includes('python') || allContent.includes('java') || 
        allContent.includes('programming') || allContent.includes('algorithm')) {
      return 'programming';
    }
    
    return 'general';
  };

  const courseCategory = analyzeCourseContent();
  const accurateProgress = calculateAccurateProgress();
  
  // Calculate average quiz score from module progress
  const averageScore = moduleProgress.length > 0 
    ? Math.round(moduleProgress.reduce((sum, p) => sum + (p.quiz_score || 0), 0) / moduleProgress.length)
    : 0;

  const getDetailedCoachingMessage = () => {
    const recentScores = moduleProgress.slice(0, 3).map(p => p.quiz_score || 0);
    const averageRecentScore = recentScores.length > 0 
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length 
      : 0;

    // Course-specific coaching based on scores and category
    if (courseCategory === 'spanish') {
      if (averageRecentScore >= 8) {
        return `¡Excelente! Your Spanish comprehension is outstanding. You've completed ${accurateProgress.completedLessons}/${accurateProgress.totalLessons} lessons with ${accurateProgress.progressPercentage}% progress. Ready for more complex grammar and conversation practice.`;
      } else if (averageRecentScore >= 6) {
        return `Buen trabajo! Your Spanish is improving steadily. With ${accurateProgress.progressPercentage}% course completion, focus on vocabulary expansion and practice speaking more.`;
      } else {
        return `Tu español está progresando. Currently at ${accurateProgress.progressPercentage}% completion. Take time to review basic grammar and practice with simple conversations. ¡No te rindas!`;
      }
    } else if (courseCategory === 'webdev') {
      if (averageRecentScore >= 8) {
        return `Excellent! You're mastering web development concepts. ${accurateProgress.progressPercentage}% course complete with strong quiz performance. Ready to tackle more complex projects and frameworks.`;
      } else if (averageRecentScore >= 6) {
        return `Good progress! Your coding skills are developing. ${accurateProgress.progressPercentage}% through the course. Practice more hands-on projects to reinforce learning.`;
      } else {
        return `Keep building those foundations! ${accurateProgress.progressPercentage}% course progress. Web development takes time. Focus on understanding core concepts before moving to advanced topics.`;
      }
    } else if (courseCategory === 'programming') {
      if (averageRecentScore >= 8) {
        return `Outstanding! Your programming logic is strong. ${accurateProgress.progressPercentage}% course completion with excellent scores. Time to explore advanced algorithms and system design.`;
      } else if (averageRecentScore >= 6) {
        return `Good work! Your programming concepts are solid. ${accurateProgress.progressPercentage}% progress made. Practice more coding problems to strengthen problem-solving skills.`;
      } else {
        return `Programming fundamentals need more practice. ${accurateProgress.progressPercentage}% course progress. Focus on basic syntax and logic before tackling complex problems.`;
      }
    } else {
      if (averageRecentScore >= 8) {
        return `Excellent mastery of the material! ${accurateProgress.progressPercentage}% course complete with outstanding quiz performance. You're ready to advance to more challenging topics.`;
      } else if (averageRecentScore >= 6) {
        return `Good understanding! ${accurateProgress.progressPercentage}% course progress with solid performance. Keep practicing to strengthen your knowledge foundation.`;
      } else {
        return `${accurateProgress.progressPercentage}% course progress made. Take time to review the fundamentals. Solid understanding is key to future success.`;
      }
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    if (score >= 6) return 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
    return 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30 border-red-200 dark:border-red-800';
  };

  const getPerformanceTrend = () => {
    if (moduleProgress.length < 2) return null;
    
    const recent = moduleProgress.slice(0, 2);
    const trend = recent[0].quiz_score - recent[1].quiz_score;
    
    if (trend > 1) return { direction: 'up', message: 'Improving!', color: 'text-green-600 dark:text-green-400' };
    if (trend < -1) return { direction: 'down', message: 'Needs attention', color: 'text-red-600 dark:text-red-400' };
    return { direction: 'stable', message: 'Steady progress', color: 'text-blue-600 dark:text-blue-400' };
  };

  const performanceTrend = getPerformanceTrend();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course-Specific Progress Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-0 dark:border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
            <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>AI Coach: {courseName}</span>
          </CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {courseCategory === 'spanish' && '🇪🇸 Spanish Learning Journey'}
            {courseCategory === 'webdev' && '💻 Web Development Path'}
            {courseCategory === 'programming' && '🔧 Programming Mastery'}
            {courseCategory === 'general' && '📚 Learning Progress'}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {accurateProgress.completedLessons}/{accurateProgress.totalLessons}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Lessons</div>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className={`text-2xl font-bold px-3 py-1 rounded-lg border ${getScoreColor(averageScore)}`}>
                {averageScore}/10
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Score</div>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{accurateProgress.progressPercentage}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Complete</div>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {accurateProgress.completedModules}/{totalModules}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Modules</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Course Progress</span>
              <span>{accurateProgress.progressPercentage}%</span>
            </div>
            <Progress value={accurateProgress.progressPercentage} className="h-2" />
          </div>
          
          {/* Course-specific coaching message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-400 dark:border-blue-500">
            <div className="flex items-start space-x-2">
              <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <p className="text-blue-800 dark:text-blue-200 font-medium">{getDetailedCoachingMessage()}</p>
            </div>
          </div>

          {/* Performance Trend */}
          {performanceTrend && (
            <div className="flex items-center justify-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <TrendingUp className={`h-4 w-4 ${performanceTrend.color}`} />
              <span className={`text-sm font-medium ${performanceTrend.color}`}>
                {performanceTrend.message}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latest Quiz-Based Feedback */}
      {latestFeedback ? (
        <Card className="bg-white dark:bg-gray-800 border dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
              <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <span>Personalized Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Performance Analysis */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-400 dark:border-purple-500">
              <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2 flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>Performance Analysis</span>
              </h4>
              <p className="text-purple-700 dark:text-purple-300">{latestFeedback.performance_analysis}</p>
            </div>

            {/* Study Recommendations */}
            {latestFeedback.study_recommendations && latestFeedback.study_recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2 flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Study Strategy:</span>
                </h4>
                <div className="space-y-2">
                  {latestFeedback.study_recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start space-x-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Areas to Focus */}
            {latestFeedback.weaknesses && latestFeedback.weaknesses.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span>Focus Areas:</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {latestFeedback.weaknesses.map((weakness: string, index: number) => (
                    <Badge key={index} variant="destructive" className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                      {weakness}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Resources */}
            {latestFeedback.recommended_resources && latestFeedback.recommended_resources.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2 flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-green-500" />
                  <span>Recommended Resources:</span>
                </h4>
                <div className="space-y-2">
                  {latestFeedback.recommended_resources.slice(0, 3).map((resource: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{resource.title}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{resource.type}</div>
                      </div>
                      <Button size="sm" variant="outline" asChild className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advancement Status */}
            <div className={`p-4 rounded-lg ${latestFeedback.should_advance ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-500' : 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500'}`}>
              <div className="flex items-center space-x-2">
                {latestFeedback.should_advance ? (
                  <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                )}
                <span className={`font-medium ${latestFeedback.should_advance ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                  {latestFeedback.should_advance 
                    ? "🎉 Excellent work! Ready for the next module!" 
                    : "📖 Review current topics before advancing."}
                </span>
              </div>
            </div>

            {/* Motivational Message */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-400 dark:border-blue-500">
              <p className="text-blue-800 dark:text-blue-200 font-medium">{latestFeedback.motivational_message}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-gray-800 border dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
              <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <span>AI Coach Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">Ready to provide personalized coaching!</p>
              <p className="text-sm">Complete a module quiz to receive detailed AI feedback tailored to your {courseName} journey.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Quiz Performance */}
      {moduleProgress.length > 0 && (
        <Card className="bg-white dark:bg-gray-800 border dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
              <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span>Recent Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {moduleProgress.slice(0, 3).map((progress, index) => (
                <div key={progress.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Quiz #{moduleProgress.length - index}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(progress.completed_at).toLocaleDateString()}
                    </div>
                    {progress.struggle_topics && progress.struggle_topics.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {progress.struggle_topics.slice(0, 2).map((topic: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className={`text-lg font-bold px-3 py-1 rounded border ${getScoreColor(progress.quiz_score || 0)}`}>
                      {progress.quiz_score || 0}/10
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Confidence: {progress.confidence_level || 0}/10
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProgressCoach;
