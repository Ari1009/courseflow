
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Brain, 
  MessageSquare, 
  Target, 
  TrendingUp,
  CheckCircle,
  AlertTriangle 
} from "lucide-react";
import { useProgressTracking } from '@/hooks/useProgressTracking';

interface Module {
  id: string;
  module_title: string;
  lessons: any[];
}

interface ModuleCheckpointProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  moduleId: string;
  moduleName: string;
  quizScore: number;
  totalQuestions: number;
  courseTitle: string;
  courseModules: Module[];
}

const ModuleCheckpoint: React.FC<ModuleCheckpointProps> = ({
  isOpen,
  onClose,
  courseId,
  moduleId,
  moduleName,
  quizScore,
  totalQuestions,
  courseTitle,
  courseModules
}) => {
  const [confidenceLevel, setConfidenceLevel] = useState([7]);
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [selectedStruggleTopics, setSelectedStruggleTopics] = useState<string[]>([]);
  const [selectedUnderstandingTopics, setSelectedUnderstandingTopics] = useState<string[]>([]);
  const [customStruggleTopic, setCustomStruggleTopic] = useState('');
  const [customUnderstandingTopic, setCustomUnderstandingTopic] = useState('');

  const { saveModuleProgress, isLoading } = useProgressTracking();

  // Common programming/learning topics
  const commonTopics = [
    'Basic concepts',
    'Syntax and structure',
    'Problem solving',
    'Logic flow',
    'Implementation',
    'Debugging',
    'Best practices',
    'Real-world application',
    'Advanced features',
    'Integration concepts'
  ];

  const handleTopicToggle = (topic: string, type: 'struggle' | 'understanding') => {
    if (type === 'struggle') {
      setSelectedStruggleTopics(prev =>
        prev.includes(topic)
          ? prev.filter(t => t !== topic)
          : [...prev, topic]
      );
    } else {
      setSelectedUnderstandingTopics(prev =>
        prev.includes(topic)
          ? prev.filter(t => t !== topic)
          : [...prev, topic]
      );
    }
  };

  const addCustomTopic = (type: 'struggle' | 'understanding') => {
    const customTopic = type === 'struggle' ? customStruggleTopic : customUnderstandingTopic;
    if (customTopic.trim()) {
      if (type === 'struggle') {
        setSelectedStruggleTopics(prev => [...prev, customTopic.trim()]);
        setCustomStruggleTopic('');
      } else {
        setSelectedUnderstandingTopics(prev => [...prev, customTopic.trim()]);
        setCustomUnderstandingTopic('');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      await saveModuleProgress({
        course_id: courseId,
        module_id: moduleId,
        quiz_score: quizScore,
        confidence_level: confidenceLevel[0],
        struggle_topics: selectedStruggleTopics,
        understanding_topics: selectedUnderstandingTopics,
        reflection_notes: reflectionNotes,
      }, courseTitle, courseModules);
      
      onClose();
    } catch (error) {
      console.error('Failed to save checkpoint:', error);
    }
  };

  const scorePercentage = Math.round((quizScore / totalQuestions) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <Brain className="h-6 w-6 text-blue-600" />
            <span>Module Checkpoint: {moduleName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quiz Results Summary */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Target className="h-5 w-5 text-green-600" />
                <span>Quiz Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${scorePercentage >= 70 ? 'text-green-600' : scorePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {quizScore}/{totalQuestions}
                  </div>
                  <p className="text-sm text-gray-600">Correct Answers</p>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${scorePercentage >= 70 ? 'text-green-600' : scorePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {scorePercentage}%
                  </div>
                  <p className="text-sm text-gray-600">Score</p>
                </div>
                <div className="text-center">
                  {scorePercentage >= 70 ? (
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                  ) : (
                    <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto" />
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    {scorePercentage >= 70 ? 'Great Job!' : 'Needs Review'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confidence Level */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>How confident do you feel about this module?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="px-2">
                <Slider
                  value={confidenceLevel}
                  onValueChange={setConfidenceLevel}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Not confident (1)</span>
                <span className="font-medium text-blue-600">
                  Confidence: {confidenceLevel[0]}/10
                </span>
                <span>Very confident (10)</span>
              </div>
            </CardContent>
          </Card>

          {/* Topics You Struggled With */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>What topics did you struggle with?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {commonTopics.map((topic) => (
                  <label key={topic} className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={selectedStruggleTopics.includes(topic)}
                      onCheckedChange={() => handleTopicToggle(topic, 'struggle')}
                    />
                    <span className="text-sm">{topic}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Add custom topic..."
                  value={customStruggleTopic}
                  onChange={(e) => setCustomStruggleTopic(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTopic('struggle')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addCustomTopic('struggle')}
                >
                  Add
                </Button>
              </div>

              {selectedStruggleTopics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedStruggleTopics.map((topic, index) => (
                    <Badge key={index} variant="destructive" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Topics You Understood Well */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>What topics did you understand well?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {commonTopics.map((topic) => (
                  <label key={topic} className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={selectedUnderstandingTopics.includes(topic)}
                      onCheckedChange={() => handleTopicToggle(topic, 'understanding')}
                    />
                    <span className="text-sm">{topic}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Add custom topic..."
                  value={customUnderstandingTopic}
                  onChange={(e) => setCustomUnderstandingTopic(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTopic('understanding')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addCustomTopic('understanding')}
                >
                  Add
                </Button>
              </div>

              {selectedUnderstandingTopics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUnderstandingTopics.map((topic, index) => (
                    <Badge key={index} variant="default" className="text-xs bg-green-100 text-green-800">
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reflection Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                <span>Additional Reflection (Optional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Share any additional thoughts about this module, questions you have, or areas where you'd like more practice..."
                value={reflectionNotes}
                onChange={(e) => setReflectionNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Skip Checkpoint
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
            >
              {isLoading ? 'Saving...' : 'Save & Get AI Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModuleCheckpoint;
