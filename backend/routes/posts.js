const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const router = express.Router();

// Helper function to get user's clinic ID
const getUserClinicId = async (user) => {
  if (!user) return null;
  
  if (user.role === 'doctor') {
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findById(user.id);
    return doctor?.clinicId || null;
  } else if (['nurse', 'head_nurse', 'supervisor'].includes(user.role)) {
    const Nurse = require('../models/Nurse');
    const nurse = await Nurse.findById(user.id);
    return nurse?.clinicId || null;
  } else if (user.role === 'clinic') {
    return user.id; // Clinic admin's ID is the clinic ID
  }
  
  return null;
};

// Validation middleware
const validatePost = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Content is required and must be less than 5000 characters'),
  body('category').isIn(['Health Tips', 'Medical News', 'Patient Stories', 'Research', 'General', 'Other']).withMessage('Valid category is required'),
  body('visibility').isIn(['Public', 'Private', 'Members Only']).withMessage('Valid visibility is required')
];

// GET /api/posts - Get all posts with filtering and pagination
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category = '',
      visibility = '',
      author = '',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Get user's clinic ID for filtering
    const userClinicId = await getUserClinicId(req.user);

    // Ensure user has clinic access
    if (!userClinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic to view posts.' 
      });
    }

    // Build query with clinic filtering
    const query = {
      clinicId: new mongoose.Types.ObjectId(userClinicId) // Only show posts from user's clinic
    };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (visibility && visibility !== 'all') {
      query.visibility = visibility;
    }
    
    if (author) {
      query.author = author;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const posts = await Post.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    // Add isLikedByCurrentUser field to each post and include comments
    const postsWithLikeStatus = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLikedByCurrentUser = post.isLikedBy(req.user.id);
      // Include comments in the response
      postObj.comments = post.comments || [];
      postObj.commentCount = post.comments?.length || 0;
      return postObj;
    });

    // Get total count for pagination
    const total = await Post.countDocuments(query);

    res.json({
      posts: postsWithLikeStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/posts/:id - Get post by ID
router.get('/:id', auth, async (req, res) => {
  try {
    // Get user's clinic ID for filtering
    let userClinicId = null;
    
    if (req.user) {
      if (req.user.role === 'doctor') {
        const Doctor = require('../models/Doctor');
        const doctor = await Doctor.findById(req.user.id);
        if (doctor) {
          userClinicId = doctor.clinicId;
        }
      } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
        const Nurse = require('../models/Nurse');
        const nurse = await Nurse.findById(req.user.id);
        if (nurse) {
          userClinicId = nurse.clinicId;
        }
      } else if (req.user.role === 'clinic') {
        userClinicId = req.user.id;
      }
    }

    if (!userClinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic to view posts.' 
      });
    }

    // Find post with clinic filtering
    const post = await Post.findOne({ 
      _id: req.params.id, 
      clinicId: userClinicId 
    }).select('-__v');
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found or access denied' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/posts - Create new post
router.post('/', auth, validatePost, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Get user information for author and clinic
    let authorName = 'Anonymous User';
    let authorId = req.user?.id || '';
    let clinicId = null;
    
    if (req.user) {
      // Try to get user details from different collections based on role
      if (req.user.role === 'doctor') {
        const Doctor = require('../models/Doctor');
        const doctor = await Doctor.findById(req.user.id);
        if (doctor) {
          authorName = `Dr. ${doctor.fullName}`;
          clinicId = doctor.clinicId;
        }
      } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
        const Nurse = require('../models/Nurse');
        const nurse = await Nurse.findById(req.user.id);
        if (nurse) {
          authorName = nurse.fullName;
          clinicId = nurse.clinicId;
        }
      } else if (req.user.role === 'clinic') {
        const Clinic = require('../models/Clinic');
        const clinic = await Clinic.findById(req.user.id);
        if (clinic) {
          authorName = clinic.adminName || clinic.name;
          clinicId = req.user.id; // Clinic admin's ID is the clinic ID
        }
      }
    }

    // Ensure clinicId is provided
    if (!clinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic to create posts.' 
      });
    }

    // Create new post with author and clinic information
    const postData = {
      ...req.body,
      author: authorName,
      authorId: authorId,
      clinicId: clinicId
    };
    
    const post = new Post(postData);
    await post.save();

    res.status(201).json({
      message: 'Post created successfully',
      post: post.toJSON()
    });
  } catch (error) {
    console.error('Error creating post:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/posts/:id - Update post
router.put('/:id', validatePost, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if post exists
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Update post
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-__v');

    res.json({
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Error updating post:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/posts/:id - Delete post
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await Post.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/posts/:id/feature - Toggle post featured status
router.patch('/:id/feature', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.featured = !post.featured;
    post.updatedAt = new Date();
    await post.save();

    res.json({
      message: `Post ${post.featured ? 'featured' : 'unfeatured'} successfully`,
      post: post.toJSON()
    });
  } catch (error) {
    console.error('Error toggling post featured status:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/posts/:id/visibility - Update post visibility
router.patch('/:id/visibility', async (req, res) => {
  try {
    const { visibility } = req.body;
    
    if (!visibility || !['Public', 'Private', 'Members Only'].includes(visibility)) {
      return res.status(400).json({ error: 'Valid visibility is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.visibility = visibility;
    post.updatedAt = new Date();
    await post.save();

    res.json({
      message: 'Post visibility updated successfully',
      post: post.toJSON()
    });
  } catch (error) {
    console.error('Error updating post visibility:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/posts/stats/summary - Get post statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    // Get user's clinic ID for filtering
    const userClinicId = await getUserClinicId(req.user);

    if (!userClinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic to view stats.' 
      });
    }

    // Filter by clinic
    const clinicFilter = { clinicId: new mongoose.Types.ObjectId(userClinicId) };
    
    const totalPosts = await Post.countDocuments(clinicFilter);
    
    // Get posts by category (filtered by clinic)
    const categoryStats = await Post.aggregate([
      { $match: clinicFilter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get posts by visibility (filtered by clinic)
    const visibilityStats = await Post.aggregate([
      { $match: clinicFilter },
      {
        $group: {
          _id: '$visibility',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get featured posts count (filtered by clinic)
    const featuredPosts = await Post.countDocuments({ 
      ...clinicFilter, 
      featured: true 
    });

    // Get posts by author (filtered by clinic)
    const authorStats = await Post.aggregate([
      { $match: clinicFilter },
      {
        $group: {
          _id: '$author',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      totalPosts,
      featuredPosts,
      categoryStats,
      visibilityStats,
      topAuthors: authorStats
    });
  } catch (error) {
    console.error('Error fetching post stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/posts/search/tags - Search posts by tags
router.get('/search/tags', async (req, res) => {
  try {
    const { tag } = req.query;
    
    if (!tag || tag.length < 2) {
      return res.status(400).json({ error: 'Tag search query must be at least 2 characters' });
    }

    const posts = await Post.find({
      tags: { $regex: tag, $options: 'i' }
    })
    .select('title category visibility featured createdAt')
    .limit(20);

    res.json(posts);
  } catch (error) {
    console.error('Error searching posts by tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/posts/:id/like - Like a post
router.post('/:id/like', auth, async (req, res) => {
  try {
    // Get user's clinic ID for filtering
    const userClinicId = await getUserClinicId(req.user);

    if (!userClinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic.' 
      });
    }

    // Find post with clinic filtering
    const post = await Post.findOne({ 
      _id: req.params.id, 
      clinicId: userClinicId 
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found or access denied' });
    }

    // Check if user already liked this post
    if (post.isLikedBy(req.user.id)) {
      return res.status(400).json({ error: 'You have already liked this post' });
    }

    await post.like(req.user.id, req.user.role);
    res.json({
      message: 'Post liked successfully',
      likes: post.likes,
      isLiked: true
    });
  } catch (error) {
    console.error('Error liking post:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/posts/:id/unlike - Unlike a post
router.post('/:id/unlike', auth, async (req, res) => {
  try {
    // Get user's clinic ID for filtering
    const userClinicId = await getUserClinicId(req.user);

    if (!userClinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic.' 
      });
    }

    // Find post with clinic filtering
    const post = await Post.findOne({ 
      _id: req.params.id, 
      clinicId: userClinicId 
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found or access denied' });
    }

    // Check if user has liked this post
    if (!post.isLikedBy(req.user.id)) {
      return res.status(400).json({ error: 'You have not liked this post' });
    }

    await post.unlike(req.user.id);
    res.json({
      message: 'Post unliked successfully',
      likes: post.likes,
      isLiked: false
    });
  } catch (error) {
    console.error('Error unliking post:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});


// POST /api/posts/:id/comments - Add a comment to a post
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Get user's clinic ID for filtering
    const userClinicId = await getUserClinicId(req.user);

    if (!userClinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic.' 
      });
    }

    // Find post with clinic filtering
    const post = await Post.findOne({ 
      _id: req.params.id, 
      clinicId: userClinicId 
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found or access denied' });
    }

    // Get user information for comment author
    let authorName = 'Anonymous User';
    let authorId = req.user?.id || '';
    
    if (req.user) {
      // Try to get user details from different collections based on role
      if (req.user.role === 'doctor') {
        const Doctor = require('../models/Doctor');
        const doctor = await Doctor.findById(req.user.id);
        if (doctor) {
          authorName = `Dr. ${doctor.fullName}`;
        }
      } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
        const Nurse = require('../models/Nurse');
        const nurse = await Nurse.findById(req.user.id);
        if (nurse) {
          authorName = nurse.fullName;
        }
      } else if (req.user.role === 'clinic') {
        const Clinic = require('../models/Clinic');
        const clinic = await Clinic.findById(req.user.id);
        if (clinic) {
          authorName = clinic.adminName || clinic.name;
        }
      }
    }

    const comment = {
      content,
      author: authorName,
      authorId: authorId,
      createdAt: new Date()
    };

    await post.addComment(comment);
    res.status(201).json({
      message: 'Comment added successfully',
      comment,
      commentCount: post.commentCount
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/posts/:id/view - Increment post views
router.post('/:id/view', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await post.incrementViews();
    res.json({
      message: 'View recorded successfully',
      views: post.views
    });
  } catch (error) {
    console.error('Error recording view:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
