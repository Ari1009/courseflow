import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Brain, 
  MessageCircle, 
  Send, 
  TrendingUp, 
  Target, 
  Award, 
  BookOpen,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Lightbulb,
  RefreshCw
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  modules: any[];
}

interface QuizScore {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  struggle_topics: string[];
  confidence_level: number;
  lesson_id: string;
}

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  created_at: string;
}

interface AITutorProps {
  courseId: string;
  courseTitle: string;
  currentCourse: Course;
}

const AITutor: React.FC<AITutorProps> = ({ courseId, courseTitle, currentCourse }) => {
  const [quizScores, setQuizScores] = useState<QuizScore[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user && courseId) {
      fetchQuizScores();
      fetchChatHistory();
    }
  }, [user, courseId]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchQuizScores = async () => {
    if (!user || !courseId) {
      console.log('Missing user or courseId for quiz scores fetch');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Fetching quiz scores for user:', user.id, 'course:', courseId);
      
      const { data, error } = await supabase
        .from('quiz_scores')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching quiz scores:', error);
        throw error;
      }

      console.log('Quiz scores fetched successfully:', data);
      setQuizScores(data || []);
    } catch (error) {
      console.error('Error fetching quiz scores:', error);
      toast({
        title: "Error loading quiz data",
        description: "Unable to load your quiz scores. Please try refreshing.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatHistory = async () => {
    if (!user || !courseId) {
      console.log('Missing user or courseId for chat history fetch');
      return;
    }

    try {
      console.log('Fetching chat history for user:', user.id, 'course:', courseId);
      
      const { data, error } = await supabase
        .from('tutor_chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) {
        console.error('Error fetching chat history:', error);
        throw error;
      }

      console.log('Chat history fetched successfully:', data);
      setChatHistory(data || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !user || !courseId) return;

    setIsChatLoading(true);
    const messageToSend = currentMessage;
    setCurrentMessage('');

    try {
      console.log('Sending message to AI tutor:', messageToSend);
      
      const response = await supabase.functions.invoke('ai-tutor-chat', {
        body: {
          message: messageToSend,
          courseId,
          userId: user.id,
          quizScores: quizScores.slice(0, 5),
          context: {
            courseTitle,
            courseModules: currentCourse.modules?.length || 0
          }
        }
      });

      console.log('AI tutor response:', response);

      if (response.error) {
        console.error('AI tutor function error:', response.error);
        throw response.error;
      }

      if (!response.data || !response.data.response) {
        throw new Error('Invalid response from AI tutor');
      }

      // Save chat to database
      const { data: chatData, error: chatError } = await supabase
        .from('tutor_chats')
        .insert({
          user_id: user.id,
          course_id: courseId,
          message: messageToSend,
          response: response.data.response
        })
        .select()
        .single();

      if (chatError) {
        console.error('Error saving chat to database:', chatError);
      } else {
        console.log('Chat saved to database:', chatData);
      }

      // Add to local chat history
      const newChat = {
        id: chatData?.id || Date.now().toString(),
        message: messageToSend,
        response: response.data.response,
        created_at: new Date().toISOString()
      };

      setChatHistory(prev => [...prev, newChat]);

      toast({
        title: "Message sent!",
        description: "Your AI tutor has responded.",
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please check your internet connection.",
        variant: "destructive",
      });
      setCurrentMessage(messageToSend);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Calculate analytics
  const averageScore = quizScores.length > 0 
    ? Math.round(quizScores.reduce((sum, score) => sum + (score.score / score.total_questions * 100), 0) / quizScores.length)
    : 0;

  const averageConfidence = quizScores.length > 0
    ? Math.round(quizScores.reduce((sum, score) => sum + (score.confidence_level || 0), 0) / quizScores.length)
    : 0;

  const allStruggleTopics = quizScores.flatMap(score => score.struggle_topics || []);
  const topicCounts = allStruggleTopics.reduce((acc, topic) => {
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topStruggleTopics = Object.entries(topicCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([topic]) => topic);

  const recentPerformance = quizScores.slice(0, 5);
  const improvementTrend = recentPerformance.length >= 2 
    ? recentPerformance[0].score - recentPerformance[recentPerformance.length - 1].score
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center space-x-2">
            <Brain className="h-6 w-6" />
            <span>AI Learning Tutor</span>
          </CardTitle>
          <CardDescription className="text-purple-100">
            Personalized guidance and progress tracking for {courseTitle}
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Progress Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center space-x-2">
            <Lightbulb className="h-4 w-4" />
            <span>Learning Tips</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center space-x-2">
            <MessageCircle className="h-4 w-4" />
            <span>AI Chat</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchQuizScores}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Data
            </Button>
          </div>

          {quizScores.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Quiz Data Yet</h3>
                <p className="text-gray-600">
                  Take your first quiz to see your progress analytics and get personalized recommendations!
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Performance Overview */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{averageScore}%</div>
                    <Progress value={averageScore} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Confidence Level</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{averageConfidence}/10</div>
                    <Progress value={averageConfidence * 10} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{quizScores.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total attempts</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Improvement</CardTitle>
                    {improvementTrend >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-red-600 transform rotate-180" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${improvementTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {improvementTrend >= 0 ? '+' : ''}{improvementTrend}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Since last quiz</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Quiz Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Quiz Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentPerformance.map((score, index) => (
                      <div key={score.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">Quiz {recentPerformance.length - index}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(score.completed_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{score.score}/{score.total_questions}</div>
                          <div className="text-sm text-gray-600">
                            Confidence: {score.confidence_level || 0}/10
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Areas to Focus On */}
              {topStruggleTopics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Areas to Focus On</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {topStruggleTopics.map((topic, index) => (
                        <Badge key={topic} variant="destructive" className="px-3 py-1">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personalized Learning Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {averageScore < 70 && (
                <div className="p-4 border-l-4 border-red-500 bg-red-50">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <h3 className="font-medium text-red-800">Focus on Fundamentals</h3>
                  </div>
                  <p className="mt-1 text-sm text-red-700">
                    Your average score suggests reviewing basic concepts. Consider retaking lessons and practicing more.
                  </p>
                </div>
              )}

              {averageScore >= 70 && averageScore < 85 && (
                <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                    <h3 className="font-medium text-yellow-800">Building Strong Foundation</h3>
                  </div>
                  <p className="mt-1 text-sm text-yellow-700">
                    Good progress! Focus on challenging yourself with advanced practice problems.
                  </p>
                </div>
              )}

              {averageScore >= 85 && (
                <div className="p-4 border-l-4 border-green-500 bg-green-50">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <h3 className="font-medium text-green-800">Excellent Progress!</h3>
                  </div>
                  <p className="mt-1 text-sm text-green-700">
                    You're mastering the material. Consider advanced topics or helping others learn.
                  </p>
                </div>
              )}

              {averageConfidence < 6 && (
                <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                  <div className="flex items-center">
                    <Lightbulb className="h-5 w-5 text-blue-500 mr-2" />
                    <h3 className="font-medium text-blue-800">Build Confidence</h3>
                  </div>
                  <p className="mt-1 text-sm text-blue-700">
                    Practice explaining concepts out loud and teaching others to build confidence.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <Card className="h-96">
            <CardHeader>
              <CardTitle>Chat with Your AI Tutor</CardTitle>
              <CardDescription>
                Ask questions about the course, get study tips, or discuss topics you're struggling with
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col h-full">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Start a conversation with your AI tutor!</p>
                    <p className="text-sm">Ask about course content, study strategies, or get help with difficult topics.</p>
                  </div>
                ) : (
                  chatHistory.map((chat) => (
                    <div key={chat.id} className="space-y-2">
                      <div className="bg-blue-100 p-3 rounded-lg ml-12">
                        <p className="text-sm">{chat.message}</p>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-lg mr-12">
                        <p className="text-sm">{chat.response}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input */}
              <div className="flex space-x-2">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask your tutor anything..."
                  disabled={isChatLoading}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={isChatLoading || !currentMessage.trim()}
                >
                  {isChatLoading ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AITutor;
