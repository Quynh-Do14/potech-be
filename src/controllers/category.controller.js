const { ROLES } = require('../constants')
const categoryModel = require('../models/category.model')
const AppError = require('../utils/AppError')
const userModel = require('../models/user.model')

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query

    const result = await categoryModel.getAllCategories({ page, limit, search })
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

const getById = async (req, res) => {
  const data = await categoryModel.getCategoryById(req.params.id)
  if (!data) return res.status(404).json({ message: 'Not found' })
  res.json(data)
}

const create = async (req, res, next) => {
  try {
    const { name, description } = req.body

    // Validate dữ liệu đầu vào
    if (!name || name.trim() === '') {
      throw new AppError('Tên danh mục là bắt buộc', 400)
    }

    if (name.length > 255) {
      throw new AppError('Tên danh mục không được vượt quá 255 ký tự', 400)
    }

    const image = req.file ? `/uploads/${req.file.filename}` : null

    const newCategory = await categoryModel.createCategory({
      name: name.trim(),
      description: description ? description.trim() : null,
      image
    })

    res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công',
      data: newCategory
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    // Kiểm tra quyền truy cập
    const profile = await userModel.findUserById(req.user.id)
    const allowedRoles = [ROLES.ADMIN, ROLES.SELLER]

    if (!allowedRoles.includes(profile.role_name)) {
      throw new AppError('Không có quyền thực hiện hành động này', 403)
    }

    const { id } = req.params
    const { name, description, image } = req.body

    // Validate input
    if (!id || isNaN(parseInt(id))) {
      throw new AppError('ID không hợp lệ', 400)
    }

    if (!name || name.trim() === '') {
      throw new AppError('Tên danh mục blog là bắt buộc', 400)
    }

    if (name.length > 255) {
      throw new AppError('Tên danh mục blog không được vượt quá 255 ký tự', 400)
    }

    const category = await categoryModel.updateCategory(
      id,
      name.trim(),
      description,
      image
    )

    if (!category) {
      throw new AppError('Không tìm thấy danh mục blog', 404)
    }

    res.json({
      success: true,
      message: 'Cập nhật danh mục blog thành công',
      data: category
    })
  } catch (error) {
    next(error)
  }
}

const remove = async (req, res, next) => {
  try {
    const profile = await userModel.findUserById(req.user.id)
    const allowedRoles = [ROLES.ADMIN, ROLES.SELLER]

    if (!allowedRoles.includes(profile.role_name)) {
      throw new AppError('Không có quyền thực hiện hành động này', 403)
    }
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      throw new AppError('ID không hợp lệ', 400)
    }

    // Kiểm tra xem danh mục có tồn tại không
    const categoryExists = await categoryModel.getCategoryById(id)
    if (!categoryExists) {
      throw new AppError('Không tìm thấy danh mục', 404)
    }

    // Gọi hàm xóa - nếu có lỗi sẽ throw AppError trong model
    const result = await categoryModel.deleteCategory(id)

    res.json({
      success: true,
      message: result.message || 'Xóa danh mục thành công',
      data: result.data || null
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
}
