const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  
  // Categorization
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Health Tips', 'Medical News', 'Patient Stories', 'Research', 'General', 'Other']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  
  // Author Information
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true
  },
  authorId: {
    type: String,
    trim: true
  },
  
  // Clinic Association
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic ID is required']
  },
  
  // Visibility and Access Control
  visibility: {
    type: String,
    enum: ['Public', 'Private', 'Members Only'],
    default: 'Public'
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // Engagement Metrics
  likes: {
    type: Number,
    default: 0,
    min: [0, 'Likes cannot be negative']
  },
  likedBy: [{
    userId: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0,
    min: [0, 'Views cannot be negative']
  },
  shares: {
    type: Number,
    default: 0,
    min: [0, 'Shares cannot be negative']
  },
  
  // Comments and Interactions
  allowComments: {
    type: Boolean,
    default: true
  },
  comments: [{
    author: {
      type: String,
      required: true,
      trim: true
    },
    authorId: {
      type: String,
      trim: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    likes: {
      type: Number,
      default: 0,
      min: [0, 'Comment likes cannot be negative']
    },
    replies: [{
      author: {
        type: String,
        required: true,
        trim: true
      },
      authorId: {
        type: String,
        trim: true
      },
      content: {
        type: String,
        required: true,
        trim: true,
        maxlength: [500, 'Reply cannot exceed 500 characters']
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      likes: {
        type: Number,
        default: 0,
        min: [0, 'Reply likes cannot be negative']
      }
    }]
  }],
  
  // Media and Attachments
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'document'],
      required: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    filename: {
      type: String,
      trim: true
    },
    size: {
      type: Number
    },
    mimeType: {
      type: String,
      trim: true
    },
    thumbnail: {
      type: String,
      trim: true
    }
  }],
  
  // SEO and Metadata
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  keywords: [{
    type: String,
    trim: true
  }],
  slug: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  
  // Publishing and Scheduling
  published: {
    type: Boolean,
    default: true
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  scheduledDate: {
    type: Date
  },
  
  // Moderation and Status
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Archived', 'Flagged', 'Removed'],
    default: 'Published'
  },
  moderationNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Moderation notes cannot exceed 500 characters']
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for total engagement
postSchema.virtual('totalEngagement').get(function() {
  return this.likes + this.views + this.shares;
});

// Virtual for is published
postSchema.virtual('isPublished').get(function() {
  return this.published && this.status === 'Published';
});

// Virtual for is scheduled
postSchema.virtual('isScheduled').get(function() {
  return this.scheduledDate && this.scheduledDate > new Date();
});

// Virtual for reading time estimate (assuming 200 words per minute)
postSchema.virtual('readingTime').get(function() {
  const wordCount = this.content.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 200);
  return minutes;
});

// Pre-save middleware to generate slug if not provided
postSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  // Update publish date if status changes to published
  if (this.isModified('status') && this.status === 'Published' && !this.publishDate) {
    this.publishDate = new Date();
  }
  
  next();
});

// Indexes for better query performance
postSchema.index({ title: 'text', content: 'text', tags: 'text' });
postSchema.index({ author: 1 });
postSchema.index({ category: 1 });
postSchema.index({ visibility: 1 });
postSchema.index({ featured: 1 });
postSchema.index({ status: 1 });
postSchema.index({ publishDate: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ slug: 1 });
postSchema.index({ clinicId: 1 });

// Compound indexes for common queries
postSchema.index({ category: 1, status: 1, publishDate: -1 });
postSchema.index({ visibility: 1, status: 1, publishDate: -1 });
postSchema.index({ featured: 1, status: 1, publishDate: -1 });
postSchema.index({ clinicId: 1, status: 1, publishDate: -1 });
postSchema.index({ clinicId: 1, category: 1, publishDate: -1 });

// Static method to find published posts
postSchema.statics.findPublished = function() {
  return this.find({
    published: true,
    status: 'Published',
    $or: [
      { scheduledDate: { $exists: false } },
      { scheduledDate: { $lte: new Date() } }
    ]
  });
};

// Static method to find featured posts
postSchema.statics.findFeatured = function() {
  return this.find({
    featured: true,
    published: true,
    status: 'Published'
  });
};

// Static method to find posts by category
postSchema.statics.findByCategory = function(category) {
  return this.find({
    category,
    published: true,
    status: 'Published'
  });
};

// Static method to search posts
postSchema.statics.search = function(query) {
  return this.find({
    $text: { $search: query },
    published: true,
    status: 'Published'
  }, {
    score: { $meta: 'textScore' }
  }).sort({ score: { $meta: 'textScore' } });
};

// Instance method to add comment
postSchema.methods.addComment = function(comment) {
  this.comments.push(comment);
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to add reply to comment
postSchema.methods.addReply = function(commentIndex, reply) {
  if (commentIndex >= 0 && commentIndex < this.comments.length) {
    this.comments[commentIndex].replies.push(reply);
    this.updatedAt = new Date();
    return this.save();
  }
  throw new Error('Invalid comment index');
};

// Instance method to like post
postSchema.methods.like = function(userId, userRole) {
  // Check if user already liked this post
  const existingLike = this.likedBy.find(like => like.userId === userId);
  if (existingLike) {
    throw new Error('User has already liked this post');
  }
  
  // Add user to likedBy array
  this.likedBy.push({
    userId: userId,
    userRole: userRole,
    likedAt: new Date()
  });
  
  // Update likes count
  this.likes = this.likedBy.length;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to unlike post
postSchema.methods.unlike = function(userId) {
  // Find and remove user from likedBy array
  const likeIndex = this.likedBy.findIndex(like => like.userId === userId);
  if (likeIndex === -1) {
    throw new Error('User has not liked this post');
  }
  
  this.likedBy.splice(likeIndex, 1);
  
  // Update likes count
  this.likes = this.likedBy.length;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to check if user has liked post
postSchema.methods.isLikedBy = function(userId) {
  return this.likedBy.some(like => like.userId === userId);
};

// Instance method to increment views
postSchema.methods.incrementViews = function() {
  this.views += 1;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to share post
postSchema.methods.share = function() {
  this.shares += 1;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to toggle featured status
postSchema.methods.toggleFeatured = function() {
  this.featured = !this.featured;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to publish post
postSchema.methods.publish = function() {
  this.published = true;
  this.status = 'Published';
  this.publishDate = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to archive post
postSchema.methods.archive = function() {
  this.status = 'Archived';
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Post', postSchema);
