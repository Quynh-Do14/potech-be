const { ROLES, MESSAGES } = require('../constants')
const userModel = require('../models/user.model')
const bcrypt = require('bcrypt')

const getAll = async (req, res) => {
  try {
    const profile = await userModel.findUserById(req.user.id)
    const allowedRoles = [ROLES.ADMIN]

    if (!allowedRoles.includes(profile.role_name)) {
      return res.status(403).json({ message: MESSAGES.UNAUTHORIZED })
    }

    const search = req.query.search?.toString() || ''
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10

    const users = await userModel.getAllUsers({ search, limit, page })

    return res.status(200).json(users)
  } catch (error) {
    console.error('getAllUsers error:', error) // Ghi log để debug
    return res.status(500).json({
      message: MESSAGES.SERVER_ERROR,
      error: error.message || error
    })
  }
}

const getById = async (req, res) => {
  try {
    const profile = await userModel.findUserById(req.user.id)
    const allowedRoles = [ROLES.ADMIN]

    if (!allowedRoles.includes(profile.role_name))
      return res.status(403).json({ message: MESSAGES.UNAUTHORIZED })

    const user = await userModel.findUserById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: MESSAGES.SERVER_ERROR, error })
  }
}

const create = async (req, res) => {
  try {
    const profile = await userModel.findUserById(req.user.id)
    const allowedRoles = [ROLES.ADMIN]

    if (!profile || !allowedRoles.includes(profile.role_name)) {
      return res.status(403).json({ message: MESSAGES.UNAUTHORIZED })
    }

    const { name, email, password, role_id } = req.body

    // Validate cơ bản
    if (!name || !email || !password || !role_id) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' })
    }

    // Kiểm tra email tồn tại
    const existing = await userModel.findUserByEmail(email)
    if (existing) {
      return res.status(400).json({ message: 'Email đã tồn tại' })
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10)

    // Tạo user mới
    const user = await userModel.createUser({
      name,
      email,
      password: hashedPassword,
      role_id
    })

    res.status(201).json({ message: 'Tạo tài khoản thành công', user })
  } catch (error) {
    console.error('Create user error:', error)
    res
      .status(500)
      .json({ message: MESSAGES.SERVER_ERROR, error: error.message })
  }
}

const update = async (req, res) => {
  try {
    const profile = await userModel.findUserById(req.user.id)
    const allowedRoles = [ROLES.ADMIN]

    if (!allowedRoles.includes(profile.role_name))
      return res.status(403).json({ message: MESSAGES.UNAUTHORIZED })

    const { name, email, role_id } = req.body
    const user = await userModel.updateUser(req.params.id, {
      name,
      email,
      role_id
    })
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: MESSAGES.SERVER_ERROR, error })
  }
}

const remove = async (req, res) => {
  try {
    const profile = await userModel.findUserById(req.user.id)
    const allowedRoles = [ROLES.ADMIN]

    if (!allowedRoles.includes(profile.role_name))
      return res.status(403).json({ message: MESSAGES.UNAUTHORIZED })

    await userModel.deleteUser(req.params.id)
    res.json({ message: 'User deleted' })
  } catch (error) {
    res.status(500).json({ message: MESSAGES.SERVER_ERROR, error })
  }
}

const getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const profile = await userModel.findUserById(req.user.id)

    if (!profile) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json(profile)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}


module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getProfile
}
