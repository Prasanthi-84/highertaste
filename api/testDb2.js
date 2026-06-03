require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('./src/models/User');
const crypto = require('crypto');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'mukunda@hkmvizag.org' }).select('+resetPasswordToken +resetPasswordExpire');
        console.log('User Token Hash:', user.resetPasswordToken);
        console.log('User Expire:', user.resetPasswordExpire);
        console.log('Time diff (s):', (user.resetPasswordExpire - Date.now())/1000);

        // Can we find it with findOne?
        const foundUser = await User.findOne({
            resetPasswordToken: user.resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });
        console.log('Found with same query?', !!foundUser);
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
})();
