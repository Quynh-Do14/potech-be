const db = require('../config/database')

const getAllBanner = async ({
  page = 1,
  limit = 10,
  search = '',
  type = ''
}) => {
  const offset = (page - 1) * limit
  const conditions = []
  const values = []
  let paramIndex = 1

  // Xây dựng điều kiện WHERE nếu có tìm kiếm theo tên
  if (search) {
    values.push(`%${search}%`)
    conditions.push(`name ILIKE $${paramIndex}`)
    paramIndex++
  }

  // Xây dựng điều kiện WHERE nếu có lọc theo type
  if (type) {
    values.push(type)
    conditions.push(`type = $${paramIndex}`)
    paramIndex++
  }

  // Tạo câu WHERE nếu có điều kiện
  const whereClause =
    conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''

  // Câu truy vấn chính
  const dataQuery = `
    SELECT * FROM banner
    ${whereClause}
    ORDER BY id DESC
    LIMIT $${paramIndex}
    OFFSET $${paramIndex + 1}
  `

  // Câu truy vấn đếm tổng số dòng
  const countQuery = `
    SELECT COUNT(*) FROM banner
    ${whereClause}
  `

  // Thêm limit và offset vào values
  values.push(limit)
  values.push(offset)

  // Thực hiện truy vấn
  const dataResult = await db.query(dataQuery, values)

  // Lấy tổng số bản ghi (chỉ dùng các tham số tìm kiếm, không dùng limit/offset)
  const countValues = values.slice(0, values.length - 2) // Bỏ limit và offset
  const countResult = await db.query(countQuery, countValues)

  const total = parseInt(countResult.rows[0].count)

  return {
    data: dataResult.rows,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit)
  }
}

const getBannerById = async id => {
  const result = await db.query('SELECT * FROM banner WHERE id = $1', [id])
  return result.rows[0]
}

const createBanner = async ({ name, image, type }) => {
  // Danh sách type hợp lệ
  const validTypes = ['HOMEPAGE', 'INTRODUCE', 'AGENCY', 'CONTACT']

  // Validate type
  if (!type || type.trim() === '') {
    throw new Error('Loại banner không được để trống.')
  }

  // Kiểm tra type có hợp lệ không
  if (!validTypes.includes(type)) {
    throw new Error(
      `Loại banner "${type}" không hợp lệ. Loại hợp lệ: ${validTypes.join(
        ', '
      )}`
    )
  }

  // Kiểm tra nếu type không phải HOMEPAGE và đã tồn tại banner với type này
  if (type !== 'HOMEPAGE') {
    const existingBanner = await db.query(
      'SELECT * FROM banner WHERE type = $1',
      [type]
    )

    if (existingBanner.rows.length > 0) {
      // Lấy tên tiếng Việt của type để hiển thị thông báo thân thiện hơn
      const typeLabels = {
        HOMEPAGE: 'Trang chủ',
        INTRODUCE: 'Giới thiệu',
        AGENCY: 'Đại lý',
        CONTACT: 'Liên hệ'
      }
      const typeLabel = typeLabels[type] || type
      throw new Error(
        `Banner cho trang "${typeLabel}" đã tồn tại. Chỉ trang chủ có thể có nhiều banner.`
      )
    }
  }

  // Validate các trường khác
  if (!name || name.trim() === '') {
    throw new Error('Tên banner không được để trống.')
  }

  if (!image || image.trim() === '') {
    throw new Error('Ảnh banner không được để trống.')
  }

  const result = await db.query(
    'INSERT INTO banner(name, image, type) VALUES($1, $2, $3) RETURNING *',
    [name, image, type]
  )
  return result.rows[0]
}

