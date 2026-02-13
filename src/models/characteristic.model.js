const db = require('../config/database')
const AppError = require('../utils/AppError')

const getAllCharacteristic = async ({ page = 1, limit = 10, search = '' }) => {
  try {
    const offset = (page - 1) * limit
    const queryParams = []
    let query = 'SELECT * FROM characteristic'
    let countQuery = 'SELECT COUNT(*) FROM characteristic'
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
  } catch (error) {
    console.error('Lỗi khi lấy danh sách tính năng sản phẩm:', error)
    throw new AppError('Lỗi server khi lấy danh sách tính năng sản phẩm', 500)
  }
}

const getCharacteristicById = async id => {
  try {
    const result = await db.query(
      'SELECT * FROM characteristic WHERE id = $1',
      [id]
    )
    return result.rows[0]
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết tính năng sản phẩm:', error)
    throw new AppError('Lỗi server khi lấy thông tin tính năng sản phẩm', 500)
  }
}

const getCharacteristicByName = async name => {
  try {
    const result = await db.query(
      'SELECT * FROM characteristic WHERE LOWER(name) = LOWER($1)',
      [name]
    )
    return result.rows[0]
  } catch (error) {
    console.error('Lỗi khi kiểm tra tên tính năng sản phẩm:', error)
    throw error
  }
}

const createCharacteristic = async name => {
  try {
    // Kiểm tra tên danh mục đã tồn tại chưa
    const existingCategory = await getCharacteristicByName(name)
    if (existingCategory) {
      throw new AppError('Tính năng đã tồn tại', 400)
    }

    const result = await db.query(
      'INSERT INTO characteristic(name) VALUES($1) RETURNING *',
      [name.trim()]
    )
    return result.rows[0]
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    if (error.code === '23505') {
      // Unique constraint violation
      throw new AppError('Tính năng đã tồn tại', 400)
    }

    console.error('Lỗi khi tạo tính năng sản phẩm:', error)
    throw new AppError('Lỗi server khi tạo tính năng sản phẩm', 500)
  }
}

const updateCharacteristic = async (id, name) => {
  try {
    // Kiểm tra danh mục có tồn tại không
    const categoryExists = await getCharacteristicById(id)
    if (!categoryExists) {
      throw new AppError('tính năng sản phẩm không tồn tại', 404)
    }

    // Kiểm tra tên mới có trùng với danh mục khác không
    if (name && name.trim()) {
      const existingCategory = await db.query(
        'SELECT * FROM characteristic WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name.trim(), id]
      )
      if (existingCategory.rows.length > 0) {
        throw new AppError('Tính năng đã tồn tại', 400)
      }
    }

    const result = await db.query(
      'UPDATE characteristic SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [name.trim(), id]
    )

    if (result.rows.length === 0) {
      throw new AppError('Không tìm thấy tính năng sản phẩm', 404)
    }

    return result.rows[0]
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    if (error.code === '23505') {
      // Unique constraint violation
      throw new AppError('Tính năng đã tồn tại', 400)
    }

    console.error('Lỗi khi cập nhật tính năng sản phẩm:', error)
    throw new AppError('Lỗi server khi cập nhật tính năng sản phẩm', 500)
  }
}

const deleteCharacteristic = async id => {
  try {
    // Kiểm tra danh mục có tồn tại không
    const categoryExists = await getCharacteristicById(id)
    if (!categoryExists) {
      throw new AppError('tính năng sản phẩm không tồn tại', 404)
    }

    // Kiểm tra xem danh mục có blog nào không
    const checkQuery = `
      SELECT COUNT(*) as blog_count 
      FROM products p 
      INNER JOIN characteristic_product ct ON p.id = ct.product_id
      WHERE characteristic_id = $1
    `
    const checkResult = await db.query(checkQuery, [id])
    const blogCount = parseInt(checkResult.rows[0].blog_count)

    if (blogCount > 0) {
      throw new AppError(
        `Không thể xóa danh mục bài viết. Có ${blogCount} bài viết đang thuộc danh mục này.`,
        400
      )
    }

    // Thực hiện xóa
    const result = await db.query(
      'DELETE FROM characteristic WHERE id = $1 RETURNING *',
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError('Không tìm thấy tính năng sản phẩm', 404)
    }

    return {
      success: true,
      message: 'Xóa danh mục bài viết thành công',
      data: result.rows[0]
    }
  } catch (error) {
    console.log('error', error)

    // Nếu đã là AppError thì throw tiếp
    if (error instanceof AppError) {
      throw error
    }

    // PostgreSQL foreign key constraint violation
    if (error.code === '23503') {
      throw new AppError(
        'Không thể xóa danh mục bài viết vì có bài viết đang sử dụng',
        400
      )
    }

    console.error('Lỗi khi xóa danh mục bài viết:', error)
    throw new AppError('Lỗi server khi xóa danh mục bài viết', 500)
  }
}

module.exports = {
  getAllCharacteristic,
  getCharacteristicById,
  createCharacteristic,
  updateCharacteristic,
  deleteCharacteristic
}
