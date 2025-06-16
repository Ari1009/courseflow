import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  Play, 
  Target,
  Brain,
  Circle,
  Award,
  TrendingUp,
  Rocket
} from "lucide-react";
import QuizModal from "./QuizModal";
import ModuleCheckpoint from "./ModuleCheckpoint";
import ProgressCoach from "./ProgressCoach";
import LearningRoadmap from "./LearningRoadmap";
import LearningPath from './LearningPath';
import AITutor from "./AITutor";

interface Course {
  id: string;
  title: string;
  audience_level: string;
  duration: string;
  created_at: string;
  modules: Module[];
  progress: number;
}

interface Module {
  id: string;
  module_title: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  lesson_title: string;
  objectives: string[];
  content: string;
  quiz: QuizQuestion[];
  free_resources: Resource[];
  completed: boolean; // Made required to match ProgressCoach expectations
}

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface Resource {
  title: string;
  url: string;
}

interface CourseViewerProps {
  course: Course;
  allCourses: Course[];
  onBack: () => void;
  onLessonComplete: (courseId: string, moduleIndex: number, lessonIndex: number) => void;
  onCourseSelect?: (course: Course) => void;
  onCreateCourse?: (courseData: {
    title: string;
    audience_level: string;
    duration: string;
    instructions?: string;
  }) => Promise<any>;
}