const updateBanner = async (id, { name, image, type }) => {
  // Danh sách type hợp lệ
  const validTypes = ['HOMEPAGE', 'INTRODUCE', 'AGENCY', 'CONTACT']

  // Kiểm tra ID hợp lệ
  if (!id) {
    throw new Error('ID banner không hợp lệ.')
  }

  // Kiểm tra banner hiện tại
  const currentBanner = await db.query(
    'SELECT type FROM banner WHERE id = $1',
    [id]
  )

  if (currentBanner.rows.length === 0) {
    throw new Error('Không tìm thấy banner.')
  }

  const currentType = currentBanner.rows[0].type

  // Nếu có truyền type mới
  if (type !== undefined) {
    // Validate type
    if (!type || type.trim() === '') {
      throw new Error('Loại banner không được để trống.')
    }

    // Kiểm tra type có hợp lệ không
    if (!validTypes.includes(type)) {
      throw new Error(
        `Loại banner "${type}" không hợp lệ. Loại hợp lệ: ${validTypes.join(
          ', '
        )}`
      )
    }

    // LOGIC QUAN TRỌNG: Kiểm tra nếu đổi type sang type không phải HOMEPAGE
    if (type !== 'HOMEPAGE') {
      // Kiểm tra xem type mới đã tồn tại chưa (trừ banner hiện tại)
      const existingBanner = await db.query(
        'SELECT * FROM banner WHERE type = $1 AND id != $2',
        [type, id]
      )

      if (existingBanner.rows.length > 0) {
        // Lấy tên tiếng Việt của type để hiển thị thông báo thân thiện hơn
        const typeLabels = {
          HOMEPAGE: 'Trang chủ',
          INTRODUCE: 'Giới thiệu',
          AGENCY: 'Đại lý',
          CONTACT: 'Liên hệ'
        }
        const typeLabel = typeLabels[type] || type
        throw new Error(
          `Banner cho trang "${typeLabel}" đã tồn tại. Chỉ trang chủ có thể có nhiều banner.`
        )
      }
    }

    // Nếu đang đổi TỪ type không phải HOMEPAGE SANG HOMEPAGE
    if (currentType !== 'HOMEPAGE' && type === 'HOMEPAGE') {
      // Cho phép chuyển sang HOMEPAGE vì HOMEPAGE có thể có nhiều banner
    }

    // Nếu đang đổi TỪ HOMEPAGE SANG type không phải HOMEPAGE
    if (currentType === 'HOMEPAGE' && type !== 'HOMEPAGE') {
      // Kiểm tra xem type mới đã tồn tại chưa
      const existingBanner = await db.query(
        'SELECT * FROM banner WHERE type = $1',
        [type]
      )

      if (existingBanner.rows.length > 0) {
        const typeLabels = {
          HOMEPAGE: 'Trang chủ',
          INTRODUCE: 'Giới thiệu',
          AGENCY: 'Đại lý',
          CONTACT: 'Liên hệ'
        }
        const typeLabel = typeLabels[type] || type
        throw new Error(
          `Banner cho trang "${typeLabel}" đã tồn tại. Chỉ trang chủ có thể có nhiều banner.`
        )
      }
    }
  }

  // Thực hiện update
  const fields = []
  const values = []
  let query = 'UPDATE banner SET '

  if (name !== undefined) {
    if (name !== null && name !== '' && name.trim() === '') {
      throw new Error('Tên banner không được để trống.')
    }
    fields.push('name')
    values.push(name !== null ? name.trim() : null)
  }

  if (type !== undefined) {
    fields.push('type')
    values.push(type.trim())
  }

  // CHỈ cập nhật ảnh nếu image không phải là undefined VÀ không phải là null/chuỗi rỗng
  if (image !== undefined && image !== null && image !== '') {
    if (image.trim() === '') {
      throw new Error('Đường dẫn ảnh không hợp lệ.')
    }
    fields.push('image')
    values.push(image.trim())
  }

  if (fields.length === 0) {
    throw new Error('Không có trường nào để cập nhật.')
  }

  // Tạo câu query động
  const setClause = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(', ')

  query += setClause + ` WHERE id = $${fields.length + 1} RETURNING *`
  values.push(id)

  try {
    const result = await db.query(query, values)
    return result.rows[0]
  } catch (error) {
    if (error.code === '23505') {
      // PostgreSQL unique violation
      throw new Error(
        'Banner cho trang này đã tồn tại. Chỉ trang chủ có thể có nhiều banner.'
      )
    }
    throw new Error(`Cập nhật banner thất bại: ${error.message}`)
  }
}

const deleteBanner = async id => {
  await db.query('DELETE FROM banner WHERE id = $1', [id])
}

module.exports = {
  getAllBanner,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner
}
