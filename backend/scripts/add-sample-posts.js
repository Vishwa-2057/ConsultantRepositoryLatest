const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config();

async function addSamplePosts() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI;
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Get a clinic ID from existing clinics
    const db = mongoose.connection.db;
    const clinicsCollection = db.collection('clinics');
    const clinic = await clinicsCollection.findOne({});
    
    if (!clinic) {
      console.log('❌ No clinics found. Please create a clinic first.');
      return;
    }
    
    console.log('🏥 Using clinic:', clinic.name, 'ID:', clinic._id);
    
    // Sample posts with different categories
    const samplePosts = [
      {
        title: "New Hypertension Treatment Guidelines",
        content: "The American Heart Association has released updated guidelines for treating hypertension. Key changes include lower blood pressure targets and new medication recommendations.",
        category: "Medical News",
        author: "Dr. Sarah Johnson",
        authorId: "sample_doctor_1",
        clinicId: clinic._id,
        visibility: "Public",
        published: true,
        status: "Published"
      },
      {
        title: "5 Tips for Better Patient Communication",
        content: "Effective communication with patients is crucial for better outcomes. Here are five proven strategies to improve your patient interactions and build trust.",
        category: "Health Tips",
        author: "Nurse Mary Wilson",
        authorId: "sample_nurse_1",
        clinicId: clinic._id,
        visibility: "Public",
        published: true,
        status: "Published"
      },
      {
        title: "A Remarkable Recovery Story",
        content: "Today I want to share an inspiring story about a patient who overcame significant health challenges through determination and proper care. This case taught me valuable lessons about resilience.",
        category: "Patient Stories",
        author: "Dr. Michael Chen",
        authorId: "sample_doctor_2",
        clinicId: clinic._id,
        visibility: "Public",
        published: true,
        status: "Published"
      },
      {
        title: "Latest Research on Diabetes Management",
        content: "Recent studies have shown promising results for new diabetes management techniques. This research could change how we approach treatment in the coming years.",
        category: "Research",
        author: "Dr. Emily Rodriguez",
        authorId: "sample_doctor_3",
        clinicId: clinic._id,
        visibility: "Public",
        published: true,
        status: "Published"
      },
      {
        title: "Welcome to Our Community Hub",
        content: "Welcome everyone to our new community platform! This is a space where we can share knowledge, discuss cases, and support each other in providing the best patient care.",
        category: "General",
        author: "Admin Team",
        authorId: "sample_admin_1",
        clinicId: clinic._id,
        visibility: "Public",
        published: true,
        status: "Published"
      },
      {
        title: "Upcoming Medical Conference Highlights",
        content: "I wanted to share some interesting topics that will be covered at the upcoming medical conference. These sessions could be valuable for our professional development.",
        category: "Other",
        author: "Dr. James Park",
        authorId: "sample_doctor_4",
        clinicId: clinic._id,
        visibility: "Public",
        published: true,
        status: "Published"
      }
    ];
    
    console.log('📝 Creating sample posts...');
    
    for (const postData of samplePosts) {
      try {
        const post = new Post(postData);
        await post.save();
        console.log(`✅ Created post: "${postData.title}" (${postData.category})`);
      } catch (error) {
        console.log(`❌ Failed to create post: "${postData.title}"`, error.message);
      }
    }
    
    console.log('\n🎉 Sample posts creation completed!');
    
    // Verify the posts were created
    const totalPosts = await Post.countDocuments({ clinicId: clinic._id });
    console.log(`📊 Total posts in clinic: ${totalPosts}`);
    
    // Show category breakdown
    const categoryStats = await Post.aggregate([
      { $match: { clinicId: clinic._id } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\n📋 Category breakdown:');
    categoryStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} posts`);
    });
    
  } catch (error) {
    console.error('❌ Error creating sample posts:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📝 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  addSamplePosts()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = addSamplePosts;
