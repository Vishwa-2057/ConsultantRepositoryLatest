import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { postAPI } from "@/services/api";

const CommentModal = ({ isOpen, onClose, post, onCommentAdded }) => {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "Health Tips": return "primary";
      case "Medical News": return "secondary";
      case "Patient Stories": return "success";
      case "Research": return "destructive";
      case "General": return "outline";
      case "Other": return "muted";
      default: return "muted";
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await postAPI.addComment(post._id, newComment.trim());
      
      // Add the new comment to the post
      const updatedPost = {
        ...post,
        comments: [...(post.comments || []), response.comment],
        commentCount: response.commentCount
      };
      
      onCommentAdded(updatedPost);
      setNewComment("");
      toast.success('Comment added successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Comments</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Post Preview */}
          <div className="flex-shrink-0 p-4 border-b border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">
                    {post.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{post.author}</h4>
                  <p className="text-xs text-muted-foreground">{post.category} • {formatTimeAgo(post.createdAt)}</p>
                </div>
              </div>
              <Badge variant={getCategoryColor(post.category)} className="text-xs">
                {post.category}
              </Badge>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm mb-1">{post.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
            </div>
            
            <div className="flex items-center space-x-4 mt-3 pt-2 border-t border-border">
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Heart className="w-3 h-3" />
                <span>{post.likes || 0}</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <MessageCircle className="w-3 h-3" />
                <span>{post.commentCount || post.comments?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {post.comments && post.comments.length > 0 ? (
                post.comments.map((comment, index) => (
                  <div key={index} className="flex space-x-3">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-xs">
                        {comment.author.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No comments yet</p>
                  <p className="text-sm text-muted-foreground">Be the first to comment on this post!</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Comment Input */}
          <div className="flex-shrink-0 p-4 border-t border-border">
            <div className="flex space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-xs">You</span>
              </div>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[80px] resize-none"
                  disabled={isSubmitting}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {newComment.length}/1000 characters
                  </span>
                  <Button 
                    onClick={handleSubmitComment}
                    disabled={isSubmitting || !newComment.trim()}
                    size="sm"
                    className="bg-gradient-primary"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentModal;
