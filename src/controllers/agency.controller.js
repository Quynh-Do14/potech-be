const { ROLES } = require('../constants')
const agencyModel = require('../models/agency.model')
const userModel = require('../models/user.model')

const getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      province = '',
      district = '',
      star_rate = '',
      category_id = ''
    } = req.query
    const result = await agencyModel.getAllAgency({
      page,
      limit,
      search,
      province,
      district,
      star_rate,
      category_id
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const getById = async (req, res) => {
  try {
    const data = await agencyModel.getAgencyById(req.params.id)
    if (!data) return res.status(404).json({ message: 'Agency not found' })
    res.json(data)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const create = async (req, res) => {
  try {
    const profile = await userModel.findUserById(req.user.id)
    const allowedRoles = [ROLES.ADMIN, ROLES.SELLER]

    if (!allowedRoles.includes(profile.role_name)) {
      return res.status(403).json({ message: MESSAGES.UNAUTHORIZED })
    }

    const {
      name,
      address,
      lat,
      long,
      phone_number,
      province,
      district,
      star_rate,
      agency_category_type
    } = req.body
    const image = req.file ? `/uploads/${req.file.filename}` : null

    // Validate required fields
    if (!name || !address || !phone_number || !province || !district) {
      return res
        .status(400)
        .json({ message: 'Name, address and phone number are required' })
    }

    const agencyCategoryType = JSON.parse(agency_category_type || '[]')
    console.log('agencyCategoryType', agencyCategoryType)
    console.log('agency_category_type1', agency_category_type)

    const newAgency = await agencyModel.createAgency({
      name,
      address,
      lat,
      long,
      phone_number,
      province,
      district,
      star_rate,
      agency_category_type: agencyCategoryType,
      image
    })
    res.status(201).json(newAgency)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const update = async (req, res) => {
  try {
    const profile = await userModel.findUserById(req.user.id)
    const allowedRoles = [ROLES.ADMIN, ROLES.SELLER]

    if (!allowedRoles.includes(profile.role_name))
      return res.status(403).json({ message: MESSAGES.UNAUTHORIZED })

    const {
      name,
      address,
      lat,
      long,
      phone_number,
      province,
      district,
      agency_category_type
    } = req.body
    const image = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.image || undefined

    const agencyCategoryType = JSON.parse(agency_category_type || '[]')
    console.log('agencyCategoryType', agencyCategoryType)

    const updateData = {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(lat !== undefined && { lat: parseFloat(lat) }),
      ...(long !== undefined && { long: parseFloat(long) }),
      ...(phone_number !== undefined && { phone_number }),
      ...(province !== undefined && { province }),
      ...(district !== undefined && { district }),
      ...(agencyCategoryType !== undefined && {
        agency_category_type: agencyCategoryType
      }),
      ...(image !== undefined && { image })
    }

    const updated = await agencyModel.updateAgency(req.params.id, updateData)
    if (!updated) return res.status(404).json({ message: 'Agency not found' })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const remove = async (req, res) => {
  try {
    const profile = await userModel.findUserById(req.user.id)
    const allowedRoles = [ROLES.ADMIN, ROLES.SELLER]

    if (!allowedRoles.includes(profile.role_name))
      return res.status(403).json({ message: MESSAGES.UNAUTHORIZED })

    const agency = await agencyModel.getAgencyById(req.params.id)
    if (!agency) return res.status(404).json({ message: 'Agency not found' })

    await agencyModel.deleteAgency(req.params.id)
    res.json({ message: 'Agency deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
}
