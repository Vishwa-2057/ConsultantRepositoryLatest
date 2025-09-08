import { useState } from "react";
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

const CommunityHub = () => {
  const [newPost, setNewPost] = useState("");

  const communityPosts = [
    {
      id: "POST001",
      author: "Dr. Sarah Kim",
      specialty: "Cardiology",
      title: "New Guidelines for Hypertension Management",
      content: "The latest AHA guidelines have introduced some significant changes in how we approach hypertension treatment...",
      timestamp: "2 hours ago",
      likes: 15,
      comments: 8,
      shares: 3,
      category: "Guidelines"
    },
    {
      id: "POST002",
      author: "Dr. Michael Rodriguez", 
      specialty: "Emergency Medicine",
      title: "Case Study: Complex Multi-trauma Patient",
      content: "Interesting case from last week involving a 35-year-old male with multiple trauma injuries...",
      timestamp: "5 hours ago",
      likes: 23,
      comments: 12,
      shares: 7,
      category: "Case Study"
    },
    {
      id: "POST003",
      author: "Dr. Lisa Chen",
      specialty: "Pediatrics",
      title: "Vaccination Schedule Updates for 2024",
      content: "The CDC has released updated vaccination recommendations for children. Key changes include...",
      timestamp: "1 day ago",
      likes: 31,
      comments: 16,
      shares: 12,
      category: "Public Health"
    }
  ];

  const upcomingEvents = [
    {
      id: "EVENT001",
      title: "Medical Conference 2024",
      date: "Feb 15-17, 2024",
      location: "Convention Center",
      attendees: 245,
      type: "Conference"
    },
    {
      id: "EVENT002",
      title: "Cardiology Workshop",
      date: "Feb 10, 2024",
      location: "Medical Center",
      attendees: 58,
      type: "Workshop"
    },
    {
      id: "EVENT003",
      title: "CME: Emergency Procedures",
      date: "Feb 8, 2024", 
      location: "Online",
      attendees: 123,
      type: "CME"
    }
  ];

  const achievements = [
    {
      id: "ACH001",
      title: "Top Contributor",
      description: "Most helpful community posts this month",
      badge: "🏆",
      date: "January 2024"
    },
    {
      id: "ACH002",
      title: "Knowledge Sharer",
      description: "Shared 10+ educational resources",
      badge: "📚",
      date: "December 2023"
    },
    {
      id: "ACH003",
      title: "Community Builder",
      description: "Helped 50+ community members",
      badge: "🤝",
      date: "November 2023"
    }
  ];

  const getCategoryColor = (category) => {
    switch (category) {
      case "Guidelines": return "primary";
      case "Case Study": return "secondary";
      case "Public Health": return "success";
      default: return "muted";
    }
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case "Conference": return "primary";
      case "Workshop": return "secondary";
      case "CME": return "success";
      default: return "muted";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Community Hub</h1>
          <p className="text-muted-foreground">Connect, share knowledge, and engage with healthcare professionals</p>
        </div>
        <Button className="bg-gradient-primary shadow-soft">
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">1,247</p>
            <p className="text-sm text-muted-foreground">Active Members</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center mx-auto mb-2">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">89</p>
            <p className="text-sm text-muted-foreground">Posts This Week</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">12</p>
            <p className="text-sm text-muted-foreground">Upcoming Events</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">94%</p>
            <p className="text-sm text-muted-foreground">Engagement Rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="feed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feed">Community Feed</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Create Post */}
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg">Share with the Community</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Share your knowledge, ask questions, or start a discussion..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <BookOpen className="w-4 h-4 mr-1" />
                        Guidelines
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Case Study
                      </Button>
                    </div>
                    <Button className="bg-gradient-primary">
                      Post
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Community Posts */}
              <div className="space-y-4">
                {communityPosts.map((post) => (
                  <Card key={post.id} className="border-0 shadow-soft hover:shadow-medical transition-all duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {post.author.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{post.author}</h4>
                            <p className="text-sm text-muted-foreground">{post.specialty} • {post.timestamp}</p>
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
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                            <Heart className="w-4 h-4 mr-1" />
                            {post.likes}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            {post.comments}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            <Share2 className="w-4 h-4 mr-1" />
                            {post.shares}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Trending Topics */}
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg">Trending Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">#Hypertension</span>
                      <span className="text-xs text-muted-foreground">24 posts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">#EmergencyMedicine</span>
                      <span className="text-xs text-muted-foreground">18 posts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">#Pediatrics</span>
                      <span className="text-xs text-muted-foreground">15 posts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">#CME</span>
                      <span className="text-xs text-muted-foreground">12 posts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Members */}
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg">Active Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">SK</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Dr. Sarah Kim</p>
                        <p className="text-xs text-muted-foreground">Cardiology</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">MR</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Dr. Michael Rodriguez</p>
                        <p className="text-xs text-muted-foreground">Emergency Medicine</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">LC</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Dr. Lisa Chen</p>
                        <p className="text-xs text-muted-foreground">Pediatrics</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Professional development and networking opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">{event.date} • {event.location}</p>
                          <p className="text-sm text-muted-foreground">{event.attendees} attendees</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge variant={getEventTypeColor(event.type)}>
                          {event.type}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Register
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
              <CardDescription>Recognition for your community contributions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((achievement) => (
                  <Card key={achievement.id} className="border-0 shadow-soft text-center">
                    <CardContent className="p-6">
                      <div className="text-4xl mb-3">{achievement.badge}</div>
                      <h3 className="font-semibold text-foreground mb-2">{achievement.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                      <Badge variant="secondary">{achievement.date}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Knowledge Base</CardTitle>
                <CardDescription>Access medical resources and guidelines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="ghost" className="w-full justify-start">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Clinical Guidelines
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Drug Reference
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Medical Calculators
                </Button>
                <Button variant="ghost" className="w-full justify-start">
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
    </div>
  );
};

export default CommunityHub;
