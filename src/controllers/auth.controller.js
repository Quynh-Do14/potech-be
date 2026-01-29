const bcrypt = require('bcrypt')
const { signToken } = require('../utils/jwt')
const userModel = require('../models/user.model')

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    const existingUser = await userModel.findUserByEmail(email)
    if (existingUser)
      return res.status(400).json({ message: 'Email already exists' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await userModel.createUser({
      name,
      email,
      password: hashedPassword
    })

    res.status(201).json({ user })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error', error })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await userModel.findUserByEmail(email)
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' })

    const accessToken = signToken({ id: user.id })
    res.json({
      accessToken: accessToken,
      refreshToken: ''
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

module.exports = { register, login }
