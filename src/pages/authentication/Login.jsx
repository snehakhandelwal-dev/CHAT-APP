
import React from "react";
import { FaUser } from "react-icons/fa";
import { FaKey } from "react-icons/fa";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
const API_URL = import.meta.env.VITE_API_URL;
function Login() {
    const navigate = useNavigate(); 
    const [loginData, setLoginData] = useState(
        {
            userName: "",
            password: ""
        }
    )

    const handleInputChange = (e) => {
        setLoginData({
            ...loginData,
            [e.target.name]: e.target.value
        })
    };
    console.log('logindata', loginData);
    const handleLogin = async () => {
        console.log("hiii")
        try {
            console.log("hiii")
            const response = await axios.post(`${API_URL}users/login`, {
                userName: loginData.userName, // Match backend field names
                password: loginData.password,
            });
           console.log("res",response.data.data);
            if (response.data.data.token) {
                localStorage.setItem("token", response.data.data.token);
                localStorage.setItem("userData", JSON.stringify(response.data.data));
                toast.success("Login successful!");
                setTimeout(() => navigate("/"), 1500);
            } else {
                toast.error(response.data.message || "Login failed!");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong!");
        }
    };
    return (
        <div className="flex justify-center items-center p-6 min-h-screen">
            <div className="max-w-[40rem] w-full flex flex-col gap-5 bg-base-200 p-6 rounded-lg">
                <h2 className="text-lg">Please Login...!!</h2>

                <label className="input input-bordered flex items-center gap-2 w-full">
                    <FaUser />
                    <input type="text" name="userName" className="grow" placeholder="Username" onChange={handleInputChange} />
                </label>

                <label className="input input-bordered flex items-center gap-2 w-full">
                    <FaKey />
                    <input type="password" name="password" className="grow" placeholder="Password" onChange={handleInputChange} />
                </label>

                <button className="btn btn-active btn-primary" onClick={handleLogin}>Login</button>
                <p>
                    Dont't have an account? &nbsp;
                    <Link to='/signup' className="text-blue-400 underline">Sign up</Link>
                    {/* <span>Forgot Password</span>{" "}
    <a href="#">Reset Password</a>{" "} */}
                </p>
            </div>
            <ToastContainer />
        </div>
    )
}
export default Login
