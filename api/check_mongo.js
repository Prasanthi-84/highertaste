const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://catering_admin:CateringAdmin2026@cluster0.2vlrwwm.mongodb.net/catering_ops_hub?retryWrites=true&w=majority&appName=Cluster0');
  
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const users = await User.find({});
  console.log("Users:", users.length);
  for (const u of users) {
    console.log(`- ${u.get('email')} / isActive: ${u.get('isActive')} / role: ${u.get('role')}`);
  }
  
  process.exit(0);
}
check().catch(console.error);
