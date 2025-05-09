
import React, { useState } from "react";
import { FaUser } from "react-icons/fa";
import { FaKey } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { MdEmail } from "react-icons/md";
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
const API_URL = import.meta.env.VITE_API_URL;
function Signup() {
    const navigate = useNavigate();
    const [signinData, setSiginData] = useState(
        
        {
            fullName: "",
            email: "",
            userName: "",
            password: "",
            confirmPassword: "",
            phoneNo: "",
            gender: "",
        }
    )

    const handleInputChange = (e) => {
        setSiginData({
            ...signinData,
            [e.target.name]: e.target.value
        })
    };
    console.log('signindata', signinData);
    const handleSignup = async () => {
        if (signinData.password !== signinData.confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }
        console.log('hiii');
        try {
            console.log('hiii99');
            const response = await axios.post(`${API_URL}users/register`, {
                fullName: signinData.fullName,
                email: signinData.email,
                userName: signinData.userName,
                password: signinData.password,
                confirmPassword: signinData.confirmPassword,
                phoneNo: signinData.phoneNo,
                gender: signinData.gender
            });
            console.log('res',response);
            if (response.data.data) {

                toast.success("Signup successful!");
                setTimeout(() => navigate("/login"), 1500);
            } else {
                toast.error(response.data.message || "Can't register the user!");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong!");
        }
    };
    return (
        <div classNameName="flex justify-center items-center p-6 min-h-screen">
            <div classNameName="max-w-[40rem] w-full flex flex-col gap-5 bg-base-200 p-6 rounded-lg">
                <h2 classNameName="text-lg">Please  Signup...!!</h2>
                <label className="input input-bordered flex items-center gap-2 w-full">
                    <FaUser />
                    <input
                        type="text"
                        className="grow"
                        placeholder="Fullname"
                        name="fullName"
                        onChange={handleInputChange} />
                </label>

                <label className="input input-bordered flex items-center gap-2 w-full">
                    <MdEmail />
                    <input
                        type="text"
                        className="grow"
                        placeholder="Email"
                        name="email"
                        onChange={handleInputChange} />
                </label>
                <label className="input input-bordered flex items-center gap-2 w-full">
                    <MdEmail />
                    <input
                        type="text"
                        className="grow"
                        placeholder="Gender"
                        name="gender"
                        onChange={handleInputChange} />
                </label>
                <label className="input input-bordered flex items-center gap-2 w-full">
                    <MdEmail />
                    <input
                        type="text"
                        className="grow"
                        placeholder="phoneNo"
                        name="phoneNo"
                        onChange={handleInputChange} />
                </label>



                <label className="input input-bordered flex items-center gap-2 w-full">
                    <FaUser />
                    <input
                        type="text"
                        className="grow"
                        placeholder="Username"
                        name="userName"
                        onChange={handleInputChange} />
                </label>

                <label className="input input-bordered flex items-center gap-2 w-full">
                    <FaKey />
                    <input
                        type="password"
                        placeholder="Password"
                        className="grow"
                        name="password"
                        onChange={handleInputChange} />
                </label>

                <label className="input input-bordered flex items-center gap-2 w-full">
                    <FaKey />
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        className="grow"
                        name="confirmPassword"
                        onChange={handleInputChange} />
                </label>

                <button className="btn btn-active btn-primary" onClick={handleSignup}>Signup</button>
                <p>
                    Already have an account? &nbsp;
                    <Link to='/login' className="text-blue-400 underline">Login</Link>
                    {/* <span>Forgot Password</span>{" "}
    <a href="#">Reset Password</a>{" "} */}
                </p>
            </div>
            <ToastContainer />
        </div>
    )
}
export default Signup
