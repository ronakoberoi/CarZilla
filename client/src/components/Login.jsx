import React from 'react'
import { useAppContext } from '../context/AppContext';
import { useAuth0 } from '@auth0/auth0-react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

const Login = () => {

    const {setShowLogin, axios, setToken, navigate} = useAppContext()
    const { loginWithPopup, getIdTokenClaims } = useAuth0();
    const [state, setState] = React.useState("login");
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);

    const onSubmitHandler = async (event) =>{
        try {
            event.preventDefault();
            const {data} = await axios.post(`/api/user/${state}`, {name, email, password})
            if(data.success){
                toast.success('Login successfull!')
                navigate('/')
                setToken(data.token)
                localStorage.setItem('token', data.token)
                setShowLogin(false)
            } else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleAuth0Login = async () =>{
        try {
            await loginWithPopup({authorizationParams: {prompt: 'login'}})
            const claims = await getIdTokenClaims()
            const emailFromClaims = claims?.email
            const derivedName = claims?.name || claims?.nickname || (emailFromClaims ? emailFromClaims.split('@')[0] : '') || 'User'
            const picture = claims?.picture || ''
            if(!emailFromClaims) return toast.error('Unable to retrieve profile from Auth0')

            const {data} = await axios.post('/api/user/auth0', {name: derivedName, email: emailFromClaims, image: picture})
            if(data.success){
                toast.success('Login successful!')
                // store app token so protected set-password page is accessible
                setToken(data.token)
                localStorage.setItem('token', data.token)
                if(data.hasLocalPassword){
                    navigate('/')
                    setShowLogin(false)
                } else {
                    // redirect to create local password page
                    navigate('/set-password')
                    setShowLogin(false)
                }
            } else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }
    
  return (
    <div onClick={()=> setShowLogin(false)} className='fixed top-0 bottom-0 right-0 left-0 z-100 flex items-center text-sm text-gray-600 bg-black/50'>
        <form onSubmit={onSubmitHandler} onClick={(e)=>e.stopPropagation()} className="flex flex-col gap-4 m-auto items-start p-8 py-12 w-80 sm:w-[352px] rounded-lg shadow-xl border border-gray-200 bg-white">
            <p className="text-2xl font-medium m-auto">
                <span className="text-primary">User</span> {state === "login" ? "Login" : "Sign Up"}
            </p>
            {state === "register" && (
                <div className="w-full">
                    <p>Name</p>
                    <input onChange={(e) => setName(e.target.value)} value={name} placeholder="type here" className="border border-gray-200 rounded w-full p-2 mt-1 outline-primary" type="text" required />
                </div>
            )}
            <div className="w-full ">
                <p>Email</p>
                <input onChange={(e) => setEmail(e.target.value)} value={email} placeholder="type here" className="border border-gray-200 rounded w-full p-2 mt-1 outline-primary" type="email" required />
            </div>
                        <div className="w-full ">
                                <p>Password</p>
                                <div className="relative">
                                    <input
                                        onChange={(e) => setPassword(e.target.value)}
                                        value={password}
                                        placeholder="type here"
                                        className="border border-gray-200 rounded w-full p-2 mt-1 outline-primary pr-12"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(s => !s)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 bg-transparent flex items-center justify-center"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            // eye-off / closed eye
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.6 2.74-4.78 4.8-6.16" />
                                                <path d="M1 1l22 22" />
                                                <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                                            </svg>
                                        ) : (
                                            // eye / open eye
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                        </div>
            {state === "register" ? (
                <p>
                    Already have account? <span onClick={() => setState("login")} className="text-primary cursor-pointer hover:underline">click here</span>
                </p>
            ) : (
                <p>
                    Create an account? <span onClick={() => setState("register")} className="text-primary-dull cursor-pointer hover:underline">click here</span>
                </p>
            )}
            <button className="bg-primary hover:bg-primary-dull transition-all text-white w-full py-2 rounded-md cursor-pointer">
                {state === "register" ? "Create Account" : "Login"}
            </button>
            <button type="button" onClick={handleAuth0Login} className="mt-2 bg-white border border-gray-200 text-gray-700 w-full py-2 rounded-md cursor-pointer flex items-center justify-center gap-2">
                <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQVZEZ6fa7bPwCI4HE5583rhd3qiFNmf6kiPg&s" alt="google" className="w-5 h-5" />
                Continue with Google
            </button>
            
        </form>
    </div>
  )
}

export default Login