import React from 'react'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const SetPassword = () => {
  const { axios, fetchUser } = useAppContext()
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    try {
      e.preventDefault()
      if(password !== confirm) return toast.error('Passwords do not match')
      const { data } = await axios.post('/api/user/set-password', { password })
      if(data.success){
        toast.success('Password set successfully')
        await fetchUser()
        navigate('/')
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-medium mb-4">Create a local password</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="New password" className="border p-2 rounded" />
        <input type="password" required value={confirm} onChange={(e)=>setConfirm(e.target.value)} placeholder="Confirm password" className="border p-2 rounded" />
        <button className="bg-primary text-white py-2 rounded">Save Password</button>
      </form>
    </div>
  )
}

export default SetPassword
