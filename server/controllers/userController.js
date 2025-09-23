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
        const user = await User.create({name, email, password: hashedPassword})
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