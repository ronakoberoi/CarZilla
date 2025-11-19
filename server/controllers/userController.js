import User from "../models/User.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Car from "../models/Car.js";
// GENERATE TOKEN

const generateToken = (userID)=>{
    const payload = userID;
    return jwt.sign(payload, process.env.JWT_SECRET)
}

// REGISTER USER

const validateEmail = (email) =>{
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

const validatePass = (password) =>{
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
}

export const registerUser = async (req, res)=> {
    try{
        const {name, email, password} = req.body

        if(!name || !email || !password) {
            return res.json({success: false, message: 'Fill All the Fields'})
        }
        if(!validateEmail(email)){
            return res.json({success: false, message: 'Email must be Valid...'})
        }
        if(!validatePass(password)){
            return res.json({success: false, message: 'Password must be at least 8 characters including uppercase, number, and special character'})
        }
        const userExists = await User.findOne({email})
        if(userExists) {
            return res.json({success: false, message: 'User Already Exists'})
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({name, email, password: hashedPassword, provider: 'local'})
        const token = generateToken(user._id.toString())
        res.json({success: true, token})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// LOGIN USER

export const loginUser = async (req, res)=>{
    try {
        const {email, password} = req.body
        const user = await User.findOne({email})
        if(!user){
            return res.json({success: false, message: 'User Not Found'})
        }
        if(user.provider && user.provider === 'auth0'){
            return res.json({success: false, message: 'This account uses Google Sign-in. Use Continue with Google or set a local password.'})
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if(!isMatch){
            return res.json({success: false, message: 'Invalid Credentials'})
        }
        const token = generateToken(user._id.toString())
        res.json({success: true, token})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// GET USER DATA USING TOKEN 

export const getUserData = async (req, res)=> {
    try {
        const {user} = req;
        res.json({success: true, user})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// GET ALL CARS 

export const getCars = async (req, res)=> {
    try {
        const cars = await Car.find({isAvaliable: true})
        res.json({success: true, cars})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// AUTH0 / OAUTH LOGIN (Google via Auth0)
export const auth0Login = async (req, res) => {
    try {
        const { name, email, image } = req.body;
        if (!email) return res.json({ success: false, message: 'Email is required' });
        // derive a friendly name if none provided (use local part of email)
        const friendlyName = name && name.trim() ? name : (email.split('@')[0] || 'User')

        let user = await User.findOne({ email });
        if (!user) {
            // create user without a local password; provider = 'auth0'
            user = await User.create({ name: friendlyName, email, image: image || '', provider: 'auth0' });
        } else {
            // ensure name and image are set if missing
            let changed = false
            if ((!user.name || user.name === '') && friendlyName) { user.name = friendlyName; changed = true }
            if (image && image !== user.image) { user.image = image; changed = true }
            if (changed) await user.save()
        }

        const token = generateToken(user._id.toString());
        const hasLocalPassword = !!(user.password && user.password.length > 0)
        res.json({ success: true, token, hasLocalPassword });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// SET PASSWORD FOR AUTH0 CREATED USERS (PROTECTED)
export const setPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const user = req.user;
        if(!password) return res.json({ success: false, message: 'Password is required' });
        if(!validatePass(password)) return res.json({ success: false, message: 'Password must be at least 8 characters including uppercase, number, and special character' });

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword
        // mark provider as both so user can use local login later
        user.provider = user.provider === 'auth0' ? 'both' : 'local'
        await user.save()
        res.json({ success: true, message: 'Password updated' });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}
