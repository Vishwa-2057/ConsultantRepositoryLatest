import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Send, FileText, Users, Heart, Lightbulb, Newspaper, User } from "lucide-react";
import { toast } from "sonner";
import { postAPI } from "@/services/api";

const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: "General", label: "General", icon: FileText, color: "bg-gray-500" },
    { value: "Health Tips", label: "Health Tips", icon: Lightbulb, color: "bg-green-500" },
    { value: "Medical News", label: "Medical News", icon: Newspaper, color: "bg-blue-500" },
    { value: "Patient Stories", label: "Patient Stories", icon: Heart, color: "bg-pink-500" },
    { value: "Research", label: "Research", icon: Users, color: "bg-purple-500" },
    { value: "Other", label: "Other", icon: User, color: "bg-gray-400" }
  ];

  const selectedCategoryData = categories.find(cat => cat.value === category);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for your post');
      return;
    }

    if (!content.trim()) {
      toast.error('Please enter content for your post');
      return;
    }

    try {
      setIsSubmitting(true);
      const postData = {
        title: title.trim(),
        content: content.trim(),
        category: category,
        visibility: 'Public'
      };

      const response = await postAPI.create(postData);
      toast.success('Post created successfully!');
      
      // Reset form
      setTitle('');
      setContent('');
      setCategory('General');
      
      // Close modal and refresh posts
      onClose();
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setContent('');
      setCategory('General');
      onClose();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0">
        <div className="flex flex-col h-full max-h-[85vh]">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Create New Post</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Post Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Post Title *
              </Label>
              <Input
                id="title"
                placeholder="Enter a descriptive title for your post..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSubmitting}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/200 characters
              </p>
            </div>

            {/* Category Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Category *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const IconComponent = cat.icon;
                  const isSelected = category === cat.value;
                  
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      disabled={isSubmitting}
                      className={`
                        flex items-center space-x-2 p-3 rounded-lg border-2 transition-all
                        ${isSelected 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }
                        ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${cat.color}`}>
                        <IconComponent className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm font-medium">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {selectedCategoryData && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Selected:</span>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <selectedCategoryData.icon className="w-3 h-3" />
                    <span>{selectedCategoryData.label}</span>
                  </Badge>
                </div>
              )}
            </div>

            {/* Post Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium">
                Content *
              </Label>
              <Textarea
                id="content"
                placeholder="Share your knowledge, ask questions, or start a discussion..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSubmitting}
                className="min-h-[180px] resize-none text-base"
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                {content.length}/5000 characters
              </p>
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-background">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl</kbd> + 
                <kbd className="px-2 py-1 bg-muted rounded text-xs ml-1">Enter</kbd> to post
              </div>
              
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || !title.trim() || !content.trim()}
                  className="bg-gradient-primary min-w-[100px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Create Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