const CourseViewer: React.FC<CourseViewerProps> = ({ 
  course, 
  allCourses, 
  onBack, 
  onLessonComplete, 
  onCourseSelect,
  onCreateCourse 
}) => {
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [lastQuizScore, setLastQuizScore] = useState(0);
  const [newlyCreatedCourse, setNewlyCreatedCourse] = useState<Course | null>(null);
  const [justCompletedLesson, setJustCompletedLesson] = useState<{moduleIndex: number, lessonIndex: number} | null>(null);

  const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0);
  const completedLessons = course.modules.reduce((total, module, moduleIdx) => {
    if (moduleIdx < currentModuleIndex) return total + module.lessons.length;
    if (moduleIdx === currentModuleIndex) return total + currentLessonIndex;
    return total;
  }, 0);

  const currentModule = course.modules[currentModuleIndex];
  const currentLesson = currentModule?.lessons[currentLessonIndex];
  const progressPercentage = (completedLessons / totalLessons) * 100;

  const handleLessonSelect = (moduleIndex: number, lessonIndex: number) => {
    setCurrentModuleIndex(moduleIndex);
    setCurrentLessonIndex(lessonIndex);
  };

  const handleMarkComplete = () => {
    if (currentLesson) {
      // Set the completion state immediately for visual feedback
      setJustCompletedLesson({ moduleIndex: currentModuleIndex, lessonIndex: currentLessonIndex });
      
      // Call the completion handler
      onLessonComplete(course.id, currentModuleIndex, currentLessonIndex);
      
      // Clear the visual feedback after a short delay
      setTimeout(() => {
        setJustCompletedLesson(null);
      }, 2000);
      
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  const handleQuizComplete = async (score: number, percentage: number) => {
    setShowQuiz(false);
    setLastQuizScore(score);
    
    // Mark lesson as complete
    await onLessonComplete(course.id, currentModuleIndex, currentLessonIndex);
    
    // Show checkpoint after quiz completion with course context including modules
    setShowCheckpoint(true);
  };

  const handleCheckpointComplete = () => {
    setShowCheckpoint(false);
    
    // Move to next lesson or module
    const currentModule = course.modules[currentModuleIndex];
    if (currentLessonIndex < currentModule.lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    } else if (currentModuleIndex < course.modules.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
      setCurrentLessonIndex(0);
    }
  };

  // Enhanced function for creating courses with better context
  const handleCreateCourse = async (courseData: any) => {
    if (onCreateCourse) {
      try {
        const newCourse = await onCreateCourse(courseData);
        if (newCourse) {
          // Set the newly created course to trigger auto-generation of similar lessons
          setNewlyCreatedCourse(newCourse);
          // Clear it after a short delay to avoid repeated triggers
          setTimeout(() => setNewlyCreatedCourse(null), 1000);
        }
        return newCourse;
      } catch (error) {
        console.error('Error creating course:', error);
        throw error;
      }
    } else {
      console.log('Create course functionality will be implemented with:', courseData);
      return Promise.resolve();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                onClick={onBack}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>
                <p className="text-sm text-gray-600">
                  {course.audience_level} • {course.duration}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="px-3 py-1">
                {completedLessons}/{totalLessons} Lessons
              </Badge>
              <div className="w-32">
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="content" className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Course Content</span>
            </TabsTrigger>
            <TabsTrigger value="tutor" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>AI Tutor</span>
            </TabsTrigger>
            <TabsTrigger value="learning-path" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Progress</span>
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="flex items-center space-x-2">
              <Rocket className="h-4 w-4" />
              <span>Expansion Roadmap</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Course Navigation Sidebar */}
              <div className="lg:col-span-1">
                <Card className="bg-white shadow-lg border-0 sticky top-8">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-t-lg">
                    <CardTitle className="text-lg">Course Progress</CardTitle>
                    <CardDescription className="text-blue-100">
                      {completedLessons} of {totalLessons} lessons completed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Progress value={course.progress} className="mb-4" />
                    <div className="text-center text-sm font-medium text-gray-700 mb-6">
                      {course.progress}% Complete
                    </div>

                    {/* Module List */}
                    <div className="space-y-4">
                      {course.modules.map((module, moduleIndex) => (
                        <div key={moduleIndex} className="space-y-2">
                          <h3 className="font-medium text-gray-800 text-sm">
                            Module {moduleIndex + 1}: {module.module_title}
                          </h3>
                          <div className="space-y-1 ml-2">
                            {module.lessons.map((lesson, lessonIndex) => {
                              const isJustCompleted = justCompletedLesson?.moduleIndex === moduleIndex && 
                                                    justCompletedLesson?.lessonIndex === lessonIndex;
                              
                              return (
                                <button
                                  key={lessonIndex}
                                  onClick={() => handleLessonSelect(moduleIndex, lessonIndex)}
                                  className={`w-full text-left p-2 rounded-lg text-sm transition-all duration-300 flex items-center space-x-2 ${
                                    currentModuleIndex === moduleIndex && currentLessonIndex === lessonIndex
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : 'hover:bg-gray-50 text-gray-700'
                                  } ${isJustCompleted ? 'animate-pulse bg-green-50 border-green-200' : ''}`}
                                >
                                  {lesson.completed || isJustCompleted ? (
                                    <CheckCircle className={`h-4 w-4 flex-shrink-0 transition-all duration-300 ${
                                      isJustCompleted ? 'text-green-500 scale-110' : 'text-green-500'
                                    }`} />
                                  ) : (
                                    <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{lesson.lesson_title}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-3">
                {currentLesson ? (
                  <div className="space-y-6">
                    {/* Lesson Header */}
                    <Card className="bg-white shadow-lg border-0">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-2xl text-gray-800">
                              {currentLesson.lesson_title}
                            </CardTitle>
                            <CardDescription className="text-gray-600 mt-2">
                              Module {currentModuleIndex + 1} • Lesson {currentLessonIndex + 1}
                            </CardDescription>
                          </div>
                          {(currentLesson.completed || (justCompletedLesson?.moduleIndex === currentModuleIndex && 
                                                      justCompletedLesson?.lessonIndex === currentLessonIndex)) && (
                            <Badge className={`bg-green-100 text-green-800 transition-all duration-300 ${
                              justCompletedLesson?.moduleIndex === currentModuleIndex && 
                              justCompletedLesson?.lessonIndex === currentLessonIndex ? 'scale-110' : ''
                            }`}>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Learning Objectives */}
                    <Card className="bg-white shadow-lg border-0">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <Target className="h-5 w-5 text-blue-600" />
                          <span>Learning Objectives</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {currentLesson.objectives.map((objective, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              </div>
                              <span className="text-gray-700">{objective}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Lesson Content */}
                    <Card className="bg-white shadow-lg border-0">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <BookOpen className="h-5 w-5 text-green-600" />
                          <span>Lesson Content</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose max-w-none">
                          <p className="text-gray-700 leading-relaxed">
                            {currentLesson.content}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Free Resources */}
                    <Card className="bg-white shadow-lg border-0">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <ExternalLink className="h-5 w-5 text-purple-600" />
                          <span>Additional Resources</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3">
                          {currentLesson.free_resources.map((resource, index) => (
                            <a
                              key={index}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="bg-purple-100 p-2 rounded-lg">
                                <ExternalLink className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-800">{resource.title}</h4>
                                <p className="text-sm text-gray-600">{resource.url}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center">
                      <Button
                        onClick={() => setShowQuiz(true)}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Take Quiz
                      </Button>
                      
                      {!currentLesson.completed && (
                        <Button
                          onClick={handleMarkComplete}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  // Course Overview
                  <Card className="bg-white shadow-lg border-0">
                    <CardHeader className="text-center py-12">
                      <div className="bg-gradient-to-r from-blue-600 to-green-600 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-white" />
                      </div>
                      <CardTitle className="text-2xl text-gray-800 mb-2">
                        Welcome to {course.title}
                      </CardTitle>
                      <CardDescription className="text-gray-600 max-w-2xl mx-auto">
                        Select a lesson from the navigation panel to begin your learning journey. 
                        This course contains {totalLessons} lessons across {course.modules.length} modules.
                      </CardDescription>
                      <div className="mt-8">
                        <Button
                          onClick={() => handleLessonSelect(0, 0)}
                          className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-3"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start First Lesson
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tutor">
            <AITutor 
              courseId={course.id}
              courseTitle={course.title}
              currentCourse={course}
            />
          </TabsContent>

          <TabsContent value="learning-path">
            <LearningPath 
              courses={allCourses}
              onCourseSelect={onCourseSelect}
              onCreateCourse={handleCreateCourse}
              currentCourse={course}
              newlyCreatedCourse={newlyCreatedCourse}
            />
          </TabsContent>

          <TabsContent value="roadmap">
            <LearningRoadmap 
              courses={allCourses}
              onCourseSelect={onCourseSelect}
              onCreateCourse={handleCreateCourse}
              currentCourse={course}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Quiz Modal */}
      {showQuiz && currentLesson && (
        <QuizModal
          questions={currentLesson.quiz.map((q, index) => ({
            id: `${currentModuleIndex}-${currentLessonIndex}-${index}`,
            question: q.question,
            options: q.options,
            correct_answer: q.answer, // Use q.answer as the correct answer
            question_order: index + 1
          }))}
          isOpen={showQuiz}
          onClose={() => setShowQuiz(false)}
          onQuizComplete={handleQuizComplete}
          lessonTitle={currentLesson.lesson_title}
          courseId={course.id}
          lessonId={currentLesson.id || `${course.id}-${currentModuleIndex}-${currentLessonIndex}`}
        />
      )}

      {/* Module Checkpoint Modal - Pass course modules for better context */}
      {showCheckpoint && currentLesson && currentModule && (
        <ModuleCheckpoint
          isOpen={showCheckpoint}
          onClose={handleCheckpointComplete}
          courseId={course.id}
          moduleId={currentModule.id}
          moduleName={currentModule.module_title}
          quizScore={lastQuizScore}
          totalQuestions={currentLesson.quiz.length}
          courseTitle={course.title}
          courseModules={course.modules}
        />
      )}
    </div>
  );
};

export default CourseViewer;
