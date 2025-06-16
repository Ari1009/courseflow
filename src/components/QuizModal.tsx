import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQuizScoring } from "@/hooks/useQuizScoring";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle, 
  XCircle, 
  Award, 
  BarChart3, 
  MessageSquare,
  Star,
  Brain,
  Target,
  Lightbulb,
  ArrowLeft
} from "lucide-react";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  question_order: number;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuizQuestion[];
  lessonTitle: string;
  courseId: string;
  lessonId: string;
  onQuizComplete?: (score: number, percentage: number) => void;
}

const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  questions,
  lessonTitle,
  courseId,
  lessonId,
  onQuizComplete
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState(5);
  const [struggleTopics, setStruggleTopics] = useState<string[]>([]);
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);
  const [currentAnswerCorrect, setCurrentAnswerCorrect] = useState<boolean | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [finalPercentage, setFinalPercentage] = useState(0);
  const [answerValidationResults, setAnswerValidationResults] = useState<boolean[]>([]);
  const [isCalculatingResults, setIsCalculatingResults] = useState(false);
  const { toast } = useToast();
  const { saveQuizScore, isLoading } = useQuizScoring();

  const availableTopics = [
    'Basic concepts',
    'Advanced features', 
    'Implementation',
    'Theory',
    'Real-world application',
    'Problem solving',
    'Best practices'
  ];

  // Helper function to extract correct answer from various formats
  const getCorrectAnswer = (question: QuizQuestion): string => {
    const { correct_answer } = question;
    
    // Handle null or undefined
    if (!correct_answer) {
      console.warn('Correct answer is null or undefined, using first option as fallback');
      return question.options?.[0] || '';
    }
    
    // Handle object format with _type and value
    if (typeof correct_answer === 'object' && correct_answer !== null) {
      const answerObj = correct_answer as any;
      if ('value' in answerObj && answerObj.value !== 'undefined') {
        return answerObj.value;
      }
    }
    
    // Handle string format
    if (typeof correct_answer === 'string' && correct_answer !== 'undefined') {
      return correct_answer;
    }
    
    // Fallback: try to find the correct answer from options based on common patterns
    const { options } = question;
    if (options && options.length > 0) {
      // For now, return the first option as fallback - this should be improved
      console.warn('Could not determine correct answer, using first option as fallback');
      return options[0];
    }
    
    return '';
  };

  useEffect(() => {
    if (isOpen && questions.length > 0) {
      resetQuiz();
      console.log('Quiz questions loaded:', questions);
      // Log the correct answers for debugging
      questions.forEach((q, index) => {
        const extractedAnswer = getCorrectAnswer(q);
        console.log(`Question ${index + 1} correct answer:`, {
          original: q.correct_answer,
          extracted: extractedAnswer
        });
      });
    }
  }, [isOpen, questions]);

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers(new Array(questions.length).fill(''));
    setIsQuizCompleted(false);
    setScore(0);
    setShowResults(false);
    setStartTime(new Date());
    setConfidenceLevel(5);
    setStruggleTopics([]);
    setReflectionNotes('');
    setShowAnswerFeedback(false);
    setCurrentAnswerCorrect(null);
    setFinalScore(0);
    setFinalPercentage(0);
    setAnswerValidationResults([]);
    setIsCalculatingResults(false);
  };

  const validateAnswerWithAI = async (userAnswer: string, question: string, correctAnswer: string): Promise<boolean> => {
    // Validate inputs before sending to edge function
    if (!userAnswer || !question || !correctAnswer) {
      console.error('Missing required validation data:', { userAnswer, question, correctAnswer });
      // Fallback to simple string comparison
      return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    }

    try {
      console.log('Sending to AI validation:', { userAnswer, question, correctAnswer });
      
      const { data, error } = await supabase.functions.invoke('validate-quiz-answer', {
        body: {
          userAnswer: userAnswer.trim(),
          question: question.trim(),
          correctAnswer: correctAnswer.trim(),
          options: currentQuestion.options
        }
      });

      if (error) {
        console.error('AI validation error:', error);
        // Fallback to simple string comparison if AI fails
        return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      }

      console.log('AI validation response:', data);
      return data?.isCorrect || false;
    } catch (error) {
      console.error('Error validating answer with AI:', error);
      // Fallback to simple string comparison
      return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    }
  };

  const handleAnswerSelect = async (selectedAnswer: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setUserAnswers(newAnswers);

    const currentQuestion = questions[currentQuestionIndex];
    const correctAnswer = getCorrectAnswer(currentQuestion);
    
    console.log('Validating answer:', {
      selectedAnswer,
      question: currentQuestion.question,
      correctAnswer
    });

    // Use AI validation
    const isCorrect = await validateAnswerWithAI(
      selectedAnswer, 
      currentQuestion.question, 
      correctAnswer
    );
    
    console.log('Answer validation result:', { isCorrect });

    // Show immediate feedback
    setCurrentAnswerCorrect(isCorrect);
    setShowAnswerFeedback(true);
  };

  const handleNext = () => {
    setShowAnswerFeedback(false);
    setCurrentAnswerCorrect(null);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      calculateAndShowResults();
    }
  };

  const handlePrevious = () => {
    setShowAnswerFeedback(false);
    setCurrentAnswerCorrect(null);
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateFinalScore = async () => {
    let calculatedScore = 0;
    const validationResults: boolean[] = [];
    
    for (let index = 0; index < questions.length; index++) {
      const question = questions[index];
      const userAnswer = userAnswers[index];
      const correctAnswer = getCorrectAnswer(question);
      
      const isCorrect = await validateAnswerWithAI(userAnswer, question.question, correctAnswer);
      validationResults.push(isCorrect);
      
      if (isCorrect) {
        calculatedScore++;
      }
      
      console.log(`Final score calculation Q${index + 1}:`, {
        userAnswer,
        correctAnswer,
        isCorrect
      });
    }
    
    console.log('Final score calculation complete:', {
      calculatedScore,
      totalQuestions: questions.length
    });
    
    setAnswerValidationResults(validationResults);
    return calculatedScore;
  };

  const calculateAndShowResults = async () => {
    setIsCalculatingResults(true);
    try {
      const calculatedScore = await calculateFinalScore();
      const percentage = Math.round((calculatedScore / questions.length) * 100);
      
      setFinalScore(calculatedScore);
      setFinalPercentage(percentage);
      setShowResults(true);
    } catch (error) {
      console.error('Error calculating results:', error);
      toast({
        title: "Error",
        description: "Failed to calculate quiz results. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCalculatingResults(false);
    }
  };

  const handleQuizComplete = async () => {
    const timeTaken = startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : undefined;

    console.log('Saving quiz with final data:', {
      finalScore,
      totalQuestions: questions.length,
      finalPercentage
    });

    // Save quiz score to database
    const result = await saveQuizScore({
      lessonId,
      courseId,
      score: finalScore,
      totalQuestions: questions.length,
      timeTakenSeconds: timeTaken,
      struggleTopics,
      confidenceLevel
    });

    if (result.success) {
      setIsQuizCompleted(true);
      onQuizComplete?.(finalScore, finalPercentage);
      
      toast({
        title: "Quiz Completed!",
        description: `You scored ${finalScore}/${questions.length} (${finalPercentage}%)`,
      });
    }
  };

  const handleStruggleTopicChange = (topic: string, checked: boolean) => {
    if (checked) {
      setStruggleTopics(prev => [...prev, topic]);
    } else {
      setStruggleTopics(prev => prev.filter(t => t !== topic));
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const selectedAnswer = userAnswers[currentQuestionIndex];

  if (!isOpen || questions.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <span>Quiz: {lessonTitle}</span>
            </DialogTitle>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Course</span>
            </Button>
          </div>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Question */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">{currentQuestion.question}</h3>
                
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const correctAnswer = getCorrectAnswer(currentQuestion);
                    const isCorrectOption = option === correctAnswer;
                    
                    let buttonClass = "w-full text-left justify-start h-auto p-4 transition-all duration-200 border";
                    
                    if (showAnswerFeedback) {
                      if (isSelected && currentAnswerCorrect) {
                        // User selected correct answer - show green
                        buttonClass += " bg-green-100 border-green-500 text-green-800 border-2";
                      } else if (isSelected && !currentAnswerCorrect) {
                        // User selected wrong answer - show red
                        buttonClass += " bg-red-100 border-red-500 text-red-800 border-2";
                      } else if (isCorrectOption && !isSelected) {
                        // Show correct answer when it wasn't selected - highlight in green
                        buttonClass += " bg-green-50 border-green-400 text-green-700 border-2";
                      } else {
                        // Other options when feedback is shown - dimmed
                        buttonClass += " opacity-50 border-gray-200";
                      }
                    } else if (isSelected) {
                      // Selected but no feedback yet - show blue
                      buttonClass += " bg-blue-100 border-blue-500 text-blue-800 border-2";
                    } else {
                      // Default state - hover effect
                      buttonClass += " border-gray-200 hover:bg-gray-50 hover:border-gray-300";
                    }
                    
                    return (
                      <div key={index} className="relative">
                        <Button
                          variant="outline"
                          className={buttonClass}
                          onClick={() => !showAnswerFeedback && handleAnswerSelect(option)}
                          disabled={showAnswerFeedback}
                        >
                          <span className="mr-3 font-medium text-sm bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="flex-1 text-left">{option}</span>
                          {showAnswerFeedback && isSelected && (
                            <span className="ml-auto">
                              {currentAnswerCorrect ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </span>
                          )}
                          {showAnswerFeedback && isCorrectOption && !isSelected && (
                            <span className="ml-auto">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </span>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Answer Feedback */}
                {showAnswerFeedback && (
                  <div className="mt-4 p-4 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-2">
                      {currentAnswerCorrect ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">Correct!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="font-medium text-red-800">Incorrect</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">
                      <strong>Correct answer:</strong> {getCorrectAnswer(currentQuestion)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              
              {currentQuestionIndex === questions.length - 1 ? (
                <Button 
                  onClick={calculateAndShowResults}
                  disabled={!selectedAnswer || isCalculatingResults}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isCalculatingResults ? 'Calculating...' : 'Finish Quiz'}
                </Button>
              ) : (
                <Button 
                  onClick={handleNext}
                  disabled={!selectedAnswer}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        ) : !isQuizCompleted ? (
          <div className="space-y-6">
            <div className="text-center">
              <Award className="h-12 w-12 mx-auto text-yellow-500 mb-2" />
              <h3 className="text-xl font-bold">Quiz Complete!</h3>
              <p className="text-gray-600">Score: {finalScore}/{questions.length} ({finalPercentage}%)</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="confidence">How confident do you feel about this material? (1-10)</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-500">1</span>
                  <Input
                    id="confidence"
                    type="range"
                    min="1"
                    max="10"
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500">10</span>
                  <Badge variant="outline" className="ml-2">{confidenceLevel}</Badge>
                </div>
              </div>

              <div>
                <Label>Which topics did you struggle with? (optional)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableTopics.map((topic) => (
                    <div key={topic} className="flex items-center space-x-2">
                      <Checkbox
                        id={topic}
                        checked={struggleTopics.includes(topic)}
                        onCheckedChange={(checked) => handleStruggleTopicChange(topic, checked as boolean)}
                      />
                      <Label htmlFor={topic} className="text-sm">{topic}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="reflection">Reflection notes (optional)</Label>
                <Textarea
                  id="reflection"
                  placeholder="What did you learn? What was challenging?"
                  value={reflectionNotes}
                  onChange={(e) => setReflectionNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <Button 
                onClick={handleQuizComplete} 
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Saving...' : 'Save Progress & Continue'}
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Course</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <Award className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Excellent Work!</h3>
              <p className="text-lg text-gray-600">
                Final Score: {finalScore}/{questions.length} ({finalPercentage}%)
              </p>
              <Badge 
                className={`mt-2 ${finalPercentage >= 80 ? 'bg-green-100 text-green-800' : 
                  finalPercentage >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
              >
                {finalPercentage >= 80 ? 'Excellent' : finalPercentage >= 60 ? 'Good' : 'Needs Review'}
              </Badge>
            </div>

            {/* Answer Review */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Answer Review
                </h4>
                <div className="space-y-3">
                  {questions.map((question, index) => {
                    const userAnswer = userAnswers[index];
                    const correctAnswer = getCorrectAnswer(question);
                    const isCorrect = answerValidationResults[index] || false;
                    
                    return (
                      <div key={question.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Question {index + 1}</span>
                          <div className="flex items-center space-x-2">
                            {isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-xs font-medium">
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700">{question.question}</p>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">Your answer:</span>
                            <span className={isCorrect ? 'text-green-600 font-medium' : 'text-red-600'}>
                              {userAnswer || 'No answer selected'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">Correct answer:</span>
                            <span className="text-green-600 font-medium">{correctAnswer}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-4">
              <Button onClick={onClose} className="flex-1">
                Continue Learning
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Course</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuizModal;
