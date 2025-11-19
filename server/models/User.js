import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String},
    role: {type: String, enum:["owner", "user"], default: 'user'},
    image: {type: String, default: ''},
    provider: { type: String, enum: ['local','auth0','both'], default: 'local' },
},{timestamps: true})

const User = mongoose.model('User', userSchema)

export default User