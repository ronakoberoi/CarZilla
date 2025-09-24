import React, { useState } from 'react'
import Title from './Title'
import { assets } from '../assets/assets';
import toast from 'react-hot-toast';

const Testimonial = () => {
    const [email, setEmail] = useState("");

    const testimonials = [
        { name: "Sakshi Bhatia", location: "Chandigarh, India", image: assets.testimonial_image_1, testimonial: "Exceptional service and attention to detail. Highly recommended!" },
        { name: "Ravleen Sethi", location: "Mohali, India", image: assets.testimonial_image_2, testimonial: "The entire process was smooth, and the results exceeded all expectations. Thank you!" },
        { name: "Aarushi Kumra", location: "Patiala, India", image: assets.testimonial_image_1, testimonial: "Fantastic experience! From start to finish, the team was professional, responsive, and genuinely cared about delivering great results." }
    ];

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email address");
            return;
        }
        toast.success("Subscribed successfully! 🎉");
        setEmail("");
    };

    return (
        <div className="py-28 px-6 md:px-16 lg:px-24 xl:px-44">
            <Title 
                title="What Our Customers Say" 
                subTitle="Discover why discerning travelers choose StayVenture for their luxury accommodations around the world." 
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-18">
                {testimonials.map((testimonial, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:-translate-y-1 transition-all duration-500">
                        <div className="flex items-center gap-3">
                            <img className="w-12 h-12 rounded-full" src={testimonial.image} alt={testimonial.name} />
                            <div>
                                <p className="text-xl">{testimonial.name}</p>
                                <p className="text-gray-500">{testimonial.location}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 mt-4">
                            {Array(5).fill(0).map((_, i) => (
                                <img key={i} src={assets.star_icon} alt="star-icon" />
                            ))}
                        </div>
                        <p className="text-gray-500 max-w-90 mt-4 font-light">"{testimonial.testimonial}"</p>
                    </div>
                ))}
            </div>

            <br /><br/><br /><br />

            {/* Subscription Form */}
            <div className="flex flex-col items-center justify-center text-center space-y-2">
                <h1 className="md:text-4xl text-2xl font-semibold">Never Miss a Deal!</h1>
                <p className="md:text-lg text-gray-500/70 pb-8">
                Subscribe to get the latest offers, new arrivals, and exclusive discounts
                </p>
                <form onSubmit={handleSubscribe} className="flex items-center justify-between max-w-2xl w-full md:h-13 h-12">
                    <input
                        className="border border-gray-300 rounded-md h-full border-r-0 outline-none w-full rounded-r-none px-3 text-gray-500"
                        type="email"
                        placeholder="Enter your email id"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <button type="submit" className="md:px-12 px-8 h-full text-white bg-primary hover:bg-primary-dull transition-all cursor-pointer rounded-md rounded-l-none">
                        Subscribe
                    </button>
                </form>
            </div>
        </div>
    )
}

export default Testimonial
