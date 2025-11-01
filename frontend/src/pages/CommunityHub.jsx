import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageCircle, 
  Users, 
  Bell, 
  Plus, 
  Heart,
  Share2,
  Calendar,
  BookOpen,
  Award,
  TrendingUp,
  Search,
  Filter
} from "lucide-react";
import { postAPI } from "@/services/api";
import { toast } from "sonner";
import CommentModal from "@/components/CommentModal";
import CreatePostModal from "@/components/CreatePostModal";

const CommunityHub = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Load posts on component mount
  useEffect(() => {
    loadPosts();
    loadStats();
  }, []);

  const loadPosts = async (categoryFilter = selectedCategory) => {
    try {
      setLoading(true);
      const filters = { 
        sortBy: 'createdAt', 
        sortOrder: 'desc' 
      };
      
      // Add category filter if not 'all'
      if (categoryFilter && categoryFilter !== 'all') {
        filters.category = categoryFilter;
      }
      
      const response = await postAPI.getAll(1, 20, filters);
      setPosts(response.posts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load community posts');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await postAPI.getStats();
      setStats(response);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleOpenCreatePost = () => {
    setIsCreatePostModalOpen(true);
  };

  const handleCloseCreatePost = () => {
    setIsCreatePostModalOpen(false);
  };

  const handlePostCreated = () => {
    // Reload posts and stats after creating a new post
    loadPosts();
    loadStats();
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    loadPosts(category);
  };

  const handleLikePost = async (postId) => {
    try {
      const post = posts.find(p => p._id === postId);
      const isCurrentlyLiked = post?.isLikedByCurrentUser;
      
      if (isCurrentlyLiked) {
        // Unlike the post
        const response = await postAPI.unlike(postId);
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p._id === postId 
              ? { ...p, likes: response.likes, isLikedByCurrentUser: false }
              : p
          )
        );
        toast.success('Post unliked!');
      } else {
        // Like the post
        const response = await postAPI.like(postId);
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p._id === postId 
              ? { ...p, likes: response.likes, isLikedByCurrentUser: true }
              : p
          )
        );
        toast.success('Post liked!');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      if (error.message.includes('already liked')) {
        toast.error('You have already liked this post');
      } else if (error.message.includes('not liked')) {
        toast.error('You have not liked this post');
      } else {
        toast.error('Failed to update like status');
      }
    }
  };

  const handleOpenComments = (post) => {
    setSelectedPost(post);
    setIsCommentModalOpen(true);
  };

  const handleCloseComments = () => {
    setIsCommentModalOpen(false);
    setSelectedPost(null);
  };

  const handleCommentAdded = (updatedPost) => {
    // Update the post in the posts array
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post._id === updatedPost._id 
          ? updatedPost
          : post
      )
    );
    
    // Update the selected post for the modal
    setSelectedPost(updatedPost);
  };

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


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">Connect, share knowledge, and engage with healthcare professionals</p>
        </div>
        <Button 
          className="gradient-button"
          onClick={handleOpenCreatePost}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.totalPosts || 0}</p>
            <p className="text-sm text-muted-foreground">Total Posts</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center mx-auto mb-2">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.featuredPosts || 0}</p>
            <p className="text-sm text-muted-foreground">Featured Posts</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">{posts.length}</p>
            <p className="text-sm text-muted-foreground">Recent Posts</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">{posts.reduce((total, post) => total + (post.likes || 0) + (post.commentCount || post.comments?.length || 0), 0)}</p>
            <p className="text-sm text-muted-foreground">Total Engagement</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="feed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feed">Community Feed</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Filter Indicator */}
              {selectedCategory !== 'all' && (
                <Card className="border-0 shadow-soft bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Filter className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">
                          Showing posts in: <Badge variant="secondary">{selectedCategory}</Badge>
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleCategoryFilter('all')}
                        className="text-xs"
                      >
                        Clear Filter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Community Posts */}
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading posts...</p>
                  </div>
                ) : posts.length === 0 ? (
                  <Card className="border-0 shadow-soft">
                    <CardContent className="p-8 text-center">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      {selectedCategory === 'all' ? (
                        <>
                          <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                          <p className="text-muted-foreground mb-4">Be the first to share something with the community!</p>
                          <Button 
                            className="gradient-button"
                            onClick={handleOpenCreatePost}
                          >
                            Create First Post
                          </Button>
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold mb-2">No posts in {selectedCategory}</h3>
                          <p className="text-muted-foreground mb-4">No posts found in this category. Try a different category or create a new post.</p>
                          <div className="flex items-center justify-center space-x-3">
                            <Button 
                              variant="outline"
                              onClick={() => handleCategoryFilter('all')}
                            >
                              View All Posts
                            </Button>
                            <Button 
                              className="gradient-button"
                              onClick={handleOpenCreatePost}
                            >
                              Create Post
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  posts.map((post) => (
                    <Card key={post._id} className="border-0 shadow-soft hover:shadow-medical transition-all duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {post.author.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{post.author}</h4>
                            <p className="text-sm text-muted-foreground">{post.category} • {formatTimeAgo(post.createdAt)}</p>
                          </div>
                        </div>
                        <Badge variant={getCategoryColor(post.category)}>
                          {post.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">{post.title}</h3>
                        <p className="text-muted-foreground">{post.content}</p>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center space-x-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`${post.isLikedByCurrentUser ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
                            onClick={() => handleLikePost(post._id)}
                          >
                            <Heart className={`w-4 h-4 mr-1 ${post.isLikedByCurrentUser ? 'fill-current' : ''}`} />
                            {post.likes || 0}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenComments(post)}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            {post.commentCount || post.comments?.length || 0}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Category Filter */}
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg">Filter by Category</CardTitle>
                  <CardDescription>Click to filter posts by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* All Posts Button */}
                    <Button
                      variant={selectedCategory === 'all' ? 'default' : 'ghost'}
                      className={`w-full justify-between ${selectedCategory === 'all' ? 'gradient-button text-white' : 'hover:bg-muted'}`}
                      onClick={() => handleCategoryFilter('all')}
                    >
                      <span className="font-medium">All Posts</span>
                      <span className="text-xs opacity-75">
                        {stats?.totalPosts || 0}
                      </span>
                    </Button>

                    {/* Category Buttons */}
                    {stats?.categoryStats?.map((category, index) => (
                      <Button
                        key={index}
                        variant={selectedCategory === category._id ? 'default' : 'ghost'}
                        className={`w-full justify-between ${
                          selectedCategory === category._id 
                            ? 'gradient-button text-white' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => handleCategoryFilter(category._id)}
                      >
                        <span className="font-medium">{category._id}</span>
                        <span className="text-xs opacity-75">
                          {category.count} posts
                        </span>
                      </Button>
                    )) || (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No categories available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Contributors */}
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg">Top Contributors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.topAuthors?.slice(0, 5).map((author, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {author._id.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{author._id}</p>
                          <p className="text-xs text-muted-foreground">{author.count} posts</p>
                        </div>
                      </div>
                    )) || (
                      <p className="text-sm text-muted-foreground">No contributors yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>


        <TabsContent value="resources">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Knowledge Base</CardTitle>
                <CardDescription>Access medical resources and guidelines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => window.open('https://www.nccih.nih.gov/health/providers/clinicalpractice', '_blank')}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Clinical Guidelines
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => window.open('https://reference.medscape.com/', '_blank')}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Drug Reference
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => window.open('https://www.mdcalc.com/', '_blank')}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Medical Calculators
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => window.open('https://www.nature.com/subjects/medical-research/srep', '_blank')}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Research Papers
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Learning Modules</CardTitle>
                <CardDescription>Continuing medical education courses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="ghost" className="w-full justify-start">
                  <Award className="w-4 h-4 mr-2" />
                  CME Courses
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Award className="w-4 h-4 mr-2" />
                  Certification Programs
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Award className="w-4 h-4 mr-2" />
                  Webinar Series
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Award className="w-4 h-4 mr-2" />
                  Skill Assessments
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Comment Modal */}
      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={handleCloseComments}
        post={selectedPost}
        onCommentAdded={handleCommentAdded}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={handleCloseCreatePost}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
};

export default CommunityHub;
