
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BookOpen, Clock, Target, Trash2, Play, Award, FolderOpen, TrendingUp } from "lucide-react";
import FolderManager from './FolderManager';
import LearningPath from './LearningPath';

interface Course {
  id: string;
  title: string;
  audience_level: string;
  duration: string;
  created_at: string;
  modules: any[];
  progress: number;
  folder_id?: string;
}

interface DashboardProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onMoveCourse?: (courseId: string, folderId: string | null) => void;
  onCreateCourse?: (courseData: {
    title: string;
    audience_level: string;
    duration: string;
    instructions?: string;
    folder_id?: string;
  }) => Promise<any>;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  courses, 
  onSelectCourse, 
  onDeleteCourse, 
  onMoveCourse,
  onCreateCourse 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [draggedCourse, setDraggedCourse] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Auto-select the first course when switching to progress tab and no course is selected
  useEffect(() => {
    if (activeTab === 'progress' && courses.length > 0 && !selectedCourse) {
      // Select the course with the highest progress, or the most recent one
      const courseToSelect = courses.reduce((best, current) => {
        const currentProgress = calculateCourseProgress(current);
        const bestProgress = calculateCourseProgress(best);
        
        if (currentProgress > bestProgress) return current;
        if (currentProgress === bestProgress) {
          return new Date(current.created_at) > new Date(best.created_at) ? current : best;
        }
        return best;
      });
      
      setSelectedCourse(courseToSelect);
    }
  }, [activeTab, courses, selectedCourse]);

  const getProgressStatus = (progress: number) => {
    if (progress === 0) return { status: 'Not Started', color: 'bg-gray-500' };
    if (progress < 100) return { status: 'In Progress', color: 'bg-blue-500' };
    return { status: 'Completed', color: 'bg-green-500' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDragStart = (e: React.DragEvent, courseId: string) => {
    setDraggedCourse(courseId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedCourse(null);
  };

  const handleCreateAndRedirect = async (courseData: {
    title: string;
    audience_level: string;
    duration: string;
    instructions?: string;
    folder_id?: string;
  }) => {
    if (onCreateCourse) {
      const newCourse = await onCreateCourse(courseData);
      if (newCourse) {
        // Switch to overview tab and select the course
        setActiveTab('overview');
        setTimeout(() => onSelectCourse(newCourse), 100);
      }
      return newCourse;
    }
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    onSelectCourse(course);
  };

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

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-700 border border-blue-100 dark:border-gray-600">
          <TabsTrigger value="overview" className="flex items-center space-x-2 transition-all hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-green-500 data-[state=active]:text-white">
            <BookOpen className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center space-x-2 transition-all hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-green-500 data-[state=active]:text-white">
            <TrendingUp className="h-4 w-4" />
            <span>Progress</span>
          </TabsTrigger>
          <TabsTrigger value="folders" className="flex items-center space-x-2 transition-all hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-green-500 data-[state=active]:text-white">
            <FolderOpen className="h-4 w-4" />
            <span>Organize</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="animate-scale-in">
          {courses.length === 0 ? (
            <div className="text-center py-12 animate-fade-in">
              <div className="bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900 dark:to-green-900 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center shadow-lg animate-pulse">
                <BookOpen className="h-12 w-12 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">No Courses Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first AI-generated course to get started with your learning journey.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Use the "Organize" tab to generate your first course.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 hover:shadow-xl transition-all hover:scale-105">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Total Courses</p>
                        <p className="text-2xl font-bold">{courses.length}</p>
                      </div>
                      <BookOpen className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 hover:shadow-xl transition-all hover:scale-105">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Completed</p>
                        <p className="text-2xl font-bold">{courses.filter(c => calculateCourseProgress(c) === 100).length}</p>
                      </div>
                      <Award className="h-8 w-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 hover:shadow-xl transition-all hover:scale-105">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm">In Progress</p>
                        <p className="text-2xl font-bold">{courses.filter(c => {
                          const progress = calculateCourseProgress(c);
                          return progress > 0 && progress < 100;
                        }).length}</p>
                      </div>
                      <Target className="h-8 w-8 text-orange-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 hover:shadow-xl transition-all hover:scale-105">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Avg Progress</p>
                        <p className="text-2xl font-bold">
                          {courses.length > 0 ? Math.round(courses.reduce((sum, c) => sum + calculateCourseProgress(c), 0) / courses.length) : 0}%
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Courses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => {
                  const actualProgress = calculateCourseProgress(course);
                  const progressInfo = getProgressStatus(actualProgress);
                  const totalLessons = course.modules.reduce((total, module) => total + (module.lessons?.length || 0), 0);
                  
                  return (
                    <Card 
                      key={course.id} 
                      className={`bg-white dark:bg-gray-800 shadow-lg border-0 dark:border dark:border-gray-700 hover:shadow-xl transition-all cursor-move hover:scale-105 animate-scale-in ${
                        draggedCourse === course.id ? 'opacity-50' : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, course.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-200 truncate">
                              {course.title}
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Created {formatDate(course.created_at)}
                            </CardDescription>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white dark:bg-gray-800 border dark:border-gray-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-gray-900 dark:text-gray-100">Delete Course</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
                                  Are you sure you want to delete "{course.title}"? This action cannot be undone and will permanently remove the course and all its content.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => onDeleteCourse(course.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Delete Course
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Course Info */}
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Target className="h-4 w-4" />
                            <span className="capitalize">{course.audience_level}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{course.duration}</span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                            <Badge 
                              variant="secondary" 
                              className={`${progressInfo.color} text-white text-xs transition-all hover:scale-105`}
                            >
                              {progressInfo.status}
                            </Badge>
                          </div>
                          <Progress value={actualProgress} className="h-2" />
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{actualProgress}% Complete</span>
                            <span>{totalLessons} Lessons</span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <Button 
                          onClick={() => handleCourseSelect(course)}
                          className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white transition-all hover:scale-105"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {actualProgress === 0 ? 'Start Course' : actualProgress === 100 ? 'Review Course' : 'Continue Learning'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="animate-scale-in">
          <LearningPath 
            courses={courses}
            onCourseSelect={handleCourseSelect}
            onCreateCourse={handleCreateAndRedirect}
            currentCourse={selectedCourse}
          />
        </TabsContent>

        <TabsContent value="folders" className="animate-scale-in">
          <FolderManager 
            courses={courses} 
            onMoveCourse={onMoveCourse || (() => {})}
            onCreateCourse={handleCreateAndRedirect}
            draggedCourse={draggedCourse}
            onDragEnd={handleDragEnd}
            onSelectCourse={handleCourseSelect}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
