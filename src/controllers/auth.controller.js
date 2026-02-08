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

    // Không trả về password trong response
    const { password: _, ...userWithoutPassword } = user
    res.status(201).json({ user: userWithoutPassword })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error', error })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Kiểm tra đầu vào
    if (!email || !password) {
      return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' })
    }

    // Tìm user theo email
    const user = await userModel.findUserByEmail(email)

    // Kiểm tra tài khoản tồn tại
    if (!user) {
      return res.status(401).json({
        message: 'Tài khoản không tồn tại',
        errorCode: 'USER_NOT_FOUND'
      })
    }

    // Kiểm tra tài khoản bị khóa (disable)
    if (user.active === false || user.active === 1) {
      return res.status(403).json({
        message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên',
        errorCode: 'ACCOUNT_DISABLED'
      })
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      // Có thể ghi log số lần thử đăng nhập thất bại ở đây
      return res.status(401).json({
        message: 'Mật khẩu không chính xác',
        errorCode: 'INVALID_PASSWORD'
      })
    }

    // Tạo token
    const accessToken = signToken({ id: user.id })

    // Cập nhật thời gian đăng nhập cuối (nếu có field này)
    if (userModel.updateLastLogin) {
      await userModel.updateLastLogin(user.id)
    }

    res.json({
      accessToken: accessToken,
      refreshToken: ''
    })
  } catch (error) {
    console.error('Login error:', error)

    // Phân loại lỗi chi tiết hơn
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ',
        error: error.message
      })
    }

    if (error.name === 'DatabaseError') {
      return res.status(503).json({
        message: 'Lỗi kết nối cơ sở dữ liệu',
        errorCode: 'DATABASE_ERROR'
      })
    }

    res.status(500).json({
      message: 'Lỗi máy chủ nội bộ',
      errorCode: 'INTERNAL_SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

const getProfile = async (req, res) => {
  try {
    // Lấy user ID từ middleware authentication (giả sử đã có middleware auth)
    const userId = req.user.id

    const user = await userModel.findUserById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Không trả về password trong response
    const { password, ...userWithoutPassword } = user
    res.json({
      user: userWithoutPassword
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id
    const { name, email } = req.body

    // Kiểm tra nếu email mới đã tồn tại (trừ chính user hiện tại)
    if (email) {
      const existingUser = await userModel.findUserByEmail(email)
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Email already exists' })
      }
    }

    const updatedUser = await userModel.updateUser(userId, { name, email })
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    const { password, ...userWithoutPassword } = updatedUser
    res.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id
    const { currentPassword, newPassword } = req.body

    // Lấy thông tin user hiện tại
    const user = await userModel.findUserById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Xác thực mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' })
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Cập nhật mật khẩu
    await userModel.updateUser(userId, { password: hashedPassword })

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
}
