import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowRight, 
  BookOpen, 
  Briefcase, 
  Code, 
  ExternalLink, 
  GraduationCap, 
  Lightbulb, 
  Play, 
  Plus, 
  Rocket, 
  Star, 
  Target,
  User,
  Calendar,
  MapPin,
  Globe,
  CheckCircle,
  Clock,
  Brain,
  Trophy,
  RefreshCw
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

interface LearningRoadmapProps {
  courses: Course[];
  onCourseSelect: (course: Course) => void;
  onCreateCourse: (courseData: {
    title: string;
    audience_level: string;
    duration: string;
    instructions?: string;
  }) => Promise<any>;
  currentCourse?: Course;
}

const LearningRoadmap: React.FC<LearningRoadmapProps> = ({ 
  courses, 
  onCourseSelect, 
  onCreateCourse,
  currentCourse 
}) => {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [aiCoachFeedback, setAiCoachFeedback] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dynamicProjects, setDynamicProjects] = useState<any[]>([]);
  const [dynamicOpportunities, setDynamicOpportunities] = useState<any[]>([]);
  const { toast } = useToast();

  // Analyze current course content specifically
  const analyzeCourseContent = useMemo(() => {
    if (!currentCourse) return 'general';
    
    const title = currentCourse.title.toLowerCase();
    const moduleContent = currentCourse.modules?.map(m => m.module_title?.toLowerCase() || '').join(' ') || '';
    const allContent = `${title} ${moduleContent}`;
    
    console.log('Analyzing course for expansion roadmap:', { title, moduleContent, allContent });
    
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
    
    return 'general';
  }, [currentCourse]);

  // Auto-generate projects and opportunities on course creation
  useEffect(() => {
    if (currentCourse && dynamicProjects.length === 0) {
      generateDynamicContent();
    }
  }, [currentCourse]);

  const generateDynamicContent = async () => {
    if (!currentCourse) return;
    
    setIsRefreshing(true);
    try {
      console.log('Generating AI content for course:', currentCourse.title);
      
      // Generate projects using Groq
      const projectsResponse = await supabase.functions.invoke('generate-roadmap-content', {
        body: {
          courseTitle: currentCourse.title,
          category: analyzeCourseContent,
          contentType: 'projects'
        }
      });

      // Generate opportunities using Groq
      const opportunitiesResponse = await supabase.functions.invoke('generate-roadmap-content', {
        body: {
          courseTitle: currentCourse.title,
          category: analyzeCourseContent,
          contentType: 'opportunities'
        }
      });

      if (projectsResponse.data?.success && projectsResponse.data.content?.projects) {
        setDynamicProjects(projectsResponse.data.content.projects);
        console.log('Generated projects:', projectsResponse.data.content.projects);
      } else {
        console.error('Projects generation failed:', projectsResponse);
        setDynamicProjects(getFallbackProjects());
      }

      if (opportunitiesResponse.data?.success && opportunitiesResponse.data.content?.opportunities) {
        setDynamicOpportunities(opportunitiesResponse.data.content.opportunities);
        console.log('Generated opportunities:', opportunitiesResponse.data.content.opportunities);
      } else {
        console.error('Opportunities generation failed:', opportunitiesResponse);
        setDynamicOpportunities(getFallbackOpportunities());
      }
      
      toast({
        title: "AI Content Generated",
        description: "Created personalized projects and opportunities using Groq AI",
      });
    } catch (error) {
      console.error('Error generating dynamic content:', error);
      setDynamicProjects(getFallbackProjects());
      setDynamicOpportunities(getFallbackOpportunities());
      toast({
        title: "Using Fallback Content",
        description: "AI generation failed, using backup content",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getFallbackProjects = () => [
    {
      title: `${currentCourse?.title || 'Learning'} Foundation Project`,
      difficulty: "Beginner",
      duration: "1-2 weeks",
      description: `Build a fundamental project that demonstrates core concepts from ${currentCourse?.title || 'your course'}`,
      tasks: [
        `Set up project structure for ${currentCourse?.title || 'your topic'}`,
        "Implement basic functionality",
        "Add user interface components",
        "Test core features",
        "Document your learning process",
        "Create project presentation"
      ]
    }
  ];

  const getFallbackOpportunities = () => [
    {
      title: `${currentCourse?.title || 'Skills'} Specialist`,
      type: "Freelance",
      company: "Various Clients",
      location: "Remote",
      salary: "$25-50/hour",
      description: `Apply your ${currentCourse?.title || 'skills'} to help clients solve problems`,
      requirements: [
        `Proficiency in ${currentCourse?.title || 'the subject'}`,
        "Strong communication skills",
        "Problem-solving abilities",
        "Portfolio of relevant work"
      ],
      website: "https://www.upwork.com"
    }
  ];

  // Course-specific project vault
  const getProjectVault = useMemo(() => {
    const projects = {
      spanish: [
        {
          title: "Spanish Conversation Practice App",
          difficulty: "Intermediate",
          duration: "2-3 weeks",
          description: "Create an interactive app for practicing Spanish conversations with AI",
          tasks: [
            "Design conversational scenarios in Spanish",
            "Create vocabulary flashcard system", 
            "Build pronunciation practice module",
            "Add grammar correction features",
            "Implement progress tracking in Spanish",
            "Create cultural context lessons",
            "Add voice recognition for Spanish"
          ]
        },
        {
          title: "Spanish Learning Blog & Portfolio",
          difficulty: "Beginner", 
          duration: "1-2 weeks",
          description: "Build a blog documenting your Spanish learning journey",
          tasks: [
            "Set up blog structure with Spanish categories",
            "Write weekly progress posts in Spanish",
            "Create grammar tip sections",
            "Add vocabulary of the week features", 
            "Build interactive Spanish quizzes",
            "Include cultural insights posts",
            "Create Spanish-English translation exercises"
          ]
        }
      ],
      webdev: [
        {
          title: "Portfolio Website Builder",
          difficulty: "Beginner",
          duration: "1-2 weeks",
          description: "Create a drag-and-drop portfolio builder for developers",
          tasks: [
            "Set up React app with routing",
            "Create responsive layout components",
            "Implement drag-and-drop functionality", 
            "Add project showcase templates",
            "Build contact form with validation",
            "Add dark/light theme toggle",
            "Deploy to hosting platform"
          ]
        },
        {
          title: "Real-time Collaboration App",
          difficulty: "Advanced",
          duration: "4-5 weeks",
          description: "Build a real-time collaborative workspace like Notion",
          tasks: [
            "Set up WebSocket server for real-time updates",
            "Implement rich text editor with collaborative editing",
            "Create user presence indicators",
            "Add file upload and media handling",
            "Implement permissions and sharing",
            "Build mobile-responsive interface",
            "Add offline support and sync"
          ]
        }
      ],
      programming: [
        {
          title: "Algorithm Visualizer",
          difficulty: "Intermediate", 
          duration: "2-3 weeks",
          description: "Interactive tool to visualize sorting and searching algorithms",
          tasks: [
            "Set up project structure and UI framework",
            "Implement basic sorting algorithms",
            "Create visualization canvas with animations",
            "Add user controls for speed and array size",
            "Implement searching algorithms", 
            "Add algorithm complexity information",
            "Deploy and optimize performance"
          ]
        }
      ],
      general: [
        {
          title: "Personal Learning Dashboard",
          difficulty: "Beginner",
          duration: "1-2 weeks",
          description: "Track and visualize your learning progress across topics",
          tasks: [
            "Create learning goal setting interface",
            "Build progress visualization charts", 
            "Add note-taking functionality",
            "Implement reminder system",
            "Create achievement badges",
            "Add study time tracking",
            "Build export/sharing features"
          ]
        }
      ]
    };
    
    return projects[analyzeCourseContent as keyof typeof projects] || projects.general;
  }, [analyzeCourseContent]);

  // Course-specific opportunities
  const getOpportunities = useMemo(() => {
    const opportunities = {
      spanish: [
        {
          title: "Spanish Tutoring Opportunity",
          type: "Freelance Work",
          company: "iTalki / Preply",
          location: "Remote Worldwide",
          duration: "Ongoing",
          salary: "$10-25/hour",
          description: "Teach Spanish conversation and grammar to international students",
          requirements: ["Conversational Spanish fluency", "Teaching passion", "Cultural knowledge"],
          contact: "Apply directly on platforms",
          website: "https://www.italki.com/teacher/application"
        }
      ],
      webdev: [
        {
          title: "Frontend Developer Bootcamp Graduate Program",
          type: "Career Accelerator",
          organization: "General Assembly / Lambda School",
          duration: "16-24 weeks",
          cost: "Income Share Agreement available",
          description: "Intensive full-stack development program with job placement",
          curriculum: ["Modern JavaScript & TypeScript", "React & Next.js", "Node.js & Databases"],
          website: "https://generalassemb.ly/education/web-development"
        }
      ],
      programming: [
        {
          title: "Software Engineering Internship",
          type: "Internship",
          company: "Google / Microsoft / Amazon",
          location: "Various",
          duration: "Summer 2024",
          salary: "$6,000-8,000/month",
          description: "Work on large-scale systems with experienced engineers",
          requirements: ["Strong programming fundamentals", "Problem-solving skills", "CS knowledge"],
          website: "https://careers.google.com/students/"
        }
      ],
      general: [
        {
          title: "Online Learning Fellowship",
          type: "Fellowship",
          organization: "Khan Academy / Coursera",
          location: "Remote",
          duration: "6-12 months",
          stipend: "$1,000-3,000",
          description: "Research and develop new educational methodologies",
          requirements: ["Passion for education", "Research skills", "Innovation mindset"],
          website: "https://www.khanacademy.org/careers"
        }
      ]
    };
    
    return opportunities[analyzeCourseContent as keyof typeof opportunities] || opportunities.general;
  }, [analyzeCourseContent]);

  // Use dynamic content if available, otherwise fall back to static
  const displayProjects = dynamicProjects.length > 0 ? dynamicProjects : getProjectVault;
  const displayOpportunities = dynamicOpportunities.length > 0 ? dynamicOpportunities : getOpportunities;

  // Advanced topics based on current course content and level
  const getAdvancedTopics = useMemo(() => {
    const currentLevel = currentCourse?.audience_level?.toLowerCase() || 'beginner';
    
    const topics = {
      spanish: {
        beginner: [
          { title: "Spanish Grammar Mastery", level: "Intermediate", description: "Advanced verb tenses and complex sentence structures" },
          { title: "Spanish Literature Introduction", level: "Intermediate", description: "Reading and analyzing classic Spanish texts" },
          { title: "Business Spanish", level: "Intermediate", description: "Professional Spanish for workplace communication" }
        ],
        intermediate: [
          { title: "Advanced Spanish Composition", level: "Advanced", description: "Writing essays and formal documents in Spanish" },
          { title: "Spanish Translation Techniques", level: "Advanced", description: "Professional translation skills and cultural adaptation" },
          { title: "Spanish Linguistics", level: "Advanced", description: "Deep dive into Spanish language structure and evolution" }
        ],
        advanced: [
          { title: "Spanish Teaching Methodology", level: "Expert", description: "Become a Spanish language instructor" },
          { title: "Hispanic Cultural Studies", level: "Expert", description: "Advanced study of Spanish-speaking cultures" },
          { title: "Spanish Literature Analysis", level: "Expert", description: "Critical analysis of Hispanic literary works" }
        ]
      },
      webdev: {
        beginner: [
          { title: "JavaScript ES6+ Features", level: "Intermediate", description: "Modern JavaScript concepts and patterns" },
          { title: "React State Management", level: "Intermediate", description: "Context, Redux, and advanced patterns" },
          { title: "RESTful API Design", level: "Intermediate", description: "Backend development and API best practices" }
        ],
        intermediate: [
          { title: "TypeScript Advanced Types", level: "Advanced", description: "Generics, utility types, and patterns" },
          { title: "Testing Strategies", level: "Advanced", description: "Unit, integration, and E2E testing" },
          { title: "Web Performance", level: "Advanced", description: "Core Web Vitals and optimization" }
        ],
        advanced: [
          { title: "Micro-frontends", level: "Expert", description: "Scalable frontend architecture" },
          { title: "WebAssembly", level: "Expert", description: "High-performance web applications" },
          { title: "Progressive Web Apps", level: "Expert", description: "Service workers, offline functionality" }
        ]
      },
      programming: {
        beginner: [
          { title: "Object-Oriented Programming", level: "Intermediate", description: "Classes, inheritance, and design patterns" },
          { title: "Data Structures & Algorithms", level: "Intermediate", description: "Arrays, trees, graphs, and optimization" },
          { title: "Database Fundamentals", level: "Intermediate", description: "SQL, NoSQL, and database design" }
        ],
        intermediate: [
          { title: "System Design Patterns", level: "Advanced", description: "Microservices, event-driven architecture" },
          { title: "DevOps & CI/CD", level: "Advanced", description: "Containerization, deployment automation" },
          { title: "Performance Optimization", level: "Advanced", description: "Profiling, caching, and scalability" }
        ],
        advanced: [
          { title: "Distributed Systems", level: "Expert", description: "Consensus algorithms, fault tolerance" },
          { title: "Machine Learning Engineering", level: "Expert", description: "MLOps, model deployment, monitoring" },
          { title: "Security Architecture", level: "Expert", description: "Cryptography, secure coding practices" }
        ]
      },
      general: {
        beginner: [
          { title: "Digital Literacy", level: "Intermediate", description: "Advanced computer and internet skills" },
          { title: "Research Methodology", level: "Intermediate", description: "Academic and professional research techniques" },
          { title: "Critical Thinking", level: "Intermediate", description: "Logic, reasoning, and analytical skills" }
        ],
        intermediate: [
          { title: "Project Management", level: "Advanced", description: "Planning, execution, and team leadership" },
          { title: "Data Analysis", level: "Advanced", description: "Statistics and data interpretation" },
          { title: "Communication Skills", level: "Advanced", description: "Public speaking and professional writing" }
        ],
        advanced: [
          { title: "Leadership Development", level: "Expert", description: "Advanced management and mentoring skills" },
          { title: "Strategic Planning", level: "Expert", description: "Long-term goal setting and execution" },
          { title: "Innovation Management", level: "Expert", description: "Leading creative and innovative teams" }
        ]
      }
    };
    
    return topics[analyzeCourseContent as keyof typeof topics]?.[currentLevel as keyof any] || topics.general.beginner;
  }, [analyzeCourseContent, currentCourse?.audience_level]);

  // Helper function to get progress status
  const getProgressStatus = (progress: number) => {
    if (progress === 0) return { status: 'Not Started', color: 'bg-gray-500' };
    if (progress < 25) return { status: 'Just Started', color: 'bg-red-500' };
    if (progress < 50) return { status: 'In Progress', color: 'bg-yellow-500' };
    if (progress < 75) return { status: 'Good Progress', color: 'bg-blue-500' };
    if (progress < 100) return { status: 'Almost Done', color: 'bg-green-500' };
    return { status: 'Completed', color: 'bg-green-600' };
  };

  const handleStartLearning = async (courseData: any) => {
    setIsGenerating(courseData.title);
    try {
      await onCreateCourse({
        title: courseData.title,
        audience_level: courseData.level || 'intermediate',
        duration: courseData.duration || '8-12 hours',
        instructions: `Create an advanced course on ${courseData.title}. ${courseData.description || ''}`
      });
    } catch (error) {
      console.error('Error creating course:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleTaskToggle = (projectIndex: number, taskIndex: number) => {
    const updatedTasks = [...projectTasks];
    if (!updatedTasks[projectIndex]) {
      updatedTasks[projectIndex] = new Array(displayProjects[projectIndex].tasks.length).fill(false);
    }
    updatedTasks[projectIndex][taskIndex] = !updatedTasks[projectIndex][taskIndex];
    setProjectTasks(updatedTasks);

    // Generate AI feedback based on progress
    const completedCount = updatedTasks[projectIndex].filter(Boolean).length;
    const totalTasks = displayProjects[projectIndex].tasks.length;
    const completionRate = (completedCount / totalTasks) * 100;
    
    let feedback = "";
    if (completionRate === 0) {
      feedback = `Great start on ${displayProjects[projectIndex].title}! The first step is always the hardest.`;
    } else if (completionRate < 25) {
      feedback = `Nice progress! You're ${completionRate.toFixed(0)}% complete. Keep building momentum.`;
    } else if (completionRate < 50) {
      feedback = `Excellent work! ${completionRate.toFixed(0)}% through. The foundation is solid!`;
    } else if (completionRate < 75) {
      feedback = `Outstanding! ${completionRate.toFixed(0)}% complete. You're in the home stretch!`;
    } else if (completionRate < 100) {
      feedback = `Almost there! ${completionRate.toFixed(0)}% complete. Final touches are crucial!`;
    } else {
      feedback = `🎉 Congratulations! You've completed ${displayProjects[projectIndex].title}! Add it to your portfolio!`;
    }
    
    setAiCoachFeedback(feedback);
  };

  const handleStartProject = (project: any, index: number) => {
    setSelectedProject({ ...project, index });
    if (!projectTasks[index]) {
      const newTasks = [...projectTasks];
      newTasks[index] = new Array(project.tasks.length).fill(false);
      setProjectTasks(newTasks);
    }
  };

  if (!currentCourse) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Brain className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <CardTitle className="text-xl mb-2">Select a Course First</CardTitle>
          <CardDescription>
            Choose a course to see AI-generated expansion opportunities and projects
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Course Context Header with Refresh Button */}
      <Card className="bg-gradient-to-r from-orange-600 to-red-600 text-white border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center space-x-2">
                <Rocket className="h-6 w-6" />
                <span>Groq AI-Powered Expansion Roadmap</span>
              </CardTitle>
              <CardDescription className="text-orange-100">
                Groq AI-generated hands-on projects and opportunities tailored specifically for your {currentCourse.title} journey
              </CardDescription>
              <div className="mt-2 text-sm text-orange-200">
                {analyzeCourseContent === 'spanish' && '🇪🇸 Spanish Language Focus'}
                {analyzeCourseContent === 'webdev' && '💻 Web Development Focus'}
                {analyzeCourseContent === 'programming' && '🔧 Programming Focus'}
                {analyzeCourseContent === 'general' && '📚 General Learning Focus'}
              </div>
            </div>
            <Button
              onClick={generateDynamicContent}
              disabled={isRefreshing}
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Generating with Groq...' : 'Regenerate with Groq AI'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Groq AI-Generated Project Vault Section */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-2xl">
            <Code className="h-6 w-6 text-purple-600" />
            <span>Groq AI-Generated Hands-On Projects</span>
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
              <Brain className="h-3 w-3 mr-1" />
              Groq AI Generated
            </Badge>
          </CardTitle>
          <CardDescription>
            Intelligently crafted projects by Groq AI spanning Beginner → Intermediate → Advanced levels for {currentCourse.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dynamicProjects.map((project, index) => (
              <Card key={index} className="bg-white border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <Badge variant={project.difficulty === 'Beginner' ? 'secondary' : project.difficulty === 'Intermediate' ? 'default' : 'destructive'}>
                      {project.difficulty}
                    </Badge>
                  </div>
                  <CardDescription>{project.description}</CardDescription>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{project.duration}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="h-4 w-4" />
                      <span>{project.tasks?.length || 0} tasks</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => handleStartProject(project, index)}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        <Rocket className="h-4 w-4 mr-2" />
                        Start Groq AI Project
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <Code className="h-5 w-5 text-purple-600" />
                          <span>{project.title}</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Groq AI Generated
                          </Badge>
                        </DialogTitle>
                        <DialogDescription>{project.description}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="font-semibold flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Project Tasks</span>
                          </h4>
                          {project.tasks.map((task: string, taskIndex: number) => (
                            <div key={taskIndex} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <Checkbox
                                checked={projectTasks[index]?.[taskIndex] || false}
                                onCheckedChange={() => handleTaskToggle(index, taskIndex)}
                                className="mt-1"
                              />
                              <span className={projectTasks[index]?.[taskIndex] ? 'line-through text-gray-500' : ''}>
                                {task}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {projectTasks[index] && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Progress</span>
                              <span className="text-sm text-gray-600">
                                {projectTasks[index].filter(Boolean).length} / {project.tasks.length} completed
                              </span>
                            </div>
                            <Progress 
                              value={(projectTasks[index].filter(Boolean).length / project.tasks.length) * 100} 
                              className="h-2"
                            />
                          </div>
                        )}

                        {aiCoachFeedback && (
                          <Card className="bg-blue-50 border-blue-200">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center space-x-2">
                                <Brain className="h-5 w-5 text-blue-600" />
                                <span>AI Coach Feedback</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-blue-800">{aiCoachFeedback}</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Groq AI-Generated Opportunities Section */}
      <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-2xl">
            <Briefcase className="h-6 w-6 text-green-600" />
            <span>Groq AI-Generated Real-World Opportunities</span>
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
              <Brain className="h-3 w-3 mr-1" />
              Groq AI Generated
            </Badge>
          </CardTitle>
          <CardDescription>
            Career paths, freelance work, and learning opportunities generated by Groq AI specifically for {analyzeCourseContent} skills from {currentCourse.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {dynamicOpportunities.map((opportunity, index) => (
              <Card key={index} className="bg-white border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                    <Badge variant="outline">{opportunity.type}</Badge>
                  </div>
                  <CardDescription>{opportunity.description}</CardDescription>
                  {opportunity.company && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{opportunity.company} • {opportunity.location}</span>
                    </div>
                  )}
                  {opportunity.salary && (
                    <div className="flex items-center space-x-2 text-sm text-green-600 font-medium">
                      <Trophy className="h-4 w-4" />
                      <span>{opportunity.salary}</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setSelectedOpportunity(opportunity)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Learn More
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{opportunity.title}</DialogTitle>
                        <DialogDescription>{opportunity.description}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {opportunity.company && (
                          <div>
                            <h4 className="font-semibold mb-2">Details</h4>
                            <p><strong>Company:</strong> {opportunity.company}</p>
                            <p><strong>Location:</strong> {opportunity.location}</p>
                            {opportunity.salary && <p><strong>Compensation:</strong> {opportunity.salary}</p>}
                            {opportunity.duration && <p><strong>Duration:</strong> {opportunity.duration}</p>}
                          </div>
                        )}
                        
                        {opportunity.requirements && (
                          <div>
                            <h4 className="font-semibold mb-2">Requirements</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {opportunity.requirements.map((req: string, i: number) => (
                                <li key={i}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex space-x-2">
                          {opportunity.contact && (
                            <Button variant="outline" asChild>
                              <a href={`mailto:${opportunity.contact}`}>
                                Contact
                              </a>
                            </Button>
                          )}
                          {opportunity.website && (
                            <Button asChild>
                              <a href={opportunity.website} target="_blank" rel="noopener noreferrer">
                                <Globe className="h-4 w-4 mr-2" />
                                Visit Website
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LearningRoadmap;
