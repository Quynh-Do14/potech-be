const db = require('../config/database')
const AppError = require('../utils/AppError')

const getAllCategories = async ({ page = 1, limit = 10, search = '' }) => {
  const offset = (page - 1) * limit
  const queryParams = []
  let query = 'SELECT * FROM categories where is_edit = true'
  let countQuery = 'SELECT COUNT(*) FROM categories where is_edit = true'
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
  query += ` ORDER BY index ASC LIMIT $${queryParams.length - 1} OFFSET $${
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

const getAllCategoriesPrivate = async ({
  page = 1,
  limit = 10,
  search = ''
}) => {
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
  query += ` ORDER BY index ASC LIMIT $${queryParams.length - 1} OFFSET $${
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
  try {
    const result = await db.query('SELECT * FROM categories WHERE id = $1', [
      id
    ])
    const productResult = result.rows[0]

    // Kiểm tra nếu không tìm thấy sản phẩm
    if (!productResult) {
      return null
    }

    // Lấy keywords nếu có sản phẩm
    const productKeyword = await db.query(
      `SELECT id, seo_category_id, keyword FROM category_keywords WHERE seo_category_id = $1 ORDER BY id ASC`,
      [productResult.id]
    )
    productResult.keyword = productKeyword.rows

    return productResult
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết Bài viết:', error)
    throw new AppError('Lỗi server khi lấy thông tin Bài viết', 500)
  }
}

const getCategoryBySlug = async slug => {
  try {
    const result = await db.query(
      'SELECT * FROM categories WHERE LOWER(slug) = LOWER($1)',
      [slug]
    )

    const productResult = result.rows[0]

    // Nếu không tìm thấy sản phẩm, trả về null
    if (!productResult) {
      return null
    }

    // Lấy keywords nếu có sản phẩm
    const productKeyword = await db.query(
      `SELECT id, seo_category_id, keyword FROM category_keywords WHERE seo_category_id = $1 ORDER BY id ASC`,
      [productResult.id]
    )
    productResult.keyword = productKeyword.rows

    return productResult
  } catch (error) {
    console.error('Lỗi khi kiểm tra slug:', error)
    throw error
  }
}

const getCategoryByIdPrivate = async id => {
  try {
    const result = await db.query('SELECT * FROM categories WHERE id = $1', [
      id
    ])
    const products = await db.query(
      'SELECT * FROM products WHERE category_id = $1',
      [id]
    )
    const productResult = result.rows[0]

    // Kiểm tra nếu không tìm thấy sản phẩm
    if (!productResult) {
      return null
    }

    // Lấy keywords
    const productKeyword = await db.query(
      `SELECT id, seo_category_id, keyword FROM category_keywords WHERE seo_category_id = $1 ORDER BY id ASC`,
      [productResult.id]
    )
    productResult.keyword = productKeyword.rows

    productResult.products = products.rows
    return productResult
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết Bài viết:', error)
    throw new AppError('Lỗi server khi lấy thông tin Bài viết', 500)
  }
}

const createCategory = async ({
  name,
  image,
  description,
  index,
  slug,
  title = '',
  content = '',
  keyword = []
}) => {
  try {
    // Kiểm tra index đã tồn tại chưa (nếu có index)
    if (index !== undefined && index !== null) {
      const existingIndex = await db.query(
        'SELECT id FROM categories WHERE index = $1',
        [index]
      )

      if (existingIndex.rows.length > 0) {
        throw new AppError(`Số thứ tự ${index} đã tồn tại`, 400)
      }
    }

    if (name) {
      const existingCategory = await db.query(
        'SELECT * FROM categories WHERE LOWER(name) = LOWER($1)',
        [String(name).trim()]
      )
      if (existingCategory.rows.length > 0) {
        throw new AppError('Tên danh mục đã tồn tại', 400)
      }
    }

    if (slug) {
      const existingCategory = await db.query(
        'SELECT * FROM categories WHERE LOWER(slug) = LOWER($1)',
        [String(slug).trim()]
      )
      if (existingCategory.rows.length > 0) {
        throw new AppError('Đường dẫn đã tồn tại', 400)
      }
    }

    const result = await db.query(
      'INSERT INTO categories(name, image, description, index, slug, title, content) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, image, description, index || null, slug, title, content] // Cho phép index null
    )

    const seoProductId = result.rows[0].id
    const keywordList = JSON.parse(keyword || '[]')
    for (const key of keywordList) {
      await db.query(
        `INSERT INTO category_keywords (seo_category_id, keyword) VALUES ($1, $2)`,
        [seoProductId, key]
      )
    }

    return result.rows[0]
  } catch (error) {
    if (error.code === '23505') {
      // Unique constraint for name
      throw new AppError('Tên danh mục đã tồn tại', 400)
    }
    throw error
  }
}

const updateCategory = async (
  id,
  name,
  description,
  index,
  image,
  slug,
  title,
  content = null,
  keyword = []
) => {
  try {
    // Kiểm tra danh mục có tồn tại không
    const categoryExists = await db.query(
      'SELECT id FROM categories WHERE id = $1',
      [id]
    )

    if (categoryExists.rows.length === 0) {
      throw new AppError('Danh mục không tồn tại', 404)
    }

    // Kiểm tra index đã tồn tại chưa (nếu có index và khác với index cũ)
    if (index !== undefined && index !== null) {
      const existingOrder = await db.query(
        'SELECT id FROM categories WHERE index = $1 AND id != $2',
        [index, id]
      )

      if (existingOrder.rows.length > 0) {
        throw new AppError(`Số thứ tự ${index} đã tồn tại`, 400)
      }
    }

    // Kiểm tra tên mới có trùng với danh mục khác không
    if (name) {
      const existingCategory = await db.query(
        'SELECT * FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
        [String(name).trim(), id]
      )
      if (existingCategory.rows.length > 0) {
        throw new AppError('Tên danh mục đã tồn tại', 400)
      }
    }

    if (slug) {
      const existingCategory = await db.query(
        'SELECT * FROM categories WHERE LOWER(slug) = LOWER($1) AND id != $2',
        [String(slug).trim(), id]
      )
      if (existingCategory.rows.length > 0) {
        throw new AppError('Đường dẫn đã tồn tại', 400)
      }
    }

    // Xây dựng câu update động
    let updateFields = []
    let params = []
    let paramIndex = 1

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`)
      params.push(String(name).trim())
      paramIndex++
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`)
      params.push(description)
      paramIndex++
    }

    if (index !== undefined) {
      updateFields.push(`index = $${paramIndex}`)
      params.push(index)
      paramIndex++
    }

    if (slug !== undefined) {
      updateFields.push(`slug = $${paramIndex}`)
      params.push(slug)
      paramIndex++
    }

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`)
      params.push(title)
      paramIndex++
    }

    if (content !== undefined) {
      updateFields.push(`content = $${paramIndex}`)
      params.push(content)
      paramIndex++
    }

    if (image !== undefined) {
      updateFields.push(`image = $${paramIndex}`)
      params.push(image)
      paramIndex++
    }

    const keywordList = JSON.parse(keyword || '[]')
    await db.query(`DELETE FROM category_keywords WHERE seo_category_id = $1`, [
      id
    ])
    for (const key of keywordList) {
      await db.query(
        `INSERT INTO category_keywords (seo_category_id, keyword) VALUES ($1, $2)`,
        [id, key]
      )
    }

    // Thêm id vào params
    params.push(id)

    const query = `
      UPDATE categories 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `

    const result = await db.query(query, params)

    return result.rows[0]
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    if (error.code === '23505') {
      throw new AppError('Tên danh mục đã tồn tại', 400)
    }

    console.error('Lỗi khi cập nhật danh mục:', error)
    throw new AppError('Lỗi server khi cập nhật danh mục', 500)
  }
}

const updateCategoriesIndex = async items => {
  try {
    // Validate dữ liệu trước
    for (const item of items) {
      const { id, index } = item

      if (!id || isNaN(parseInt(id))) {
        throw new AppError(`ID không hợp lệ: ${id}`, 400)
      }

      if (index === undefined || index === null || isNaN(parseInt(index))) {
        throw new AppError(`Số thứ tự không hợp lệ cho ID ${id}`, 400) // ✅ Sửa message
      }
    }

    // Lấy danh sách ID để kiểm tra tồn tại
    const ids = items.map(item => item.id)
    const checkExist = await db.query(
      'SELECT id FROM categories WHERE id = ANY($1::int[])',
      [ids]
    )

    if (checkExist.rows.length !== ids.length) {
      const existingIds = checkExist.rows.map(row => row.id)
      const notFoundIds = ids.filter(id => !existingIds.includes(id))
      throw new AppError(
        `Không tìm thấy danh mục với ID: ${notFoundIds.join(', ')}`, // ✅ Sửa từ "sản phẩm" thành "danh mục"
        404
      )
    }

    // Kiểm tra index không trùng nhau trong request
    const indexes = items.map(item => item.index)
    const uniqueIndexes = [...new Set(indexes)]
    if (indexes.length !== uniqueIndexes.length) {
      throw new AppError(
        'Các số thứ tự không được trùng nhau trong request', // ✅ Sửa message
        400
      )
    }

    // Kiểm tra index không bị trùng với danh mục khác ngoài danh sách đang cập nhật
    const existingOrder = await db.query(
      'SELECT index FROM categories WHERE index = ANY($1::int[]) AND id != ALL($2::int[])',
      [indexes, ids]
    )

    if (existingOrder.rows.length > 0) {
      const duplicateOrders = existingOrder.rows.map(row => row.index)
      throw new AppError(
        `Các số thứ tự ${duplicateOrders.join(
          ', '
        )} đã tồn tại ở danh mục khác`, // ✅ Sửa message
        400
      )
    }

    // Xây dựng câu query CASE WHEN để cập nhật tất cả cùng lúc
    let caseWhen = ''
    let params = []
    let paramIndex = 1

    items.forEach((item, i) => {
      caseWhen += `WHEN id = $${paramIndex} THEN $${paramIndex + 1} `
      params.push(item.id, item.index)
      paramIndex += 2
    })

    const query = `
      UPDATE categories 
      SET index = CASE 
        ${caseWhen}
        ELSE index 
      END
      WHERE id IN (${items.map((_, i) => `$${i * 2 + 1}`).join(', ')})
      RETURNING id, index, name
    `

    const result = await db.query(query, params)

    return {
      success: true,
      message: 'Cập nhật số thứ tự thành công', // ✅ Sửa message
      data: result.rows
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    console.error('Lỗi khi cập nhật số thứ tự hàng loạt:', error) // ✅ Sửa log
    throw new AppError('Lỗi server khi cập nhật số thứ tự', 500) // ✅ Sửa message
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

    const checkQueryAgency = `
      SELECT COUNT(*) as product_count 
      FROM agency a
      INNER JOIN agency_categories_type act ON a.id = act.agency_id
      WHERE category_id = $1
    `
    const checkResultAgency = await db.query(checkQueryAgency, [id])
    const productCountAgency = parseInt(checkResultAgency.rows[0].product_count)

    if (productCount > 0) {
      throw new AppError(
        `Không thể xóa danh mục. Có ${productCount} sản phẩm đang thuộc danh mục này.`,
        400
      )
    }

    if (productCountAgency > 0) {
      throw new AppError(
        `Không thể xóa danh mục. Có ${productCountAgency} đại lý có dòng sản phẩm của danh mục này.`,
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
  getAllCategoriesPrivate,
  getCategoryById,
  getCategoryBySlug,
  getCategoryByIdPrivate,
  createCategory,
  updateCategory,
  updateCategoriesIndex,
  deleteCategory
}
