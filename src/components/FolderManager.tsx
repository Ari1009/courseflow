
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderPlus, Folder, Edit2, Trash2, Move, Plus, Brain, ChevronDown, ChevronRight, Play, Clock, Target, X } from "lucide-react";
import { useFolders } from "@/hooks/useFolders";

interface Course {
  id: string;
  title: string;
  folder_id?: string;
  audience_level: string;
  duration: string;
  progress: number;
  modules: any[];
  created_at: string;
}

interface FolderManagerProps {
  courses: Course[];
  onMoveCourse: (courseId: string, folderId: string | null) => void;
  onCreateCourse?: (courseData: {
    title: string;
    audience_level: string;
    duration: string;
    instructions?: string;
    folder_id?: string;
  }) => Promise<any>;
  draggedCourse?: string | null;
  onDragEnd?: () => void;
  onSelectCourse?: (course: Course) => void;
}

const FOLDER_COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Yellow' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#84CC16', label: 'Lime' },
  { value: '#F97316', label: 'Orange' }
];

const FolderManager: React.FC<FolderManagerProps> = ({ 
  courses, 
  onMoveCourse, 
  onCreateCourse,
  draggedCourse,
  onDragEnd,
  onSelectCourse
}) => {
  const { folders, createFolder, deleteFolder } = useFolders();
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3B82F6');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Course creation states
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [courseTitle, setCourseTitle] = useState('');
  const [audienceLevel, setAudienceLevel] = useState('');
  const [duration, setDuration] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const folder = await createFolder(newFolderName.trim(), newFolderColor);
    if (folder) {
      setNewFolderName('');
      setNewFolderColor('#3B82F6');
      setIsCreateDialogOpen(false);
    }
  };

  const handleMoveCourse = (folderId: string | null) => {
    if (selectedCourseId) {
      onMoveCourse(selectedCourseId, folderId);
      setIsMoveDialogOpen(false);
      setSelectedCourseId('');
    }
  };

  const handleCreateCourseInFolder = async (folderId: string) => {
    setSelectedFolderId(folderId);
    setIsCourseDialogOpen(true);
  };

  const handleGenerateCourse = async () => {
    if (!courseTitle || !audienceLevel || !duration || !onCreateCourse) return;

    setIsGenerating(true);
    try {
      await onCreateCourse({
        title: courseTitle,
        audience_level: audienceLevel,
        duration: duration,
        instructions: instructions,
        folder_id: selectedFolderId,
      });

      // Reset form
      setCourseTitle('');
      setAudienceLevel('');
      setDuration('');
      setInstructions('');
      setIsCourseDialogOpen(false);
      setSelectedFolderId('');
    } catch (error) {
      console.error('Error creating course:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolder(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    if (draggedCourse) {
      onMoveCourse(draggedCourse, folderId);
      setDragOverFolder(null);
      onDragEnd?.();
    }
  };

  const toggleFolderExpansion = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getCoursesInFolder = (folderId: string | null) => {
    return courses.filter(course => course.folder_id === folderId);
  };

  const getProgressStatus = (progress: number) => {
    if (progress === 0) return { status: 'Not Started', color: 'bg-gray-500' };
    if (progress < 100) return { status: 'In Progress', color: 'bg-blue-500' };
    return { status: 'Completed', color: 'bg-green-500' };
  };

  const unorganizedCourses = getCoursesInFolder(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Create Folder Button */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white transition-all hover:scale-105">
            <FolderPlus className="h-4 w-4 mr-2" />
            Create New Folder
          </Button>
        </DialogTrigger>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name..."
                className="transition-all focus:scale-105"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-color">Folder Color</Label>
              <Select value={newFolderColor} onValueChange={setNewFolderColor}>
                <SelectTrigger className="transition-all hover:scale-105">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLDER_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-300 transition-transform hover:scale-110"
                          style={{ backgroundColor: color.value }}
                        />
                        <span>{color.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleCreateFolder}
              className="w-full transition-all hover:scale-105"
              disabled={!newFolderName.trim()}
            >
              Create Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Folders List */}
      <div className="space-y-4">
        {folders.map((folder) => {
          const folderCourses = getCoursesInFolder(folder.id);
          const isDragOver = dragOverFolder === folder.id;
          const isExpanded = expandedFolders.has(folder.id);
          
          return (
            <Card 
              key={folder.id} 
              className={`bg-white shadow-lg border-0 transition-all hover:shadow-xl animate-scale-in ${
                isDragOver ? 'ring-2 ring-blue-500 shadow-xl scale-105' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder.id)}
            >
              <CardHeader 
                className="text-white rounded-t-lg cursor-pointer transition-all hover:brightness-110"
                style={{ backgroundColor: folder.color }}
                onClick={() => toggleFolderExpansion(folder.id)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 transition-transform" />
                    ) : (
                      <ChevronRight className="h-5 w-5 transition-transform" />
                    )}
                    <Folder className="h-5 w-5" />
                    <span>{folder.name}</span>
                    <span className="text-sm font-normal opacity-80">
                      ({folderCourses.length} courses)
                    </span>
                  </CardTitle>
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    {onCreateCourse && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCreateCourseInFolder(folder.id)}
                        className="text-white hover:bg-white/20 transition-all hover:scale-110"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20 transition-all hover:scale-110"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the folder "{folder.name}"? This will move all courses in this folder to "Unorganized". The courses themselves will not be deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteFolder(folder.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Folder
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="p-4 animate-accordion-down">
                  {folderCourses.length > 0 ? (
                    <div className="space-y-4">
                      {folderCourses.map((course) => {
                        const progressInfo = getProgressStatus(course.progress);
                        const totalLessons = course.modules.reduce((total, module) => total + module.lessons?.length || 0, 0);
                        
                        return (
                          <Card key={course.id} className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-green-50 transition-all cursor-pointer hover:scale-105 animate-fade-in">
                            <CardContent className="p-4" onClick={() => onSelectCourse?.(course)}>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-800">{course.title}</h4>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="text-xs transition-all hover:scale-105">
                                      {course.audience_level}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCourseId(course.id);
                                        setIsMoveDialogOpen(true);
                                      }}
                                      className="h-6 w-6 p-0 transition-all hover:scale-110"
                                    >
                                      <Move className="h-3 w-3" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => e.stopPropagation()}
                                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 transition-all hover:scale-110"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Remove Course from Folder</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to remove "{course.title}" from this folder? The course will be moved to "Unorganized" but will not be deleted.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => onMoveCourse(course.id, null)}
                                            className="bg-orange-600 hover:bg-orange-700"
                                          >
                                            Remove from Folder
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{course.duration}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Target className="h-3 w-3" />
                                    <span>{totalLessons} lessons</span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Progress</span>
                                    <Badge 
                                      variant="secondary" 
                                      className={`${progressInfo.color} text-white text-xs transition-all hover:scale-105`}
                                    >
                                      {progressInfo.status}
                                    </Badge>
                                  </div>
                                  <Progress value={course.progress} className="h-1" />
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{course.progress}% Complete</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-xs px-2 transition-all hover:scale-105"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectCourse?.(course);
                                      }}
                                    >
                                      <Play className="h-3 w-3 mr-1" />
                                      Open
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                      isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                    }`}>
                      <p className="text-gray-500 text-sm">
                        {isDragOver ? 'Drop course here' : 'No courses in this folder yet. Drag courses here or use the + button to create a new course.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Unorganized Courses */}
        {unorganizedCourses.length > 0 && (
          <Card 
            className={`bg-white shadow-lg border-0 transition-all hover:shadow-xl animate-scale-in ${
              dragOverFolder === null ? 'ring-2 ring-gray-400 shadow-xl scale-105' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, null)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
          >
            <CardHeader className="bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <Folder className="h-5 w-5" />
                <span>Unorganized Courses</span>
                <span className="text-sm font-normal opacity-80">
                  ({unorganizedCourses.length} courses)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {unorganizedCourses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded hover:from-blue-50 hover:to-green-50 cursor-pointer transition-all hover:scale-105 animate-fade-in">
                    <span 
                      className="text-sm font-medium flex-1"
                      onClick={() => onSelectCourse?.(course)}
                    >
                      {course.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setIsMoveDialogOpen(true);
                      }}
                      className="transition-all hover:scale-110"
                    >
                      <Move className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Move Course Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Move Course to Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-gray-600">
              Select a folder to move the course to:
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start transition-all hover:scale-105"
                onClick={() => handleMoveCourse(null)}
              >
                <Folder className="h-4 w-4 mr-2" />
                Remove from folder
              </Button>
              {folders.map((folder) => (
                <Button
                  key={folder.id}
                  variant="outline"
                  className="w-full justify-start transition-all hover:scale-105"
                  onClick={() => handleMoveCourse(folder.id)}
                >
                  <div 
                    className="w-4 h-4 rounded-full mr-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: folder.color }}
                  />
                  {folder.name}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Course in Folder Dialog */}
      <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
        <DialogContent className="max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle>Create Course in Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="course-title">Course Title *</Label>
              <Input
                id="course-title"
                placeholder="e.g., Introduction to Web Development"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="transition-all focus:scale-105"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience-level">Audience Level *</Label>
              <Select value={audienceLevel} onValueChange={setAudienceLevel}>
                <SelectTrigger className="transition-all hover:scale-105">
                  <SelectValue placeholder="Select audience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-duration">Duration *</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="transition-all hover:scale-105">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2 hours">1-2 hours</SelectItem>
                  <SelectItem value="3-5 hours">3-5 hours</SelectItem>
                  <SelectItem value="6-10 hours">6-10 hours</SelectItem>
                  <SelectItem value="10+ hours">10+ hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-instructions">Additional Instructions</Label>
              <Textarea
                id="course-instructions"
                placeholder="Any specific requirements..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="transition-all focus:scale-105"
              />
            </div>

            <Button 
              onClick={handleGenerateCourse}
              disabled={isGenerating || !courseTitle || !audienceLevel || !duration}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white transition-all hover:scale-105"
            >
              {isGenerating ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4" />
                  <span>Generate Course</span>
                </div>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FolderManager;
