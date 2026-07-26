const { ROLES } = require('../constants')
const seoProductModel = require('../models/seo-product.model')
const userModel = require('../models/user.model')
const AppError = require('../utils/AppError')

const getAll = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      slug = '',
      category_id
    } = req.query

    const result = await seoProductModel.getAllProducts({
      page,
      limit,
      search,
      slug,
      category_id
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
}

const getById = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      throw new AppError('ID không hợp lệ', 400)
    }

    const product = await seoProductModel.getProductById(id)
    if (!product) {
      throw new AppError('Không tìm thấy bài viết', 404)
    }
    res.json(product)
  } catch (error) {
    next(error)
  }
}

const getByIdPrivate = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      throw new AppError('ID không hợp lệ', 400)
    }

    const product = await seoProductModel.getProductByIdPrivate(id)
    if (!product) {
      throw new AppError('Không tìm thấy bài viết', 404)
    }
    res.json(product)
  } catch (error) {
    next(error)
  }
}

const getBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params

    if (!slug || slug.trim() === '') {
      throw new AppError('Slug không hợp lệ', 400)
    }

    const product = await seoProductModel.getProductBySlug(slug)

    // Nếu không tìm thấy, trả về object rỗng
    if (!product) {
      return res.json({})
    }

    res.json(product)
  } catch (error) {
    next(error)
  }
}

const create = async (req, res, next) => {
  try {
    // Kiểm tra quyền truy cập
    const profile = await userModel.findUserById(req.user.id)
    const allowedRoles = [ROLES.ADMIN, ROLES.SELLER]

    if (!allowedRoles.includes(profile.role_name)) {
      throw new AppError('Không có quyền thực hiện hành động này', 403)
    }

    // Validate input
    const { slug, title, category_id, content } = req.body

    // Validate slug
    if (!slug || slug.trim() === '') {
      throw new AppError('Slug là bắt buộc', 400)
    }

    if (slug.length > 255) {
      throw new AppError('Slug không được vượt quá 255 ký tự', 400)
    }

    // Validate slug format (chỉ cho phép chữ thường, số, dấu gạch ngang)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new AppError(
        'Slug chỉ được chứa chữ thường, số và dấu gạch ngang (-)',
        400
      )
    }

    // Validate title
    if (!title || title.trim() === '') {
      throw new AppError('Tiêu đề là bắt buộc', 400)
    }

    if (title.length > 500) {
      throw new AppError('Tiêu đề không được vượt quá 500 ký tự', 400)
    }

    // Validate category_id (nếu có)
    if (category_id && isNaN(parseInt(category_id))) {
      throw new AppError('Category ID không hợp lệ', 400)
    }

    // Tạo bài viết mới
    const product = await seoProductModel.createProduct(
      slug.trim(),
      title.trim(),
      category_id || null,
      content || null
    )

    res.status(201).json({
      success: true,
      message: 'Tạo bài viết thành công',
      data: product
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
    const { slug, title, category_id, content } = req.body

    // Validate input
    if (!id || isNaN(parseInt(id))) {
      throw new AppError('ID không hợp lệ', 400)
    }

    // Validate slug (nếu có)
    if (slug && slug.trim() !== '') {
      if (slug.length > 255) {
        throw new AppError('Slug không được vượt quá 255 ký tự', 400)
      }
      if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new AppError(
          'Slug chỉ được chứa chữ thường, số và dấu gạch ngang (-)',
          400
        )
      }
    }

    // Validate title (nếu có)
    if (title && title.trim() !== '') {
      if (title.length > 500) {
        throw new AppError('Tiêu đề không được vượt quá 500 ký tự', 400)
      }
    }

    // Validate category_id (nếu có)
    if (category_id && isNaN(parseInt(category_id))) {
      throw new AppError('Category ID không hợp lệ', 400)
    }

    // Cập nhật bài viết
    const product = await seoProductModel.updateProduct(
      id,
      slug ? slug.trim() : undefined,
      title ? title.trim() : undefined,
      category_id !== undefined ? category_id : undefined,
      content !== undefined ? content : undefined
    )

    if (!product) {
      throw new AppError('Không tìm thấy bài viết', 404)
    }

    res.json({
      success: true,
      message: 'Cập nhật bài viết thành công',
      data: product
    })
  } catch (error) {
    next(error)
  }
}

const remove = async (req, res, next) => {
  try {
    // Kiểm tra quyền truy cập
    const profile = await userModel.findUserById(req.user.id)
    const allowedRoles = [ROLES.ADMIN, ROLES.SELLER]

    if (!allowedRoles.includes(profile.role_name)) {
      throw new AppError('Không có quyền thực hiện hành động này', 403)
    }

    const { id } = req.params

    // Validate input
    if (!id || isNaN(parseInt(id))) {
      throw new AppError('ID không hợp lệ', 400)
    }

    // Kiểm tra sản phẩm có tồn tại không
    const productExists = await seoProductModel.getProductById(id)
    if (!productExists) {
      throw new AppError('Không tìm thấy bài viết', 404)
    }

    const result = await seoProductModel.deleteProduct(id)

    res.json({
      success: true,
      message: result.message || 'Xóa bài viết thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAll,
  getById,
  getByIdPrivate,
  getBySlug,
  create,
  update,
  remove
}
