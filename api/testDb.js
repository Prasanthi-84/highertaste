require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('./src/models/User');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'mukunda@hkmvizag.org' }).select('+resetPasswordToken +resetPasswordExpire');
        console.log('User Token:', user.resetPasswordToken);
        console.log('User Expire:', user.resetPasswordExpire);
        console.log('Now       :', new Date());
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
})();
