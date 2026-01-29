const db = require('../config/database')

const getAllUsers = async ({ search = '', limit = 10, page = 1 }) => {
  const offset = (page - 1) * limit
  const queryParams = []
  const conditions = []

  let baseQuery = `
    SELECT u.id, u.name, u.email, u.role_id, r.name AS role_name, u.created_at 
    FROM users u 
    LEFT JOIN roles r ON u.role_id = r.id
  `

  let countQuery = `
    SELECT COUNT(*) 
    FROM users u 
    LEFT JOIN roles r ON u.role_id = r.id
  `

  // Thêm điều kiện tìm kiếm
  if (search) {
    queryParams.push(`%${search}%`)
    conditions.push(`LOWER(u.name) LIKE LOWER($${queryParams.length})`)
  }

  // Gắn điều kiện WHERE nếu có
  if (conditions.length > 0) {
    const whereClause = `WHERE ${conditions.join(' AND ')}`
    baseQuery += ` ${whereClause}`
    countQuery += ` ${whereClause}`
  }

  // Thêm phân trang
  queryParams.push(limit)
  queryParams.push(offset)
  baseQuery += ` ORDER BY u.id DESC LIMIT $${queryParams.length - 1} OFFSET $${
    queryParams.length
  }`

  // Thực hiện truy vấn
  const dataResult = await db.query(baseQuery, queryParams)
  const countResult = await db.query(
    countQuery,
    queryParams.slice(0, queryParams.length - 2)
  )
  const total = parseInt(countResult.rows[0]?.count || '0')

  return {
    data: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

const createUser = async ({ name, email, password, role_id }) => {
  const query = `
    INSERT INTO users (name, email, password, role_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, role_id
  `
  const values = [name, email, password, role_id]

  const result = await db.query(query, values)
  return result.rows[0]
}

const updateUser = async (id, { name, email, role_id }) => {
  const result = await db.query(
    `
    UPDATE users SET name = $1, email = $2, role_id = $3
    WHERE id = $4 RETURNING id, name, email, role_id
    `,
    [name, email, role_id, id]
  )
  return result.rows[0]
}

const deleteUser = async id => {
  await db.query('DELETE FROM users WHERE id = $1', [id])
}

const findUserByEmail = async email => {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email])
  return result.rows[0]
}

const findUserById = async id => {
  const result = await db.query(
    `
      SELECT 
        u.id, u.name, u.email, u.role_id, u.created_at,
        r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
      `,
    [id]
  )

  return result.rows[0]
}

module.exports = {
  getAllUsers,
  updateUser,
  deleteUser,
  createUser,
  findUserByEmail,
  findUserById
}
