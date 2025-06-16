
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import AuthPage from '@/components/AuthPage';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Brain, Target, Users, Clock, Award, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CourseViewer from "@/components/CourseViewer";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { courses, isLoading, createCourse, deleteCourse, updateLessonCompletion, moveCourseToFolder } = useCourses();
  const [activeTab, setActiveTab] = useState('create');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Course creation form state
  const [courseTitle, setCourseTitle] = useState('');
  const [audienceLevel, setAudienceLevel] = useState('');
  const [duration, setDuration] = useState('');
  const [instructions, setInstructions] = useState('');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const generateCourse = async (courseData?: {
    title: string;
    audience_level: string;
    duration: string;
    instructions?: string;
  }) => {
    const data = courseData || {
      title: courseTitle,
      audience_level: audienceLevel,
      duration: duration,
      instructions: instructions,
    };

    if (!data.title || !data.audience_level || !data.duration) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      await createCourse(data);

      toast({
        title: "Course Generated Successfully!",
        description: `Your course "${data.title}" has been created with AI-generated content.`,
      });

      // Reset form only if called from the form
      if (!courseData) {
        setCourseTitle('');
        setAudienceLevel('');
        setDuration('');
        setInstructions('');
        
        // Switch to dashboard
        setActiveTab('dashboard');
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "There was an error generating your course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out.",
    });
  };

  const markLessonComplete = async (courseId: string, moduleIndex: number, lessonIndex: number) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      const lessonId = course.modules[moduleIndex].lessons[lessonIndex].id;
      await updateLessonCompletion(lessonId, true);
    }
  };

  if (selectedCourse) {
    return (
      <CourseViewer 
        course={selectedCourse} 
        allCourses={courses}
        onBack={() => setSelectedCourse(null)}
        onLessonComplete={markLessonComplete}
        onCourseSelect={setSelectedCourse}
        onCreateCourse={generateCourse}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                CourseFlow
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className="text-sm text-gray-600 dark:text-gray-300">Welcome, {user.email}</span>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white dark:bg-gray-800 border dark:border-gray-700">
            <TabsTrigger value="create" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-green-500 data-[state=active]:text-white">
              <BookOpen className="h-4 w-4" />
              <span>Create Course</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-green-500 data-[state=active]:text-white">
              <Users className="h-4 w-4" />
              <span>My Courses ({courses.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Course Creation Form */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg border-0 dark:border dark:border-gray-700 animate-scale-in">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Create New Course</span>
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    Let AI generate a complete course with lessons, quizzes, and resources
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium dark:text-gray-200">Course Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Introduction to Web Development"
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      className="border-gray-300 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level" className="text-sm font-medium dark:text-gray-200">Difficulty *</Label>
                    <Select value={audienceLevel} onValueChange={setAudienceLevel}>
                      <SelectTrigger className="border-gray-300 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                        <SelectValue placeholder="Select difficulty level" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-600">
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-sm font-medium dark:text-gray-200">Duration *</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="border-gray-300 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-600">
                        <SelectItem value="1-2 hours">1-2 hours</SelectItem>
                        <SelectItem value="3-5 hours">3-5 hours</SelectItem>
                        <SelectItem value="6-10 hours">6-10 hours</SelectItem>
                        <SelectItem value="10+ hours">10+ hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions" className="text-sm font-medium dark:text-gray-200">Additional Instructions</Label>
                    <Textarea
                      id="instructions"
                      placeholder="Any specific requirements or focus areas..."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="border-gray-300 focus:border-blue-500 resize-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={() => generateCourse()}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-medium py-3 hover:scale-105 transition-all duration-300"
                  >
                    {isGenerating ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Generating Course...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Brain className="h-4 w-4" />
                        <span>Generate Course with AI</span>
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Features Overview */}
              <div className="space-y-6">
                <Card className="bg-white dark:bg-gray-800 shadow-lg border-0 dark:border dark:border-gray-700 animate-scale-in">
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-800 dark:text-gray-200">What You'll Get</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start space-x-3 hover:scale-105 transition-transform duration-200">
                      <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">Structured Content</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Complete lessons with learning objectives and detailed explanations</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 hover:scale-105 transition-transform duration-200">
                      <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                        <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">Interactive Quizzes</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Test your knowledge with AI-generated multiple choice questions</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 hover:scale-105 transition-transform duration-200">
                      <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
                        <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">Curated Resources</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Free learning materials from YouTube, blogs, and documentation</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 hover:scale-105 transition-transform duration-200">
                      <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg">
                        <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">Progress Tracking</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Monitor your learning progress and completion status</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dashboard">
            <Dashboard 
              courses={courses} 
              onSelectCourse={setSelectedCourse}
              onDeleteCourse={deleteCourse}
              onMoveCourse={moveCourseToFolder}
              onCreateCourse={generateCourse}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
