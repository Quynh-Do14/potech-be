const db = require('../config/database')
const AppError = require('../utils/AppError')

const getAllCategories = async ({ page = 1, limit = 10, search = '' }) => {
  const offset = (page - 1) * limit
  const queryParams = []
  let query = 'SELECT * FROM categories'
  let countQuery = 'SELECT COUNT(*) FROM categories'
  let conditions = []

  // Tìm kiếm theo tên (search)
  if (search) {
    queryParams.push(`%${search}%`)
    conditions.push(`LOWER(name) LIKE LOWER($${queryParams.length})`)
  }

  // Gắn điều kiện nếu có
  if (conditions.length > 0) {
    const whereClause = ` WHERE ${conditions.join(' AND ')}`
    query += whereClause
    countQuery += whereClause
  }

  // Thêm phân trang
  queryParams.push(limit)
  queryParams.push(offset)
  query += ` ORDER BY id DESC LIMIT $${queryParams.length - 1} OFFSET $${
    queryParams.length
  }`

  // Truy vấn dữ liệu và tổng số dòng
  const dataResult = await db.query(query, queryParams)
  const countResult = await db.query(
    countQuery,
    queryParams.slice(0, queryParams.length - 2)
  )
  const total = parseInt(countResult.rows[0].count)

  return {
    data: dataResult.rows,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit)
  }
}

const getCategoryById = async id => {
  const result = await db.query('SELECT * FROM categories WHERE id = $1', [id])
  return result.rows[0]
}

const createCategory = async ({ name, image, description }) => {
  try {
    const result = await db.query(
      'INSERT INTO categories(name, image, description) VALUES($1, $2, $3) RETURNING *',
      [name, image, description]
    )
    return result.rows[0]
  } catch (error) {
    if (error.code === '23505') {
      // Duplicate name
      throw new AppError('Tên danh mục đã tồn tại', 400)
    }
    throw error
  }
}

const updateCategory = async (id, name) => {
  try {
    // Kiểm tra danh mục có tồn tại không
    const categoryExists = await getCategoryById(id)
    if (!categoryExists) {
      throw new AppError('Danh mục blog không tồn tại', 404)
    }

    // Kiểm tra tên mới có trùng với danh mục khác không
    if (name) {
      const existingCategory = await db.query(
        'SELECT * FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
        [String(name).trim(), id]
      )
      if (existingCategory.rows.length > 0) {
        throw new AppError('Tên danh mục blog đã tồn tại', 400)
      }
    }

    const result = await db.query(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
      [String(name).trim(), id]
    )

    if (result.rows.length === 0) {
      throw new AppError('Không tìm thấy danh mục blog', 404)
    }

    return result.rows[0]
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    if (error.code === '23505') {
      // Unique constraint violation
      throw new AppError('Tên danh mục blog đã tồn tại', 400)
    }

    console.error('Lỗi khi cập nhật danh mục blog:', error)
    throw new AppError('Lỗi server khi cập nhật danh mục blog', 500)
  }
}

const deleteCategory = async id => {
  try {
    // Kiểm tra xem danh mục có sản phẩm không
    const checkQuery = `
      SELECT COUNT(*) as product_count 
      FROM products 
      WHERE category_id = $1
    `
    const checkResult = await db.query(checkQuery, [id])
    const productCount = parseInt(checkResult.rows[0].product_count)

    if (productCount > 0) {
      throw new AppError(
        `Không thể xóa danh mục. Có ${productCount} sản phẩm đang thuộc danh mục này.`,
        400
      )
    }

    // Nếu không có sản phẩm, thực hiện xóa
    const deleteResult = await db.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [id]
    )

    if (!deleteResult.rows[0]) {
      throw new AppError('Danh mục không tồn tại', 404)
    }

    return {
      success: true,
      message: 'Xóa danh mục thành công',
      data: deleteResult.rows[0]
    }
  } catch (error) {
    if (error.code === '23503') {
      // Foreign key constraint
      throw new AppError(
        'Không thể xóa danh mục vì có sản phẩm đang sử dụng',
        400
      )
    }
    throw error
  }
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
}
