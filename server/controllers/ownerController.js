import User from "../models/User.js";
import fs from "fs";
import imagekit from "../configs/imageKit.js"
import Car from "../models/Car.js"
import Booking from "../models/Booking.js";

export const changeRoleToOwner=async(req,res)=>{
    try{
        const{_id}=req.user;
        await User.findByIdAndUpdate(_id, {role: "owner"})
        res.json({success: true, message: "Now you can list cars"})
    } catch(error){
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API TO LIST CAR

export const addCar = async (req, res)=>{
    try {
        const {_id} = req.user;
        let car = JSON.parse(req.body.carData);
        const imageFile = req.file;

        // UPLOAD IMAGE TO IMAGEKIT
        const fileBuffer = fs.readFileSync(imageFile.path)
        const response = await imagekit.upload({
            file: fileBuffer,
            fileName: imageFile.originalname,
            folder: '/cars'
        })

        // FOR URL GENERATION (IMAGE)
        var optimizedImageUrl = imagekit.url({
            path : response.filePath,
            transformation : [
                {width: '1280'},
                {quality: 'auto'},
                {format: 'webp'}
            ]
        });

        const image = optimizedImageUrl;
        await Car.create({...car, owner: _id, image})
        res.json({success: true, message: "CAR ADDED"})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API TO LIST OWNER CARS

export const getOwnerCars = async (req, res)=>{
    try{
        const {_id} = req.user;
        const cars = await Car.find({owner: _id})
        res.json({success: true, cars})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API TO TOGGLE AVAILABILITY

export const toggleCarAvailability = async (req, res)=>{
    try{
        const {_id} = req.user;
        const {carId} = req.body
        const car = await Car.findById(carId)

        if(car.owner.toString() !== _id.toString()) {
            return res.json({success: false, message: "UNAUTHORIZED"})
        }

        car.isAvaliable = !car.isAvaliable
        await car.save()

        res.json({success: true, message: "Availability Toggled"})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API TO DELETE CAR

export const deleteCar = async (req, res)=>{
    try{
        const {_id} = req.user;
        const {carId} = req.body
        const car = await Car.findById(carId)

        if(car.owner.toString() !== _id.toString()) {
            return res.json({success: false, message: "UNAUTHORIZED"})
        }

        car.owner = null;
        car.isAvaliable = false;
        await car.save()

        res.json({success: true, message: "CAR REMOVED"})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API TO GET ALL DASHBOARD DATA

export const getDashboardData = async (req, res)=>{
    try {
        const { _id, role } = req.user;

        if(role !== 'owner'){
            return res.json({success: false, message: "UNAUTHORIZED"})
        }

        const cars = await Car.find({owner: _id})
        const bookings = await Booking.find({owner: _id}).populate('car').sort({createdAt: -1})
        const pendingBookings = await Booking.find({owner: _id, status: "Pending"})
        const completedBookings = await Booking.find({owner: _id, status: "Confirmed"})
        // MONTHLY REVENUE

        const monthlyRevenue = bookings.slice().filter(booking => booking.status === 'Confirmed').reduce((acc, booking)=> acc + booking.price, 0)
        
        const dashboardData = {
        totalCars: cars.length,
        totalBookings: bookings.length,
        pendingBookings: pendingBookings.length,
        completedBookings: completedBookings.length,
        recentBookings: bookings.slice(0,3),
        monthlyRevenue
        }

        res.json({ success: true, dashboardData });

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API TO UPDATE IMAGE 

export const updateUserImage= async (req, res)=>{
    try {
        const{ _id } = req.user;
        const imageFile = req.file;
        // UPLOAD IMAGE TO IMAGEKIT
        const fileBuffer = fs.readFileSync(imageFile.path)
        const response = await imagekit.upload({
            file: fileBuffer,
            fileName: imageFile.originalname,
            folder: '/users'
        })
        // FOR URL GENERATION (IMAGE)
        var optimizedImageUrl = imagekit.url({
            path : response.filePath,
            transformation : [
                {width: '400'},
                {quality: 'auto'},
                {format: 'webp'}
            ]
        });

        const image = optimizedImageUrl;
        await User.findByIdAndUpdate(_id, {image})
        res.json({success: true, message: "IMAGE UPDATED"})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}