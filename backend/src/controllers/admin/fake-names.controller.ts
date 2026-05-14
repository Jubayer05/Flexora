import type { Response } from 'express'

import db from '../../configs/db'
import type { AuthRequest } from '../../types/req-res'

/**
 * Get all fake names with pagination and filtering
 */
export const getFakeNames = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {}
    if (status) {
      where.status = status
    }
    if (search) {
      where.name = {
        contains: search as string,
        mode: 'insensitive'
      }
    }

    // Get fake names with pagination
    const [fakeNames, total] = await Promise.all([
      db.fakeNames.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      db.fakeNames.count({ where })
    ])

    res.json({
      success: true,
      data: {
        fakeNames,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1
        }
      },
      message: 'Fake names retrieved successfully'
    })
  } catch (error) {
    console.error('Get fake names error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve fake names'
    })
  }
}

/**
 * Get single fake name by ID
 */
export const getFakeNameById = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id!)

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fake name ID'
      })
    }

    const fakeName = await db.fakeNames.findUnique({
      where: { id }
    })

    if (!fakeName) {
      return res.status(404).json({
        success: false,
        message: 'Fake name not found'
      })
    }

    res.json({
      success: true,
      data: fakeName,
      message: 'Fake name retrieved successfully'
    })
  } catch (error) {
    console.error('Get fake name by ID error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve fake name'
    })
  }
}

/**
 * Create new fake name
 */
export const createFakeName = async (req: AuthRequest, res: Response) => {
  try {
    const { name, status = 'AVAILABLE' } = req.body

    // Check if name already exists
    const existingName = await db.fakeNames.findUnique({
      where: { name }
    })

    if (existingName) {
      return res.status(400).json({
        success: false,
        message: 'Fake name already exists'
      })
    }

    const fakeName = await db.fakeNames.create({
      data: {
        name,
        status
      }
    })

    res.status(201).json({
      success: true,
      data: fakeName,
      message: 'Fake name created successfully'
    })
  } catch (error) {
    console.error('Create fake name error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create fake name'
    })
  }
}

/**
 * Bulk create fake names
 */
export const bulkCreateFakeNames = async (req: AuthRequest, res: Response) => {
  try {
    const { names } = req.body

    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Names array is required and must not be empty'
      })
    }

    // Filter out duplicates and existing names
    const uniqueNames = [...new Set(names)]
    const existingNames = await db.fakeNames.findMany({
      where: {
        name: { in: uniqueNames }
      },
      select: { name: true }
    })

    const existingNamesSet = new Set(existingNames.map((n: { name: string }) => n.name))
    const newNames = uniqueNames.filter((name) => !existingNamesSet.has(name))

    if (newNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All names already exist'
      })
    }

    // Bulk create
    const result = await db.fakeNames.createMany({
      data: newNames.map((name) => ({
        name,
        status: 'AVAILABLE'
      })),
      skipDuplicates: true
    })

    res.status(201).json({
      success: true,
      data: {
        created: result.count,
        skipped: uniqueNames.length - result.count
      },
      message: `${result.count} fake names created successfully`
    })
  } catch (error) {
    console.error('Bulk create fake names error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create fake names'
    })
  }
}

/**
 * Update fake name
 */
export const updateFakeName = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id!)
    const { name, status } = req.body

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fake name ID'
      })
    }

    // Check if fake name exists
    const existingFakeName = await db.fakeNames.findUnique({
      where: { id }
    })

    if (!existingFakeName) {
      return res.status(404).json({
        success: false,
        message: 'Fake name not found'
      })
    }

    // Check if new name already exists (if name is being changed)
    if (name && name !== existingFakeName.name) {
      const nameExists = await db.fakeNames.findUnique({
        where: { name }
      })

      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: 'Fake name already exists'
        })
      }
    }

    // Update fake name
    const updateData: any = {}
    if (name) updateData.name = name
    if (status) updateData.status = status

    const fakeName = await db.fakeNames.update({
      where: { id },
      data: updateData
    })

    res.json({
      success: true,
      data: fakeName,
      message: 'Fake name updated successfully'
    })
  } catch (error) {
    console.error('Update fake name error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update fake name'
    })
  }
}

/**
 * Delete fake name
 */
export const deleteFakeName = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id!)

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fake name ID'
      })
    }

    // Check if fake name exists
    const existingFakeName = await db.fakeNames.findUnique({
      where: { id }
    })

    if (!existingFakeName) {
      return res.status(404).json({
        success: false,
        message: 'Fake name not found'
      })
    }

    await db.fakeNames.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Fake name deleted successfully'
    })
  } catch (error) {
    console.error('Delete fake name error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete fake name'
    })
  }
}

/**
 * Bulk delete fake names
 */
export const bulkDeleteFakeNames = async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs array is required and must not be empty'
      })
    }

    const result = await db.fakeNames.deleteMany({
      where: {
        id: { in: ids }
      }
    })

    res.json({
      success: true,
      data: { deleted: result.count },
      message: `${result.count} fake names deleted successfully`
    })
  } catch (error) {
    console.error('Bulk delete fake names error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete fake names'
    })
  }
}

/**
 * Get statistics about fake names
 */
export const getFakeNamesStats = async (req: AuthRequest, res: Response) => {
  try {
    const [total, available, used] = await Promise.all([
      db.fakeNames.count(),
      db.fakeNames.count({ where: { status: 'AVAILABLE' } }),
      db.fakeNames.count({ where: { status: 'USED' } })
    ])

    res.json({
      success: true,
      data: {
        total,
        available,
        used,
        usagePercentage: total > 0 ? ((used / total) * 100).toFixed(2) : '0.00'
      },
      message: 'Statistics retrieved successfully'
    })
  } catch (error) {
    console.error('Get fake names stats error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve statistics'
    })
  }
}
