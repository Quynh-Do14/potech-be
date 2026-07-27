const db = require('../config/database')
const AppError = require('../utils/AppError')

const getAllProducts = async ({
  page = 1,
  limit = 10,
  search = '',
  slug = '',
  category_id = null
}) => {
  try {
    const offset = (page - 1) * limit
    const queryParams = []
    let query = 'SELECT * FROM seo_product'
    let countQuery = 'SELECT COUNT(*) FROM seo_product'
    let conditions = []

    // Tìm kiếm theo title
    if (search) {
      queryParams.push(`%${search}%`)
      conditions.push(`LOWER(title) LIKE LOWER($${queryParams.length})`)
    }

    // Lọc theo category_id
    if (slug) {
      queryParams.push(slug)
      conditions.push(`slug = $${queryParams.length}`)
    }

    // Lọc theo category_id
    if (category_id) {
      queryParams.push(category_id)
      conditions.push(`category_id = $${queryParams.length}`)
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
    console.error('Lỗi khi lấy danh sách Bài viết:', error)
    throw new AppError('Lỗi server khi lấy danh sách Bài viết', 500)
  }
}

const getProductById = async id => {
  try {
    const result = await db.query('SELECT * FROM seo_product WHERE id = $1', [
      id
    ])

    const productResult = result.rows[0]

    // Kiểm tra nếu không tìm thấy sản phẩm
    if (!productResult) {
      return null
    }

    // Lấy keywords nếu có sản phẩm
    const productKeyword = await db.query(
      `SELECT id, seo_product_id, keyword FROM seo_product_keyword WHERE seo_product_id = $1`,
      [productResult.id]
    )
    productResult.keyword = productKeyword.rows

    return productResult
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết Bài viết:', error)
    throw new AppError('Lỗi server khi lấy thông tin Bài viết', 500)
  }
}

const getProductByIdPrivate = async id => {
  try {
    const result = await db.query('SELECT * FROM seo_product WHERE id = $1', [
      id
    ])

    const productResult = result.rows[0]

    // Kiểm tra nếu không tìm thấy sản phẩm
    if (!productResult) {
      return null
    }

    // Lấy keywords
    const productKeyword = await db.query(
      `SELECT id, seo_product_id, keyword FROM seo_product_keyword WHERE seo_product_id = $1`,
      [productResult.id]
    )
    productResult.keyword = productKeyword.rows

    return productResult
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết Bài viết:', error)
    throw new AppError('Lỗi server khi lấy thông tin Bài viết', 500)
  }
}
const getProductBySlug = async slug => {
  try {
    const result = await db.query(
      'SELECT * FROM seo_product WHERE LOWER(slug) = LOWER($1)',
      [slug]
    )

    const productResult = result.rows[0]

    // Nếu không tìm thấy sản phẩm, trả về null
    if (!productResult) {
      return null
    }

    // Lấy keywords nếu có sản phẩm
    const productKeyword = await db.query(
      `SELECT id, seo_product_id, keyword FROM seo_product_keyword WHERE seo_product_id = $1`,
      [productResult.id]
    )
    productResult.keyword = productKeyword.rows

    return productResult
  } catch (error) {
    console.error('Lỗi khi kiểm tra slug:', error)
    throw error
  }
}

const createProduct = async (
  slug,
  title,
  category_id = null,
  content = null,
  description = null,
  keyword = []
) => {
  try {
    // Kiểm tra slug đã tồn tại chưa
    const existingProduct = await getProductBySlug(slug)
    if (existingProduct) {
      throw new AppError('Đường dẫn này đã có bài viết', 400)
    }

    const result = await db.query(
      `INSERT INTO seo_product(slug, title, category_id, content, description) 
       VALUES($1, $2, $3, $4, $5) RETURNING *`,
      [slug.trim(), title.trim(), category_id, content, description]
    )
    const seoProductId = result.rows[0].id
    const keywordList = JSON.parse(keyword || '[]')
    for (const key of keywordList) {
      await db.query(
        `INSERT INTO seo_product_keyword (seo_product_id,keyword) VALUES ($1, $2)`,
        [seoProductId, key]
      )
    }

    return result.rows[0]
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    if (error.code === '23505') {
      // Unique constraint violation
      throw new AppError('Đường dẫn này đã có bài viết', 400)
    }

    console.error('Lỗi khi tạo Bài viết:', error)
    throw new AppError('Lỗi server khi tạo Bài viết', 500)
  }
}

const updateProduct = async (
  id,
  slug,
  title,
  category_id = null,
  content = null,
  description = null,
  keyword = []
) => {
  try {
    // Kiểm tra sản phẩm có tồn tại không
    const productExists = await getProductById(id)
    if (!productExists) {
      throw new AppError('Bài viết không tồn tại', 404)
    }

    // Xây dựng câu lệnh UPDATE động
    const updates = []
    const values = []
    let paramCount = 1
    let hasUpdates = false

    // Kiểm tra và xử lý slug
    if (slug !== undefined && slug !== null) {
      const trimmedSlug = slug.trim()
      if (trimmedSlug === '') {
        throw new AppError('Slug không được để trống', 400)
      }

      // Kiểm tra slug có trùng với bài viết khác không
      const existingProduct = await db.query(
        'SELECT * FROM seo_product WHERE LOWER(slug) = LOWER($1) AND id != $2',
        [trimmedSlug, id]
      )
      if (existingProduct.rows.length > 0) {
        throw new AppError('Đường dẫn này đã có bài viết', 400)
      }

      updates.push(`slug = $${paramCount++}`)
      values.push(trimmedSlug)
      hasUpdates = true
    }

    // Xử lý title
    if (title !== undefined && title !== null) {
      const trimmedTitle = title.trim()
      if (trimmedTitle === '') {
        throw new AppError('Tiêu đề không được để trống', 400)
      }
      updates.push(`title = $${paramCount++}`)
      values.push(trimmedTitle)
      hasUpdates = true
    }

    // Xử lý category_id
    if (category_id !== undefined) {
      // Nếu category_id là null hoặc số
      if (category_id !== null && isNaN(parseInt(category_id))) {
        throw new AppError('Category ID không hợp lệ', 400)
      }
      updates.push(`category_id = $${paramCount++}`)
      values.push(category_id)
      hasUpdates = true
    }

    // Xử lý content
    if (content !== undefined) {
      updates.push(`content = $${paramCount++}`)
      values.push(content)
      hasUpdates = true
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`)
      values.push(description)
      hasUpdates = true
    }

    const keywordList = JSON.parse(keyword || '[]')
    await db.query(
      `DELETE FROM seo_product_keyword WHERE seo_product_id = $1`,
      [id]
    )
    for (const key of keywordList) {
      await db.query(
        `INSERT INTO seo_product_keyword (seo_product_id, keyword) VALUES ($1, $2)`,
        [id, key]
      )
    }

    // Nếu không có field nào được cập nhật
    if (!hasUpdates) {
      throw new AppError('Không có dữ liệu để cập nhật', 400)
    }

    // Thêm updated_at
    updates.push(`updated_at = NOW()`)

    values.push(id)
    const query = `UPDATE seo_product SET ${updates.join(
      ', '
    )} WHERE id = $${paramCount} RETURNING *`

    const result = await db.query(query, values)

    if (result.rows.length === 0) {
      throw new AppError('Không tìm thấy Bài viết', 404)
    }

    return result.rows[0]
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    if (error.code === '23505') {
      // Unique constraint violation
      throw new AppError('Đường dẫn này đã có bài viết', 400)
    }

    console.error('Lỗi khi cập nhật Bài viết:', error)
    throw new AppError('Lỗi server khi cập nhật Bài viết', 500)
  }
}

const deleteProduct = async id => {
  try {
    // Kiểm tra sản phẩm có tồn tại không
    const productExists = await getProductById(id)
    if (!productExists) {
      throw new AppError('Bài viết không tồn tại', 404)
    }

    // Kiểm tra xem sản phẩm có blog liên quan không (nếu có)
    const checkQuery = `
      SELECT COUNT(*) as blog_count 
      FROM blog 
      WHERE blog_category_id = $1
    `
    const checkResult = await db.query(checkQuery, [id])

    // const blogCount = parseInt(checkResult.rows[0].blog_count)
    // if (blogCount > 0) {
    //   throw new AppError(
    //     `Không thể xóa Bài viết. Có ${blogCount} bài viết đang thuộc sản phẩm này.`,
    //     400
    //   )
    // }

    // Thực hiện xóa
    const result = await db.query(
      'DELETE FROM seo_product WHERE id = $1 RETURNING *',
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError('Không tìm thấy Bài viết', 404)
    }

    return {
      success: true,
      message: 'Xóa Bài viết thành công',
      data: result.rows[0]
    }
  } catch (error) {
    console.log('error', error)

    if (error instanceof AppError) {
      throw error
    }

    // PostgreSQL foreign key constraint violation
    if (error.code === '23503') {
      throw new AppError(
        'Không thể xóa Bài viết vì có bài viết đang sử dụng',
        400
      )
    }

    console.error('Lỗi khi xóa Bài viết:', error)
    throw new AppError('Lỗi server khi xóa Bài viết', 500)
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  getProductByIdPrivate,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct
}
