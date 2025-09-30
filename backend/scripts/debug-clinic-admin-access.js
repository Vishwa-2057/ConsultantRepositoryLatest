const mongoose = require('mongoose');
require('dotenv').config();

async function debugClinicAdminAccess() {
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
    
    const db = mongoose.connection.db;
    
    // Get all clinics
    console.log('\n🏥 CLINICS:');
    const clinics = await db.collection('clinics').find({}).toArray();
    clinics.forEach(clinic => {
      console.log(`   ID: ${clinic._id}`);
      console.log(`   Name: ${clinic.name}`);
      console.log(`   Admin Name: ${clinic.adminName || 'N/A'}`);
      console.log(`   Admin Email: ${clinic.adminEmail || 'N/A'}`);
      console.log('   ---');
    });
    
    // Get all posts and their clinic IDs
    console.log('\n📝 POSTS:');
    const posts = await db.collection('posts').find({}).toArray();
    console.log(`Found ${posts.length} posts total`);
    
    const postsByClinic = {};
    posts.forEach(post => {
      const clinicId = post.clinicId ? post.clinicId.toString() : 'No Clinic';
      if (!postsByClinic[clinicId]) {
        postsByClinic[clinicId] = [];
      }
      postsByClinic[clinicId].push(post);
    });
    
    Object.keys(postsByClinic).forEach(clinicId => {
      console.log(`\n   Clinic ID: ${clinicId}`);
      console.log(`   Posts: ${postsByClinic[clinicId].length}`);
      postsByClinic[clinicId].forEach(post => {
        console.log(`      - "${post.title}" (${post.category}) by ${post.author}`);
      });
    });
    
    // Check if clinic admin IDs match clinic IDs
    console.log('\n🔍 CLINIC ADMIN ID MATCHING:');
    clinics.forEach(clinic => {
      const clinicIdStr = clinic._id.toString();
      const postsForClinic = postsByClinic[clinicIdStr] || [];
      console.log(`\n   Clinic: ${clinic.name}`);
      console.log(`   Clinic ID: ${clinicIdStr}`);
      console.log(`   Posts with this clinic ID: ${postsForClinic.length}`);
      
      // The clinic admin should be able to access posts where clinicId matches their user ID
      // For clinic admins, their user ID should be the same as the clinic ID
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📝 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  debugClinicAdminAccess()
    .then(() => {
      console.log('🎉 Debug completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug failed:', error);
      process.exit(1);
    });
}

module.exports = debugClinicAdminAccess;
